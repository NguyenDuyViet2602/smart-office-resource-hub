"""
Smart Office AI Vision Service — FastAPI + YOLOv8

Endpoints:
  POST /detect       — Detect device from base64 image frame
  GET  /health       — Health check
  GET  /models/info  — Model info
"""

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import settings
from detector import get_detector, DetectionResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading YOLO model...")
    get_detector()
    logger.info("AI Vision service ready")
    yield
    logger.info("Shutting down AI Vision service")


app = FastAPI(
    title="Smart Office AI Vision",
    description="Device detection service using YOLOv8",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DetectRequest(BaseModel):
    image_base64: str
    equipment_id: Optional[str] = None
    expected_labels: Optional[list[str]] = None


class DetectResponse(BaseModel):
    confirmed: bool
    label: str
    equipment_type: str
    confidence: float
    bbox: Optional[list] = None
    message: str
    equipment_id: Optional[str] = None


@app.get("/health")
async def health():
    detector = get_detector()
    return {
        "status": "ok",
        "model": settings.model_path,
        "device": settings.device,
        "model_loaded": detector.model is not None,
    }


@app.get("/models/info")
async def model_info():
    detector = get_detector()
    if not detector.model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "model_path": settings.model_path,
        "device": settings.device,
        "confidence_threshold": settings.confidence_threshold,
        "num_classes": len(detector.model.names),
        "class_names": detector.model.names,
    }


@app.post("/detect", response_model=DetectResponse)
async def detect_device(request: DetectRequest):
    """
    Detect a device in the provided image frame.

    - Decodes base64 image
    - Runs YOLOv8 inference
    - Returns detection result with confidence score
    - If confirmed and equipment_id is provided, the NestJS backend
      will be notified to update the equipment status
    """
    try:
        detector = get_detector()
        result: DetectionResult = detector.detect(
            request.image_base64,
            expected_labels=request.expected_labels,
        )

        response = DetectResponse(
            confirmed=result.confirmed,
            label=result.label,
            equipment_type=result.equipment_type,
            confidence=result.confidence,
            bbox=result.bbox,
            message=result.message,
            equipment_id=request.equipment_id,
        )

        if result.confirmed and request.equipment_id:
            await notify_backend(request.equipment_id, result)

        return response

    except Exception as e:
        logger.error(f"Detection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


async def notify_backend(equipment_id: str, result: DetectionResult):
    """Notify NestJS backend that a device has been returned via AI verification."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{settings.backend_url}/equipment/{equipment_id}/return",
                json={
                    "aiVerified": True,
                    "confidence": result.confidence,
                    "detectedLabel": result.label,
                },
            )
        logger.info(f"Backend notified: equipment {equipment_id} returned")
    except Exception as e:
        logger.warning(f"Failed to notify backend for equipment {equipment_id}: {e}")


@app.post("/train/prepare-dataset")
async def prepare_dataset_info():
    """
    Returns instructions for fine-tuning the YOLO model on custom office equipment.
    In production, this endpoint would trigger a training pipeline.
    """
    return {
        "instructions": "To fine-tune YOLOv8 on custom equipment:",
        "steps": [
            "1. Collect 100-500 images per equipment type (phone, laptop, tablet, etc.)",
            "2. Annotate with Roboflow or LabelImg in YOLO format",
            "3. Run: yolo train model=yolov8n.pt data=dataset.yaml epochs=50 imgsz=640",
            "4. Replace models/yolov8n.pt with the trained model (best.pt)",
        ],
        "supported_types": list({
            "cell phone": "phone",
            "laptop": "laptop",
            "tablet": "tablet",
        }.keys()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
