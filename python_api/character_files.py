# Character file management - parse AI character output and save as JSON dictionary files
import os
import re
import json
import unicodedata
from datetime import datetime


CHARACTERS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'uploads', 'characters'
)


def _slugify(text: str) -> str:
    """Convert a Vietnamese name to a safe filename slug."""
    # Normalize unicode (decompose accents)
    text = unicodedata.normalize('NFKD', text)
    # Encode to ASCII ignoring non-ASCII chars (strips diacritics)
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Lowercase and replace spaces/special chars with underscore
    text = re.sub(r'[^a-zA-Z0-9]+', '_', text).strip('_').lower()
    return text or 'nhan_vat'


def _get_save_dir(project_id=None) -> str:
    """Return the directory where character files should be saved."""
    if project_id:
        save_dir = os.path.join(CHARACTERS_DIR, str(project_id))
    else:
        save_dir = CHARACTERS_DIR
    os.makedirs(save_dir, exist_ok=True)
    return save_dir


def extract_characters_json(raw_content: str) -> list:
    """
    Extract the JSON character array from the AI response.

    Tries three strategies in order:
    1. Between ---JSON_CHARACTERS_START--- / ---JSON_CHARACTERS_END--- markers (legacy)
    2. Any ```json ... ``` fenced block
    3. The entire response treated as a bare JSON array

    Returns a list of character dicts, or an empty list if parsing fails.
    """
    # Strategy 1: legacy markers
    pattern = r'---JSON_CHARACTERS_START---.*?```json\s*([\s\S]*?)```.*?---JSON_CHARACTERS_END---'
    match = re.search(pattern, raw_content, re.DOTALL | re.IGNORECASE)

    if not match:
        # Strategy 2: any ```json ... ``` fence
        pattern_fallback = r'```json\s*([\s\S]*?)```'
        match = re.search(pattern_fallback, raw_content, re.DOTALL | re.IGNORECASE)

    if match:
        json_str = match.group(1).strip()
    else:
        # Strategy 3: bare JSON array (no fences)
        json_str = raw_content.strip()

    try:
        data = json.loads(json_str)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return [data]
    except json.JSONDecodeError:
        pass

    return []


def save_characters(raw_content: str, project_id=None, extra_meta: dict = None) -> tuple:
    """
    Parse character JSON from AI response and save each character as an
    individual JSON file.

    Args:
        raw_content: Raw text response from the AI.
        project_id:  Optional project identifier used as a sub-folder name.
        extra_meta:  Optional dict of extra fields to merge into each file.

    Returns:
        Tuple of (saved_paths, characters_list) where saved_paths is the list
        of file paths written and characters_list is the list of character dicts.
    """
    characters = extract_characters_json(raw_content)
    if not characters:
        print("⚠️  No character JSON block found in AI response – skipping file save.")
        return [], []

    save_dir = _get_save_dir(project_id)
    saved_paths = []
    saved_chars = []

    for char in characters:
        if not isinstance(char, dict):
            continue

        ho_ten = char.get('ho_ten', '').strip() or 'nhan_vat'
        slug = _slugify(ho_ten)

        # Build the character record
        record = {
            "ho_ten": ho_ten,
            "vai_tro": char.get('vai_tro', ''),
            "gioi_tinh": char.get('gioi_tinh', ''),
            "tuoi": char.get('tuoi', ''),
            "quoc_tich": char.get('quoc_tich', ''),
            "ngoai_hinh": char.get('ngoai_hinh', ''),
            "tinh_cach": char.get('tinh_cach', ''),
            "background": char.get('background', ''),
            "created_at": datetime.utcnow().isoformat() + 'Z',
        }

        if extra_meta:
            record.update(extra_meta)

        # Use a unique filename: slug + timestamp suffix to avoid collisions
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"{slug}_{timestamp}.json"
        filepath = os.path.join(save_dir, filename)

        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(record, f, ensure_ascii=False, indent=2)
            saved_paths.append(filepath)
            # Include _filename so frontend can reference the file for updates
            char_with_meta = dict(record)
            char_with_meta['_filename'] = filename
            saved_chars.append(char_with_meta)
            print(f"✅ Saved character file: {filepath}")
        except OSError as exc:
            print(f"❌ Failed to save character file {filepath}: {exc}")

    return saved_paths, saved_chars


def delete_characters(project_id=None) -> int:
    """
    Delete all character JSON files for the given project (or global dir).
    Returns the number of files deleted.
    """
    save_dir = _get_save_dir(project_id)
    if not os.path.isdir(save_dir):
        return 0
    deleted = 0
    for fname in os.listdir(save_dir):
        if fname.endswith('.json'):
            try:
                os.remove(os.path.join(save_dir, fname))
                deleted += 1
            except OSError as exc:
                print(f"⚠️ Could not delete {fname}: {exc}")
    print(f"🗑️ Deleted {deleted} character file(s) for project={project_id}")
    return deleted


def load_characters_text(project_id=None) -> str:
    """
    Load all saved character JSON files for a project and return them as
    formatted text suitable for injection into AI prompts.

    Returns empty string if no files exist.
    """
    if project_id:
        save_dir = os.path.join(CHARACTERS_DIR, str(project_id))
    else:
        save_dir = CHARACTERS_DIR

    if not os.path.isdir(save_dir):
        return ''

    chars = []
    for filename in sorted(os.listdir(save_dir)):
        if not filename.endswith('.json'):
            continue
        filepath = os.path.join(save_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                char = json.load(f)
            chars.append(char)
        except Exception:
            pass

    if not chars:
        return ''

    lines = []
    for i, c in enumerate(chars, 1):
        lines.append(f"--- Nhân vật {i}: {c.get('ho_ten', '?')} ---")
        if c.get('vai_tro'):
            lines.append(f"Vai trò: {c['vai_tro']}")
        if c.get('gioi_tinh'):
            lines.append(f"Giới tính: {c['gioi_tinh']}")
        if c.get('tuoi'):
            lines.append(f"Tuổi: {c['tuoi']}")
        if c.get('quoc_tich'):
            lines.append(f"Quốc tịch: {c['quoc_tich']}")
        if c.get('ngoai_hinh'):
            lines.append(f"Ngoại hình: {c['ngoai_hinh']}")
        if c.get('tinh_cach'):
            lines.append(f"Tính cách: {c['tinh_cach']}")
        if c.get('background'):
            lines.append(f"Background: {c['background']}")
        lines.append('')

    return '\n'.join(lines).strip()
