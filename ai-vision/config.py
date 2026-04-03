from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_path: str = "models/yolov8n.pt"
    confidence_threshold: float = 0.60
    backend_url: str = "http://backend:3000"
    device: str = "cuda"  # "cuda" or "cpu"
    port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
