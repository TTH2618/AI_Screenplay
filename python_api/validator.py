# Validation agents for each screenplay step.
# Each agent takes the generated output + all prior-step context,
# calls AI to verify coherence, and returns a structured verdict.

import json
import re
import httpx
import config as _cfg

# Provider → API base URL mapping
_PROVIDER_URLS = {
    'openrouter': 'https://openrouter.ai/api/v1/chat/completions',
    'openai':     'https://api.openai.com/v1/chat/completions',
    'anthropic':  'https://api.anthropic.com/v1/messages',
    'google':     'https://generativelanguage.googleapis.com/v1beta/chat/completions',
}

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

MAX_RETRIES = 5  # Maximum generation attempts per step before giving up

# ── Validation criteria per tool ─────────────────────────────────────────────

from agents import AGENTS

_CTX_LABELS = {
    'logline': 'LOGLINE', 'theme': 'CHỦ ĐỀ', 'characters': 'NHÂN VẬT',
    'synopsis': 'SYNOPSIS', 'structure': 'CẤU TRÚC 4 HỒI',
    'beatsheet': 'BEAT SHEET',
    'scenelist': 'DANH SÁCH CẢNH', 'scene_count': 'SỐ CẢNH YÊU CẦU',
    'scene_number': 'SỐ CẢNH HIỆN TẠI',
    'story_content': 'NỘI DUNG TRUYỆN GỐC',
}
_CTX_MAX_CHARS = 1200  # max chars per context field to keep total prompt size manageable


def _build_validation_prompt(tool_id: str, generated_output: str, context: dict) -> str:
    """Build the validation prompt for a given tool."""
    agent = AGENTS.get(tool_id)
    
    if not agent:
        criteria = '- Nội dung phải hợp lý và nhất quán với các bước trước.'
        relevant_fields = list(_CTX_LABELS.keys())
        field_max_overrides = {}
        windows_limit = (2500, 1500)
    else:
        criteria = getattr(agent, 'CRITERIA', '- Nội dung phải hợp lý và nhất quán với các bước trước.')
        relevant_fields = getattr(agent, 'CTX_FIELDS', [])
        field_max_overrides = getattr(agent, 'CTX_FIELD_MAX', {})
        windows_limit = getattr(agent, 'WINDOWS', (2500, 1500))

    # Only include context fields relevant to this tool
    ctx_parts = []
    for field in relevant_fields:
        value = context.get(field, '').strip()
        if value:
            # allow much larger context for story_content so validator can read the full story
            field_max_chars = (
                15000 if field == 'story_content'
                else field_max_overrides.get(field, _CTX_MAX_CHARS)
            )
            
            if len(value) > field_max_chars:
                if field == 'story_content':
                    # For long stories, keep head and tail
                    half = field_max_chars // 2
                    truncated = value[:half] + '\n\n...(đoạn giữa được lược bỏ)...\n\n' + value[-half:]
                else:
                    truncated = value[:field_max_chars] + '...(lược bỏ)'
            else:
                truncated = value
                
            label = _CTX_LABELS.get(field, field.upper())
            ctx_parts.append(f"### {label}:\n{truncated}")

    ctx_text = '\n\n'.join(ctx_parts) if ctx_parts else '(Chưa có dữ liệu bước trước)'

    # Per-tool output window sizes (head + tail) to keep prompt manageable
    head_limit, tail_limit = windows_limit
    limit = head_limit + tail_limit
    if len(generated_output) > limit:
        head = generated_output[:head_limit]
        tail = generated_output[-tail_limit:]
        output_display = head + f"\n\n...[đoạn giữa đã lược bỏ, tổng {len(generated_output)} ký tự]...\n\n" + tail
    else:
        output_display = generated_output

    # Sanitize: replace stray backslashes that could corrupt the JSON response
    output_display = output_display.replace('\\', '/')

    return f"""Bạn là một biên tập viên kịch bản Hollywood chuyên nghiệp. Nhiệm vụ của bạn là KIỂM TRA chất lượng và tính nhất quán của đầu ra bước "{tool_id}".

## DỮ LIỆU CÁC BƯỚC TRƯỚC:
{ctx_text}

## ĐẦU RA CẦN KIỂM TRA (bước "{tool_id}"):
{output_display}

## TIÊU CHÍ KIỂM TRA:
{criteria}

## HƯỚNG DẪN:
Đánh giá đầu ra theo các tiêu chí trên. Trả về JSON hợp lệ (không có text khác):

{{
  "valid": true hoặc false,
  "score": số từ 1-10,
  "issues": ["vấn đề 1 nếu có", "vấn đề 2 nếu có"],
  "suggestions": ["hướng dẫn sửa cụ thể cho vấn đề 1", "hướng dẫn sửa cụ thể cho vấn đề 2"],
  "reason": "giải thích ngắn gọn tại sao hợp lệ hoặc không hợp lệ"
}}

Mỗi phần tử trong "suggestions" phải là một chỉ dẫn CỤ THỂ và HÀNH ĐỘNG ĐƯỢC về cách sửa vấn đề tương ứng trong "issues".
Chỉ trả về JSON, không có markdown, không có text giải thích."""


def validate_step(tool_id: str, generated_output: str, context: dict) -> dict:
    """
    Validate the generated output for a given tool step.

    Args:
        tool_id:           The tool that produced the output (e.g. 'theme').
        generated_output:  The raw text output from the AI generation step.
        context:           Dict of all previous step outputs keyed by step name.

    Returns:
        {
            'valid': bool,
            'score': int (1-10),
            'issues': list[str],
            'reason': str,
        }
    """
    try:
        agent = AGENTS.get(tool_id)
        max_tokens = getattr(agent, 'MAX_TOKENS', 1024) if agent else 1024

        provider = _cfg.AI_PROVIDER or 'openrouter'
        runtime_model = _cfg.OPENROUTER_MODEL or 'google/gemini-2.0-flash-001'
        runtime_api_key = _cfg.OPENROUTER_API_KEY or ''
        api_url = _PROVIDER_URLS.get(provider, OPENROUTER_API_URL)

        headers = {
            "Authorization": f"Bearer {runtime_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "AI Screenplay Validator",
        }
        payload = {
            "model": runtime_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Bạn là một biên tập viên kịch bản chuyên nghiệp. "
                        "Nhiệm vụ: kiểm tra chất lượng đầu ra của AI. "
                        "Chỉ trả về JSON, không có bất kỳ text nào khác."
                    ),
                },
                {
                    "role": "user",
                    "content": _build_validation_prompt(tool_id, generated_output, context),
                },
            ],
            "temperature": 0.2,
            # Give the model enough room based on agent configurations
            "max_tokens": max_tokens,
        }

        with httpx.Client(timeout=60.0) as client:
            response = client.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        _val_usage = data.get('usage', {})
        raw = data['choices'][0]['message']['content'].strip()

        # Strip markdown fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'```\s*$', '', raw, flags=re.MULTILINE).strip()

        # Robust JSON extraction: find the outermost {...} block
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            raw = json_match.group(0)

        # If JSON is truncated (unterminated), attempt to repair it
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            # Close any open string/array/object so json.loads can parse partial output
            _repair = raw
            # Count unclosed brackets
            open_braces   = _repair.count('{') - _repair.count('}')
            open_brackets = _repair.count('[') - _repair.count(']')
            # Ensure last string is terminated
            if _repair.count('"') % 2 != 0:
                _repair += '"'
            for _ in range(max(open_brackets, 0)):
                _repair += ']'
            for _ in range(max(open_braces, 0)):
                _repair += '}'
            result = json.loads(_repair)
        return {
            'valid': bool(result.get('valid', False)),
            'score': int(result.get('score', 0)),
            'issues': result.get('issues', []),
            'suggestions': result.get('suggestions', []),
            'reason': result.get('reason', ''),
            'tokens_in':  int(_val_usage.get('prompt_tokens', 0)),
            'tokens_out': int(_val_usage.get('completion_tokens', 0)),
        }

    except Exception as e:
        print(f"⚠️  Validator error for {tool_id}: {e}")
        # On validator failure, allow the output through (fail-open)
        return {
            'valid': True,
            'score': 7,
            'issues': [],
            'suggestions': [],
            'reason': f'Validator gặp lỗi kỹ thuật ({e}), chấp nhận kết quả.',
            'tokens_in':  0,
            'tokens_out': 0,
        }
