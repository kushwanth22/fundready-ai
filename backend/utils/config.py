from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    anthropic_model: str 
    apify_api_token: str
    box_client_id: str
    box_client_secret: str
    box_developer_token: str
    box_root_folder_id: str = "0"

    class Config:
        env_file = ("backend/.env", ".env")
        extra = 'ignore'


settings = Settings()
