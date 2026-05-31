"""Class names for best_v1.pt — loaded from the model at runtime."""
from typing import Optional, Tuple

# Matches models/best_v1.pt (production)
BEST_V1_CLASS_NAMES = {
    0: "bottle",
    1: "proper_fill",
    2: "under_fill",
    3: "over_fill",
    4: "label_proper",
    5: "label_torn",
    6: "label_missing",
}

FILL_CLASSES = frozenset({"proper_fill", "under_fill", "over_fill"})
LABEL_CLASSES = frozenset({"label_proper", "label_torn", "label_missing"})


def validate_model_names(model_names: dict) -> Tuple[bool, Optional[str]]:
    """Confirm loaded weights match best_v1 class order."""
    if not model_names:
        return False, "Model has no class names"
    for idx, expected in BEST_V1_CLASS_NAMES.items():
        if model_names.get(idx) != expected:
            return False, f"Index {idx}: expected '{expected}', got '{model_names.get(idx)}'"
    return True, None


def class_name_from_id(cls_id: int, model_names: dict) -> str:
    """Resolve class string from model.names (best_v1.pt)."""
    if cls_id in model_names:
        return model_names[cls_id]
    return BEST_V1_CLASS_NAMES.get(cls_id, f"class_{cls_id}")
