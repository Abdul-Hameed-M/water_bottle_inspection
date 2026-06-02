import os
import cv2
import time
import random
import numpy as np
import torch
import logging
from collections import defaultdict, deque
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

# =========================================================
# CLASS DEFINITIONS & COLOR PALETTE  (mirrors test.py exactly)
# =========================================================
CLASS_NAMES = [
    "bottle",
    "proper_fill",
    "under_fill",
    "over_fill",
    "label_proper",
    "label_torn",
    "label_missing",
]

# Hex colors – same as test.py
CLASS_COLORS_HEX = {
    "bottle":        "#1E90FF",   # Blue
    "proper_fill":   "#00E676",   # Green
    "under_fill":    "#FF7F50",   # Coral Orange
    "over_fill":     "#FFD700",   # Gold Yellow
    "label_proper":  "#BA55D3",   # Violet Purple
    "label_torn":    "#FF1493",   # Hot Pink
    "label_missing": "#FF0000",   # Bright Red
}

LIVE_SOURCE_TYPES = frozenset({"webcam", "ipcam", "rtsp"})
LIVE_CLASS_THRESHOLDS = {
    "bottle":        0.35,
    "proper_fill":   0.50,
    "under_fill":    0.50,
    "over_fill":     0.20,
    "label_proper":  0.50,
    "label_torn":    0.50,
    "label_missing": 0.50,
}


def _hex_to_bgr(hex_str: str):
    """Convert '#RRGGBB' → (B, G, R) tuple for OpenCV – identical to test.py."""
    hex_str = hex_str.lstrip("#")
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return (b, g, r)


# Pre-compute BGR palette once at module level (reused across all frames)
CLASS_COLORS_BGR = {cls: _hex_to_bgr(hex_c) for cls, hex_c in CLASS_COLORS_HEX.items()}


def _bbox_area(bbox):
    x1, y1, x2, y2 = bbox
    return max(0.0, x2 - x1) * max(0.0, y2 - y1)


def _bbox_intersection_area(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    return max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)


def _bbox_iou(boxA, boxB):
    """Compute the Intersection over Union (IoU) of two bounding boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    boxAArea = max(0.0, boxA[2] - boxA[0]) * max(0.0, boxA[3] - boxA[1])
    boxBArea = max(0.0, boxB[2] - boxB[0]) * max(0.0, boxB[3] - boxB[1])

    unionArea = boxAArea + boxBArea - interArea
    return interArea / unionArea if unionArea > 0.0 else 0.0


def _bbox_center(bbox):
    x1, y1, x2, y2 = bbox
    return (x1 + x2) / 2.0, (y1 + y2) / 2.0


def _center_inside(inner_bbox, outer_bbox):
    cx, cy = _bbox_center(inner_bbox)
    x1, y1, x2, y2 = outer_bbox
    return x1 <= cx <= x2 and y1 <= cy <= y2


def _clip_box_to_frame(frame_shape, x1, y1, x2, y2):
    frame_h, frame_w = frame_shape[:2]
    return (
        int(max(0, min(x1, frame_w - 1))),
        int(max(0, min(y1, frame_h - 1))),
        int(max(0, min(x2, frame_w - 1))),
        int(max(0, min(y2, frame_h - 1))),
    )


def _rects_overlap(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    return ax1 < bx2 and ax2 > bx1 and ay1 < by2 and ay2 > by1


def _place_text_label(frame_shape, x1, y1, x2, y2, label, font_scale, thickness,
                      occupied_labels):
    frame_h, frame_w = frame_shape[:2]
    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
    candidates = [
        (x1 + 4, y1 - 6),
        (x1 + 4, y1 + th + 8),
        (x1 + 4, y2 - 8),
        (x2 - tw - 4, y1 + th + 8),
        (x2 - tw - 4, y2 - 8),
    ]

    for tx, ty in candidates:
        tx = int(max(2, min(tx, frame_w - tw - 2)))
        ty = int(max(th + 2, min(ty, frame_h - 4)))
        rect = (tx - 2, ty - th - 2, tx + tw + 2, ty + 4)
        if not any(_rects_overlap(rect, existing) for existing in occupied_labels):
            occupied_labels.append(rect)
            return tx, ty

    tx = int(max(2, min(x1 + 4, frame_w - tw - 2)))
    ty = int(max(th + 2, min(y1 + th + 8 + (len(occupied_labels) % 4) * (th + 6), frame_h - 4)))
    occupied_labels.append((tx - 2, ty - th - 2, tx + tw + 2, ty + 4))
    return tx, ty


def _detection_key(det):
    x1, y1, x2, y2 = det["bbox"]
    return (det["name"], round(x1), round(y1), round(x2), round(y2))


def _append_unique_detection(target, seen, det):
    key = _detection_key(det)
    if key not in seen:
        seen.add(key)
        target.append(det)


def _draw_detection_cv2(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int,
                         cls_name: str, conf: float, color_bgr: tuple,
                         occupied_labels=None):
    """
    Draw a compact detection overlay:
      • subtle transparent fill inside the box
      • thin anti-aliased outline
      • small white label text without a colored background block
    """
    x1, y1, x2, y2 = _clip_box_to_frame(frame.shape, x1, y1, x2, y2)
    if x2 <= x1 or y2 <= y1:
        return
    if occupied_labels is None:
        occupied_labels = []

    # --- subtle transparent fill ---
    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color_bgr, -1, cv2.LINE_AA)
    cv2.addWeighted(overlay, 0.08, frame, 0.92, 0, frame)

    # --- bounding-box outline: thinner and cleaner ---
    cv2.rectangle(frame, (x1, y1), (x2, y2), color_bgr, 2, cv2.LINE_AA)

    # --- compact white class label, no colored rectangle background ---
    label = f"{cls_name} : {conf:.2f}"
    font_scale = 0.52
    text_thickness = 1
    text_x, text_y = _place_text_label(
        frame.shape, x1, y1, x2, y2, label, font_scale, text_thickness, occupied_labels
    )

    # Soft shadow keeps white text readable without a heavy label chip.
    cv2.putText(frame, label,
                (text_x + 1, text_y + 1),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), 2, cv2.LINE_AA)
    cv2.putText(frame, label,
                (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255),
                text_thickness, cv2.LINE_AA)


def _draw_bottle_status_cv2(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int,
                              status: str, occupied_labels=None):
    """
    Draw the parent bottle class box under fill/label detections.
    """
    x1, y1, x2, y2 = _clip_box_to_frame(frame.shape, x1, y1, x2, y2)
    if x2 <= x1 or y2 <= y1:
        return
    if occupied_labels is None:
        occupied_labels = []
    color_bgr = CLASS_COLORS_BGR["bottle"]

    # --- semi-transparent fill for the bottle box ---
    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color_bgr, -1, cv2.LINE_AA)
    cv2.addWeighted(overlay, 0.06, frame, 0.94, 0, frame)

    # --- cleaner outer outline ---
    cv2.rectangle(frame, (x1, y1), (x2, y2), color_bgr, 2, cv2.LINE_AA)

    label = f"bottle : {status}"
    font_scale = 0.52
    text_thickness = 1
    text_x, text_y = _place_text_label(
        frame.shape, x1, y1, x2, y2, label, font_scale, text_thickness, occupied_labels
    )
    cv2.putText(frame, label,
                (text_x + 1, text_y + 1),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), 2, cv2.LINE_AA)
    cv2.putText(frame, label,
                (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255),
                text_thickness, cv2.LINE_AA)


class YOLOInference:
    def __init__(self, model_path: str = None):

        # Class-wise confidence thresholds for best_v1.pt live inference.
        # Proper classes need stronger evidence; anomaly classes stay sensitive.
        self.class_confidence_thresholds = {
            "bottle":        0.35,
            "proper_fill":   0.50,
            "under_fill":    0.50,
            "over_fill":     0.20,
            "label_proper":  0.50,
            "label_torn":    0.50,
            "label_missing": 0.50,
        }

        # ── Model loading (single instance, reused for all sources) ──────────
        print("Loading model...")
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
                print("Model loaded successfully")
                logger.info("Custom YOLOv8 model loaded successfully.")
            else:
                logger.warning(f"Custom model not found at {model_path}. Loading fallback yolov8n.pt")
                self.model = YOLO("yolov8n.pt")
                self.is_fallback = True
                print("Model loaded successfully (fallback yolov8n.pt)")
        except Exception as e:
            logger.error(f"Error loading model: {e}. Falling back to yolov8n.pt")
            self.model = YOLO("yolov8n.pt")
            self.is_fallback = True
            print("Model loaded successfully (fallback yolov8n.pt)")

        if not self.is_fallback and hasattr(self, "model") and self.model is not None:
            ok, err = validate_model_names(dict(self.model.names))
            if ok:
                logger.info(f"best_v1.pt classes: {self.model.names}")
            else:
                logger.warning(f"Note: {err}")
                logger.info(f"Using classes from loaded weights: {self.model.names}")

        # Track last screenshot save times per bottle ID
        self.last_screenshot_saved = {}

        # Frame-skipping cache for real-time high-FPS streaming
        self.frame_counter = 0
        self.has_cached_results = False
        self.last_detected_bottles = []
        self.last_fills = []
        self.last_labels = []
        self.bottle_state_history = defaultdict(lambda: deque(maxlen=5))
        self.last_matched_parts = {}
        self.current_source_type = None
        self.tracked_bottles = []

        self.device = get_inference_device()
        self.inference_imgsz = get_inference_imgsz(self.device)
        self.frame_skip_interval = get_frame_skip_interval(self.device)
        logger.info(
            f"Inference device: {self.device} "
            f"(imgsz={self.inference_imgsz}, skip=1/{self.frame_skip_interval})"
        )

        # MPS warmup only on Apple Silicon
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

        print("Inference started")

    def reset_stream_state(self, source_type=None):
        """Clear cached detections/history when switching camera or uploaded video."""
        self.frame_counter = 0
        self.has_cached_results = False
        self.last_detected_bottles = []
        self.last_fills = []
        self.last_labels = []
        self.bottle_state_history.clear()
        self.last_matched_parts.clear()
        self.last_screenshot_saved.clear()
        self.current_source_type = source_type
        self.tracked_bottles.clear()

    # ─────────────────────────────────────────────────────────────────────────
    # Confidence threshold API
    # ─────────────────────────────────────────────────────────────────────────

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
                    raise ValueError(
                        f"Threshold must be between 0.0 and 1.0 for {class_name}, got {threshold}"
                    )
            else:
                raise ValueError(f"Unknown class: {class_name}")
        logger.info(f"Updated all confidence thresholds: {self.class_confidence_thresholds}")

    def _pick_detection_for_bottle(self, bottle, detections, kind: str):
        """Choose the best fill/label detection that geometrically belongs to a bottle."""
        bx1, by1, bx2, by2 = bottle["bbox"]
        bw = max(1.0, bx2 - bx1)
        bh = max(1.0, by2 - by1)
        bottle_area = max(1.0, _bbox_area(bottle["bbox"]))
        best = None
        best_score = -1.0

        for det in detections:
            dx1, dy1, dx2, dy2 = det["bbox"]
            dw = max(1.0, dx2 - dx1)
            dh = max(1.0, dy2 - dy1)
            det_area = max(1.0, _bbox_area(det["bbox"]))
            overlap = _bbox_intersection_area(det["bbox"], bottle["bbox"])
            inside_ratio = overlap / det_area
            bottle_ratio = det_area / bottle_area
            width_ratio = dw / bw
            height_ratio = dh / bh
            _, cy = _bbox_center(det["bbox"])
            rel_y = (cy - by1) / bh

            if inside_ratio < 0.55 and not _center_inside(det["bbox"], bottle["bbox"]):
                continue

            if kind == "fill":
                if bottle_ratio > 1.05 or height_ratio > 1.05:
                    continue
                if rel_y < 0.25 or rel_y > 1.02:
                    continue
                ideal_area = 0.55
            else:
                if bottle_ratio > 0.38 or height_ratio > 0.55:
                    continue
                if width_ratio > 0.92 and height_ratio > 0.40:
                    continue
                if rel_y < 0.18 or rel_y > 0.88:
                    continue
                ideal_area = 0.18

            area_score = max(0.0, 1.0 - abs(bottle_ratio - ideal_area) / ideal_area)
            score = (det["conf"] * 0.55) + (inside_ratio * 0.30) + (area_score * 0.15)
            if score > best_score:
                best_score = score
                best = det

        return best

    def _smooth_bottle_state(self, obj_id, fill_det, label_det, is_inference_frame):
        """Stabilize live webcam/IP-camera labels without inventing detections."""
        if is_inference_frame:
            fill_name = fill_det["name"] if fill_det else "under_fill"
            label_name = label_det["name"] if label_det else "label_missing"
            fill_conf = fill_det["conf"] if fill_det else 0.0
            label_conf = label_det["conf"] if label_det else 0.0
            self.bottle_state_history[obj_id].append({
                "fill": fill_name,
                "label": label_name,
                "fill_conf": fill_conf,
                "label_conf": label_conf,
            })
            previous_parts = self.last_matched_parts.get(obj_id, {})
            self.last_matched_parts[obj_id] = {
                "fill": fill_det or previous_parts.get("fill"),
                "label": label_det or previous_parts.get("label"),
            }

        history = self.bottle_state_history.get(obj_id)
        if not history:
            return (
                fill_det["name"] if fill_det else "under_fill",
                label_det["name"] if label_det else "label_missing",
                fill_det["conf"] if fill_det else 0.0,
                label_det["conf"] if label_det else 0.0,
                fill_det,
                label_det,
            )

        fill_scores = defaultdict(float)
        label_scores = defaultdict(float)
        for idx, item in enumerate(history):
            weight = idx + 1
            fill_scores[item["fill"]] += weight * max(0.05, item["fill_conf"])
            label_scores[item["label"]] += weight * max(0.05, item["label_conf"])

        smooth_fill = max(fill_scores, key=fill_scores.get)
        smooth_label = max(label_scores, key=label_scores.get)
        matched = self.last_matched_parts.get(obj_id, {})
        stable_fill_det = fill_det or matched.get("fill")
        stable_label_det = label_det or matched.get("label")
        fill_conf = fill_det["conf"] if fill_det else (stable_fill_det["conf"] if stable_fill_det else 0.0)
        label_conf = label_det["conf"] if label_det else (stable_label_det["conf"] if stable_label_det else 0.0)

        return smooth_fill, smooth_label, fill_conf, label_conf, stable_fill_det, stable_label_det

    # ─────────────────────────────────────────────────────────────────────────
    # Main inference method
    # ─────────────────────────────────────────────────────────────────────────

    def predict(self, frame, conf_threshold=0.25, inspection_id="SYS001", source_type=None):
        """
        Runs YOLO inference on a frame with ByteTrack, matches sub-classes (fills/labels),
        renders detections using the EXACT same OpenCV pipeline as test.py, and logs to DB.

        Returns:
            annotated_frame (numpy array): annotated BGR frame
            stats (dict): stats count dictionary
            detections_list (list): list of active detection details
        """
        start_time = time.time()

        source_type = source_type or self.current_source_type
        is_live_source = source_type in LIVE_SOURCE_TYPES

        # Keep live webcam/phone frames larger so two bottles and small labels survive.
        h, w = frame.shape[:2]
        max_frame_width = 960 if is_live_source else 640
        if w > max_frame_width:
            scale = max_frame_width / w
            new_h = int(h * scale)
            frame = cv2.resize(frame, (max_frame_width, new_h), interpolation=cv2.INTER_AREA)
            h, w = frame.shape[:2]

        # Frame-skip decision for real-time high-FPS streaming
        self.frame_counter += 1
        is_inference_frame = (
            (self.frame_counter % self.frame_skip_interval == 1)
            or (not self.has_cached_results)
        )

        if is_inference_frame:
            device = self.device
            yolo_imgsz = 640 if is_live_source else self.inference_imgsz
            model_conf = min(conf_threshold, 0.15) if is_live_source else conf_threshold

            # ── Run YOLO model. Live sources use predict() to avoid tracker drops. ──
            results = None
            try:
                with torch.no_grad():
                    if is_live_source:
                        results = self.model.predict(
                            frame,
                            device=device,
                            conf=model_conf,
                            verbose=False,
                            imgsz=yolo_imgsz,
                            half=(device in ("mps", "cuda")),
                        )
                    else:
                        results = self.model.track(
                            frame,
                            persist=True,
                            tracker="bytetrack.yaml",
                            device=device,
                            conf=model_conf,
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
                        conf=model_conf,
                        verbose=False,
                        imgsz=640 if is_live_source else 416,
                        half=False,
                    )

            # ── Parse detections with class-wise confidence filtering ──────────
            raw_detections = []
            
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for idx, box in enumerate(boxes):
                    cls_id   = int(box.cls[0].item())
                    conf     = float(box.conf[0].item())
                    xyxy     = box.xyxy[0].cpu().numpy().tolist()
                    track_id = int(box.id[0].item()) if (box.id is not None) else None
                    cls_name = class_name_from_id(cls_id, dict(self.model.names))

                    # Giant false positive filtering (except we will bypass it if we have sub-class support)
                    box_w = xyxy[2] - xyxy[0]
                    box_h = xyxy[3] - xyxy[1]
                    is_giant_false_positive = False
                    if cls_name == "bottle":
                        is_giant_false_positive = box_w > 0.96 * w and box_h > 0.96 * h
                    elif cls_name in LABEL_CLASSES:
                        is_giant_false_positive = box_w > 0.90 * w or box_h > 0.70 * h
                    elif cls_name in FILL_CLASSES:
                        is_giant_false_positive = box_w > 0.96 * w or box_h > 0.98 * h
                    
                    raw_detections.append({
                        "bbox": xyxy,
                        "conf": conf,
                        "class": cls_id,
                        "track_id": track_id,
                        "name": cls_name,
                        "is_giant_fp": is_giant_false_positive
                    })

            # Separate into raw groups with low conf floor (0.10) to prevent early suppression
            raw_bottles = [d for d in raw_detections if d["name"] == "bottle" and d["conf"] >= 0.10]
            raw_fills = [d for d in raw_detections if d["name"] in FILL_CLASSES and d["conf"] >= 0.10]
            raw_labels = [d for d in raw_detections if d["name"] in LABEL_CLASSES and d["conf"] >= 0.10]

            # 1. Clean up stale tracked bottles from history
            self.tracked_bottles = [tb for tb in self.tracked_bottles if self.frame_counter - tb["last_seen_frame"] <= 5]

            # 2. Match raw bottles with tracked bottles using IOU
            for rb in raw_bottles:
                rb["tracked_state"] = None
                best_tb = None
                best_iou = -1.0
                for tb in self.tracked_bottles:
                    iou = _bbox_iou(rb["bbox"], tb["bbox"])
                    if iou > 0.40 and iou > best_iou:
                        best_iou = iou
                        best_tb = tb
                
                if best_tb is not None:
                    # Update tracked bottle
                    best_tb["bbox"] = rb["bbox"]
                    best_tb["conf"] = rb["conf"]
                    best_tb["frames_seen"] += 1
                    best_tb["last_seen_frame"] = self.frame_counter
                    if rb["track_id"] is not None:
                        best_tb["track_id"] = rb["track_id"]
                    rb["tracked_state"] = best_tb
                else:
                    # Create new tracked bottle
                    new_tb = {
                        "bbox": rb["bbox"],
                        "conf": rb["conf"],
                        "track_id": rb["track_id"],
                        "frames_seen": 1,
                        "last_seen_frame": self.frame_counter,
                        "confirmed": False
                    }
                    self.tracked_bottles.append(new_tb)
                    rb["tracked_state"] = new_tb

            # 3. Determine accepted fills and labels based on class-specific thresholds
            accepted_fills = []
            accepted_labels = []

            threshold_map = LIVE_CLASS_THRESHOLDS if is_live_source else self.class_confidence_thresholds

            for rf in raw_fills:
                # Special live optimization for over_fill: allow low-confidence over_fill (down to 0.20)
                # if it overlaps with any raw/tracked bottle
                cls_threshold = threshold_map.get(rf["name"], conf_threshold)
                is_accepted = False
                if rf["conf"] >= cls_threshold:
                    is_accepted = True
                elif is_live_source and rf["name"] == "over_fill" and rf["conf"] >= 0.20:
                    if any((_bbox_intersection_area(rf["bbox"], rb["bbox"]) / _bbox_area(rf["bbox"]) > 0.50) for rb in raw_bottles):
                        is_accepted = True
                
                if is_accepted:
                    accepted_fills.append(rf)

            for rl in raw_labels:
                cls_threshold = threshold_map.get(rl["name"], conf_threshold)
                if rl["conf"] >= cls_threshold:
                    # Enforce bottle-centric validation (Issue #1): reject label if it doesn't overlap a bottle
                    has_overlap = False
                    # Check overlap with raw bottles in current frame
                    for rb in raw_bottles:
                        overlap_ratio = _bbox_intersection_area(rl["bbox"], rb["bbox"]) / _bbox_area(rl["bbox"])
                        if overlap_ratio > 0.40 or _center_inside(rl["bbox"], rb["bbox"]):
                            has_overlap = True
                            break
                    # Check overlap with tracked bottles in our history
                    if not has_overlap:
                        for tb in self.tracked_bottles:
                            overlap_ratio = _bbox_intersection_area(rl["bbox"], tb["bbox"]) / _bbox_area(rl["bbox"])
                            if overlap_ratio > 0.40 or _center_inside(rl["bbox"], tb["bbox"]):
                                has_overlap = True
                                break
                    
                    if has_overlap:
                        accepted_labels.append(rl)

            # 4. Determine accepted bottles based on thresholds and stability (Fix #3)
            accepted_bottles = []
            for rb in raw_bottles:
                if rb["is_giant_fp"]:
                    continue  # giant false positive unless promoted
                tb = rb["tracked_state"]
                is_accepted = False
                
                # Normal threshold
                if rb["conf"] >= threshold_map.get("bottle", conf_threshold):
                    is_accepted = True
                # Live stable / overlap override
                elif is_live_source and rb["conf"] >= 0.20:
                    if tb.get("confirmed", False) or tb["frames_seen"] >= 2:
                        is_accepted = True
                
                if is_accepted:
                    tb["confirmed"] = True
                    accepted_bottles.append(rb)

            # 5. Bottle Detection Priority (Fix #2): promote or reconstruct bottles for orphan fills/labels
            for sub in accepted_fills + accepted_labels:
                covered = False
                for b in accepted_bottles:
                    if _bbox_intersection_area(sub["bbox"], b["bbox"]) / _bbox_area(sub["bbox"]) > 0.50 or _center_inside(sub["bbox"], b["bbox"]):
                        covered = True
                        break
                if covered:
                    continue

                # Search through all raw bottles (even low confidence and giant false positives)
                best_rb = None
                best_overlap = -1.0
                for rb in raw_bottles:
                    if rb in accepted_bottles:
                        continue
                    overlap = _bbox_intersection_area(sub["bbox"], rb["bbox"]) / _bbox_area(sub["bbox"])
                    if overlap > 0.50 or _center_inside(sub["bbox"], rb["bbox"]):
                        if overlap > best_overlap:
                            best_overlap = overlap
                            best_rb = rb

                if best_rb is not None:
                    best_rb["tracked_state"]["confirmed"] = True
                    # If it was filtered as a giant false positive, un-filter it!
                    if best_rb["is_giant_fp"]:
                        best_rb["is_giant_fp"] = False
                    accepted_bottles.append(best_rb)
                    logger.info(f"Promoted bottle detection (conf={best_rb['conf']:.2f}) due to sub-class {sub['name']} detection priority.")
                    continue

                # Search recently seen history for a matching bottle
                best_tb = None
                best_tb_overlap = -1.0
                for tb in self.tracked_bottles:
                    if self.frame_counter - tb["last_seen_frame"] <= 3:
                        overlap = _bbox_intersection_area(sub["bbox"], tb["bbox"]) / _bbox_area(sub["bbox"])
                        if overlap > 0.50 or _center_inside(sub["bbox"], tb["bbox"]):
                            if overlap > best_tb_overlap:
                                best_tb_overlap = overlap
                                best_tb = tb

                if best_tb is not None:
                    reconstructed_bottle = {
                        "bbox": best_tb["bbox"],
                        "conf": best_tb["conf"],
                        "class": 0,
                        "track_id": best_tb["track_id"],
                        "name": "bottle",
                        "is_giant_fp": False
                    }
                    best_tb["confirmed"] = True
                    accepted_bottles.append(reconstructed_bottle)
                    logger.info(f"Reconstructed bottle detection from history (id={best_tb['track_id']}) due to sub-class {sub['name']} detection priority.")

            detected_bottles = accepted_bottles
            fills = accepted_fills
            labels = accepted_labels

            # Fallback demo simulation when using yolov8n.pt (keeps original demo logic working)
            if self.is_fallback and len(detected_bottles) > 0:
                random.seed(42)
                for b in detected_bottles:
                    x1, y1, x2, y2 = b["bbox"]
                    coord_sum = int(x1 + y1)

                    fill_val = coord_sum % 100
                    if fill_val < 90:
                        fill_cls_name = "proper_fill"
                    elif fill_val < 97:
                        fill_cls_name = "under_fill"
                    else:
                        fill_cls_name = "over_fill"

                    label_val = (coord_sum // 10) % 100
                    if label_val < 88:
                        label_cls_name = "label_proper"
                    elif label_val < 96:
                        label_cls_name = "label_torn"
                    else:
                        label_cls_name = "label_missing"

                    fills.append({
                        "bbox": [x1, y1 + (y2 - y1) * 0.4, x2, y2],
                        "conf": 0.85 + 0.1 * random.random(),
                        "name": fill_cls_name,
                    })
                    labels.append({
                        "bbox": [x1, y1 + (y2 - y1) * 0.3, x2, y2 - (y2 - y1) * 0.2],
                        "conf": 0.80 + 0.18 * random.random(),
                        "name": label_cls_name,
                    })

            # Cache for skipped frames
            self.last_detected_bottles = detected_bottles
            self.last_fills = fills
            self.last_labels = labels
            self.has_cached_results = True
        else:
            detected_bottles = self.last_detected_bottles
            fills             = self.last_fills
            labels            = self.last_labels

        # Ensure fallback track IDs when model.track didn't assign them
        next_fallback_id = 1
        existing_ids = {b["track_id"] for b in detected_bottles if b["track_id"] is not None}
        for b in detected_bottles:
            if b["track_id"] is None:
                while next_fallback_id in existing_ids:
                    next_fallback_id += 1
                b["track_id"] = next_fallback_id
                existing_ids.add(next_fallback_id)

        # ── Post-processed statistics ─────────────────────────────────────────
        stats = {
            "total_bottles": len(detected_bottles),
            "proper_fill":   0,
            "under_fill":    0,
            "over_fill":     0,
            "label_proper":  0,
            "label_torn":    0,
            "label_missing": 0,
            "passed":        0,
            "failed":        0,
        }

        detections_list  = []
        db_logs_to_insert = []

        # Work on a copy so original frame is untouched
        annotated_frame = frame.copy()

        # =========================================================
        # STEP 1 – Determine PASS/FAIL for every bottle with spatial matching
        # =========================================================
        bottle_results = []
        draw_fills = []
        draw_labels = []
        seen_fill_boxes = set()
        seen_label_boxes = set()

        for bottle in detected_bottles:
            obj_id  = bottle["track_id"]
            bx1, by1, bx2, by2 = bottle["bbox"]

            fill_det = self._pick_detection_for_bottle(bottle, fills, "fill")
            label_det = self._pick_detection_for_bottle(bottle, labels, "label")
            matched_fill_name, matched_label_name, fill_conf, label_conf, fill_det, label_det = (
                self._smooth_bottle_state(obj_id, fill_det, label_det, is_inference_frame)
            )

            # PASS only if BOTH proper_fill AND label_proper are detected
            if matched_fill_name == "proper_fill" and matched_label_name == "label_proper":
                status = "PASS"
                stats["passed"] += 1
            else:
                status = "FAIL"
                stats["failed"] += 1

            stats[matched_fill_name]  += 1
            stats[matched_label_name] += 1
            avg_conf = (fill_conf + label_conf) / 2

            if fill_det is not None:
                _append_unique_detection(draw_fills, seen_fill_boxes, fill_det)
            if label_det is not None:
                _append_unique_detection(draw_labels, seen_label_boxes, label_det)

            bottle_results.append((
                bottle, status, matched_fill_name, matched_label_name, avg_conf
            ))

        # In live webcam/phone mode, also draw valid raw sub-detections so
        # bottle + fill + label appear together instead of one at a time.
        if is_live_source:
            for f in fills:
                _append_unique_detection(draw_fills, seen_fill_boxes, f)
            for l in labels:
                _append_unique_detection(draw_labels, seen_label_boxes, l)

        # =========================================================
        # STEP 2 – Draw bottle boxes first so fill/label boxes stay visible
        # =========================================================
        occupied_labels = []
        for (bottle, status, matched_fill_name, matched_label_name, avg_conf) in bottle_results:
            bx1, by1, bx2, by2 = bottle["bbox"]
            _draw_bottle_status_cv2(annotated_frame, bx1, by1, bx2, by2, status, occupied_labels)

        # =========================================================
        # STEP 3 – Draw fills above bottle boxes
        # =========================================================
        for f in draw_fills:
            fx1, fy1, fx2, fy2 = f["bbox"]
            color_bgr = CLASS_COLORS_BGR.get(f["name"], (255, 255, 255))
            _draw_detection_cv2(annotated_frame,
                                fx1, fy1, fx2, fy2,
                                f["name"], f["conf"], color_bgr, occupied_labels)

        # =========================================================
        # STEP 4 – Draw labels above bottle boxes
        # =========================================================
        for l in draw_labels:
            lx1, ly1, lx2, ly2 = l["bbox"]
            color_bgr = CLASS_COLORS_BGR.get(l["name"], (255, 255, 255))
            _draw_detection_cv2(annotated_frame,
                                lx1, ly1, lx2, ly2,
                                l["name"], l["conf"], color_bgr, occupied_labels)

        # =========================================================
        # STEP 5 – Build response/log rows after all overlays are rendered
        # =========================================================
        for (bottle, status, matched_fill_name, matched_label_name, avg_conf) in bottle_results:
            obj_id = bottle["track_id"]
            bx1, by1, bx2, by2 = bottle["bbox"]

            detection_info = {
                "bottle_id":    obj_id,
                "bbox":         [bx1, by1, bx2, by2],
                "fill_status":  matched_fill_name,
                "label_status": matched_label_name,
                "confidence":   avg_conf,
                "pass_fail":    status,
                "screenshot_path": None,
            }

            # Save snapshot on FAIL (throttled to once per 10 s per bottle)
            if status == "FAIL":
                now = time.time()
                if obj_id not in self.last_screenshot_saved or \
                   (now - self.last_screenshot_saved[obj_id]) > 10.0:
                    screenshot_path = save_failed_screenshot(
                        annotated_frame.copy(),
                        obj_id, matched_fill_name, matched_label_name, inspection_id
                    )
                    detection_info["screenshot_path"] = screenshot_path
                    self.last_screenshot_saved[obj_id] = now

                    if is_inference_frame:
                        db_logs_to_insert.append(DetectionLog(
                            inspection_id   = inspection_id,
                            bottle_id       = obj_id,
                            fill_status     = matched_fill_name,
                            label_status    = matched_label_name,
                            confidence      = avg_conf,
                            pass_fail       = status,
                            screenshot_path = screenshot_path,
                        ))
            else:
                if obj_id not in self.last_screenshot_saved:
                    self.last_screenshot_saved[obj_id] = time.time()
                    if is_inference_frame:
                        db_logs_to_insert.append(DetectionLog(
                            inspection_id   = inspection_id,
                            bottle_id       = obj_id,
                            fill_status     = matched_fill_name,
                            label_status    = matched_label_name,
                            confidence      = avg_conf,
                            pass_fail       = status,
                            screenshot_path = None,
                        ))

            detections_list.append(detection_info)

        # ── Async DB write ────────────────────────────────────────────────────
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

        # ── Latency ──────────────────────────────────────────────────────────
        latency = (time.time() - start_time) * 1000.0   # ms
        stats["latency"] = latency

        return annotated_frame, stats, detections_list
