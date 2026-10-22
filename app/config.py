from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_hostname: str
    database_port: str
    database_password: str
    database_name: str
    database_username: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

    database_url: str 
    gemini_api_key: str
    gemini_model_name: str
    model_config = SettingsConfigDict(env_file=".env")
    
settings = Settings()