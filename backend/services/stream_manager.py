import cv2
import time
import os
import socket
import threading
import urllib.error
import urllib.request
import logging
from urllib.parse import urlparse
import numpy as np
from queue import Queue

from backend.utils.stream_url import (
    normalize_ipcam_url,
    normalize_rtsp_url,
    build_ipcam_candidates,
    build_ipcam_snapshot_urls,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class StreamManager:
    def __init__(self):
        self.cap = None
        self.raw_queue = Queue(maxsize=2)
        self.processed_queue = Queue(maxsize=2)
        self.is_running = False
        self.paused = False
        self.capture_thread = None
        self.inference_thread = None
        self.source_type = None  # webcam, ipcam, rtsp, video
        self.source_url = None
        self.actual_source = None
        self.lock = threading.Lock()
        self.fps_smoothed = 0.0
        self.last_frame = None
        self.last_processed_data = None
        self.snapshot_url = None  # HTTP /shot.jpg polling when MJPEG fails

        # RTSP reconnection settings
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_delay = 2.0  # seconds
        self.last_successful_frame_time = None

    def get_status(self):
        return {
            "source_type": self.source_type,
            "source_url": self.source_url,
            "actual_source": self.actual_source,
            "is_running": self.is_running,
            "is_live": self.source_type in ("webcam", "ipcam", "rtsp") and self.is_running,
        }

    def _open_webcam(self, index: int):
        """Open macOS webcam via AVFoundation; never fall back to uploaded files."""
        for attempt_idx in [index, 1, 2, 0]:
            cap = None
            try:
                cap = cv2.VideoCapture(attempt_idx, cv2.CAP_AVFOUNDATION)
            except Exception as e:
                logger.error(f"Failed to open webcam at index {attempt_idx}: {e}")
                continue
            if cap is None or not cap.isOpened():
                if cap is not None:
                    cap.release()
                logger.warning(f"Webcam at index {attempt_idx} is not available")
                continue

            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

            # Warm-up reads (macOS sometimes returns empty frames right after open)
            frame = None
            for _ in range(8):
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    break
                time.sleep(0.08)

            if frame is not None and frame.size > 0:
                logger.info(f"Webcam ready at index {attempt_idx}")
                return cap, attempt_idx, frame

            cap.release()
            logger.warning(f"Webcam at index {attempt_idx} failed to produce valid frames")

        logger.error("Could not open any webcam. Please check:")
        logger.error("  1. Camera permissions in System Settings → Privacy → Camera")
        logger.error("  2. No other application is using the camera (FaceTime, Zoom, etc.)")
        logger.error("  3. Camera is properly connected (for external cameras)")
        return None, index, None

    def _reset_after_failed_start(self):
        """Clear partial state when start() fails before threads are launched."""
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
        self.cap = None
        self.is_running = False
        self.source_type = None
        self.source_url = None
        self.actual_source = None
        self.snapshot_url = None
        self.last_frame = None
        self.last_processed_data = None
        self.reconnect_attempts = 0
        self.last_successful_frame_time = None

    def _attempt_reconnect(self):
        """Attempt to reconnect to RTSP stream after connection loss."""
        if self.source_type != "rtsp" or self.reconnect_attempts >= self.max_reconnect_attempts:
            return False

        self.reconnect_attempts += 1
        logger.info(f"Attempting RTSP reconnection ({self.reconnect_attempts}/{self.max_reconnect_attempts})")

        time.sleep(self.reconnect_delay)

        try:
            # Close existing capture
            if self.cap:
                self.cap.release()

            # Attempt to reopen stream
            cap, test_frame = self._open_network_stream(self.source_url, "rtsp")
            if cap is not None and test_frame is not None:
                self.cap = cap
                self.last_frame = self._resize_frame_if_needed(test_frame)
                self.last_successful_frame_time = time.time()
                self.reconnect_attempts = 0
                logger.info("RTSP reconnection successful")
                return True
            else:
                logger.warning(f"RTSP reconnection attempt {self.reconnect_attempts} failed")
                return False
        except Exception as e:
            logger.error(f"RTSP reconnection error: {e}")
            return False

    def _host_port_reachable(self, host: str, port: int, timeout_sec: float = 2.5) -> bool:
        if not host:
            return False
        try:
            with socket.create_connection((host, port), timeout=timeout_sec):
                return True
        except OSError:
            return False

    def _http_probe(self, url: str, timeout_sec: float = 4.0) -> bool:
        """Quick reachability check before OpenCV (hotspot / wrong IP fails fast)."""
        try:
            req = urllib.request.Request(
                url,
                method="GET",
                headers={"User-Agent": "SeeWise/1.0", "Range": "bytes=0-2047"},
            )
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                chunk = resp.read(2048)
                return len(chunk) > 0
        except urllib.error.HTTPError as e:
            if e.code in (200, 206, 401):
                return True
        except Exception:
            pass
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SeeWise/1.0"})
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                chunk = resp.read(2048)
                return len(chunk) > 0
        except urllib.error.HTTPError as e:
            return e.code in (200, 206, 401)
        except Exception:
            return False

    def _read_snapshot_frame(self, url: str):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SeeWise/1.0"})
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                data = resp.read()
            if not data:
                return None
            arr = np.frombuffer(data, dtype=np.uint8)
            return cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception:
            return None

    def _open_network_stream(self, url: str, source_type: str, warm_attempts: int = 40):
        if source_type == "rtsp":
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|stimeout;15000000"
        else:
            # HTTP/MJPEG — longer timeouts for phone hotspot latency
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
                "rw_timeout;20000000|stimeout;20000000|timeout;20000000"
            )

        cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            return None, None

        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        frame = None
        for _ in range(warm_attempts):
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                break
            time.sleep(0.15)

        if frame is None or frame.size == 0:
            cap.release()
            return None, None

        return cap, frame

    def _open_ipcam(self, source: str):
        """
        Try normalized URL, common IP Webcam paths, then snapshot polling.
        Returns (cap_or_none, test_frame, actual_url, snapshot_url_or_none).
        """
        candidates = build_ipcam_candidates(str(source))
        tried = []
        first = urlparse(candidates[0])
        host = first.hostname or ""
        port = first.port or (443 if first.scheme == "https" else 80)

        if host and not self._host_port_reachable(host, port, timeout_sec=2.5):
            logger.warning(
                f"Cannot reach {host}:{port} — "
                "start IP Webcam on the phone and connect Mac to phone hotspot."
            )
            tried.extend(candidates)
            tried.extend(build_ipcam_snapshot_urls(str(source)))
            logger.warning(f"IP camera failed. Tried: {tried}")
            return None, None, None, None

        for url in candidates:
            tried.append(url)
            logger.info(f"Trying IP camera URL: {url}")
            if not self._http_probe(url, timeout_sec=4.0):
                logger.warning(f"HTTP probe failed: {url}")
                continue
            cap, frame = self._open_network_stream(url, "ipcam", warm_attempts=25)
            if cap is not None and frame is not None:
                logger.info(f"IP camera opened: {url}")
                return cap, frame, url, None

        # Snapshot fallback (IP Webcam /shot.jpg)
        for snap_url in build_ipcam_snapshot_urls(str(source)):
            if snap_url in tried:
                continue
            tried.append(snap_url)
            logger.info(f"Trying snapshot URL: {snap_url}")
            if not self._http_probe(snap_url, timeout_sec=4.0):
                continue
            frame = self._read_snapshot_frame(snap_url)
            if frame is not None and frame.size > 0:
                logger.info(f"IP camera snapshot mode: {snap_url}")
                return None, frame, snap_url, snap_url

        logger.warning(f"IP camera failed. Tried: {tried}")
        return None, None, None, None

    def _resize_frame_if_needed(self, frame):
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640.0 / w
            new_h = int(h * scale)
            frame = cv2.resize(frame, (640, new_h), interpolation=cv2.INTER_AREA)
        return frame

    def start(self, source, source_type="webcam", yolo_inference=None, inspection_id="SYS001"):
        self.stop()

        with self.lock:
            self.source_type = source_type
            self.source_url = source
            self.actual_source = None
            self.paused = False
            self.last_frame = None
            self.last_processed_data = None
            self.cap = None
            self.snapshot_url = None

            logger.info(f"Connecting to {source_type}: {source}")

            test_frame = None

            if source_type == "webcam":
                try:
                    cam_index = int(source)
                except (TypeError, ValueError):
                    cam_index = 0
                self.cap, cam_index, test_frame = self._open_webcam(cam_index)
                if self.cap is None:
                    logger.error("Webcam failed — no uploaded-video fallback")
                    self._reset_after_failed_start()
                    return False
                self.source_url = cam_index
                self.actual_source = f"webcam:{cam_index}"

            elif source_type == "ipcam":
                try:
                    url = normalize_ipcam_url(str(source))
                except ValueError as e:
                    logger.error(f"{e}")
                    self._reset_after_failed_start()
                    return False
                self.source_url = url
                self.cap, test_frame, opened_url, self.snapshot_url = self._open_ipcam(url)
                if test_frame is None:
                    logger.error(f"Could not open IP camera: {url}")
                    self._reset_after_failed_start()
                    return False
                self.actual_source = opened_url
                self.source_url = opened_url

            elif source_type == "rtsp":
                try:
                    url = normalize_rtsp_url(str(source))
                except ValueError as e:
                    logger.error(f"{e}")
                    self._reset_after_failed_start()
                    return False
                self.source_url = url
                self.cap, test_frame = self._open_network_stream(url, "rtsp")
                if self.cap is None:
                    logger.error(f"Could not open RTSP stream: {url}")
                    self._reset_after_failed_start()
                    return False
                self.actual_source = url

            elif source_type == "video":
                path = str(source)
                if not os.path.isfile(path):
                    logger.error(f"Video file not found: {path}")
                    self._reset_after_failed_start()
                    return False
                self.cap = cv2.VideoCapture(path)
                if not self.cap.isOpened():
                    self._reset_after_failed_start()
                    return False
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                ret, test_frame = self.cap.read()
                if not ret or test_frame is None:
                    self.cap.release()
                    self.cap = None
                    self._reset_after_failed_start()
                    return False
                self.actual_source = path
                self.source_url = path

            else:
                logger.error(f"Unknown source type: {source_type}")
                self._reset_after_failed_start()
                return False

            if test_frame is not None:
                self.last_frame = self._resize_frame_if_needed(test_frame)

            self.is_running = True
            self.raw_queue = Queue(maxsize=2)
            self.processed_queue = Queue(maxsize=2)
            self.reconnect_attempts = 0
            self.last_successful_frame_time = time.time()

            self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.capture_thread.start()

            if yolo_inference is not None:
                self.inference_thread = threading.Thread(
                    target=self._inference_loop,
                    args=(yolo_inference, inspection_id),
                    daemon=True,
                )
                self.inference_thread.start()
            else:
                self.inference_thread = None

            logger.info(f"Live source active: {self.actual_source}")
            return True

    def stop(self):
        with self.lock:
            self.is_running = False
            self.paused = False

        if self.capture_thread:
            self.capture_thread.join(timeout=1.0)
            self.capture_thread = None

        if self.inference_thread:
            self.inference_thread.join(timeout=1.0)
            self.inference_thread = None

        with self.lock:
            if self.cap:
                self.cap.release()
                self.cap = None
            while not self.raw_queue.empty():
                try:
                    self.raw_queue.get_nowait()
                except Exception:
                    pass
            while not self.processed_queue.empty():
                try:
                    self.processed_queue.get_nowait()
                except Exception:
                    pass
            self.fps_smoothed = 0.0
            self.last_frame = None
            self.last_processed_data = None
            self.source_type = None
            self.source_url = None
            self.actual_source = None
            self.snapshot_url = None
            logger.info("Stream stopped successfully.")

    def _capture_loop(self):
        last_read_time = time.time()
        consecutive_failures = 0

        while True:
            with self.lock:
                if not self.is_running:
                    break
                is_paused = self.paused
                src_type = self.source_type

            if is_paused:
                time.sleep(0.05)
                continue

            snap_url = self.snapshot_url
            if snap_url:
                frame = self._read_snapshot_frame(snap_url)
                ret = frame is not None and frame.size > 0
                if not ret:
                    consecutive_failures += 1
                    if consecutive_failures >= 30:
                        logger.warning("ipcam snapshot lost — reconnecting...")
                        self._reconnect_network()
                        consecutive_failures = 0
                    else:
                        time.sleep(0.08)
                    continue
                consecutive_failures = 0
                frame = self._resize_frame_if_needed(frame)
                self.last_frame = frame
                self.last_successful_frame_time = time.time()
                if self.raw_queue.full():
                    try:
                        self.raw_queue.get_nowait()
                    except Exception:
                        pass
                try:
                    self.raw_queue.put_nowait(frame)
                except Exception:
                    pass
                time.sleep(0.12)
                continue

            if self.source_type in ("rtsp", "ipcam"):
                for _ in range(2):
                    if not self.cap.grab():
                        break
                ret, frame = self.cap.retrieve()
            else:
                ret, frame = self.cap.read()

            if not ret or frame is None or frame.size == 0:
                consecutive_failures += 1
                if src_type == "video":
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    consecutive_failures = 0
                    continue
                if src_type == "webcam" and consecutive_failures < 10:
                    time.sleep(0.05)
                    continue
                if src_type in ("rtsp", "ipcam"):
                    if consecutive_failures >= 30:
                        logger.warning(f"{src_type} lost — attempting reconnection...")
                        if src_type == "rtsp":
                            if self._attempt_reconnect():
                                consecutive_failures = 0
                                continue
                        else:
                            self._reconnect_network()
                            consecutive_failures = 0
                    else:
                        time.sleep(0.03)
                    continue
                if src_type == "webcam":
                    logger.error("Webcam read failed repeatedly. Stopping.")
                break

            consecutive_failures = 0
            frame = self._resize_frame_if_needed(frame)
            self.last_frame = frame
            self.last_successful_frame_time = time.time()

            if self.raw_queue.full():
                try:
                    self.raw_queue.get_nowait()
                except Exception:
                    pass
            try:
                self.raw_queue.put_nowait(frame)
            except Exception:
                pass

            if src_type == "video":
                video_fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
                target_interval = 1.0 / video_fps
                elapsed = time.time() - last_read_time
                time.sleep(max(0.001, target_interval - elapsed))
                last_read_time = time.time()

        self.is_running = False

    def _reconnect_network(self):
        url = self.source_url
        src = self.source_type
        if not url or src not in ("rtsp", "ipcam"):
            return
        if self.snapshot_url:
            time.sleep(0.5)
            frame = self._read_snapshot_frame(self.snapshot_url)
            if frame is not None and frame.size > 0:
                return
            return
        try:
            if self.cap:
                self.cap.release()
        except Exception:
            pass
        time.sleep(0.5)
        self.cap, _ = self._open_network_stream(str(url), src)

    def _inference_loop(self, yolo_inference, inspection_id):
        last_time = time.time()
        frame_count = 0
        inference_fps_smoothed = 0.0

        while True:
            with self.lock:
                if not self.is_running:
                    break
                is_paused = self.paused

            if is_paused:
                time.sleep(0.05)
                continue

            frame = None
            try:
                while not self.raw_queue.empty():
                    frame = self.raw_queue.get_nowait()
            except Exception:
                pass

            if frame is None:
                try:
                    frame = self.raw_queue.get(timeout=0.05)
                except Exception:
                    continue

            try:
                processed_frame, stats, detections = yolo_inference.predict(
                    frame, inspection_id=inspection_id
                )
            except Exception as e:
                print(f"[SeeWise Inference Thread] Predict error: {e}")
                processed_frame = frame.copy()
                stats = {
                    "total_bottles": 0, "proper_fill": 0, "under_fill": 0, "over_fill": 0,
                    "label_proper": 0, "label_torn": 0, "label_missing": 0, "passed": 0, "failed": 0,
                    "latency": 0.0,
                }
                detections = []

            frame_count += 1
            now = time.time()
            elapsed = now - last_time
            if elapsed >= 1.0:
                fps = frame_count / elapsed
                if inference_fps_smoothed == 0.0:
                    inference_fps_smoothed = fps
                else:
                    inference_fps_smoothed = 0.9 * inference_fps_smoothed + 0.1 * fps
                frame_count = 0
                last_time = now
                with self.lock:
                    self.fps_smoothed = inference_fps_smoothed

            if self.processed_queue.full():
                try:
                    self.processed_queue.get_nowait()
                except Exception:
                    pass

            payload = {"frame": processed_frame, "stats": stats, "detections": detections}
            try:
                self.processed_queue.put_nowait(payload)
            except Exception:
                pass

    def get_processed_data(self):
        if not self.is_running:
            return None

        if self.inference_thread is None:
            try:
                frame = self.raw_queue.get(timeout=0.01)
                self.last_processed_data = {
                    "frame": frame,
                    "stats": {
                        "total_bottles": 0, "proper_fill": 0, "under_fill": 0, "over_fill": 0,
                        "label_proper": 0, "label_torn": 0, "label_missing": 0, "passed": 0, "failed": 0,
                        "latency": 0.0,
                    },
                    "detections": [],
                }
                return self.last_processed_data
            except Exception:
                return self.last_processed_data

        try:
            data = self.processed_queue.get(timeout=0.01)
            self.last_processed_data = data
            return data
        except Exception:
            return self.last_processed_data

    def get_frame(self):
        return self.last_frame

    def get_fps(self):
        return round(self.fps_smoothed, 1)
