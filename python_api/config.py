# Configuration for AI Screenplay Python API
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env từ thư mục root (1 cấp trên python_api/)
ROOT_DIR = Path(__file__).resolve().parent.parent
_ENV_PATH = ROOT_DIR / '.env'
load_dotenv(_ENV_PATH)

def reload_config():
    """Reload .env file và cập nhật các biến config module-level.
    Được gọi khi admin thay đổi cấu hình AI từ trang admin."""
    global OPENROUTER_API_KEY, OPENROUTER_MODEL, AI_PROVIDER
    # override=True để cập nhật os.environ với giá trị mới từ file
    load_dotenv(_ENV_PATH, override=True)
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
    OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')
    AI_PROVIDER = os.getenv('AI_PROVIDER', 'openrouter')

# OpenRouter API Configuration
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')
AI_PROVIDER = os.getenv('AI_PROVIDER', 'openrouter')

# Server Configuration
HOST = os.getenv('PYTHON_API_HOST', '0.0.0.0')
PORT = int(os.getenv('PYTHON_API_PORT', 5000))
DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
