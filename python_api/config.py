# Configuration for AI Screenplay Python API
import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API Configuration
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')
AI_PROVIDER = os.getenv('AI_PROVIDER', 'openrouter')

# Server Configuration
HOST = os.getenv('PYTHON_API_HOST', '0.0.0.0')
PORT = int(os.getenv('PYTHON_API_PORT', 5000))
DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
