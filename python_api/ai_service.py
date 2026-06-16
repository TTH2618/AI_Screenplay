# AI Service - Handles AI API calls
import re
import httpx
import config as _cfg
from prompts import get_system_prompt, build_user_prompt
from character_files import save_characters

# Tools that produce character profiles and should trigger JSON file saving
_CHARACTER_TOOLS = {'character', 'story_character'}

# Provider → API base URL mapping
_PROVIDER_URLS = {
    'openrouter': 'https://openrouter.ai/api/v1/chat/completions',
    'openai':     'https://api.openai.com/v1/chat/completions',
    'anthropic':  'https://api.anthropic.com/v1/messages',
    'google':     'https://generativelanguage.googleapis.com/v1beta/chat/completions',
}

# Fallback (legacy)
OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'


def _get_runtime_config():
    """Trả về (provider, model, api_key) trực tiếp từ .env (qua config module)."""
    provider = _cfg.AI_PROVIDER or 'openrouter'
    model    = _cfg.OPENROUTER_MODEL or 'google/gemini-2.0-flash-001'
    api_key  = _cfg.OPENROUTER_API_KEY or ''
    return provider, model, api_key



def generate_content(tool_id: str, form_data: dict, project_id=None) -> dict:
    """
    Generate AI content for screenplay tools
    
    Args:
        tool_id: The tool identifier (logline, theme, character, etc.)
        form_data: Dictionary containing form field values
        
    Returns:
        Dictionary with success status and content/error
    """
    try:
        system_prompt = get_system_prompt(tool_id)
        user_prompt = build_user_prompt(tool_id, form_data)
        
        print(f"🎬 Generating content for tool: {tool_id}")
        print(f"📝 User prompt length: {len(user_prompt)} chars")
        
        provider, runtime_model, runtime_api_key = _get_runtime_config()
        api_url = _PROVIDER_URLS.get(provider, OPENROUTER_API_URL)

        # Call AI API using httpx
        headers = {
            "Authorization": f"Bearer {runtime_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "AI Screenplay"
        }
        
        payload = {
            "model": runtime_model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user", 
                    "content": user_prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4096
        }
        
        with httpx.Client(timeout=120.0) as client:
            response = client.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        
        # Extract content
        content = data['choices'][0]['message']['content']

        # Extract token usage (OpenAI-compatible format)
        _usage = data.get('usage', {})
        tokens_in  = int(_usage.get('prompt_tokens', 0))
        tokens_out = int(_usage.get('completion_tokens', 0))
        
        # Format to HTML
        html_content = format_response_to_html(content)
        
        # Save character JSON files when a character tool is used
        saved_files = []
        characters_data = []
        if tool_id in _CHARACTER_TOOLS:
            saved_files, characters_data = save_characters(content, project_id=project_id)
        
        print(f"✅ Content generated successfully: {len(content)} chars | tokens in={tokens_in} out={tokens_out}")
        
        return {
            'success': True,
            'content': html_content,
            'raw_content': content,
            'model': runtime_model,
            'tool_id': tool_id,
            'provider': provider,
            'tokens_in':  tokens_in,
            'tokens_out': tokens_out,
            'character_files': saved_files,
            'characters_data': characters_data,
        }
        
    except Exception as e:
        print(f"❌ Error generating content: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'tool_id': tool_id,
            'tokens_in': 0,
            'tokens_out': 0,
        }


def generate_one_character(hint: str = '', existing_names: list = None) -> dict:
    """
    Generate a single character profile using AI.

    Args:
        hint: Optional description / request for the new character.
        existing_names: List of names already in the project (to avoid duplicates).

    Returns:
        Dict with 'success' and 'character' (8-field dict) or 'error'.
    """
    try:
        existing_names = existing_names or []
        existing_ctx = (
            f"\nCác nhân vật đã có trong dự án (không được trùng tên): {', '.join(existing_names)}"
            if existing_names else ''
        )
        hint_ctx = f"\nYêu cầu cụ thể từ người dùng: {hint}" if hint else ''

        system_prompt = (
            "Bạn là một nhà biên kịch chuyên nghiệp. "
            "Nhiệm vụ: tạo MỘT nhân vật phim mới với hồ sơ đầy đủ."
        )
        user_prompt = f"""Hãy tạo MỘT nhân vật phim mới.{existing_ctx}{hint_ctx}

Trả về DUY NHẤT một đối tượng JSON hợp lệ (không có text nào khác), theo đúng cấu trúc sau:

{{
  "ho_ten": "<Họ tên đầy đủ>",
  "vai_tro": "<nhân vật chính | nhân vật phụ | nhân vật phản diện>",
  "gioi_tinh": "<Nam | Nữ | Khác>",
  "tuoi": "<số tuổi, ví dụ: 28>",
  "quoc_tich": "<quốc tịch>",
  "ngoai_hinh": "<mô tả ngoại hình chi tiết>",
  "tinh_cach": "<mô tả tính cách, điểm mạnh, điểm yếu>",
  "background": "<tiểu sử và quá khứ của nhân vật>"
}}

Trả lời bằng tiếng Việt. Chỉ trả về JSON, không có markdown, không có text giải thích."""

        provider, runtime_model, runtime_api_key = _get_runtime_config()
        api_url = _PROVIDER_URLS.get(provider, OPENROUTER_API_URL)
        headers = {
            "Authorization": f"Bearer {runtime_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "AI Screenplay"
        }
        payload = {
            "model": runtime_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.85,
            "max_tokens": 1024
        }

        with httpx.Client(timeout=60.0) as client:
            response = client.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        _usage_c = data.get('usage', {})
        raw = data['choices'][0]['message']['content'].strip()

        # Strip possible markdown code fences
        import re as _re, json as _json
        raw = _re.sub(r'^```(?:json)?\s*', '', raw, flags=_re.MULTILINE)
        raw = _re.sub(r'```\s*$', '', raw, flags=_re.MULTILINE).strip()

        character = _json.loads(raw)
        allowed = ['ho_ten', 'vai_tro', 'gioi_tinh', 'tuoi', 'quoc_tich', 'ngoai_hinh', 'tinh_cach', 'background']
        character = {k: character.get(k, '') for k in allowed}

        print(f"✅ Generated single character: {character.get('ho_ten', '?')}")
        return {
            'success': True,
            'character': character,
            'tokens_in':  int(_usage_c.get('prompt_tokens', 0)),
            'tokens_out': int(_usage_c.get('completion_tokens', 0)),
        }

    except Exception as e:
        print(f"❌ Error generating single character: {e}")
        return {'success': False, 'error': str(e)}


def format_response_to_html(content: str) -> str:
    """
    Convert markdown-style formatting to HTML
    
    Args:
        content: Raw text content from AI
        
    Returns:
        HTML formatted content
    """
    html = content
    
    # Headers (process in order: h3, h2, h1)
    html = re.sub(r'^### (.*)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.*)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    
    # Bold
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    
    # Italic
    html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
    
    # Horizontal rule
    html = re.sub(r'^---$', r'<hr>', html, flags=re.MULTILINE)
    
    # Unordered lists
    html = re.sub(r'^- (.*)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    
    # Ordered lists
    html = re.sub(r'^\d+\. (.*)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    
    # Line breaks
    html = html.replace('\n\n', '</p><p>')
    html = html.replace('\n', '<br>')
    
    # Wrap in paragraph if not already wrapped
    if not html.startswith('<'):
        html = '<p>' + html + '</p>'
    
    # Clean up empty paragraphs
    html = html.replace('<p></p>', '')
    
    # Group consecutive list items into ul
    html = re.sub(r'((?:<li>.*?</li>)+)', r'<ul>\1</ul>', html, flags=re.DOTALL)
    html = html.replace('</ul><ul>', '')
    
    return html


def test_connection() -> dict:
    """
    Test connection to the configured AI API
    """
    try:
        provider, runtime_model, runtime_api_key = _get_runtime_config()
        api_url = _PROVIDER_URLS.get(provider, OPENROUTER_API_URL)

        headers = {
            "Authorization": f"Bearer {runtime_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "AI Screenplay"
        }
        
        payload = {
            "model": runtime_model,
            "messages": [
                {"role": "user", "content": "Hello"}
            ],
            "max_tokens": 10
        }
        
        with httpx.Client(timeout=30.0) as client:
            response = client.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
        
        return {
            'success': True,
            'message': f'Kết nối {provider} API thành công!',
            'model': runtime_model,
            'provider': provider
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Lỗi kết nối: {str(e)}'
        }


def generate_story_analysis(tool_id: str, story_content: str, story_title: str, previous_analyses: dict = None) -> dict:
    """
    Generate AI analysis for uploaded story
    
    Args:
        tool_id: The analysis tool identifier
        story_content: The story text content
        story_title: Title of the story
        previous_analyses: Dict of previous analysis results for context
        
    Returns:
        Dictionary with success status and content/error
    """
    try:
        from story_prompts import get_story_analysis_prompt, build_story_analysis_user_prompt
        
        system_prompt = get_story_analysis_prompt(tool_id)
        user_prompt = build_story_analysis_user_prompt(tool_id, story_content, story_title, previous_analyses)
        
        print(f"📚 Analyzing story with tool: {tool_id}")
        print(f"📝 Story length: {len(story_content)} chars")
        print(f"📝 User prompt length: {len(user_prompt)} chars")
        
        # Call AI API using runtime config
        provider, runtime_model, runtime_api_key = _get_runtime_config()
        api_url = _PROVIDER_URLS.get(provider, OPENROUTER_API_URL)
        headers = {
            "Authorization": f"Bearer {runtime_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "AI Screenplay"
        }
        
        payload = {
            "model": runtime_model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user", 
                    "content": user_prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4096
        }
        
        with httpx.Client(timeout=180.0) as client:  # Longer timeout for story analysis
            response = client.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        
        # Extract content
        content = data['choices'][0]['message']['content']
        
        # Format to HTML
        html_content = format_response_to_html(content)
        
        print(f"✅ Story analysis completed: {len(content)} chars")
        
        return {
            'success': True,
            'content': html_content,
            'raw_content': content,
            'model': runtime_model,
            'tool_id': tool_id,
            'provider': provider
        }
        
    except Exception as e:
        print(f"❌ Error analyzing story: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'tool_id': tool_id
        }
