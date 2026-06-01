import os
import cv2
import time
import random
import numpy as np
import torch
import logging
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO
from backend.utils.device import (
    get_frame_skip_interval,
    get_inference_device,
    get_inference_imgsz,
    is_apple_silicon,
)
from backend.utils.model_classes import (
    FILL_CLASSES,
    LABEL_CLASSES,
    validate_model_names,
    class_name_from_id,
)
from backend.utils.screenshot import save_failed_screenshot
from backend.database.db import SessionLocal
from backend.database.models import DetectionLog

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class YOLOInference:
    def __init__(self, model_path: str = None):
        self.class_descriptive_names = {
            "bottle": "bottle",
            "proper_fill": "proper_fill",
            "under_fill": "under_fill",
            "over_fill": "over_fill",
            "label_proper": "label_proper",
            "label_torn": "label_torn",
            "label_missing": "label_missing"
        }
        
        self.class_colors = {
            "bottle": (30, 144, 255, 255),       # Blue (#1E90FF)
            "proper_fill": (0, 230, 118, 255),    # Green (#00E676)
            "under_fill": (255, 59, 48, 255),     # Red (#FF3B30)
            "over_fill": (255, 214, 10, 255),     # Yellow (#FFD60A)
            "label_proper": (138, 43, 226, 255),  # Purple (#8A2BE2)
            "label_torn": (255, 0, 255, 255),     # Magenta (#FF00FF)
            "label_missing": (255, 255, 255, 255) # White (#FFFFFF)
        }
        
        # Class-wise confidence thresholds (default values)
        self.class_confidence_thresholds = {
            "bottle": 0.40,
            "proper_fill": 0.55,
            "under_fill": 0.35,
            "over_fill": 0.30,
            "label_proper": 0.50,
            "label_torn": 0.35,
            "label_missing": 0.30
        }
        
        # Load custom model or fallback
        if not model_path:
            model_path = os.getenv("MODEL_PATH", "../models/best_v1.pt")
        
        # Make model path absolute dynamically
        if not os.path.isabs(model_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.abspath(os.path.join(base_dir, model_path))

        logger.info(f"Attempting to load model from: {model_path}")
        self.is_fallback = False

        try:
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                logger.info("Custom YOLOv8 model loaded successfully.")
            else:
                logger.warning(f"Custom model not found at {model_path}. Loading fallback yolov8n.pt")
                self.model = YOLO("yolov8n.pt")
                self.is_fallback = True
        except Exception as e:
            logger.error(f"Error loading model: {e}. Falling back to yolov8n.pt")
            self.model = YOLO("yolov8n.pt")
            self.is_fallback = True

        if not self.is_fallback and hasattr(self, "model") and self.model is not None:
            ok, err = validate_model_names(dict(self.model.names))
            if ok:
                logger.info(f"best_v1.pt classes: {self.model.names}")
            else:
                logger.warning(f"Note: {err}")
                logger.info(f"Using classes from loaded weights: {self.model.names}")

        # Track last screenshot save times per bottle ID to avoid spamming the disk
        self.last_screenshot_saved = {}

        # Frame-skipping cache for real-time high-FPS streaming
        self.frame_counter = 0
        self.has_cached_results = False
        self.last_detected_bottles = []
        self.last_fills = []
        self.last_labels = []

        self.device = get_inference_device()
        self.inference_imgsz = get_inference_imgsz(self.device)
        self.frame_skip_interval = get_frame_skip_interval(self.device)
        logger.info(
            f"Inference device: {self.device} "
            f"(imgsz={self.inference_imgsz}, skip=1/{self.frame_skip_interval})"
        )

        # MPS warmup only on Apple Silicon (Intel Mac MPS is slower than CPU)
        if self.device == "mps":
            try:
                dummy = np.zeros((480, 640, 3), dtype=np.uint8)
                self.model(dummy, verbose=False, device="mps", imgsz=self.inference_imgsz)
                logger.info("MPS GPU warmup completed successfully.")
            except Exception as e:
                logger.warning(f"MPS warmup skipped: {e}")
        elif self.device == "cpu" and not is_apple_silicon():
            try:
                torch.set_num_threads(min(8, os.cpu_count() or 4))
            except Exception:
                pass
        
        # Load high-visibility bold font for industrial overlays (larger for better readability)
        self.font = None
        font_paths = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNS.ttf",
            "/System/Library/Fonts/SFProDisplay-Bold.otf",
            "/Windows/Fonts/arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        ]
        for path in font_paths:
            try:
                if os.path.exists(path):
                    self.font = ImageFont.truetype(path, 20)  # Increased from 16 to 20
                    break
            except Exception:
                continue
        if self.font is None:
            self.font = ImageFont.load_default()

    def get_confidence_thresholds(self):
        """Get current class-wise confidence thresholds"""
        return self.class_confidence_thresholds.copy()

    def set_confidence_threshold(self, class_name: str, threshold: float):
        """Set confidence threshold for a specific class"""
        if class_name in self.class_confidence_thresholds:
            if 0.0 <= threshold <= 1.0:
                self.class_confidence_thresholds[class_name] = threshold
                logger.info(f"Updated {class_name} confidence threshold to {threshold}")
            else:
                raise ValueError(f"Threshold must be between 0.0 and 1.0, got {threshold}")
        else:
            raise ValueError(f"Unknown class: {class_name}")

    def set_all_confidence_thresholds(self, thresholds: dict):
        """Set confidence thresholds for all classes"""
        for class_name, threshold in thresholds.items():
            if class_name in self.class_confidence_thresholds:
                if 0.0 <= threshold <= 1.0:
                    self.class_confidence_thresholds[class_name] = threshold
                else:
                    raise ValueError(f"Threshold must be between 0.0 and 1.0 for {class_name}, got {threshold}")
            else:
                raise ValueError(f"Unknown class: {class_name}")
        logger.info(f"Updated all confidence thresholds: {self.class_confidence_thresholds}")

    def predict(self, frame, conf_threshold=0.25, inspection_id="SYS001"):
        """
        Runs YOLO inference on a frame with ByteTrack, matches sub-classes (fills/labels),
        creates a clean visualization overlay using PIL, and logs metrics to database.
        Returns:
            processed_frame (numpy array): annotated frame
            stats (dict): stats count dictionary
            detections_list (list): list of active detections detail
        """
        start_time = time.time()
        
        # Optimize frame resolution: downscale high-res RTSP / phone feeds to standard 640 width
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640.0 / w
            new_h = int(h * scale)
            frame = cv2.resize(frame, (640, new_h), interpolation=cv2.INTER_AREA)
            h, w = frame.shape[:2]
            
        # Frame counter & skip decision logic for real-time high-FPS
        self.frame_counter += 1
        is_inference_frame = (
            (self.frame_counter % self.frame_skip_interval == 1)
            or (not self.has_cached_results)
        )
        
        if is_inference_frame:
            device = self.device
            yolo_imgsz = self.inference_imgsz
            
            # Run model inference with tracking (ByteTrack)
            results = None
            try:
                with torch.no_grad():
                    results = self.model.track(
                        frame,
                        persist=True,
                        tracker="bytetrack.yaml",
                        device=device,
                        conf=conf_threshold,
                        verbose=False,
                        imgsz=yolo_imgsz,
                        half=(device in ("mps", "cuda")),
                    )
            except Exception as e:
                print(f"[SeeWise AI] track on {device} failed ({e}); using CPU predict.")
                with torch.no_grad():
                    results = self.model.predict(
                        frame,
                        device="cpu",
                        conf=conf_threshold,
                        verbose=False,
                        imgsz=416,
                        half=False,
                    )
            
            # Parse detections with class-wise confidence filtering
            detected_bottles = []
            fills = []
            labels = []

            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for idx, box in enumerate(boxes):
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].cpu().numpy().tolist() # [x1, y1, x2, y2]
                    track_id = int(box.id[0].item()) if (box.id is not None) else None

                    cls_name = class_name_from_id(cls_id, dict(self.model.names))

                    # Apply class-wise confidence filtering
                    class_threshold = self.class_confidence_thresholds.get(cls_name, conf_threshold)
                    if conf < class_threshold:
                        continue

                    # Filter out giant false-positive boxes that cover almost the entire frame width or height.
                    # This prevents false detections from drawing red/pink outer flickering borders along the frame edges.
                    box_w = xyxy[2] - xyxy[0]
                    box_h = xyxy[3] - xyxy[1]
                    if box_w > 0.8 * w or box_h > 0.9 * h:
                        logger.info(f"Filtering out giant false-positive box for {cls_name}: {xyxy} (frame w={w}, h={h})")
                        continue

                    det = {"bbox": xyxy, "conf": conf, "class": cls_id, "track_id": track_id, "name": cls_name}

                    if cls_name == "bottle":
                        detected_bottles.append(det)
                    elif cls_name in FILL_CLASSES:
                        fills.append(det)
                    elif cls_name in LABEL_CLASSES:
                        labels.append(det)
            
            # If we are in fallback/demo mode, simulate sub-class detections
            if self.is_fallback and len(detected_bottles) > 0:
                random.seed(42)
                for idx, b in enumerate(detected_bottles):
                    x1, y1, x2, y2 = b["bbox"]
                    coord_sum = int(x1 + y1)
                    
                    # Simulate fills (90% proper, 7% under, 3% over)
                    fill_val = coord_sum % 100
                    if fill_val < 90:
                        fill_cls_name = "proper_fill"
                    elif fill_val < 97:
                        fill_cls_name = "under_fill"
                    else:
                        fill_cls_name = "over_fill"
                        
                    # Simulate labels (88% proper, 8% torn, 4% missing)
                    label_val = (coord_sum // 10) % 100
                    if label_val < 88:
                        label_cls_name = "label_proper"
                    elif label_val < 96:
                        label_cls_name = "label_torn"
                    else:
                        label_cls_name = "label_missing"
                    
                    fills.append({"bbox": [x1, y1 + (y2-y1)*0.4, x2, y2], "conf": 0.85 + 0.1 * random.random(), "name": fill_cls_name})
                    labels.append({"bbox": [x1, y1 + (y2-y1)*0.3, x2, y2 - (y2-y1)*0.2], "conf": 0.80 + 0.18 * random.random(), "name": label_cls_name})
            
            # Save to frame cache for skipping
            self.last_detected_bottles = detected_bottles
            self.last_fills = fills
            self.last_labels = labels
            self.has_cached_results = True
        else:
            # Use cached detections
            detected_bottles = self.last_detected_bottles
            fills = self.last_fills
            labels = self.last_labels
            
        # Ensure fallback track IDs if model.track didn't assign them
        next_fallback_id = 1
        for b in detected_bottles:
            if b["track_id"] is None:
                b["track_id"] = next_fallback_id
                next_fallback_id += 1
                
        # Post-processed statistics
        stats = {
            "total_bottles": len(detected_bottles),
            "proper_fill": 0,
            "under_fill": 0,
            "over_fill": 0,
            "label_proper": 0,
            "label_torn": 0,
            "label_missing": 0,
            "passed": 0,
            "failed": 0
        }
        
        detections_list = []
        db_logs_to_insert = []
        
        # Render using PIL for high contrast, clean shapes, and rounded cards
        img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)).convert("RGBA")
        draw = ImageDraw.Draw(img_pil, "RGBA")
        
        # 1. Draw sub-detection bounding boxes first (fills)
        for f in fills:
            fx1, fy1, fx2, fy2 = f["bbox"]
            f_name = f["name"]
            f_conf = f["conf"]
            f_color = self.class_colors.get(f_name, (255, 255, 255, 255))
            f_desc = self.class_descriptive_names.get(f_name, f_name)
            
            # Draw semi-transparent background overlay inside bounding box (alpha 0.15 -> 38 out of 255)
            draw.rectangle([fx1, fy1, fx2, fy2], fill=(f_color[0], f_color[1], f_color[2], 38))
            
            # Draw 2px rectangle outline
            draw.rectangle([fx1, fy1, fx2, fy2], outline=f_color, width=2)
            
            # Draw text label above the rectangle (larger and more readable)
            f_label = f"{f_desc} ({f_conf * 100:.1f}%)"
            try:
                tw = draw.textlength(f_label, font=self.font)
            except Exception:
                tw = len(f_label) * 11.5  # Adjusted for larger font

            tx1 = fx1
            ty1 = max(0, fy1 - 24)  # Increased from 18 to 24
            tx2 = tx1 + tw + 8
            ty2 = ty1 + 24  # Increased from 18 to 24

            # Solid label background for high contrast
            draw.rectangle([tx1, ty1, tx2, ty2], fill=f_color)

            # Larger label text color dynamically selected based on color brightness
            f_text_color = (0, 0, 0, 255) if sum(f_color[:3]) > 380 else (255, 255, 255, 255)
            draw.text((tx1 + 4, ty1 + 2), f_label, fill=f_text_color, font=self.font)
            
        # 2. Draw sub-detection bounding boxes (labels)
        for l in labels:
            lx1, ly1, lx2, ly2 = l["bbox"]
            l_name = l["name"]
            l_conf = l["conf"]
            l_color = self.class_colors.get(l_name, (255, 255, 255, 255))
            l_desc = self.class_descriptive_names.get(l_name, l_name)
            
            # Draw semi-transparent background overlay inside bounding box (alpha 0.15 -> 38 out of 255)
            draw.rectangle([lx1, ly1, lx2, ly2], fill=(l_color[0], l_color[1], l_color[2], 38))
            
            # Draw 2px rectangle outline
            draw.rectangle([lx1, ly1, lx2, ly2], outline=l_color, width=2)
            
            # Draw text label above the rectangle (larger and more readable)
            l_label = f"{l_desc} ({l_conf * 100:.1f}%)"
            try:
                tw = draw.textlength(l_label, font=self.font)
            except Exception:
                tw = len(l_label) * 11.5  # Adjusted for larger font

            tx1 = lx1
            ty1 = max(0, ly1 - 24)  # Increased from 18 to 24
            tx2 = tx1 + tw + 8
            ty2 = ty1 + 24  # Increased from 18 to 24

            # Solid label background for high contrast
            draw.rectangle([tx1, ty1, tx2, ty2], fill=l_color)

            # Larger label text color dynamically selected based on color brightness
            l_text_color = (0, 0, 0, 255) if sum(l_color[:3]) > 380 else (255, 255, 255, 255)
            draw.text((tx1 + 4, ty1 + 2), l_label, fill=l_text_color, font=self.font)
            
        # 3. Draw parent bottles and details cards
        for idx, bottle in enumerate(detected_bottles):
            obj_id = bottle["track_id"]
            bx1, by1, bx2, by2 = bottle["bbox"]
            centroid = [(bx1 + bx2) / 2.0, (by1 + by2) / 2.0]
            
            # Find sub-detections inside or closest to this bottle
            matched_fill_name = "under_fill"  # Default to fail state if not detected
            fill_conf = 0.0
            min_dist_fill = float("inf")
            for f in fills:
                fx1, fy1, fx2, fy2 = f["bbox"]
                fcX, fcY = (fx1 + fx2) / 2, (fy1 + fy2) / 2
                dist = np.linalg.norm(np.array([fcX, fcY]) - np.array(centroid))
                if dist < min_dist_fill and dist < 180:
                    min_dist_fill = dist
                    matched_fill_name = f["name"]
                    fill_conf = f["conf"]
                    
            matched_label_name = "label_missing"  # Default to fail state if not detected
            label_conf = 0.0
            min_dist_label = float("inf")
            for l in labels:
                lx1, ly1, lx2, l_y2 = l["bbox"]
                lcX, lcY = (lx1 + lx2) / 2, (ly1 + l_y2) / 2
                dist = np.linalg.norm(np.array([lcX, lcY]) - np.array(centroid))
                if dist < min_dist_label and dist < 180:
                    min_dist_label = dist
                    matched_label_name = l["name"]
                    label_conf = l["conf"]
            
            # Determine PASS/FAIL logic: only proper_fill AND label_proper = PASS, all others = FAIL
            if matched_fill_name == "proper_fill" and matched_label_name == "label_proper":
                status = "PASS"
                stats["passed"] += 1
                color = (0, 230, 118, 255) # Green (#00E676)
            else:
                status = "FAIL"
                stats["failed"] += 1
                color = (255, 59, 48, 255) # Red (#FF3B30)
                
            stats[matched_fill_name] += 1
            stats[matched_label_name] += 1
            avg_conf = (fill_conf + label_conf) / 2
            
            # Draw semi-transparent background overlay inside parent bottle box
            draw.rectangle([bx1, by1, bx2, by2], fill=(color[0], color[1], color[2], 38))
            
            # Draw Thick Bounding Box around the bottle
            draw.rectangle([bx1, by1, bx2, by2], outline=color, width=4)

            # Draw bottle ID label on the bounding box (Omitted as requested to remove Bottle ID from display)
            # cls_name = bottle.get('name', 'bottle')
            # desc_name = self.class_descriptive_names.get(cls_name, cls_name)
            # clean_class_name = desc_name.replace('_', ' ').title()
            # bottle_label = f"{clean_class_name} | ID {obj_id}"
            # try:
            #     bw = draw.textlength(bottle_label, font=self.font)
            # except Exception:
            #     bw = len(bottle_label) * 11.5
            # 
            # bx_label_x1 = bx1
            # bx_label_y1 = by1 - 24
            # bx_label_x2 = bx1 + bw + 8
            # bx_label_y2 = by1
            # 
            # # Draw bottle ID label background
            # draw.rectangle([bx_label_x1, bx_label_y1, bx_label_x2, bx_label_y2], fill=color)
            # 
            # # Draw bottle ID text
            # bottle_text_color = (0, 0, 0, 255) if sum(color[:3]) > 380 else (255, 255, 255, 255)
            # draw.text((bx_label_x1 + 4, bx_label_y1 + 2), bottle_label, fill=bottle_text_color, font=self.font)
            
            # Append detection details
            detection_info = {
                "bottle_id": obj_id,
                "bbox": [bx1, by1, bx2, by2],
                "fill_status": matched_fill_name,
                "label_status": matched_label_name,
                "confidence": avg_conf,
                "pass_fail": status,
                "screenshot_path": None
            }
            
            # Save snapshots of failed bottles to storage with fully annotated overlays
            if status == "FAIL":
                now = time.time()
                if obj_id not in self.last_screenshot_saved or (now - self.last_screenshot_saved[obj_id]) > 10.0:
                    annotated_shot = cv2.cvtColor(np.array(img_pil.convert("RGB")), cv2.COLOR_RGB2BGR)
                    screenshot_path = save_failed_screenshot(annotated_shot, obj_id, matched_fill_name, matched_label_name, inspection_id)
                    detection_info["screenshot_path"] = screenshot_path
                    self.last_screenshot_saved[obj_id] = now
                    
                    if is_inference_frame:
                        db_logs_to_insert.append(
                            DetectionLog(
                                inspection_id=inspection_id,
                                bottle_id=obj_id,
                                fill_status=matched_fill_name,
                                label_status=matched_label_name,
                                confidence=avg_conf,
                                pass_fail=status,
                                screenshot_path=screenshot_path
                            )
                        )
            else:
                if obj_id not in self.last_screenshot_saved:
                    self.last_screenshot_saved[obj_id] = time.time()
                    if is_inference_frame:
                        db_logs_to_insert.append(
                            DetectionLog(
                                inspection_id=inspection_id,
                                bottle_id=obj_id,
                                fill_status=matched_fill_name,
                                label_status=matched_label_name,
                                confidence=avg_conf,
                                pass_fail=status,
                                screenshot_path=None
                            )
                        )
            
            detections_list.append(detection_info)

        # Save logs to database asynchronously
        if db_logs_to_insert and is_inference_frame:
            db = SessionLocal()
            try:
                db.add_all(db_logs_to_insert)
                db.commit()
            except Exception as e:
                print(f"[SeeWise DB] Error logging detections: {e}")
                db.rollback()
            finally:
                db.close()
                
        # Convert PIL image back to CV2 format (BGR)
        annotated_frame = cv2.cvtColor(np.array(img_pil.convert("RGB")), cv2.COLOR_RGB2BGR)
        
        # Calculate latency
        latency = (time.time() - start_time) * 1000.0 # ms
        stats["latency"] = latency
        
        return annotated_frame, stats, detections_list
