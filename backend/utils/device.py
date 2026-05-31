"""Select the best inference device for this machine (Intel Mac vs Apple Silicon)."""
import platform

import torch


def is_apple_silicon() -> bool:
    return platform.system() == "Darwin" and platform.machine() == "arm64"


def get_inference_device() -> str:
    """
    MPS is only reliable on Apple Silicon. Intel Macs report mps.is_available()
    but hybrid MPS/CPU inference is far slower than CPU-only.
    """
    if torch.cuda.is_available():
        return "cuda"
    if is_apple_silicon() and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def get_inference_imgsz(device: str) -> int:
    if device == "cuda":
        return 640
    if device == "mps":
        return 640
    return 416


def get_frame_skip_interval(device: str) -> int:
    """Run full YOLO every Nth frame; reuse boxes on others."""
    if device == "cuda":
        return 2
    if device == "mps":
        return 2
    return 2
