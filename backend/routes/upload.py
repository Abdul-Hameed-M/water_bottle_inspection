import os
import shutil
import cv2
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from backend.routes.stream import stream_manager, create_inspection_session, yolo_inference
from backend.services.inference import YOLOInference

router = APIRouter(prefix="/upload", tags=["Video Upload"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(os.path.dirname(BASE_DIR), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/video")
async def upload_video(file: UploadFile = File(...)):
    """
    Saves an uploaded video to disk under a unique name, then configures the stream manager
    to stream this recorded video as a simulated live feed.
    """
    # Verify file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".mov", ".avi", ".mkv"]:
        raise HTTPException(status_code=400, detail="Invalid video format. Use MP4, MOV, AVI, or MKV.")
        
    # Create a unique VUxxx inspection session ID
    session_id = create_inspection_session("video")
    
    # Save the file using the inspection session ID
    filepath = os.path.join(UPLOAD_DIR, f"{session_id}{ext}")
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Start stream manager with this video source
        success = stream_manager.start(filepath, "video", yolo_inference=yolo_inference, inspection_id=session_id)
        if not success:
            raise HTTPException(status_code=500, detail="Could not open uploaded video for processing")
            
        return {
            "status": "success",
            "message": "Video uploaded and stream initialized",
            "filename": file.filename,
            "filepath": filepath,
            "inspection_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading video: {str(e)}")

@router.get("/export/{inspection_id}")
def export_processed_video(inspection_id: str):
    """
    Processes the entire uploaded video offline, applies YOLOv8 detection overlays,
    saves the output, and serves the file as a downloadable response.
    """
    # Find the uploaded video source file matching this inspection_id
    source_file = None
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(inspection_id):
            source_file = os.path.join(UPLOAD_DIR, f)
            break
            
    if not source_file:
        raise HTTPException(status_code=404, detail="Uploaded source video not found for this inspection session")
        
    export_dir = os.path.join(BASE_DIR, "storage", "exported_videos")
    os.makedirs(export_dir, exist_ok=True)
    out_path = os.path.join(export_dir, f"{inspection_id}_processed.mp4")
    
    # If the processed video already exists, serve it immediately (caching optimization)
    if os.path.exists(out_path):
        return FileResponse(out_path, media_type="video/mp4", filename=f"seewise_processed_{inspection_id}.mp4")
        
    # Open the video and read frames
    cap = cv2.VideoCapture(source_file)
    if not cap.isOpened():
        raise HTTPException(status_code=500, detail="Failed to open source video file")
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    
    # Use MP4V codec to write processed video
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
    
    # Create an independent inference tracker to avoid corrupting active live-feed state
    export_tracker = YOLOInference()
    
    print(f"[SeeWise Exporter] Start processing video offline for session: {inspection_id}")
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            # Run inference drawing PIL overlays directly on the frame
            processed_frame, _, _ = export_tracker.predict(frame, inspection_id=inspection_id)
            out.write(processed_frame)
    except Exception as e:
        print(f"[SeeWise Exporter] Error processing video frames: {e}")
        cap.release()
        out.release()
        raise HTTPException(status_code=500, detail=f"Error exporting processed video: {str(e)}")
        
    cap.release()
    out.release()
    
    print(f"[SeeWise Exporter] Export processing completed: {out_path}")
    return FileResponse(out_path, media_type="video/mp4", filename=f"seewise_processed_{inspection_id}.mp4")
