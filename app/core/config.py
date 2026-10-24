import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Crust & Flame Pizza Restaurant"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "crust_and_flame_super_secret_jwt_key_2026_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    DATABASE_URL: str = "sqlite:///./pizzadb.db"
    DELIVERY_FEE: float = 3.50
    TAX_RATE: float = 0.08  # 8% tax

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
