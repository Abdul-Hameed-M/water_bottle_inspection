import os
import cv2
import datetime

# Directory settings
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENSHOT_DIR = os.path.join(BASE_DIR, "storage", "failed_bottles")

def save_failed_screenshot(frame, bottle_id, fill_status, label_status, inspection_id="SYSTEM") -> str:
    """
    Saves a screenshot of a failed bottle scan.
    Returns the relative path to the saved image.
    """
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"fail_{inspection_id}_bottle_{bottle_id}_{fill_status}_{label_status}_{timestamp}.jpg"
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    
    # Save the frame
    cv2.imwrite(filepath, frame)
    
    # Return static path served by FastAPI static files mount
    return f"/static/storage/failed_bottles/{filename}"
