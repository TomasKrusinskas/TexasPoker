import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings."""

    database_host: str = os.getenv("DATABASE_HOST", "localhost")
    database_port: int = int(os.getenv("DATABASE_PORT", 5432))
    database_name: str = os.getenv("DATABASE_NAME", "poker_db")
    database_user: str = os.getenv("DATABASE_USER", "poker_user")
    database_password: str = os.getenv("DATABASE_PASSWORD", "poker_password")

    api_version: str = "v1"
    api_title: str = "Poker API"

    big_blind: int = 40
    small_blind: int = 20
    num_players: int = 6

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()