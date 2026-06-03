# AI Screenplay Python API Server
import os
import time
import uuid as _uuid_mod
import threading as _threading
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_service import generate_content, test_connection
from config import HOST, PORT, DEBUG, AI_PROVIDER
from db_runtime import (
    log_generation, save_story_file_metadata, get_user_ai_quota_state,
    calculate_cost, deduct_user_balance, get_user_balance,
)
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ── Async Job Store ──────────────────────────────────────────────────────────
# Lưu trạng thái công việc trong bộ nhớ (dict thread-safe với lock).
# Mỗi job có TTL _JOB_TTL giây; dọn dẹp được gọi mỗi khi submit job mới.
_jobs_lock = _threading.Lock()
_jobs: dict = {}   # {job_id: {status, progress, result, error, created_at, tool_id}}
_JOB_TTL = 3600    # giây – job "done"/"error" quá _JOB_TTL sẽ bị xóa


def _evict_old_jobs():
    """Xóa các job đã hoàn thành/lỗi và hết TTL."""
    cutoff = datetime.utcnow() - timedelta(seconds=_JOB_TTL)
    with _jobs_lock:
        stale = [
            jid for jid, j in _jobs.items()
            if j['status'] in ('done', 'error') and j['created_at'] < cutoff
        ]
        for jid in stale:
            del _jobs[jid]


def _run_job(job_id: str, data: dict):
    """
    Background worker – chạy pipeline generate+validate và ghi kết quả vào _jobs.
    Được khởi động bởi /api/generate-async trong thread riêng.
    """
    with app.app_context():
        started_at = time.perf_counter()
        tool_id      = data.get('tool_id')
        raw_user_id  = data.get('user_id')
        user_id      = int(raw_user_id) if str(raw_user_id).isdigit() else None
        project_id   = data.get('project_id')
        form_data    = dict(data.get('form_data', {}))

        try:
            with _jobs_lock:
                _jobs[job_id]['status']   = 'processing'
                _jobs[job_id]['progress'] = 'Kiểm tra quota...'

            # ── Quota check ─────────────────────────────────────────────────
            quota_state = get_user_ai_quota_state(user_id, free_daily_limit=10, pro_daily_limit=50)
            if not quota_state.get('allowed', True):
                is_pro = quota_state.get('is_pro_active', False)
                quota_msg = (
                    'Tài khoản PRO đã đạt giới hạn 50 lượt AI hôm nay. Vui lòng thử lại vào ngày mai.'
                    if is_pro else
                    'Tài khoản Free chỉ được 10 lượt AI mỗi ngày. Nâng cấp PRO để dùng tối đa 50 lượt/ngày.'
                )
                with _jobs_lock:
                    _jobs[job_id].update({
                        'status':     'error',
                        'progress':   'Bị từ chối',
                        'error':      quota_msg,
                        'error_code': 429,
                    })
                return

            # ── Character injection ─────────────────────────────────────────
            _CHARACTER_CONSUMING_TOOLS = {
                'synopsis', 'structure', 'beatsheet', 'scenelist', 'script',
                'story_synopsis', 'story_structure',
                'story_beatsheet', 'story_scenelist', 'story_script',
            }
            if tool_id in _CHARACTER_CONSUMING_TOOLS:
                from character_files import load_characters_text
                chars_text = load_characters_text(project_id)
                if chars_text:
                    form_data['characters'] = chars_text

            # ── Validation context ──────────────────────────────────────────
            _validation_context = {
                'logline':       form_data.get('logline', ''),
                'theme':         form_data.get('theme', ''),
                'characters':    form_data.get('characters', ''),
                'synopsis':      form_data.get('synopsis', ''),
                'structure':     form_data.get('structure', ''),
                'beatsheet':     form_data.get('beatsheet', ''),
                'scenelist':     form_data.get('scenelist', ''),
                'scene_count':   form_data.get('scene_count', ''),
                'story_content': form_data.get('story_content', ''),
            }

            from validator import validate_step, MAX_RETRIES
            from character_files import delete_characters

            _is_char_tool    = tool_id in ('character', 'story_character')
            validation_history = []
            _all_results     = []
            result           = None
            attempts         = 0

            # ── Token accumulator (all generate + validate calls) ────────────
            _total_tokens_in  = 0
            _total_tokens_out = 0

            # ── Generate → Validate loop ────────────────────────────────────
            for attempt in range(1, MAX_RETRIES + 1):
                attempts = attempt
                with _jobs_lock:
                    _jobs[job_id]['progress'] = f'Tạo nội dung – lần {attempt}/{MAX_RETRIES}...'

                result = generate_content(tool_id, form_data, project_id=project_id)
                _total_tokens_in  += result.get('tokens_in', 0)
                _total_tokens_out += result.get('tokens_out', 0)

                if not result.get('success'):
                    break

                with _jobs_lock:
                    _jobs[job_id]['progress'] = f'Xác thực kết quả – lần {attempt}/{MAX_RETRIES}...'

                verdict = validate_step(tool_id, result.get('raw_content', ''), _validation_context)
                _total_tokens_in  += verdict.get('tokens_in', 0)
                _total_tokens_out += verdict.get('tokens_out', 0)
                validation_history.append({
                    'attempt': attempt,
                    'valid':   verdict['valid'],
                    'score':   verdict['score'],
                    'reason':  verdict['reason'],
                    'issues':  verdict['issues'],
                })
                _all_results.append((result, verdict))

                if verdict['valid']:
                    break

                if attempt < MAX_RETRIES:
                    if _is_char_tool and project_id:
                        delete_characters(project_id)
                    issues_text      = '\n'.join(f'- {i}' for i in verdict['issues'])
                    suggestions      = verdict.get('suggestions', [])
                    suggestions_text = (
                        '\nHướng dẫn sửa cụ thể:\n' + '\n'.join(f'- {s}' for s in suggestions)
                    ) if suggestions else ''
                    form_data['_validation_feedback'] = (
                        f"Lần tạo trước bị từ chối vì:\n{issues_text}\n"
                        f"Lý do: {verdict['reason']}"
                        f"{suggestions_text}\n"
                        f"Hãy đọc kỹ và sửa TẤT CẢ các vấn đề trên."
                    )
                else:
                    best_result, best_verdict = max(_all_results, key=lambda x: x[1]['score'])
                    if best_result is not result:
                        if _is_char_tool and project_id:
                            delete_characters(project_id)
                            if best_result.get('raw_content'):
                                from character_files import save_characters as _save_chars
                                saved_files, characters_data = _save_chars(
                                    best_result['raw_content'], project_id=project_id
                                )
                                best_result['character_files'] = saved_files
                                best_result['characters_data'] = characters_data
                        result = best_result

            elapsed_ms = int((time.perf_counter() - started_at) * 1000)

            # ── Calculate cost and deduct from user balance ──────────────────
            _cost_vnd = calculate_cost(_total_tokens_in, _total_tokens_out)
            if user_id and _cost_vnd > 0:
                deduct_user_balance(user_id, _cost_vnd)

            if result:
                _passed     = any(v['valid'] for v in validation_history)
                _best_score = max((v['score'] for v in validation_history), default=0)
                result['validation'] = {
                    'attempts':            attempts,
                    'history':             validation_history,
                    'passed':              _passed,
                    'best_score':          _best_score,
                    'used_best_of_retries': (not _passed and len(_all_results) > 0),
                }

            if not quota_state.get('is_pro_active'):
                result['quota'] = {
                    'is_pro_active': False,
                    'daily_limit':   quota_state.get('daily_limit', 10),
                    'used_today':    quota_state.get('used_today', 0) + 1,
                    'remaining':     max((quota_state.get('remaining', 1) - 1), 0),
                }
            else:
                result['quota'] = {
                    'is_pro_active': True,
                    'daily_limit':   None,
                    'used_today':    None,
                    'remaining':     None,
                }

            # Attach token/cost info to result so frontend can display it
            result['tokens_in']  = _total_tokens_in
            result['tokens_out'] = _total_tokens_out
            result['cost_vnd']   = round(_cost_vnd, 4)
            result['balance_vnd'] = get_user_balance(user_id) if user_id else None

            log_generation({
                'user_id':       user_id,
                'project_id':    project_id,
                'tool_id':       tool_id,
                'provider':      result.get('provider', AI_PROVIDER),
                'model_name':    result.get('model'),
                'tokens_in':     _total_tokens_in,
                'tokens_out':    _total_tokens_out,
                'cost_vnd':      _cost_vnd,
                'call_type':     'generate',
                'status':        'success' if result.get('success') else 'error',
                'latency_ms':    elapsed_ms,
                'error_type':    None if result.get('success') else 'api_error',
                'error_message': None if result.get('success') else result.get('error'),
            })

            with _jobs_lock:
                _jobs[job_id].update({
                    'status':   'done'    if result.get('success') else 'error',
                    'progress': 'Hoàn thành' if result.get('success') else 'Thất bại',
                    'result':   result,
                    'error':    None if result.get('success') else result.get('error', 'Lỗi không xác định'),
                })

        except Exception as exc:
            with _jobs_lock:
                _jobs[job_id].update({
                    'status':   'error',
                    'progress': 'Lỗi hệ thống',
                    'error':    str(exc),
                })


@app.route('/')
def index():
    """API Documentation endpoint"""
    return jsonify({
        'name': 'AI Screenplay Python API',
        'version': '1.0.0',
        'description': 'API để tạo nội dung kịch bản phim với AI',
        'endpoints': {
            'POST /api/generate': 'Tạo nội dung AI cho một công cụ cụ thể',
            'GET /api/health': 'Kiểm tra trạng thái API và kết nối OpenRouter',
            'GET /api/tools': 'Lấy danh sách các công cụ hỗ trợ'
        }
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint - tests OpenRouter API connection"""
    result = test_connection()
    status_code = 200 if result['success'] else 500
    return jsonify(result), status_code


@app.route('/api/tools', methods=['GET'])
def get_tools():
    """Get list of supported tools"""
    tools = [
        {'id': 'logline', 'name': '1. Tạo Logline', 'description': 'Tạo logline cho phim'},
        {'id': 'theme', 'name': '2. Xác định Chủ đề', 'description': 'Xác định chủ đề phim'},
        {'id': 'character', 'name': '3. Mô tả Nhân vật', 'description': 'Tạo mô tả nhân vật'},
        {'id': 'synopsis', 'name': '4. Viết Tóm tắt', 'description': 'Viết synopsis phim'},
        {'id': 'structure', 'name': '5. Cấu trúc 4 Hồi', 'description': 'Tạo cấu trúc 4 hồi'},
        {'id': 'beatsheet', 'name': '6. Tạo Beat Sheet', 'description': 'Tạo beat sheet'},
        {'id': 'scenelist', 'name': '7. Danh sách Cảnh', 'description': 'Tạo danh sách cảnh'},
        {'id': 'script', 'name': '8. Viết Kịch bản', 'description': 'Viết kịch bản cảnh'}
    ]
    return jsonify({'success': True, 'tools': tools})


@app.route('/api/generate', methods=['POST'])
def generate():
    """
    Generate AI content for a specific tool
    
    Expected JSON body:
    {
        "tool_id": "logline",
        "form_data": {
            "movie_idea": "Ý tưởng phim...",
            ...
        }
    }
    """
    started_at = time.perf_counter()
    tool_id = None
    user_id = None
    project_id = None

    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Không có dữ liệu được gửi'
            }), 400
        
        tool_id = data.get('tool_id')
        form_data = data.get('form_data', {})
        raw_user_id = data.get('user_id')
        user_id = int(raw_user_id) if str(raw_user_id).isdigit() else None
        project_id = data.get('project_id')
        
        if not tool_id:
            return jsonify({
                'success': False,
                'error': 'Thiếu tool_id'
            }), 400
        
        # Validate tool_id
        valid_tools = ['logline', 'theme', 'character', 'synopsis',
                       'structure', 'beatsheet', 'scenelist', 'script',
                       'story_theme', 'story_character', 'story_synopsis',
                       'story_structure', 'story_beatsheet',
                       'story_scenelist', 'story_script']
        
        if tool_id not in valid_tools:
            return jsonify({
                'success': False,
                'error': f'Tool không hợp lệ: {tool_id}'
            }), 400

        quota_state = get_user_ai_quota_state(user_id, free_daily_limit=10, pro_daily_limit=50)
        if not quota_state.get('allowed', True):
            is_pro = quota_state.get('is_pro_active', False)
            quota_msg = (
                'Tài khoản PRO đã đạt giới hạn 50 lượt AI hôm nay. Vui lòng thử lại vào ngày mai.'
                if is_pro else
                'Tài khoản Free chỉ được 10 lượt AI mỗi ngày. Nâng cấp PRO để dùng tối đa 50 lượt/ngày.'
            )
            return jsonify({
                'success': False,
                'error': quota_msg,
                'quota': quota_state,
            }), 429
        
        # For tools that use character data: inject from saved JSON files
        _CHARACTER_CONSUMING_TOOLS = {
            'synopsis', 'structure', 'beatsheet', 'scenelist', 'script',
            'story_synopsis', 'story_structure',
            'story_beatsheet', 'story_scenelist', 'story_script',
        }
        if tool_id in _CHARACTER_CONSUMING_TOOLS:
            from character_files import load_characters_text
            chars_text = load_characters_text(project_id)
            if chars_text:
                form_data['characters'] = chars_text
                print(f"📋 Injected {chars_text.count('--- Nhân vật')} character(s) from JSON files into form_data")

        # ── Validation context: collect all previous steps from form_data ──────
        _validation_context = {
            'logline':       form_data.get('logline', ''),
            'theme':         form_data.get('theme', ''),
            'characters':    form_data.get('characters', ''),
            'synopsis':      form_data.get('synopsis', ''),
            'structure':     form_data.get('structure', ''),
            'beatsheet':     form_data.get('beatsheet', ''),
            'scenelist':     form_data.get('scenelist', ''),
            'scene_count':   form_data.get('scene_count', ''),
            'story_content': form_data.get('story_content', ''),
        }

        # ── Generate → Validate loop (max MAX_RETRIES attempts) ───────────────
        from validator import validate_step, MAX_RETRIES
        from character_files import delete_characters

        _is_char_tool = tool_id in ('character', 'story_character')
        validation_history = []
        _all_results = []  # (result_dict, verdict_dict) for each successful generation
        result = None
        attempts = 0

        # ── Token accumulator (all generate + validate calls) ────────────────
        _total_tokens_in  = 0
        _total_tokens_out = 0

        for attempt in range(1, MAX_RETRIES + 1):
            attempts = attempt
            print(f"🔄 Attempt {attempt}/{MAX_RETRIES} for tool: {tool_id}")
            result = generate_content(tool_id, form_data, project_id=project_id)
            _total_tokens_in  += result.get('tokens_in', 0)
            _total_tokens_out += result.get('tokens_out', 0)

            if not result.get('success'):
                # Generation itself failed – don't retry, surface the error
                break

            # Validate the raw output
            verdict = validate_step(tool_id, result.get('raw_content', ''), _validation_context)
            _total_tokens_in  += verdict.get('tokens_in', 0)
            _total_tokens_out += verdict.get('tokens_out', 0)
            validation_history.append({
                'attempt': attempt,
                'valid': verdict['valid'],
                'score': verdict['score'],
                'reason': verdict['reason'],
                'issues': verdict['issues'],
            })
            print(f"  {'✅' if verdict['valid'] else '❌'} Validation score={verdict['score']} – {verdict['reason']}")

            _all_results.append((result, verdict))

            if verdict['valid']:
                break  # Accepted

            if attempt < MAX_RETRIES:
                # For character tools: delete saved files before retrying
                if _is_char_tool and project_id:
                    delete_characters(project_id)

                # Feed the issues + actionable suggestions back so the next attempt knows what to fix
                issues_text = '\n'.join(f'- {i}' for i in verdict['issues'])
                suggestions = verdict.get('suggestions', [])
                suggestions_text = ('\nHướng dẫn sửa cụ thể:\n' + '\n'.join(f'- {s}' for s in suggestions)) if suggestions else ''
                form_data['_validation_feedback'] = (
                    f"Lần tạo trước bị từ chối vì:\n{issues_text}\n"
                    f"Lý do: {verdict['reason']}"
                    f"{suggestions_text}\n"
                    f"Hãy đọc kỹ và sửa TẤT CẢ các vấn đề trên."
                )
            else:
                # All retries exhausted – pick the attempt with the highest score
                best_result, best_verdict = max(_all_results, key=lambda x: x[1]['score'])
                print(f"  ⚠️ Exhausted retries – using best attempt (score={best_verdict['score']})")

                if best_result is not result:
                    # The last attempt is not the best – switch to the best one
                    if _is_char_tool and project_id:
                        delete_characters(project_id)
                        if best_result.get('raw_content'):
                            from character_files import save_characters as _save_chars
                            saved_files, characters_data = _save_chars(
                                best_result['raw_content'], project_id=project_id
                            )
                            best_result['character_files'] = saved_files
                            best_result['characters_data'] = characters_data
                    result = best_result
                else:
                    # Last attempt is already the best – keep its files as-is
                    if _is_char_tool and project_id:
                        pass  # files already saved by generate_content

        elapsed_ms = int((time.perf_counter() - started_at) * 1000)

        # ── Calculate cost and deduct from user balance ──────────────────────
        _cost_vnd = calculate_cost(_total_tokens_in, _total_tokens_out)
        if user_id and _cost_vnd > 0:
            deduct_user_balance(user_id, _cost_vnd)

        # Attach validation metadata to the result
        if result:
            _passed = any(v['valid'] for v in validation_history)
            _best_score = max((v['score'] for v in validation_history), default=0)
            result['validation'] = {
                'attempts': attempts,
                'history': validation_history,
                'passed': _passed,
                'best_score': _best_score,
                'used_best_of_retries': (not _passed and len(_all_results) > 0),
            }
            result['tokens_in']   = _total_tokens_in
            result['tokens_out']  = _total_tokens_out
            result['cost_vnd']    = round(_cost_vnd, 4)
            result['balance_vnd'] = get_user_balance(user_id) if user_id else None

        if not quota_state.get('is_pro_active'):
            result['quota'] = {
                'is_pro_active': False,
                'daily_limit': quota_state.get('daily_limit', 10),
                'used_today': (quota_state.get('used_today', 0) + 1),
                'remaining': max((quota_state.get('remaining', 1) - 1), 0),
            }
        else:
            result['quota'] = {
                'is_pro_active': True,
                'daily_limit': None,
                'used_today': None,
                'remaining': None,
            }

        log_generation({
            'user_id':       user_id,
            'project_id':    project_id,
            'tool_id':       tool_id,
            'provider':      result.get('provider', AI_PROVIDER),
            'model_name':    result.get('model'),
            'tokens_in':     _total_tokens_in,
            'tokens_out':    _total_tokens_out,
            'cost_vnd':      _cost_vnd,
            'call_type':     'generate',
            'status':        'success' if result.get('success') else 'error',
            'latency_ms':    elapsed_ms,
            'error_type':    None if result.get('success') else 'api_error',
            'error_message': None if result.get('success') else result.get('error'),
        })

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - started_at) * 1000)
        log_generation({
            'user_id': user_id,
            'project_id': project_id,
            'tool_id': tool_id or 'unknown',
            'provider': AI_PROVIDER,
            'model_name': None,
            'status': 'error',
            'latency_ms': elapsed_ms,
            'error_type': type(e).__name__,
            'error_message': str(e),
        })
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ── Async Job Endpoints ──────────────────────────────────────────────────────

@app.route('/api/generate-async', methods=['POST'])
def generate_async():
    """
    Submit a generation job asynchronously.
    Trả về job_id (UUID) ngay lập tức; quá trình xử lý diễn ra trong background thread.

    Request body: giống /api/generate
    Response 202: { "success": true, "job_id": "<uuid>", "status": "pending" }
    """
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Không có dữ liệu được gửi'}), 400

    tool_id = data.get('tool_id')
    valid_tools = [
        'logline', 'theme', 'character', 'synopsis',
        'structure', 'beatsheet', 'scenelist', 'script',
        'story_theme', 'story_character', 'story_synopsis',
        'story_structure', 'story_beatsheet', 'story_scenelist', 'story_script',
    ]
    if not tool_id or tool_id not in valid_tools:
        return jsonify({'success': False, 'error': f'Tool không hợp lệ: {tool_id}'}), 400

    _evict_old_jobs()   # dọn dẹp job cũ hết TTL

    job_id = str(_uuid_mod.uuid4())
    with _jobs_lock:
        _jobs[job_id] = {
            'status':     'pending',
            'progress':   'Đang chờ xử lý...',
            'result':     None,
            'error':      None,
            'error_code': None,
            'tool_id':    tool_id,
            'created_at': datetime.utcnow(),
        }

    t = _threading.Thread(target=_run_job, args=(job_id, data), daemon=True)
    t.start()

    return jsonify({'success': True, 'job_id': job_id, 'status': 'pending'}), 202


@app.route('/api/job/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """
    Kiểm tra trạng thái một async job.

    Response: {
        "success": true,
        "job_id": "...",
        "status": "pending" | "processing" | "done" | "error",
        "progress": "mô tả bước hiện tại",
        "tool_id": "...",
        "result": { ... },   // chỉ có khi status = "done"
        "error": "...",      // chỉ có khi status = "error"
        "error_code": 429    // chỉ có khi status = "error" và có mã lỗi cụ thể
    }
    """
    with _jobs_lock:
        job = _jobs.get(job_id)

    if job is None:
        return jsonify({
            'success': False,
            'error':   'Job không tồn tại hoặc đã hết hạn',
        }), 404

    response = {
        'success':  True,
        'job_id':   job_id,
        'status':   job['status'],
        'progress': job['progress'],
        'tool_id':  job.get('tool_id'),
    }

    if job['status'] == 'done':
        response['result'] = job['result']
    elif job['status'] == 'error':
        response['error']      = job['error']
        response['error_code'] = job.get('error_code')

    return jsonify(response), 200


@app.route('/api/characters', methods=['GET'])
def get_characters():
    """Get saved character JSON files for a project"""
    try:
        import json as _json
        from character_files import CHARACTERS_DIR
        project_id = request.args.get('project_id')
        if project_id:
            save_dir = os.path.join(CHARACTERS_DIR, str(project_id))
        else:
            save_dir = CHARACTERS_DIR

        characters = []
        if os.path.isdir(save_dir):
            for filename in sorted(os.listdir(save_dir)):
                if filename.endswith('.json'):
                    filepath = os.path.join(save_dir, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            char = _json.load(f)
                            char['_filename'] = filename  # include for frontend save
                            characters.append(char)
                    except Exception:
                        pass

        return jsonify({'success': True, 'characters': characters}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/characters', methods=['POST'])
def create_character():
    """Create a new character JSON file"""
    try:
        import json as _json
        import unicodedata, re
        from datetime import datetime
        from character_files import CHARACTERS_DIR, _slugify, _get_save_dir
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u'}), 400

        project_id = data.get('project_id')
        char_data = data.get('data', {})

        allowed_fields = ['ho_ten', 'vai_tro', 'gioi_tinh', 'tuoi',
                          'quoc_tich', 'ngoai_hinh', 'tinh_cach', 'background']
        record = {field: char_data.get(field, '') for field in allowed_fields}
        record['created_at'] = datetime.utcnow().isoformat() + 'Z'

        ho_ten = record.get('ho_ten', '').strip() or 'nhan_vat'
        slug = _slugify(ho_ten)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"{slug}_{timestamp}.json"

        save_dir = _get_save_dir(project_id)
        filepath = os.path.join(save_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            _json.dump(record, f, ensure_ascii=False, indent=2)

        record['_filename'] = filename
        return jsonify({'success': True, 'filename': filename, 'character': record}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/characters', methods=['PUT'])
def update_character():
    """Update a saved character JSON file"""
    try:
        import json as _json
        from character_files import CHARACTERS_DIR
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Không có dữ liệu'}), 400

        project_id = data.get('project_id')
        filename = data.get('filename', '')
        char_data = data.get('data', {})

        # Security: reject filenames with path separators or traversal sequences
        if not filename or '/' in filename or '\\' in filename or '..' in filename:
            return jsonify({'success': False, 'error': 'Tên file không hợp lệ'}), 400
        if not filename.endswith('.json'):
            return jsonify({'success': False, 'error': 'Chỉ hỗ trợ file JSON'}), 400

        if project_id:
            save_dir = os.path.join(CHARACTERS_DIR, str(project_id))
        else:
            save_dir = CHARACTERS_DIR

        filepath = os.path.join(save_dir, filename)

        # Prevent path traversal
        real_save_dir = os.path.realpath(save_dir)
        real_filepath = os.path.realpath(filepath)
        if not real_filepath.startswith(real_save_dir + os.sep):
            return jsonify({'success': False, 'error': 'Truy cập không hợp lệ'}), 403

        if not os.path.isfile(filepath):
            return jsonify({'success': False, 'error': 'File không tồn tại'}), 404

        # Read existing file to preserve metadata
        with open(filepath, 'r', encoding='utf-8') as f:
            existing = _json.load(f)

        # Update only the editable fields
        allowed_fields = ['ho_ten', 'vai_tro', 'gioi_tinh', 'tuoi',
                          'quoc_tich', 'ngoai_hinh', 'tinh_cach', 'background']
        for field in allowed_fields:
            if field in char_data:
                existing[field] = char_data[field]

        with open(filepath, 'w', encoding='utf-8') as f:
            _json.dump(existing, f, ensure_ascii=False, indent=2)

        return jsonify({'success': True, 'message': 'Đã lưu thành công'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/characters', methods=['DELETE'])
def delete_characters():
    """Delete all character JSON files for a project (used when regenerating)"""
    try:
        from character_files import CHARACTERS_DIR
        project_id = request.args.get('project_id')
        if project_id:
            save_dir = os.path.join(CHARACTERS_DIR, str(project_id))
        else:
            save_dir = CHARACTERS_DIR

        # Security: prevent path traversal
        real_base = os.path.realpath(CHARACTERS_DIR)
        real_dir = os.path.realpath(save_dir)
        if not real_dir.startswith(real_base):
            return jsonify({'success': False, 'error': 'Truy cập không hợp lệ'}), 403

        deleted = 0
        if os.path.isdir(save_dir):
            for filename in os.listdir(save_dir):
                if filename.endswith('.json'):
                    try:
                        os.remove(os.path.join(save_dir, filename))
                        deleted += 1
                    except Exception:
                        pass

        return jsonify({'success': True, 'deleted': deleted}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/characters/generate-one', methods=['POST'])
def generate_one_character_route():
    """Generate a single character profile via AI"""
    try:
        from ai_service import generate_one_character
        data = request.get_json() or {}
        hint = data.get('hint', '')
        existing_names = data.get('existing_names', [])
        if not isinstance(existing_names, list):
            existing_names = []
        result = generate_one_character(hint=hint, existing_names=existing_names)
        status = 200 if result.get('success') else 500
        return jsonify(result), status
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/extract-text', methods=['POST'])
def extract_text():
    """Extract text from uploaded file (txt, pdf, docx)"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Không có file được gửi'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Chưa chọn file'}), 400
        
        original_filename = file.filename
        filename = original_filename.lower()
        user_id = request.form.get('user_id')
        text = ''
        
        if filename.endswith('.txt'):
            text = file.read().decode('utf-8', errors='ignore')
        elif filename.endswith('.pdf'):
            try:
                from PyPDF2 import PdfReader
                import io
                reader = PdfReader(io.BytesIO(file.read()))
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + '\n'
            except ImportError:
                return jsonify({'success': False, 'error': 'Cần cài đặt PyPDF2 để đọc file PDF'}), 500
        elif filename.endswith('.docx'):
            try:
                from docx import Document as DocxDocument
                import io
                doc = DocxDocument(io.BytesIO(file.read()))
                for para in doc.paragraphs:
                    text += para.text + '\n'
            except ImportError:
                return jsonify({'success': False, 'error': 'Cần cài đặt python-docx để đọc file Word'}), 500
        else:
            return jsonify({'success': False, 'error': 'Chỉ hỗ trợ file .txt, .pdf, .docx'}), 400
        
        text = text.strip()
        if not text:
            return jsonify({'success': False, 'error': 'Không thể trích xuất nội dung từ file'}), 400

        uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'stories')
        os.makedirs(uploads_dir, exist_ok=True)

        extension = os.path.splitext(original_filename)[1].lower() or '.txt'
        safe_stem = secure_filename(os.path.splitext(original_filename)[0]) or 'story'
        stored_name = f"{safe_stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{extension}"
        absolute_path = os.path.join(uploads_dir, stored_name)

        # Reconstruct bytes from extracted text to keep a local copy for management/cleanup.
        with open(absolute_path, 'w', encoding='utf-8') as f:
            f.write(text)

        relative_storage_path = os.path.join('uploads', 'stories', stored_name).replace('\\', '/')
        save_story_file_metadata({
            'user_id': int(user_id) if user_id and str(user_id).isdigit() else None,
            'original_name': original_filename,
            'stored_name': stored_name,
            'file_type': extension.replace('.', ''),
            'size_bytes': os.path.getsize(absolute_path),
            'storage_path': relative_storage_path,
            'extracted_chars': len(text),
        })
        
        return jsonify({
            'success': True,
            'text': text,
            'filename': original_filename,
            'length': len(text)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'error': 'Endpoint không tồn tại'
    }), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({
        'success': False,
        'error': 'Lỗi server nội bộ'
    }), 500


if __name__ == '__main__':
    print("=" * 50)
    print("🎬 AI Screenplay Python API")
    print("=" * 50)
    print(f"🚀 Server đang chạy tại http://{HOST}:{PORT}")
    print(f"📚 API Documentation: http://localhost:{PORT}/")
    print(f"❤️  Health check: http://localhost:{PORT}/api/health")
    print("=" * 50)
    
    app.run(host=HOST, port=PORT, debug=DEBUG)
