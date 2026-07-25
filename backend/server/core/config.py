from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.

    This class reads configuration values from the `.env` file and provides
    a centralized way to access application settings throughout the project.
    """

    database_name: str
    database_username: str
    database_password: str
    database_host: str
    database_port: int

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    @property
    def database_url(self) -> str:
        """
        Generate the PostgreSQL database connection URL.

        Returns:
            str: PostgreSQL connection string.
        """
        return (
            f"postgresql://{self.database_username}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
    )


#: Singleton instance used throughout the application to access configuration.
settings = Settings()