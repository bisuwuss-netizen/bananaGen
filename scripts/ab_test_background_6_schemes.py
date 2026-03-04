#!/usr/bin/env python3
"""
Generate real A/B background images for 6 teaching schemes and build comparison grid.

A = baseline prompt (legacy-style per-scheme background prompt)
B = optimized prompt (unified backend optimizer)
"""

from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, ImageDraw

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from models import Page, Project
from services.ai_providers import get_image_provider
from services.image_prompt_optimizer import optimize_html_image_slots


TARGET_SCHEMES = ["tech_blue", "academic", "interactive", "visual", "practical", "modern"]

LEGACY_BG_STYLE_MAP: Dict[str, List[str]] = {
    "tech_blue": [
        "科技风统一背景图，冷蓝/青灰/微光渐变，结构清晰。",
        "边缘点缀科技网格、粒子、曲线光带，中心保持干净留白。",
        "低饱和、柔和不抢正文，纹理细腻，避免过曝。",
    ],
    "academic": [
        "学术严谨风统一背景图，冷灰/深蓝/米白，纸张质感。",
        "边缘点缀学术网格、书页边角、细线框，中心留白。",
        "避免夸张装饰与强视觉冲击。",
    ],
    "interactive": [
        "互动活泼风统一背景图，明亮多彩但低饱和。",
        "边缘点缀贴纸/涂鸦/对话气泡，中心留白。",
        "氛围轻松、有课堂互动感。",
    ],
    "visual": [
        "视觉叙事风统一背景图，高级灰度+单一强调色。",
        "边缘带摄影/海报质感光影，中心留白。",
        "图像感强，但避免文字干扰。",
    ],
    "practical": [
        "实践操作风统一背景图，工业橙+深灰+白。",
        "边缘点缀工具轮廓、警示条、工程标记，中心留白。",
        "强调操作与安全提示的氛围。",
    ],
    "modern": [
        "现代先锋风统一背景图，非对称几何与柔和渐层，质感高级。",
        "边缘加入玻璃态几何和斜切结构，中心保持大面积留白。",
        "风格干净克制，突出品牌气质，不抢正文。",
    ],
}


@dataclass
class SchemeRun:
    scheme_id: str
    source_project_id: str
    synthetic_source: bool
    title_seed: str
    page_titles: List[str]
    prompt_a: str
    prompt_b: str
    image_a: Optional[Path]
    image_b: Optional[Path]
    error_a: Optional[str] = None
    error_b: Optional[str] = None


def clean_text(v: Any) -> str:
    if not isinstance(v, str):
        return ""
    return " ".join(v.replace("<", "").replace(">", "").replace("`", "").split()).strip()


def build_legacy_prompt(scheme_id: str, topic: str, page_titles: List[str]) -> str:
    lines = ["高质量知识点教学PPT统一背景图。"]
    if topic:
        lines.append(f"主题：{topic}。")
    if page_titles:
        lines.append(f"页面线索：{'；'.join(page_titles[:5])}。")
    lines.extend(LEGACY_BG_STYLE_MAP.get(scheme_id, LEGACY_BG_STYLE_MAP["tech_blue"]))
    lines.append("禁止出现任何文字、数字、符号、水印、Logo 或可识别标记。")
    return " ".join(lines)


def get_latest_project_for_scheme(scheme_id: str) -> Optional[Project]:
    return (
        Project.query
        .filter(Project.render_mode == "html", Project.scheme_id == scheme_id)
        .order_by(Project.updated_at.desc())
        .first()
    )


def get_latest_seed_project() -> Project:
    p = (
        Project.query
        .filter(Project.render_mode == "html")
        .order_by(Project.updated_at.desc())
        .first()
    )
    if not p:
        raise RuntimeError("No html project found in database")
    return p


def extract_titles(project_id: str, limit: int = 5) -> Tuple[str, List[str]]:
    pages = (
        Page.query
        .filter_by(project_id=project_id)
        .order_by(Page.order_index.asc())
        .limit(max(1, limit))
        .all()
    )
    titles: List[str] = []
    for pg in pages:
        oc = pg.get_outline_content() or {}
        title = clean_text(oc.get("title", ""))
        if title:
            titles.append(title)
    return (titles[0] if titles else "", titles)


def generate_with_retry(provider, prompt: str, aspect_ratio: str, resolution: str, max_attempts: int = 3):
    last_err = None
    for i in range(max_attempts):
        try:
            return provider.generate_image(prompt=prompt, aspect_ratio=aspect_ratio, resolution=resolution)
        except Exception as e:  # noqa: BLE001
            last_err = e
            wait_s = min(8, 2 + i * 2)
            time.sleep(wait_s)
    raise RuntimeError(str(last_err) if last_err else "unknown image generation error")


def ensure_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        return bg
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def create_placeholder(size: Tuple[int, int], text: str) -> Image.Image:
    img = Image.new("RGB", size, (245, 245, 245))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, size[0] - 1, size[1] - 1), outline=(200, 200, 200), width=2)
    draw.text((30, 30), text[:80], fill=(90, 90, 90))
    return img


def build_grid(results: List[SchemeRun], out_path: Path) -> Path:
    # Determine target size by first available image.
    sample_size = None
    for r in results:
        for p in (r.image_a, r.image_b):
            if p and p.exists():
                with Image.open(p) as im:
                    sample_size = im.size
                break
        if sample_size:
            break
    if not sample_size:
        sample_size = (1280, 720)

    img_w, img_h = sample_size
    margin = 24
    gap_x = 24
    gap_y = 26
    label_h = 34
    top_header_h = 44

    canvas_w = margin + img_w + gap_x + img_w + margin
    canvas_h = margin + top_header_h + len(results) * (label_h + img_h) + (len(results) - 1) * gap_y + margin
    canvas = Image.new("RGB", (canvas_w, canvas_h), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)

    draw.text((margin, margin), "A/B Background Comparison (A=Baseline, B=Optimized)", fill=(20, 20, 20))
    draw.text((margin, margin + 20), "Left: A  |  Right: B", fill=(60, 60, 60))

    y = margin + top_header_h
    for r in results:
        label = f"{r.scheme_id} | source={r.source_project_id[:8]}{'*' if r.synthetic_source else ''}"
        draw.text((margin, y), label, fill=(30, 30, 30))
        y += label_h

        # A image
        if r.image_a and r.image_a.exists():
            with Image.open(r.image_a) as im:
                a_img = ensure_rgb(im).resize((img_w, img_h))
        else:
            a_img = create_placeholder((img_w, img_h), f"A failed: {r.error_a or 'unknown'}")

        # B image
        if r.image_b and r.image_b.exists():
            with Image.open(r.image_b) as im:
                b_img = ensure_rgb(im).resize((img_w, img_h))
        else:
            b_img = create_placeholder((img_w, img_h), f"B failed: {r.error_b or 'unknown'}")

        canvas.paste(a_img, (margin, y))
        canvas.paste(b_img, (margin + img_w + gap_x, y))
        y += img_h + gap_y

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, format="PNG")
    return out_path


def run(output_base: Path) -> Dict[str, Any]:
    app = create_app()
    with app.app_context():
        image_model = app.config.get("IMAGE_MODEL")
        aspect_ratio = app.config.get("DEFAULT_ASPECT_RATIO", "16:9")
        resolution = app.config.get("DEFAULT_RESOLUTION", "2K")
        provider = get_image_provider(model=image_model)

        seed_project = get_latest_seed_project()
        runs: List[SchemeRun] = []

        for idx, scheme_id in enumerate(TARGET_SCHEMES):
            scheme_project = get_latest_project_for_scheme(scheme_id)
            synthetic = False
            if not scheme_project:
                scheme_project = seed_project
                synthetic = True

            title_seed, titles = extract_titles(scheme_project.id, limit=6)
            topic = clean_text(scheme_project.idea_prompt or title_seed or "教学主题")
            prompt_a = build_legacy_prompt(scheme_id, topic, titles)

            slot = {
                "page_id": f"{scheme_id}-background",
                "slot_path": "background_image",
                "prompt": prompt_a,
                "context": {
                    "asset_type": "background",
                    "layout_id": "cover",
                    "scheme_id": scheme_id,
                    "slot_role": "background",
                    "page_title": clean_text(title_seed or topic),
                    "page_facts": [clean_text(t) for t in titles[:6]],
                    "project_topic": topic,
                    "extra_requirements": clean_text(getattr(scheme_project, "extra_requirements", "") or ""),
                    "template_style": clean_text(getattr(scheme_project, "template_style", "") or ""),
                    "visual_goal": "生成统一背景图，中心留白，不干扰正文阅读。",
                },
            }
            prompt_b = optimize_html_image_slots([slot], scheme_project)[0]["prompt"]

            scheme_dir = output_base / scheme_id
            scheme_dir.mkdir(parents=True, exist_ok=True)
            (scheme_dir / "prompt_a.txt").write_text(prompt_a, encoding="utf-8")
            (scheme_dir / "prompt_b.txt").write_text(prompt_b, encoding="utf-8")

            image_a_path = scheme_dir / "image_a.webp"
            image_b_path = scheme_dir / "image_b.webp"
            err_a = None
            err_b = None

            try:
                img_a = generate_with_retry(provider, prompt_a, aspect_ratio, resolution, max_attempts=3)
                if img_a:
                    img_a.save(image_a_path, format="WEBP", quality=90)
                time.sleep(1.5)
            except Exception as e:  # noqa: BLE001
                err_a = str(e)

            try:
                img_b = generate_with_retry(provider, prompt_b, aspect_ratio, resolution, max_attempts=3)
                if img_b:
                    img_b.save(image_b_path, format="WEBP", quality=90)
                time.sleep(1.5)
            except Exception as e:  # noqa: BLE001
                err_b = str(e)

            runs.append(
                SchemeRun(
                    scheme_id=scheme_id,
                    source_project_id=scheme_project.id,
                    synthetic_source=synthetic,
                    title_seed=title_seed,
                    page_titles=titles,
                    prompt_a=prompt_a,
                    prompt_b=prompt_b,
                    image_a=image_a_path if image_a_path.exists() else None,
                    image_b=image_b_path if image_b_path.exists() else None,
                    error_a=err_a,
                    error_b=err_b,
                )
            )

        grid_path = build_grid(runs, output_base / "comparison_grid.png")
        result = {
            "image_model": image_model,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "output_dir": str(output_base),
            "grid": str(grid_path),
            "schemes": [
                {
                    "scheme_id": r.scheme_id,
                    "source_project_id": r.source_project_id,
                    "synthetic_source": r.synthetic_source,
                    "prompt_a_len": len(r.prompt_a),
                    "prompt_b_len": len(r.prompt_b),
                    "image_a": str(r.image_a) if r.image_a else None,
                    "image_b": str(r.image_b) if r.image_b else None,
                    "error_a": r.error_a,
                    "error_b": r.error_b,
                }
                for r in runs
            ],
        }
        (output_base / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return result


def main() -> None:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = PROJECT_ROOT / "uploads" / "ab_tests" / f"bg_6_schemes_{ts}"
    result = run(out)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

