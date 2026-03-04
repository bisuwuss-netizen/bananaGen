
import os
import sys

# Ensure we can import app code
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models.settings import Settings
from config import Config

def update_settings():
    """
    Update database settings from environment variables/Config.
    Reference: .env file -> Config class -> database Settings
    """
    with app.app_context():
        settings = Settings.get_settings()
        if not settings:
            print("No existing settings found. Creating new.")
            settings = Settings()
            db.session.add(settings)
        
        # Read from Config (which loads from .env)
        provider_format = Config.AI_PROVIDER_FORMAT or 'openai'
        
        # Determine API key and base URL based on provider format
        if provider_format == 'openai':
            api_key = Config.OPENAI_API_KEY
            api_base = Config.OPENAI_API_BASE
        else:
            api_key = Config.GOOGLE_API_KEY
            api_base = Config.GOOGLE_API_BASE
            
        text_model = Config.TEXT_MODEL
        image_model = Config.IMAGE_MODEL
        
        # Update settings object
        settings.ai_provider_format = provider_format
        settings.api_key = api_key
        settings.api_base_url = api_base
        settings.text_model = text_model
        settings.image_model = image_model
        
        db.session.commit()
        
        print("Settings updated successfully from environment.")
        print(f"Provider: {settings.ai_provider_format}")
        print(f"Base URL: {settings.api_base_url}")
        print(f"Text Model: {settings.text_model}")
        print(f"Image Model: {settings.image_model}")

if __name__ == "__main__":
    update_settings()
