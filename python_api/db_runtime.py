"""Runtime database access for dynamic admin settings and logging."""

import os
from datetime import datetime
from typing import Optional

try:
    import pymysql
except Exception:  # pragma: no cover
    pymysql = None


def _get_connection():
    if pymysql is None:
        return None

    return pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'ai_screenplay'),
        port=int(os.getenv('DB_PORT', '3306')),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def get_active_api_key(provider: str = 'openrouter') -> Optional[str]:
    conn = _get_connection()
    if conn is None:
        return None

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                'SELECT api_key FROM api_credentials WHERE provider = %s AND is_active = 1 LIMIT 1',
                (provider,),
            )
            row = cursor.fetchone()
            return row['api_key'] if row else None
    except Exception:
        return None
    finally:
        conn.close()


def get_active_provider() -> Optional[str]:
    """Đọc provider AI đang được cấu hình từ DB (payment_settings)."""
    conn = _get_connection()
    if conn is None:
        return None
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT setting_value FROM payment_settings WHERE setting_key = 'ai_provider' LIMIT 1"
            )
            row = cursor.fetchone()
            return row['setting_value'] if row else None
    except Exception:
        return None
    finally:
        conn.close()


def get_active_model() -> Optional[str]:
    """Đọc model AI đang được cấu hình từ DB (payment_settings)."""
    conn = _get_connection()
    if conn is None:
        return None
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT setting_value FROM payment_settings WHERE setting_key = 'ai_model' LIMIT 1"
            )
            row = cursor.fetchone()
            return row['setting_value'] if row else None
    except Exception:
        return None
    finally:
        conn.close()


def get_system_prompt_override(tool_id: str) -> Optional[str]:
    conn = _get_connection()
    if conn is None:
        return None

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                'SELECT prompt_text FROM system_prompts WHERE tool_id = %s AND is_active = 1 LIMIT 1',
                (tool_id,),
            )
            row = cursor.fetchone()
            return row['prompt_text'] if row else None
    except Exception:
        return None
    finally:
        conn.close()


def log_generation(payload: dict) -> None:
    conn = _get_connection()
    if conn is None:
        return

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO ai_generation_logs
                    (user_id, project_id, tool_id, provider, model_name,
                     tokens_in, tokens_out, cost_vnd, call_type,
                     status, latency_ms, error_type, error_message)
                VALUES
                    (%s, %s, %s, %s, %s,
                     %s, %s, %s, %s,
                     %s, %s, %s, %s)
                """,
                (
                    payload.get('user_id'),
                    payload.get('project_id'),
                    payload.get('tool_id', ''),
                    payload.get('provider', 'openrouter'),
                    payload.get('model_name'),
                    int(payload.get('tokens_in') or 0),
                    int(payload.get('tokens_out') or 0),
                    float(payload.get('cost_vnd') or 0),
                    payload.get('call_type', 'generate'),
                    payload.get('status', 'error'),
                    int(payload.get('latency_ms') or 0),
                    payload.get('error_type'),
                    payload.get('error_message'),
                ),
            )
    except Exception as _e:
        print(f'[log_generation ERROR] {_e}')  # Visible in Python console for debugging
        return
    finally:
        conn.close()


def get_token_pricing() -> tuple:
    """Return (price_input_per_1k_vnd, price_output_per_1k_vnd)."""
    conn = _get_connection()
    if conn is None:
        return 5.0, 15.0
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT setting_key, setting_value FROM payment_settings "
                "WHERE setting_key IN ('token_price_input_per_1k_vnd', 'token_price_output_per_1k_vnd')"
            )
            rows = {r['setting_key']: float(r['setting_value']) for r in cursor.fetchall()}
        return (
            rows.get('token_price_input_per_1k_vnd', 5.0),
            rows.get('token_price_output_per_1k_vnd', 15.0),
        )
    except Exception:
        return 5.0, 15.0
    finally:
        conn.close()


def calculate_cost(tokens_in: int, tokens_out: int) -> float:
    """Calculate cost in VND for the given token counts."""
    price_in, price_out = get_token_pricing()
    return (tokens_in / 1000.0) * price_in + (tokens_out / 1000.0) * price_out


def get_user_balance(user_id: int) -> float:
    """Return current AI credit balance for a user in VND."""
    if not user_id:
        return 0.0
    conn = _get_connection()
    if conn is None:
        return 0.0
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                'SELECT ai_balance_vnd FROM users WHERE id = %s LIMIT 1',
                (int(user_id),),
            )
            row = cursor.fetchone()
            return float(row['ai_balance_vnd']) if row else 0.0
    except Exception:
        return 0.0
    finally:
        conn.close()


def deduct_user_balance(user_id: int, amount_vnd: float) -> bool:
    """Deduct amount_vnd from user's AI balance. Returns True on success."""
    if not user_id or amount_vnd <= 0:
        return True
    conn = _get_connection()
    if conn is None:
        return True  # can't verify, allow
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                'UPDATE users SET ai_balance_vnd = ai_balance_vnd - %s WHERE id = %s',
                (round(amount_vnd, 4), int(user_id)),
            )
            return cursor.rowcount > 0
    except Exception:
        return True
    finally:
        conn.close()


def add_user_balance(user_id: int, amount_vnd: float) -> bool:
    """Add amount_vnd to user's AI balance."""
    if not user_id or amount_vnd <= 0:
        return False
    conn = _get_connection()
    if conn is None:
        return False
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                'UPDATE users SET ai_balance_vnd = ai_balance_vnd + %s WHERE id = %s',
                (round(amount_vnd, 4), int(user_id)),
            )
            return cursor.rowcount > 0
    except Exception:
        return False
    finally:
        conn.close()


def save_story_file_metadata(payload: dict) -> None:
    conn = _get_connection()
    if conn is None:
        return

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO uploaded_story_files
                    (user_id, original_name, stored_name, file_type, size_bytes, storage_path, extracted_chars)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    payload.get('user_id'),
                    payload.get('original_name', ''),
                    payload.get('stored_name', ''),
                    payload.get('file_type', ''),
                    int(payload.get('size_bytes') or 0),
                    payload.get('storage_path', ''),
                    int(payload.get('extracted_chars') or 0),
                ),
            )
    except Exception:
        return
    finally:
        conn.close()


def get_user_ai_quota_state(user_id: Optional[int], free_daily_limit: int = 10, pro_daily_limit: int = 50) -> dict:
    """Return AI quota state for a user. PRO users get pro_daily_limit/day, Free users get free_daily_limit/day."""
    fallback = {
        'allowed': True,
        'is_pro_active': False,
        'used_today': 0,
        'daily_limit': int(free_daily_limit),
        'remaining': int(free_daily_limit),
    }

    if not user_id:
        return fallback

    conn = _get_connection()
    if conn is None:
        return fallback

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                'SELECT plan_type, pro_expires_at FROM users WHERE id = %s LIMIT 1',
                (int(user_id),),
            )
            user = cursor.fetchone()
            if not user:
                return fallback

            now = datetime.now()
            is_pro = (user.get('plan_type') == 'pro') and (
                user.get('pro_expires_at') is None or user.get('pro_expires_at') >= now
            )

            if is_pro:
                cursor.execute(
                    """
                    SELECT COUNT(*) AS total
                    FROM ai_generation_logs
                    WHERE user_id = %s
                      AND DATE(created_at) = CURDATE()
                    """,
                    (int(user_id),),
                )
                pro_row = cursor.fetchone() or {}
                pro_used = int(pro_row.get('total') or 0)
                pro_remaining = max(int(pro_daily_limit) - pro_used, 0)
                return {
                    'allowed': pro_remaining > 0,
                    'is_pro_active': True,
                    'used_today': pro_used,
                    'daily_limit': int(pro_daily_limit),
                    'remaining': pro_remaining,
                }

            # Auto-downgrade expired PRO to free for consistency.
            if user.get('plan_type') == 'pro' and user.get('pro_expires_at') and user.get('pro_expires_at') < now:
                cursor.execute(
                    "UPDATE users SET plan_type = 'free', pro_expires_at = NULL, updated_at = NOW() WHERE id = %s",
                    (int(user_id),),
                )

            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM ai_generation_logs
                WHERE user_id = %s
                  AND DATE(created_at) = CURDATE()
                """,
                (int(user_id),),
            )
            row = cursor.fetchone() or {}
            used_today = int(row.get('total') or 0)
            remaining = max(int(free_daily_limit) - used_today, 0)

            return {
                'allowed': remaining > 0,
                'is_pro_active': False,
                'used_today': used_today,
                'daily_limit': int(free_daily_limit),
                'remaining': remaining,
            }
    except Exception:
        return fallback
    finally:
        conn.close()
