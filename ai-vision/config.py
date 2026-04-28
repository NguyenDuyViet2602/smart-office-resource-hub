from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_path: str = "models/yolov8n.pt"
    confidence_threshold: float = 0.60
    backend_url: str = "http://backend:3000"
    device: str = "cpu"  # "cuda" or "cpu"
    port: int = 8000
    # Shared secret for AI Vision → Backend internal calls (set via AI_SERVICE_API_KEY)
    ai_service_api_key: str = "changeme-internal-ai-key"
    # Comma-separated list of allowed CORS origins
    allowed_origins: str = "http://localhost:3001"

    class Config:
        env_file = ".env"


settings = Settings()
