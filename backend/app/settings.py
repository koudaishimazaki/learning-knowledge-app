from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=".env",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+psycopg://myknowledge:myknowledge@db:5432/myknowledge",
        validation_alias="DATABASE_URL",
    )
    jwt_secret: str = Field(default="change-me", validation_alias="JWT_SECRET")
    access_token_expire_minutes: int = Field(
        default=60 * 24 * 7, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    # Automation / ingestion (optional). If set, enables API-key based ingestion endpoints.
    automation_api_key: str | None = Field(default=None, validation_alias="AUTOMATION_API_KEY")
    automation_user_email: str | None = Field(
        default=None,
        validation_alias="AUTOMATION_USER_EMAIL",
        description="Default target user for automation ingestion (email).",
    )

    cors_origins: str = Field(
        default="http://localhost:5173",
        validation_alias="CORS_ORIGINS",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()

