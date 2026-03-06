import re
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class LayoutMixin:

    @staticmethod
    def normalize_outline_layouts(outline: List[Dict], render_mode: str = 'image', scheme_id: str = 'edu_dark') -> List[Dict]:
        from services.prompts.layouts import LAYOUT_SCHEMES, SCHEME_ROLE_LAYOUTS, LAYOUT_ID_ALIASES

        if render_mode != 'html' or not outline:
            return outline

        scheme = LAYOUT_SCHEMES.get(scheme_id or 'edu_dark', LAYOUT_SCHEMES['edu_dark'])
        scheme_layouts = list(scheme.get('layouts', {}).keys())
        if not scheme_layouts:
            scheme_layouts = [
                'cover', 'toc', 'section_title', 'title_content', 'title_bullets',
                'two_column', 'process_steps', 'image_full', 'quote', 'ending'
            ]
        valid_layouts = set(scheme_layouts)
        scheme_roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or 'edu_dark', SCHEME_ROLE_LAYOUTS['edu_dark'])
        cover_id = scheme_roles.get('cover', 'cover')
        toc_id = scheme_roles.get('toc', 'toc')
        ending_id = scheme_roles.get('ending', 'ending')
        is_tech_blue = (scheme_id or 'edu_dark') == 'tech_blue'

        ratio_layouts = ['section_title', 'title_content', 'title_bullets', 'two_column']
        special_layouts = ['process_steps', 'image_full', 'quote']

        def flatten_pages(outline_items: List[Dict]) -> List[Dict]:
            pages = []
            for item in outline_items:
                if isinstance(item, dict) and "part" in item and "pages" in item:
                    for page in item.get("pages", []):
                        pages.append(page)
                else:
                    pages.append(item)
            return pages

        def keyword_in(text: str, keywords: List[str]) -> bool:
            return any(k in text for k in keywords)

        def is_resource_page(text: str) -> bool:
            return keyword_in(text, ["学习资源", "资源推荐", "参考资料", "工具推荐", "学习路径", "课程推荐", "拓展阅读", "延伸阅读"])

        def is_list_like(text: str) -> bool:
            return keyword_in(text, ["要点", "清单", "原则", "维度", "分类", "类型", "列表", "检查项", "建议项"])

        def build_meta(page: Dict) -> Dict:
            title = (page.get('title') or '').strip()
            points = page.get('points') or []
            points_text = " ".join([str(p) for p in points]).lower()
            full_text = f"{title.lower()} {points_text}"
            return {
                'title': title,
                'points_len': len(points) if isinstance(points, list) else 0,
                'full_text': full_text
            }

        def layout_affinity(layout: str, meta: Dict) -> int:
            text = meta['full_text']
            points_len = meta['points_len']
            if layout == 'process_steps':
                return 3 if keyword_in(text, ["流程", "步骤", "阶段", "过程", "方法", "路径", "实施", "执行", "操作"]) else (2 if points_len >= 4 else 1)
            if layout == 'two_column':
                return 3 if keyword_in(text, ["对比", "比较", "差异", "优缺点", "优势", "劣势", "正反", "左右", "双栏"]) else (2 if 2 <= points_len <= 4 else 1)
            if layout == 'quote':
                return 3 if keyword_in(text, ["引用", "名言", "金句", "观点", "语录", "摘录"]) else 1
            if layout == 'image_full':
                return 3 if keyword_in(text, ["案例", "示例", "图", "图片", "示意", "效果", "演示", "截图", "全景", "作品", "海报"]) else (2 if points_len <= 2 else 1)
            if layout == 'section_title':
                return 3 if points_len == 0 else (2 if points_len == 1 else 1)
            if layout == 'title_content':
                return 3 if points_len <= 3 else (2 if points_len == 4 else 1)
            if layout == 'title_bullets':
                if is_list_like(text):
                    return 3
                return 3 if points_len >= 5 else (2 if points_len >= 4 else 1)
            return 1

        def image_affinity(page: Dict, index: int) -> int:
            title = str(page.get('title') or '')
            points = page.get('points') or []
            points_text = " ".join([str(p) for p in points]) if isinstance(points, list) else str(points or '')
            text = f"{title} {points_text}".lower()
            base_layout = LAYOUT_ID_ALIASES.get(page.get('layout_id'), page.get('layout_id'))
            score = 0
            if base_layout in {'image_full'}:
                score += 10
            if keyword_in(text, ["案例", "示意", "截图", "效果", "演示", "作品", "可视化", "对比图", "图表", "前后"]):
                score += 3
            if keyword_in(text, ["流程", "步骤", "路径", "架构"]):
                score += 2
            if keyword_in(text, ["定义", "概念", "原理", "总结", "回顾", "答疑"]):
                score -= 2
            if index <= 1 or index >= total - 2:
                score -= 1
            if bool(page.get('has_image', False)):
                score += 1
            return score

        pages = flatten_pages(outline)
        if not pages:
            return outline

        total = len(pages)
        for idx, page in enumerate(pages):
            if not isinstance(page, dict):
                continue
            if idx == 0:
                page['layout_id'] = cover_id
                continue
            if idx == 1 and total >= 2:
                page['layout_id'] = toc_id
                continue
            if idx == total - 1 and total >= 2:
                page['layout_id'] = ending_id
                continue

            title = (page.get('title') or '').strip()
            points = page.get('points') or []
            points_text = " ".join([str(p) for p in points]).lower()
            full_text = f"{title.lower()} {points_text}"

            if is_resource_page(full_text):
                if is_tech_blue:
                    page['layout_id'] = 'title_bullets'
                else:
                    candidates = [lid for lid in scheme_layouts
                                  if lid not in {cover_id, toc_id, ending_id}
                                  and LAYOUT_ID_ALIASES.get(lid, lid) == 'title_bullets']
                    if candidates:
                        page['layout_id'] = candidates[0]
                page['has_image'] = False
                page['keywords'] = []

            current_layout = page.get('layout_id')
            if current_layout in valid_layouts and current_layout not in {cover_id, toc_id, ending_id}:
                continue

            if is_resource_page(full_text):
                base_layout = 'title_bullets'
            if keyword_in(full_text, ["流程", "步骤", "阶段", "过程", "方法", "路径", "实施", "执行", "操作"]):
                base_layout = 'process_steps'
            elif keyword_in(full_text, ["对比", "比较", "差异", "优缺点", "优势", "劣势", "正反", "左右", "双栏"]):
                base_layout = 'two_column'
            elif keyword_in(full_text, ["引用", "名言", "金句", "观点", "语录", "摘录"]):
                base_layout = 'quote'
            elif keyword_in(full_text, ["案例", "示例", "图", "图片", "示意", "效果", "演示", "截图", "全景", "作品", "海报"]):
                base_layout = 'image_full'
            else:
                if isinstance(points, list) and len(points) == 0:
                    base_layout = 'section_title'
                elif is_list_like(full_text):
                    base_layout = 'title_bullets'
                elif isinstance(points, list) and len(points) <= 3:
                    base_layout = 'title_content'
                else:
                    base_layout = 'title_bullets'

            if is_tech_blue:
                layout = base_layout
            else:
                candidates = [lid for lid in scheme_layouts
                              if lid not in {cover_id, toc_id, ending_id}
                              and LAYOUT_ID_ALIASES.get(lid, lid) == base_layout]
                if not candidates:
                    candidates = [lid for lid in scheme_layouts if lid not in {cover_id, toc_id, ending_id}]
                layout = candidates[idx % len(candidates)] if candidates else cover_id

            page['layout_id'] = layout if layout in valid_layouts else (scheme_layouts[0] if scheme_layouts else 'title_content')
            if is_resource_page(full_text):
                page['has_image'] = False
                page['keywords'] = []

        content_bases = ['title_content', 'title_bullets', 'two_column', 'process_steps']
        content_layout_map = {base: [] for base in content_bases}
        for lid in scheme_layouts:
            base = LAYOUT_ID_ALIASES.get(lid, lid)
            if base in content_layout_map:
                content_layout_map[base].append(lid)

        def pick_layout(base: str, seed: int) -> str:
            candidates = content_layout_map.get(base) or []
            if not candidates:
                return base
            return candidates[seed % len(candidates)]

        def normalize_section_title(title: str) -> str:
            if not title:
                return "本章内容"
            cleaned = re.sub(r"^第\\s*[0-9一二三四五六七八九十]+\\s*部分[:：\\-\\s]*", "", title)
            cleaned = cleaned.strip()
            return cleaned or title

        def build_points(topic: str) -> List[str]:
            return [
                f"{topic}的定义与范围",
                f"{topic}的核心特征与价值",
                f"{topic}的应用场景与注意事项"
            ]

        def make_insert_pages(section_title: str, count: int, seed: int) -> List[Dict]:
            topic = normalize_section_title(section_title)
            suffixes = ["概念解析", "关键要点", "应用示例", "常见误区"]
            inserts: List[Dict] = []
            for i in range(count):
                base = content_bases[(seed + i) % len(content_bases)]
                title = f"{topic}：{suffixes[(seed + i) % len(suffixes)]}"
                inserts.append({
                    'title': title,
                    'points': build_points(topic),
                    'layout_id': pick_layout(base, seed + i),
                    'has_image': False,
                    'keywords': []
                })
            return inserts

        def enforce_section_gaps(pages_list: List[Dict]) -> List[Dict]:
            new_pages: List[Dict] = []
            total_pages = len(pages_list)
            for idx, page in enumerate(pages_list):
                new_pages.append(page)
                if not isinstance(page, dict):
                    continue
                base = LAYOUT_ID_ALIASES.get(page.get('layout_id'), page.get('layout_id'))
                if base != 'section_title':
                    continue
                j = idx + 1
                run_len = 0
                while j < total_pages:
                    next_page = pages_list[j]
                    if not isinstance(next_page, dict):
                        j += 1
                        continue
                    next_base = LAYOUT_ID_ALIASES.get(next_page.get('layout_id'), next_page.get('layout_id'))
                    if next_base == 'section_title':
                        break
                    run_len += 1
                    j += 1
                missing = 2 - run_len
                if missing > 0:
                    new_pages.extend(make_insert_pages(page.get('title', '本章内容'), missing, idx))
            return new_pages

        def assign_section_numbers(pages_list: List[Dict]) -> None:
            section_index = 0
            for page in pages_list:
                if not isinstance(page, dict):
                    continue
                base = LAYOUT_ID_ALIASES.get(page.get('layout_id'), page.get('layout_id'))
                if base == 'section_title':
                    section_index += 1
                    page['section_number'] = f"{section_index:02d}"

        def enforce_reserved_positions(pages_list: List[Dict]) -> None:
            if not pages_list:
                return
            if len(pages_list) >= 1:
                pages_list[0]['layout_id'] = cover_id
            if len(pages_list) >= 2:
                pages_list[1]['layout_id'] = toc_id
            if len(pages_list) >= 2:
                pages_list[-1]['layout_id'] = ending_id

        if any(isinstance(item, dict) and "pages" in item for item in outline):
            for item in outline:
                if isinstance(item, dict) and "pages" in item:
                    item["pages"] = enforce_section_gaps(item.get("pages", []))
            pages = flatten_pages(outline)
        else:
            outline[:] = enforce_section_gaps(outline)
            pages = outline

        enforce_reserved_positions(pages)
        assign_section_numbers(pages)

        total = len(pages)

        def build_section_follow_indices(pages_list: List[Dict]) -> set:
            protected = set()
            for i, p in enumerate(pages_list):
                if not isinstance(p, dict):
                    continue
                base = LAYOUT_ID_ALIASES.get(p.get('layout_id'), p.get('layout_id'))
                if base == 'section_title':
                    if i + 1 < len(pages_list):
                        protected.add(i + 1)
                    if i + 2 < len(pages_list):
                        protected.add(i + 2)
            return protected

        section_follow_indices = build_section_follow_indices(pages)

        if total < 4:
            return outline

        current_counts = {}
        for page in pages:
            if not isinstance(page, dict):
                continue
            lid = page.get('layout_id')
            if lid in valid_layouts:
                current_counts[lid] = current_counts.get(lid, 0) + 1

        reserved_indices = {0, 1, total - 1} if total >= 3 else {0}
        candidate_indices = [i for i in range(total) if i not in reserved_indices]

        kept_special_indices = set()
        if is_tech_blue:
            special_cap = max(1, round(max(1, total - 3) * 0.2))
            for layout in special_layouts:
                indices = [i for i in candidate_indices if pages[i].get('layout_id') == layout]
                if not indices:
                    continue
                ranked = sorted(
                    indices,
                    key=lambda idx: layout_affinity(layout, build_meta(pages[idx])),
                    reverse=True
                )
                for keep_idx in ranked[:special_cap]:
                    kept_special_indices.add(keep_idx)

            if total >= 10:
                missing = [l for l in valid_layouts if current_counts.get(l, 0) == 0]
            else:
                missing = [l for l in valid_layouts if current_counts.get(l, 0) == 0 and l in ratio_layouts]

            locked_indices = set(reserved_indices) | kept_special_indices

            def pick_candidate(target_layout: str) -> Optional[int]:
                available = [i for i in candidate_indices if i not in locked_indices]
                if target_layout == 'section_title':
                    available = [i for i in available if i not in section_follow_indices]
                if not available:
                    return None
                return max(available, key=lambda idx: layout_affinity(target_layout, build_meta(pages[idx])))

            for layout in missing:
                if layout in {'cover', 'toc', 'ending'}:
                    continue
                idx = pick_candidate(layout)
                if idx is None:
                    continue
                pages[idx]['layout_id'] = layout
                locked_indices.add(idx)

            current_counts = {}
            for page in pages:
                if not isinstance(page, dict):
                    continue
                lid = page.get('layout_id')
                if lid in valid_layouts:
                    current_counts[lid] = current_counts.get(lid, 0) + 1

            pool_indices = [i for i in candidate_indices if i not in kept_special_indices]
            if pool_indices:
                pool_size = len(pool_indices)
                weights = {'section_title': 2, 'title_content': 4, 'title_bullets': 1, 'two_column': 3}
                weight_total = sum(weights.values()) or 1

                raw_targets = {k: pool_size * v / weight_total for k, v in weights.items()}
                targets = {k: int(raw_targets[k]) for k in weights}
                total_base = sum(targets.values())

                if pool_size >= 4:
                    for k in targets:
                        if targets[k] == 0:
                            targets[k] = 1
                            total_base += 1

                remainder = pool_size - total_base
                if remainder > 0:
                    fractions = sorted(
                        [(raw_targets[k] - int(raw_targets[k]), k) for k in weights],
                        reverse=True
                    )
                    idx = 0
                    while remainder > 0:
                        k = fractions[idx % len(fractions)][1]
                        targets[k] += 1
                        remainder -= 1
                        idx += 1
                elif remainder < 0:
                    while remainder < 0:
                        k = max(targets, key=lambda key: targets[key])
                        if pool_size >= 4 and targets[k] <= 1:
                            candidates = [x for x in targets if targets[x] > 1]
                            if not candidates:
                                break
                            k = max(candidates, key=lambda key: targets[key])
                        targets[k] -= 1
                        remainder += 1

                unassigned = set(pool_indices)
                assigned = {}
                for layout in ratio_layouts:
                    if targets[layout] <= 0:
                        continue
                    candidates = list(unassigned)
                    if layout == 'section_title':
                        candidates = [i for i in candidates if i not in section_follow_indices]
                    candidates.sort(
                        key=lambda idx: layout_affinity(layout, build_meta(pages[idx])),
                        reverse=True
                    )
                    chosen = candidates[:targets[layout]]
                    for idx in chosen:
                        assigned[idx] = layout
                        if idx in unassigned:
                            unassigned.remove(idx)

                if unassigned:
                    remaining_needs = {k: targets[k] - list(assigned.values()).count(k) for k in ratio_layouts}
                    for idx in list(unassigned):
                        layout = max(remaining_needs, key=lambda k: remaining_needs[k])
                        assigned[idx] = layout
                        remaining_needs[layout] -= 1
                        if remaining_needs[layout] < 0:
                            remaining_needs[layout] = 0

                for idx, layout in assigned.items():
                    pages[idx]['layout_id'] = layout

            for i in range(2, total - 1):
                current = pages[i].get('layout_id')
                prev = pages[i - 1].get('layout_id')
                if current == prev and current in {'title_bullets', 'two_column', 'title_content'}:
                    alternatives = [l for l in ratio_layouts + special_layouts
                                    if l != current and l in valid_layouts]
                    if alternatives:
                        alt = min(alternatives, key=lambda l: current_counts.get(l, 0))
                        pages[i]['layout_id'] = alt
                        current_counts[current] = max(0, current_counts.get(current, 0) - 1)
                        current_counts[alt] = current_counts.get(alt, 0) + 1
        else:
            if total >= len(scheme_layouts):
                missing = [l for l in scheme_layouts if current_counts.get(l, 0) == 0]
                if missing:
                    duplicates = [i for i in candidate_indices if current_counts.get(pages[i].get('layout_id'), 0) > 1]
                    for layout in missing:
                        if not duplicates:
                            break
                        idx = duplicates.pop(0)
                        current_layout = pages[idx].get('layout_id')
                        if current_layout in current_counts:
                            current_counts[current_layout] = max(0, current_counts[current_layout] - 1)
                        pages[idx]['layout_id'] = layout
                        current_counts[layout] = current_counts.get(layout, 0) + 1

            content_layout_ids = [
                lid for lid in scheme_layouts
                if lid not in {cover_id, toc_id, ending_id}
            ]
            if content_layout_ids and candidate_indices:
                max_per_layout = max(
                    2,
                    (len(candidate_indices) + len(content_layout_ids) - 1) // len(content_layout_ids) + 1
                )
                content_counts = {lid: 0 for lid in content_layout_ids}
                for idx in candidate_indices:
                    lid = pages[idx].get('layout_id')
                    if lid in content_counts:
                        content_counts[lid] += 1

                for idx in candidate_indices:
                    current_layout = pages[idx].get('layout_id')
                    if current_layout not in content_counts:
                        continue
                    if content_counts[current_layout] <= max_per_layout:
                        continue
                    replacement = min(content_layout_ids, key=lambda lid: content_counts.get(lid, 0))
                    if replacement == current_layout:
                        continue
                    if content_counts.get(replacement, 0) >= max_per_layout:
                        continue
                    pages[idx]['layout_id'] = replacement
                    content_counts[current_layout] = max(0, content_counts.get(current_layout, 0) - 1)
                    content_counts[replacement] = content_counts.get(replacement, 0) + 1

        for i in range(1, total):
            prev_base = LAYOUT_ID_ALIASES.get(pages[i - 1].get('layout_id'), pages[i - 1].get('layout_id'))
            curr_base = LAYOUT_ID_ALIASES.get(pages[i].get('layout_id'), pages[i].get('layout_id'))
            if prev_base == 'section_title' and curr_base == 'section_title':
                base = content_bases[i % len(content_bases)]
                pages[i]['layout_id'] = pick_layout(base, i)

        assign_section_numbers(pages)

        if total >= 3:
            required_image_indices = set()
            optional_indices = []
            reserved_no_image_bases = {'toc', 'section_title', 'quote', 'ending'}
            optional_image_bases = {'title_content', 'title_bullets', 'process_steps', 'two_column'}

            for i, page in enumerate(pages):
                if not isinstance(page, dict):
                    continue
                base_layout = LAYOUT_ID_ALIASES.get(page.get('layout_id'), page.get('layout_id'))
                if i == 0 and base_layout == 'cover':
                    continue
                if base_layout == 'image_full':
                    required_image_indices.add(i)
                    page['has_image'] = True
                    continue
                if base_layout in reserved_no_image_bases:
                    page['has_image'] = False
                    page['keywords'] = []
                    continue
                if base_layout in optional_image_bases:
                    optional_indices.append(i)

            content_count = max(1, len([i for i in range(total) if i not in {0, 1, total - 1}]))
            target_total_images = max(3, round(content_count * 0.28))
            target_total_images = min(target_total_images, max(5, round(content_count * 0.35)))
            target_optional_images = max(0, target_total_images - len(required_image_indices))

            ranked_optional = sorted(
                optional_indices,
                key=lambda idx: image_affinity(pages[idx], idx),
                reverse=True
            )

            selected_optional: List[int] = []
            for idx in ranked_optional:
                if len(selected_optional) >= target_optional_images:
                    break
                if any(abs(idx - prev) <= 1 for prev in selected_optional):
                    continue
                selected_optional.append(idx)

            selected = set(selected_optional) | required_image_indices
            for i in optional_indices:
                page = pages[i]
                page['has_image'] = i in selected
                if not page['has_image']:
                    page['keywords'] = []
                elif not page.get('keywords'):
                    title_kw = str(page.get('title') or '').strip()
                    page['keywords'] = [title_kw[:20], "场景示意", "视觉辅助"] if title_kw else ["场景示意", "视觉辅助"]

        final_counts = {}
        for page in pages:
            if not isinstance(page, dict):
                continue
            lid = page.get('layout_id')
            if lid in valid_layouts:
                final_counts[lid] = final_counts.get(lid, 0) + 1
        try:
            if is_tech_blue:
                ordered = {k: final_counts.get(k, 0) for k in [
                    'cover', 'toc', 'section_title', 'title_content', 'title_bullets',
                    'two_column', 'process_steps', 'image_full', 'quote', 'ending'
                ]}
                logger.info(f"[layout_distribution] scheme={scheme_id} total={total} {ordered}")
            else:
                logger.info(f"[layout_distribution] scheme={scheme_id} total={total} {final_counts}")
        except Exception:
            logger.info(f"[layout_distribution] scheme={scheme_id} total={total} {final_counts}")

        return outline
