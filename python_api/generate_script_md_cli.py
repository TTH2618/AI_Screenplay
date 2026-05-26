"""CLI tool to generate a detailed screenplay scene and save it as Markdown.

Input format: each prompt must be provided inside angle brackets, e.g. <your text>.
"""

from __future__ import annotations

import argparse
import re
from datetime import datetime
from pathlib import Path

from ai_service import generate_content


def _extract_bracket_value(raw: str) -> str:
    """Validate and extract text wrapped in <...>."""
    text = raw.strip()
    if len(text) >= 2 and text.startswith("<") and text.endswith(">"):
        inner = text[1:-1].strip()
        if inner:
            return inner
    raise ValueError("Dữ liệu phải nằm trong dấu <> và không được để trống.")


def _parse_batch_input(raw: str) -> dict[str, str]:
    """Parse one-shot input containing exactly 6 fields in <...> blocks."""
    matches = re.findall(r"<([\s\S]*?)>", raw.strip())
    if len(matches) != 6:
        raise ValueError(
            "Phai nhap dung 6 dau vao trong dau <> theo thu tu yeu cau."
        )

    values = [item.strip() for item in matches]
    if any(not item for item in values):
        raise ValueError("Khong duoc de trong noi dung ben trong <>.")

    return {
        "synopsis": values[0],
        "characters": values[1],
        "structure": values[2],
        "beatsheet": values[3],
        "scenelist": values[4],
        "scene_number": values[5],
    }


def _ask_batch_input() -> dict[str, str]:
    """Prompt until the user provides a valid one-shot input string."""
    while True:
        raw = input(
            "Nhap 1 luot 6 dau vao theo dang "
            "<tom tat><mo ta nhan vat><phan tich theo hoi><beat sheet><danh sach canh><canh can viet>\n> "
        )
        try:
            return _parse_batch_input(raw)
        except ValueError as exc:
            print(f"Lỗi: {exc}")
            print(
                "Vi du hop le: <Tom tat phim><Mo ta nhan vat><Phan tich tung hoi>"
                "<Beat sheet><Danh sach canh><Canh 12>"
            )


def _build_markdown_content(screenplay: str) -> str:
    """Create markdown with screenplay content only."""
    return screenplay.strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Nhap du lieu tu dong lenh va xuat kich ban chi tiet ra file Markdown."
    )
    parser.add_argument(
        "--out",
        default="",
        help="Duong dan file .md dau ra (neu bo trong se tu dong tao trong uploads/stories).",
    )
    args = parser.parse_args()

    print("=== Tao Kich Ban Chi Tiet (.md) ===")
    print("Nhap 1 dong duy nhat gom 6 dau vao, moi dau vao dat trong <>.")

    form_data = _ask_batch_input()

    print("\nDang goi AI de tao kich ban chi tiet...")
    result = generate_content("script", form_data)

    if not result.get("success"):
        err = result.get("error", "Khong ro loi")
        raise RuntimeError(f"Khong tao duoc kich ban: {err}")

    screenplay = (result.get("raw_content") or "").strip()
    if not screenplay:
        raise RuntimeError("AI tra ve noi dung rong.")

    if args.out:
        output_path = Path(args.out).expanduser().resolve()
    else:
        default_dir = Path(__file__).resolve().parent.parent / "uploads" / "stories"
        default_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = default_dir / f"kich_ban_chi_tiet_{ts}.md"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    md_content = _build_markdown_content(screenplay)
    output_path.write_text(md_content, encoding="utf-8")

    print(f"\nDa tao file Markdown: {output_path}")


if __name__ == "__main__":
    main()
