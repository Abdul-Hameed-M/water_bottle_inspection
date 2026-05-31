import asyncio
import base64
import cv2
import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from backend.services.stream_manager import StreamManager
from backend.services.inference import YOLOInference
from backend.utils.stream_url import (
    normalize_ipcam_url,
    normalize_rtsp_url,
    build_ipcam_candidates,
    ipcam_hotspot_hint,
)
from backend.database.models import MetricSummary, InspectionSession
from backend.database.db import SessionLocal
from backend.websocket.manager import manager

router = APIRouter(prefix="/stream", tags=["Streaming"])

# Global stream manager and model instances
stream_manager = StreamManager()
yolo_inference = YOLOInference()

# Global session state
active_inspection_id = "SYS001"

class ConnectRequest(BaseModel):
    url: str

class WebcamRequest(BaseModel):
    index: int = 0

class ConfidenceThresholdRequest(BaseModel):
    class_name: str
    threshold: float

class AllConfidenceThresholdsRequest(BaseModel):
    thresholds: dict

def create_inspection_session(source_type: str) -> str:
    global active_inspection_id
    prefix_map = {
        "webcam": "WC",
        "ipcam": "PC",
        "rtsp": "CCTV",
        "video": "VU"
    }
    prefix = prefix_map.get(source_type, "SYS")
    
    db = SessionLocal()
    try:
        count = db.query(InspectionSession).filter(InspectionSession.inspection_id.like(f"{prefix}%")).count()
        new_id = f"{prefix}{count + 1:03d}"
        
        session = InspectionSession(
            inspection_id=new_id,
            source_type=source_type,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(session)
        db.commit()
        
        active_inspection_id = new_id
        print(f"[SeeWise Session] Created active session: {active_inspection_id}")
        return new_id
    except Exception as e:
        print(f"[SeeWise Session] Error generating session: {e}")
        db.rollback()
        active_inspection_id = f"{prefix}999"
        return active_inspection_id
    finally:
        db.close()

@router.get("/status")
def stream_status():
    return stream_manager.get_status()

@router.get("/confidence-thresholds")
def get_confidence_thresholds():
    """Get current class-wise confidence thresholds"""
    return yolo_inference.get_confidence_thresholds()

@router.post("/confidence-threshold")
def set_confidence_threshold(req: ConfidenceThresholdRequest):
    """Set confidence threshold for a specific class"""
    try:
        yolo_inference.set_confidence_threshold(req.class_name, req.threshold)
        return {
            "status": "success",
            "message": f"Updated {req.class_name} confidence threshold to {req.threshold}",
            "thresholds": yolo_inference.get_confidence_thresholds()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/confidence-thresholds")
def set_all_confidence_thresholds(req: AllConfidenceThresholdsRequest):
    """Set confidence thresholds for all classes"""
    try:
        yolo_inference.set_all_confidence_thresholds(req.thresholds)
        return {
            "status": "success",
            "message": "Updated all confidence thresholds",
            "thresholds": yolo_inference.get_confidence_thresholds()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cameras")
def get_cameras():
    """
    Detects Mac cameras that can return real frames (not just open handles).
    Includes fallback detection for various camera types.
    """
    detected_cameras = []
    name_map = {
        0: "FaceTime HD Camera",
        1: "External USB Camera",
        2: "Continuity Camera",
        3: "Virtual Camera",
    }

    # Try AVFoundation first (macOS native)
    for idx in range(4):
        cap = cv2.VideoCapture(idx, cv2.CAP_AVFOUNDATION)
        if not cap.isOpened():
            cap.release()
            continue
        ok = False
        for _ in range(5):
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                ok = True
                break
        cap.release()
        if ok:
            detected_cameras.append({
                "index": idx,
                "name": name_map.get(idx, f"Camera Index #{idx}"),
            })

    # Fallback: Try default backend if AVFoundation didn't find cameras
    if not detected_cameras:
        print("[SeeWise Stream] AVFoundation found no cameras, trying default backend...")
        for idx in range(4):
            cap = cv2.VideoCapture(idx)
            if not cap.isOpened():
                cap.release()
                continue
            ok = False
            for _ in range(5):
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    ok = True
                    break
            cap.release()
            if ok:
                detected_cameras.append({
                    "index": idx,
                    "name": name_map.get(idx, f"Camera Index #{idx} (Fallback)"),
                })

    # Final fallback: Add default camera if none detected
    if not detected_cameras:
        print("[SeeWise Stream] No cameras detected, adding default fallback")
        detected_cameras.append({"index": 0, "name": "FaceTime HD Camera (Default)"})

    return detected_cameras

def _stream_response(session_id: str, message: str):
    status = stream_manager.get_status()
    return {
        "status": "success",
        "message": message,
        "inspection_id": session_id,
        "source_type": status.get("source_type"),
        "actual_source": status.get("actual_source"),
    }


@router.post("/start-webcam")
def start_webcam(req: WebcamRequest):
    session_id = create_inspection_session("webcam")
    success = stream_manager.start(req.index, "webcam", yolo_inference=yolo_inference, inspection_id=session_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not open Mac webcam. Close FaceTime/Zoom, allow camera access for "
                "Terminal/Python in System Settings → Privacy → Camera, then try again."
            ),
        )
    return _stream_response(session_id, "Webcam stream started")

def _ipcam_failure_detail(url: str) -> str:
    tried = build_ipcam_candidates(url)
    paths = ", ".join(tried[:6])
    if len(tried) > 6:
        paths += ", …"
    return (
        f"Could not open phone IP camera (tried: {paths}). "
        "Ensure IP Webcam shows «server running» and the Mac is on the phone's hotspot. "
        "IP Webcam stream URL is usually http://192.168.43.1:8080/videofeed (not /video). "
        f"{ipcam_hotspot_hint()}"
    )


@router.get("/ipcam-hints")
def ipcam_hints():
    """Hotspot / IP Webcam setup notes for the Live Inspection UI."""
    return {
        "hint": ipcam_hotspot_hint(),
        "example_urls": [
            "http://192.168.43.1:8080/videofeed",
            "http://192.168.49.1:8080/videofeed",
            "http://192.168.43.1:8080/shot.jpg",
            "http://192.168.1.10:4747/video",
        ],
        "android_hotspot_gateway_ips": ["192.168.43.1", "192.168.49.1"],
        "ip_webcam_port": 8080,
    }


@router.post("/connect-ipcam")
def connect_ipcam(req: ConnectRequest):
    try:
        url = normalize_ipcam_url(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    session_id = create_inspection_session("ipcam")
    success = stream_manager.start(url, "ipcam", yolo_inference=yolo_inference, inspection_id=session_id)
    if not success:
        raise HTTPException(status_code=400, detail=_ipcam_failure_detail(url))
    status = stream_manager.get_status()
    actual = status.get("actual_source") or url
    return _stream_response(session_id, f"Connected to IP camera: {actual}")

@router.post("/connect-rtsp")
def connect_rtsp(req: ConnectRequest):
    try:
        url = normalize_rtsp_url(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    session_id = create_inspection_session("rtsp")
    success = stream_manager.start(url, "rtsp", yolo_inference=yolo_inference, inspection_id=session_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not open RTSP stream at {url}. "
                "Check camera IP, credentials, and rtsp:// path (often /stream or /h264)."
            ),
        )
    return _stream_response(session_id, f"Connected to RTSP: {url}")

@router.post("/pause")
def pause_stream():
    """
    Freezes playback for recorded videos (freezes live stream progression).
    """
    stream_manager.paused = True
    print("[SeeWise Stream] Stream paused.")
    return {"status": "success", "message": "Stream paused"}

@router.post("/resume")
def resume_stream():
    """
    Resumes playback for recorded videos.
    """
    stream_manager.paused = False
    print("[SeeWise Stream] Stream resumed.")
    return {"status": "success", "message": "Stream resumed"}

@router.post("/stop-stream")
def stop_stream():
    stream_manager.stop()
    return {"status": "success", "message": "Stream stopped"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"[SeeWise WS] Client connected to active session: {active_inspection_id}")
    
    last_db_log = datetime.datetime.now()
    last_sent = 0.0
    min_frame_interval = 1.0 / 30.0  # cap UI updates ~30 FPS to reduce encode/network load
    
    try:
        while True:
            # Fetch processed frame and metadata from StreamManager
            data = stream_manager.get_processed_data()
            if data is None:
                await asyncio.sleep(0.005)
                continue
                
            processed_frame = data["frame"]
            stats = data["stats"]
            detections = data["detections"]
            
            now_mono = asyncio.get_event_loop().time()
            if now_mono - last_sent < min_frame_interval:
                await asyncio.sleep(0.001)
                continue
            last_sent = now_mono

            ret, buffer = cv2.imencode(
                '.jpg', processed_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65]
            )
            if not ret:
                await asyncio.sleep(0.005)
                continue
                
            img_b64 = base64.b64encode(buffer).decode('utf-8')
            
            stats["stream_fps"] = stream_manager.get_fps()
            stats["inspection_id"] = active_inspection_id
            stream_status = stream_manager.get_status()
            stats["source_type"] = stream_status.get("source_type")
            stats["actual_source"] = stream_status.get("actual_source")
            
            payload = {
                "image": f"data:image/jpeg;base64,{img_b64}",
                "stats": stats,
                "detections": detections
            }
            
            await websocket.send_json(payload)
            
            # Every 5 seconds, write aggregated FPS & Latency stats to MetricSummary DB table and update the InspectionSession
            # This is run in a background threadpool using asyncio.to_thread to avoid blocking the event loop
            now = datetime.datetime.now()
            if (now - last_db_log).total_seconds() >= 5.0:
                last_db_log = now
                def log_metrics(stats_copy):
                    db = SessionLocal()
                    try:
                        metric = MetricSummary(
                            inspection_id=active_inspection_id,
                            fps=stats_copy.get("stream_fps", 0.0),
                            latency=stats_copy.get("latency", 0.0),
                            total_detected=stats_copy.get("total_bottles", 0),
                            passed_count=stats_copy.get("passed", 0),
                            failed_count=stats_copy.get("failed", 0)
                        )
                        db.add(metric)
                        
                        # Update InspectionSession summary statistics
                        session = db.query(InspectionSession).filter(InspectionSession.inspection_id == active_inspection_id).first()
                        if session:
                            session.total_detected = max(session.total_detected, stats_copy.get("total_bottles", 0))
                            session.passed_count = max(session.passed_count, stats_copy.get("passed", 0))
                            session.failed_count = max(session.failed_count, stats_copy.get("failed", 0))
                            session.avg_fps = stats_copy.get("stream_fps", 0.0)
                            session.avg_latency = stats_copy.get("latency", 0.0)
                            
                        db.commit()
                    except Exception as e:
                        print(f"[SeeWise Metric] Error logging metrics: {e}")
                        db.rollback()
                    finally:
                        db.close()
                
                asyncio.create_task(asyncio.to_thread(log_metrics, dict(stats)))
            
            await asyncio.sleep(0.001)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("[SeeWise WS] Client disconnected.")
    except Exception as e:
        manager.disconnect(websocket)
        print(f"[SeeWise WS] Connection error: {e}")
