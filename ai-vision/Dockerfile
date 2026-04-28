# AI Vision Service — PyTorch + YOLOv8 (CPU)
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Create models directory and pre-download YOLOv8 nano model
RUN mkdir -p models && python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" && \
    mv yolov8n.pt models/yolov8n.pt 2>/dev/null || true

EXPOSE 8000

ENV DEVICE=cpu
ENV MODEL_PATH=models/yolov8n.pt
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
