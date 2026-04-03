"""
YOLOv8-based device detector for Smart Office AI Vision.

Equipment type mapping to YOLO class labels (COCO dataset + fine-tuned labels).
For production, fine-tune on a custom dataset of office equipment.
"""

import base64
import io
import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np
from PIL import Image
from ultralytics import YOLO

from config import settings

logger = logging.getLogger(__name__)

# Mapping from YOLO class names to EquipmentType enum values
LABEL_TO_EQUIPMENT_TYPE = {
    "cell phone": "phone",
    "smartphone": "phone",
    "iphone": "phone",
    "laptop": "laptop",
    "notebook": "laptop",
    "tablet": "tablet",
    "ipad": "tablet",
    "camera": "camera",
    "projector": "projector",
    "headphones": "headset",
    "headset": "headset",
    "mouse": "other",
    "keyboard": "other",
}


@dataclass
class DetectionResult:
    confirmed: bool
    label: str
    equipment_type: str
    confidence: float
    bbox: Optional[list] = None
    message: str = ""


class DeviceDetector:
    def __init__(self):
        self.model: Optional[YOLO] = None
        self._load_model()

    def _load_model(self):
        try:
            self.model = YOLO(settings.model_path)
            self.model.to(settings.device)
            logger.info(f"YOLO model loaded from {settings.model_path} on {settings.device}")
        except Exception as e:
            logger.warning(f"Failed to load model from {settings.model_path}, using default yolov8n: {e}")
            self.model = YOLO("yolov8n.pt")
            self.model.to(settings.device)

    def decode_image(self, image_base64: str) -> np.ndarray:
        """Decode base64 image to numpy array."""
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.array(image)

    def detect(
        self,
        image_base64: str,
        expected_labels: Optional[list[str]] = None,
    ) -> DetectionResult:
        """
        Run YOLO detection on the image.

        If expected_labels is provided, only confirm detection if a matching label is found.
        Otherwise, return the highest-confidence detection.
        """
        image_array = self.decode_image(image_base64)

        results = self.model(image_array, verbose=False)[0]

        if len(results.boxes) == 0:
            return DetectionResult(
                confirmed=False,
                label="",
                equipment_type="other",
                confidence=0.0,
                message="Không phát hiện được thiết bị trong khung hình",
            )

        best_box = None
        best_conf = 0.0
        best_label = ""

        for box in results.boxes:
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            label = results.names[cls_id].lower()

            if conf > best_conf:
                best_conf = conf
                best_label = label
                best_box = box

        equipment_type = LABEL_TO_EQUIPMENT_TYPE.get(best_label, "other")

        if best_conf < settings.confidence_threshold:
            return DetectionResult(
                confirmed=False,
                label=best_label,
                equipment_type=equipment_type,
                confidence=best_conf,
                message=f"Độ chính xác thấp ({best_conf:.1%}). Vui lòng đưa thiết bị gần hơn.",
            )

        # If caller specifies expected labels, validate
        if expected_labels:
            normalized_expected = [l.lower() for l in expected_labels]
            match = any(
                exp in best_label or best_label in exp
                for exp in normalized_expected
            )
            if not match:
                return DetectionResult(
                    confirmed=False,
                    label=best_label,
                    equipment_type=equipment_type,
                    confidence=best_conf,
                    message=f"Phát hiện '{best_label}' nhưng không khớp với thiết bị mong đợi: {expected_labels}",
                )

        bbox = best_box.xyxy[0].tolist() if best_box else None

        return DetectionResult(
            confirmed=True,
            label=best_label,
            equipment_type=equipment_type,
            confidence=best_conf,
            bbox=bbox,
            message=f"Đã nhận diện: {best_label} ({best_conf:.1%})",
        )


_detector: Optional[DeviceDetector] = None


def get_detector() -> DeviceDetector:
    global _detector
    if _detector is None:
        _detector = DeviceDetector()
    return _detector
