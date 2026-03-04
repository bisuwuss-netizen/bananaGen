#!/usr/bin/env python3
"""
A/B test for HTML image prompt pipeline.

Experiment target:
- A: original rule-based prompt (frontend-style baseline)
- B: optimized prompt (rule + optional small-model rewrite + quality gate)

Outputs:
- prompt_a.txt
- prompt_b.txt
- prompt_diff.txt
- image_a.webp (optional)
- image_b.webp (optional)
- result.json
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from models import Page, Project
from services.ai_providers import get_image_provider
from services.image_prompt_optimizer import optimize_html_image_slots


def clean_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value).replace("<", "").replace(">", "").replace("`", "").strip()


def collect_page_facts(page: Page, model: Dict[str, Any]) -> List[str]:
    facts: List[str] = []
    outline = page.get_outline_content() or {}
    if outline.get("title"):
        facts.append(clean_text(outline["title"]))
    points = outline.get("points")
    if isinstance(points, list):
        for p in points[:4]:
            t = clean_text(p)
            if t:
                facts.append(t)

    for key in ("title", "subtitle"):
        t = clean_text(model.get(key))
        if t:
            facts.append(t)

    content = model.get("content")
    if isinstance(content, list):
        for c in content[:3]:
            t = clean_text(c)
            if t:
                facts.append(t)
    elif isinstance(content, str):
        t = clean_text(content)
        if t:
            facts.append(t)

    bullets = model.get("bullets")
    if isinstance(bullets, list):
        for b in bullets[:4]:
            if not isinstance(b, dict):
                continue
            for k in ("text", "description"):
                t = clean_text(b.get(k))
                if t:
                    facts.append(t)

    steps = model.get("steps")
    if isinstance(steps, list):
        for s in steps[:4]:
            if not isinstance(s, dict):
                continue
            for k in ("label", "description"):
                t = clean_text(s.get(k))
                if t:
                    facts.append(t)

    desc = page.get_description_content()
    if isinstance(desc, dict):
        for k in ("general_image_description", "image_description", "text"):
            t = clean_text(desc.get(k))
            if t:
                facts.append(t)
    elif isinstance(desc, str):
        t = clean_text(desc)
        if t:
            facts.append(t)

    uniq = []
    seen = set()
    for item in facts:
        if item and len(item) > 1 and item not in seen:
            seen.add(item)
            uniq.append(item)
    return uniq[:8]


def get_layout_intent(layout_id: str, slot_path: str) -> str:
    if layout_id == "process_steps":
        return "生成“流程步骤图”，必须体现先后顺序与动作结果，含1个主体和3-4个流程节点。"
    if layout_id == "title_bullets":
        return "生成“要点解释图”，画面需对应页面要点，至少体现3个相关元素之间关系。"
    if layout_id == "two_column":
        if slot_path.startswith("left"):
            return "该图用于左栏，对应“左侧观点/方案”，与右栏形成对比。"
        if slot_path.startswith("right"):
            return "该图用于右栏，对应“右侧观点/方案”，与左栏形成对比。"
        return "生成“对比信息图”，用于左右栏内容比较，差异要清晰。"
    if layout_id == "image_full":
        return "生成“整页核心场景图”，突出主题对象与关键情境。"
    return "生成“概念解释图”，用于辅助理解，不是背景纹理图。"


def build_baseline_prompt(layout_id: str, scheme_id: str, facts: List[str], slot_path: str) -> str:
    topic_line = (
        f"页面主题与信息：{'；'.join(facts[:6])}"
        if facts else
        "页面主题与信息：专业知识讲解场景"
    )
    scheme_style_map = {
        "tech_blue": "视觉风格：科技教学插画，冷蓝与青灰配色，专业克制，细节清晰。",
        "academic": "视觉风格：学术讲解插画，冷灰与深蓝配色，理性严谨，构图干净。",
        "interactive": "视觉风格：课堂互动插画，明亮但低饱和，亲和活泼，元素清楚。",
        "visual": "视觉风格：叙事感插画，灰度基调+单一强调色，层次分明。",
        "practical": "视觉风格：实操训练插画，工业橙与深灰，强调工具与步骤。",
        "modern": "视觉风格：现代商务视觉，干净留白，几何结构与柔和层次。",
    }
    lines = [
        "任务：为PPT生成“内容解释型配图”，目标是帮助观众理解页面知识点。",
        topic_line,
        get_layout_intent(layout_id, slot_path),
        scheme_style_map.get(scheme_id, scheme_style_map["tech_blue"]),
        "构图要求：主体明确，包含2-4个与主题强相关的具体元素，避免大面积空白。",
        "禁止：文字、数字、Logo、水印、纯抽象渐变、纯装饰边框、无意义背景纹理。",
    ]
    return " ".join(lines)


def infer_slot_path(layout_id: str) -> str:
    if layout_id in ("title_content", "title_bullets", "process_steps"):
        return "image.src"
    if layout_id == "two_column":
        return "left.image_src"
    if layout_id == "image_full":
        return "image_src"
    return "image.src"


def run_experiment(
    project_id: str,
    page_index: int,
    slot_path: str | None,
    out_dir: Path,
    with_images: bool,
) -> Dict[str, Any]:
    app = create_app()
    with app.app_context():
        project = Project.query.get(project_id)
        if not project:
            raise RuntimeError(f"project not found: {project_id}")

        page = Page.query.filter_by(project_id=project_id, order_index=page_index).first()
        if not page:
            raise RuntimeError(f"page not found: project={project_id}, order_index={page_index}")

        layout_id = (page.layout_id or "title_content").strip()
        real_slot_path = slot_path or infer_slot_path(layout_id)
        model = page.get_html_model() or {}
        facts = collect_page_facts(page, model)
        scheme_id = project.scheme_id or "tech_blue"
        title = clean_text((page.get_outline_content() or {}).get("title", ""))

        prompt_a = build_baseline_prompt(layout_id, scheme_id, facts, real_slot_path)
        slot = {
            "page_id": page.id,
            "slot_path": real_slot_path,
            "prompt": prompt_a,
            "context": {
                "layout_id": layout_id,
                "scheme_id": scheme_id,
                "asset_type": "background" if "background" in real_slot_path else "content",
                "slot_role": (
                    "left" if real_slot_path.startswith("left")
                    else "right" if real_slot_path.startswith("right")
                    else "background" if "background" in real_slot_path
                    else "main"
                ),
                "page_title": title,
                "page_facts": facts,
                "project_topic": clean_text(project.idea_prompt or ""),
                "extra_requirements": clean_text(project.extra_requirements or ""),
                "template_style": clean_text(project.template_style or ""),
                "visual_goal": get_layout_intent(layout_id, real_slot_path),
            },
        }

        old_enabled = app.config.get("IMAGE_PROMPT_REWRITE_ENABLED", True)
        try:
            app.config["IMAGE_PROMPT_REWRITE_ENABLED"] = True
            prompt_b = optimize_html_image_slots([slot], project)[0]["prompt"]
        finally:
            app.config["IMAGE_PROMPT_REWRITE_ENABLED"] = old_enabled

        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "prompt_a.txt").write_text(prompt_a, encoding="utf-8")
        (out_dir / "prompt_b.txt").write_text(prompt_b, encoding="utf-8")

        diff = "\n".join(
            difflib.unified_diff(
                prompt_a.split(" "),
                prompt_b.split(" "),
                fromfile="prompt_a",
                tofile="prompt_b",
                lineterm="",
            )
        )
        (out_dir / "prompt_diff.txt").write_text(diff, encoding="utf-8")

        result: Dict[str, Any] = {
            "project_id": project_id,
            "page_index": page_index,
            "page_id": page.id,
            "page_title": title,
            "layout_id": layout_id,
            "slot_path": real_slot_path,
            "scheme_id": scheme_id,
            "facts": facts,
            "prompt_a_len": len(prompt_a),
            "prompt_b_len": len(prompt_b),
            "image_model": app.config.get("IMAGE_MODEL"),
            "with_images": with_images,
            "files": {
                "prompt_a": str(out_dir / "prompt_a.txt"),
                "prompt_b": str(out_dir / "prompt_b.txt"),
                "prompt_diff": str(out_dir / "prompt_diff.txt"),
            },
        }

        if with_images:
            provider = get_image_provider(model=app.config.get("IMAGE_MODEL"))
            aspect_ratio = app.config.get("DEFAULT_ASPECT_RATIO", "16:9")
            resolution = app.config.get("DEFAULT_RESOLUTION", "2K")

            img_a = provider.generate_image(prompt=prompt_a, aspect_ratio=aspect_ratio, resolution=resolution)
            img_b = provider.generate_image(prompt=prompt_b, aspect_ratio=aspect_ratio, resolution=resolution)
            if img_a:
                path_a = out_dir / "image_a.webp"
                img_a.save(path_a, format="WEBP", quality=90)
                result["files"]["image_a"] = str(path_a)
            if img_b:
                path_b = out_dir / "image_b.webp"
                img_b.save(path_b, format="WEBP", quality=90)
                result["files"]["image_b"] = str(path_b)

        (out_dir / "result.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        result["files"]["result"] = str(out_dir / "result.json")
        return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="A/B test html image prompt optimization")
    parser.add_argument("--project-id", required=True, help="target project id")
    parser.add_argument("--page-index", type=int, required=True, help="target page order_index")
    parser.add_argument("--slot-path", default="", help="optional slot path, default inferred by layout")
    parser.add_argument(
        "--out-dir",
        default="uploads/ab_tests",
        help="output base directory (default: uploads/ab_tests)",
    )
    parser.add_argument(
        "--no-images",
        action="store_true",
        help="only compare prompts, do not call image model",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = Path(args.out_dir) / f"{args.project_id}_{args.page_index}_{ts}"
    result = run_experiment(
        project_id=args.project_id,
        page_index=args.page_index,
        slot_path=args.slot_path.strip() or None,
        out_dir=out_dir,
        with_images=not args.no_images,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
