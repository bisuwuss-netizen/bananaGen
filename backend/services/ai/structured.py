import json
import logging
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)


class StructuredMixin:

    def _fix_empty_sections(self, outline: Dict, scheme_id: str = 'edu_dark') -> Dict:
        from services.prompts.layouts import LAYOUT_SCHEMES, SCHEME_ROLE_LAYOUTS, LAYOUT_ID_ALIASES

        if 'pages' not in outline or len(outline['pages']) < 2:
            return outline

        pages = outline['pages']
        role = SCHEME_ROLE_LAYOUTS.get(scheme_id, SCHEME_ROLE_LAYOUTS['edu_dark'])
        cover_id = role.get('cover', 'cover')
        toc_id = role.get('toc', 'toc')
        ending_id = role.get('ending', 'ending')
        ending_base = LAYOUT_ID_ALIASES.get(ending_id, ending_id)

        scheme_layouts = list(
            (LAYOUT_SCHEMES.get(scheme_id, LAYOUT_SCHEMES['edu_dark']) or {}).get('layouts', {}).keys()
        )
        reserved_layouts = {cover_id, toc_id, ending_id}

        preferred_bases = ['title_content', 'title_bullets', 'two_column', 'process_steps']
        content_layouts: List[str] = []
        for base in preferred_bases:
            matches = [
                lid for lid in scheme_layouts
                if lid not in reserved_layouts and LAYOUT_ID_ALIASES.get(lid, lid) == base
            ]
            content_layouts.extend(matches)

        if not content_layouts:
            content_layouts = [lid for lid in scheme_layouts if lid not in reserved_layouts]
        if not content_layouts:
            content_layouts = ['title_content', 'title_bullets', 'two_column', 'process_steps']

        fixed_pages = []
        i = 0
        while i < len(pages):
            current_page = pages[i]
            current_layout = current_page.get('layout_id', '')
            current_base = LAYOUT_ID_ALIASES.get(current_layout, current_layout)
            fixed_pages.append(current_page)

            needs_fix = False
            if current_base == 'section_title' and i + 1 < len(pages):
                next_layout = pages[i + 1].get('layout_id', '')
                next_base = LAYOUT_ID_ALIASES.get(next_layout, next_layout)
                if next_base == 'section_title':
                    needs_fix = True
                if next_layout == ending_id or next_base == ending_base:
                    needs_fix = True

            if needs_fix:
                section_title = current_page.get('title', '章节')
                for j in range(2):
                    layout_id = content_layouts[j % len(content_layouts)]
                    new_page = {
                        'page_id': f"p{len(fixed_pages)+1:02d}_inserted",
                        'title': f"{section_title} - 内容{j+1}",
                        'layout_id': layout_id,
                        'has_image': j == 0,
                        'keywords': [section_title, '内容展示'] if j == 0 else []
                    }
                    fixed_pages.append(new_page)
            i += 1

        for idx, page in enumerate(fixed_pages, 1):
            page['page_id'] = f"p{idx:02d}"

        outline['pages'] = fixed_pages
        return outline

    def generate_structured_outline(self, topic: str, requirements: str = "", language: str = 'zh', scheme_id: str = 'edu_dark') -> Dict:
        from services.prompts.layouts import LAYOUT_SCHEMES, SCHEME_ROLE_LAYOUTS
        from services.prompts.structured_content import get_structured_outline_prompt
        from services.presentation.ppt_quality_guard import apply_structured_outline_quality_guard
        from services.presentation.narrative_continuity import enrich_outline_with_narrative_contract

        prompt = get_structured_outline_prompt(topic, requirements, language, scheme_id=scheme_id)
        outline = self.generate_json(prompt, thinking_budget=1000)

        scheme = LAYOUT_SCHEMES.get(scheme_id, LAYOUT_SCHEMES['edu_dark'])
        valid_layouts = list(scheme.get('layouts', {}).keys())

        if 'pages' in outline:
            for page in outline['pages']:
                if page.get('layout_id') not in valid_layouts:
                    role = SCHEME_ROLE_LAYOUTS.get(scheme_id, SCHEME_ROLE_LAYOUTS['edu_dark'])
                    fallback = role.get('cover') if page.get('page_id') == 'p01' else (valid_layouts[0] if valid_layouts else 'title_content')
                    page['layout_id'] = fallback
                if 'has_image' not in page:
                    page['has_image'] = False
                if 'keywords' not in page:
                    page['keywords'] = []

            outline = self._fix_empty_sections(outline, scheme_id)
            outline['pages'] = self.normalize_outline_layouts(
                outline.get('pages', []), render_mode='html', scheme_id=scheme_id
            )

        guarded = apply_structured_outline_quality_guard(outline, scheme_id=scheme_id)
        return enrich_outline_with_narrative_contract(guarded)

    def generate_structured_page_content(self, page_outline: Dict,
                                         full_outline: Dict = None,
                                         language: str = 'zh',
                                         scheme_id: str = 'edu_dark',
                                         content_depth: str = 'balanced',
                                         continuity_context: Dict = None,
                                         rewrite_instruction: str = "",
                                         thinking_budget: int = 320,
                                         return_metadata: bool = False) -> Dict:
        from services.prompts.layouts import LAYOUT_ID_ALIASES
        from services.prompts.structured_content import get_structured_page_content_prompt
        from services.presentation.ppt_quality_guard import apply_page_model_quality_guard
        from services.presentation.narrative_continuity import apply_template_capacity

        layout_id = page_outline.get('layout_id', 'title_content').lower()

        if 'toc' in layout_id and full_outline:
            toc_model = self._generate_toc_model(page_outline, full_outline, language)
            if return_metadata:
                return {'model': toc_model, 'closed_promise_ids': []}
            return toc_model

        prompt = get_structured_page_content_prompt(
            page_outline=page_outline, full_outline=full_outline,
            language=language, scheme_id=scheme_id,
            continuity_context=continuity_context, rewrite_instruction=rewrite_instruction
        )
        raw_result = self.generate_json(prompt, thinking_budget=max(100, int(thinking_budget or 320)))

        def _normalize_closed_ids(value: Any) -> List[str]:
            if not isinstance(value, list):
                return []
            cleaned: List[str] = []
            seen = set()
            for item in value:
                text = str(item or "").strip()
                if not text or text in seen:
                    continue
                seen.add(text)
                cleaned.append(text)
                if len(cleaned) >= 12:
                    break
            return cleaned

        model: Dict[str, Any]
        closed_promise_ids: List[str] = []
        if isinstance(raw_result, dict) and isinstance(raw_result.get('model'), dict):
            model = raw_result.get('model') or {}
            closed_promise_ids = _normalize_closed_ids(raw_result.get('closed_promise_ids'))
        elif isinstance(raw_result, dict):
            model = raw_result
        else:
            model = {}

        def extract_text_fields(lid: str, model_data: Dict) -> List[str]:
            parts: List[str] = []
            if lid == 'title_content':
                parts.extend([str(x) for x in model_data.get('content', []) if x])
                if model_data.get('highlight'):
                    parts.append(str(model_data.get('highlight')))
            elif lid == 'title_bullets':
                for b in model_data.get('bullets', []):
                    if isinstance(b, dict):
                        if b.get('text'): parts.append(str(b['text']))
                        if b.get('description'): parts.append(str(b['description']))
                    else:
                        parts.append(str(b))
            elif lid == 'two_column':
                for side in ['left', 'right']:
                    col = model_data.get(side) or {}
                    if col.get('header'): parts.append(str(col['header']))
                    for c in col.get('content', []) or []: parts.append(str(c))
                    for b in col.get('bullets', []) or []:
                        if isinstance(b, dict):
                            if b.get('text'): parts.append(str(b['text']))
                            if b.get('description'): parts.append(str(b['description']))
                        else:
                            parts.append(str(b))
            elif lid == 'process_steps':
                for s in model_data.get('steps', []) or []:
                    if s.get('label'): parts.append(str(s['label']))
                    if s.get('description'): parts.append(str(s['description']))
            return parts

        def ensure_length(lid: str, model_data: Dict, title: str, depth: str = 'balanced') -> Dict:
            depth_configs = {
                'concise': (80, 120), 'balanced': (120, 180), 'detailed': (180, 280)
            }
            target_min, target_max = depth_configs.get(depth, (120, 180))
            if lid not in {'title_content', 'title_bullets', 'two_column', 'process_steps'}:
                return model_data

            parts = extract_text_fields(lid, model_data)
            total_len = len("".join(parts))

            def add_sentence(text: str) -> str:
                return f"{text}。理解其适用条件与常见误区，可提升实际应用效果。"

            if total_len < target_min:
                if lid == 'title_content':
                    content = model_data.get('content', [])
                    if not isinstance(content, list): content = [str(content)]
                    if not content: content = [add_sentence(title)]
                    else: content[-1] = str(content[-1]) + add_sentence(title)
                    model_data['content'] = content
                elif lid == 'title_bullets':
                    bullets = model_data.get('bullets', [])
                    if bullets:
                        b0 = bullets[0]
                        if isinstance(b0, dict): b0['description'] = (b0.get('description') or '') + add_sentence(title)
                        else: bullets[0] = str(b0) + add_sentence(title)
                    else:
                        bullets = [{'icon': 'fa-lightbulb', 'text': title, 'description': add_sentence(title)}]
                    model_data['bullets'] = bullets
                elif lid == 'two_column':
                    right = model_data.get('right') or {}
                    content = right.get('content', [])
                    if not isinstance(content, list): content = [str(content)]
                    content.append(f"结论：{title}需要结合目标与场景权衡选择。")
                    right['content'] = content
                    model_data['right'] = right
                elif lid == 'process_steps':
                    steps = model_data.get('steps', [])
                    if steps: steps[-1]['description'] = (steps[-1].get('description') or '') + add_sentence(title)
                    else: steps = [{'number': 1, 'label': title or '步骤', 'description': add_sentence(title), 'icon': 'fa-check'}]
                    model_data['steps'] = steps

            if lid == 'title_bullets':
                for b in model_data.get('bullets', []):
                    if isinstance(b, dict) and not b.get('description'):
                        b['description'] = f"说明：{b.get('text', '')}的关键点与适用场景。"
            elif lid == 'two_column':
                for side in ['left', 'right']:
                    col = model_data.get(side) or {}
                    content = col.get('content', [])
                    if not content and col.get('bullets'):
                        content = [f"解释：{title}在该维度的差异与影响。"]
                    col['content'] = content
                    model_data[side] = col

            parts = extract_text_fields(lid, model_data)
            total_len = len("".join(parts))
            if total_len > target_max:
                overflow = total_len - target_max
                def trim_text(text: str, cut: int) -> str:
                    return text[:-cut] if cut < len(text) else text[:max(0, len(text) - 1)]

                if lid == 'title_content':
                    content = model_data.get('content', [])
                    if content: content[-1] = trim_text(str(content[-1]), overflow); model_data['content'] = content
                elif lid == 'title_bullets':
                    bullets = model_data.get('bullets', [])
                    if bullets:
                        b0 = bullets[0]
                        if isinstance(b0, dict) and b0.get('description'): b0['description'] = trim_text(str(b0['description']), overflow)
                        elif isinstance(b0, str): bullets[0] = trim_text(b0, overflow)
                        model_data['bullets'] = bullets
                elif lid == 'two_column':
                    right = model_data.get('right') or {}
                    content = right.get('content', [])
                    if content: content[-1] = trim_text(str(content[-1]), overflow); right['content'] = content; model_data['right'] = right
                elif lid == 'process_steps':
                    steps = model_data.get('steps', [])
                    if steps: steps[-1]['description'] = trim_text(str(steps[-1].get('description', '')), overflow); model_data['steps'] = steps

            return model_data

        layout_id = page_outline.get('layout_id', 'title_content')
        resolved_layout_id = LAYOUT_ID_ALIASES.get(layout_id, layout_id)
        if page_outline.get('has_image') and resolved_layout_id in ['title_content', 'title_bullets', 'process_steps']:
            if 'image' not in model:
                model['image'] = {
                    'src': '', 'alt': ' '.join(page_outline.get('keywords', [])),
                    'position': 'right', 'width': '40%'
                }
            elif not model['image'].get('src'):
                model['image']['src'] = ''

        model = ensure_length(resolved_layout_id, model, page_outline.get('title', ''), content_depth)
        model = apply_page_model_quality_guard(layout_id=layout_id, model=model, page_outline=page_outline)
        model = apply_template_capacity(
            layout_id=layout_id, model=model,
            constraints=(continuity_context or {}).get('template_constraints') if isinstance(continuity_context, dict) else None
        )
        layout_variant = str(page_outline.get('layout_variant') or 'a').strip().lower() or 'a'
        if isinstance(model, dict):
            model['variant'] = layout_variant
            model['layout_variant'] = layout_variant
            if page_outline.get('layout_archetype'):
                model['layout_archetype'] = page_outline.get('layout_archetype')

        if return_metadata:
            return {'model': model, 'closed_promise_ids': closed_promise_ids}
        return model

    def generate_structured_page_content_batch(self,
                                               batch_requests: List[Dict[str, Any]],
                                               language: str = 'zh',
                                               scheme_id: str = 'edu_dark',
                                               thinking_budget: int = 280) -> Dict[str, Dict[str, Any]]:
        from services.prompts.structured_content import get_structured_page_content_batch_prompt
        from services.presentation.ppt_quality_guard import apply_page_model_quality_guard
        from services.presentation.narrative_continuity import apply_template_capacity

        if not isinstance(batch_requests, list) or not batch_requests:
            return {}

        prompt = get_structured_page_content_batch_prompt(
            batch_requests=batch_requests, language=language, scheme_id=scheme_id,
        )
        result = self.generate_json(prompt, thinking_budget=max(100, int(thinking_budget or 280)))

        page_outline_by_id: Dict[str, Dict[str, Any]] = {}
        context_by_id: Dict[str, Dict[str, Any]] = {}
        for item in batch_requests:
            if not isinstance(item, dict): continue
            page_outline = item.get('page_outline') if isinstance(item.get('page_outline'), dict) else {}
            page_id = str(page_outline.get('page_id') or '').strip()
            if not page_id: continue
            page_outline_by_id[page_id] = page_outline
            context_by_id[page_id] = item.get('continuity_context') if isinstance(item.get('continuity_context'), dict) else {}

        output: Dict[str, Dict[str, Any]] = {}
        parsed_items = result if isinstance(result, list) else []
        for row in parsed_items:
            if not isinstance(row, dict): continue
            page_id = str(row.get('page_id') or '').strip()
            if not page_id or page_id not in page_outline_by_id: continue

            model = row.get('model') if isinstance(row.get('model'), dict) else {}
            closed_ids_raw = row.get('closed_promise_ids') if isinstance(row.get('closed_promise_ids'), list) else []
            closed_ids: List[str] = []
            seen = set()
            for item in closed_ids_raw:
                pid = str(item or '').strip()
                if not pid or pid in seen: continue
                seen.add(pid)
                closed_ids.append(pid)
                if len(closed_ids) >= 12: break

            page_outline = page_outline_by_id[page_id]
            lid = page_outline.get('layout_id', 'title_content')
            model = apply_page_model_quality_guard(layout_id=lid, model=model, page_outline=page_outline)
            model = apply_template_capacity(
                layout_id=lid, model=model,
                constraints=context_by_id.get(page_id, {}).get('template_constraints') if isinstance(context_by_id.get(page_id), dict) else None
            )
            layout_variant = str(page_outline.get('layout_variant') or 'a').strip().lower() or 'a'
            if isinstance(model, dict):
                model['variant'] = layout_variant
                model['layout_variant'] = layout_variant
                if page_outline.get('layout_archetype'):
                    model['layout_archetype'] = page_outline.get('layout_archetype')
            output[page_id] = {'model': model, 'closed_promise_ids': closed_ids}

        return output

    @staticmethod
    def _normalize_continuity_review_result(result: Any, valid_page_ids: List[str]) -> Dict[str, Any]:
        valid_set = set(valid_page_ids or [])
        rewrite_pages: List[Dict[str, Any]] = []

        if isinstance(result, dict):
            raw_pages = result.get('rewrite_pages')
            if isinstance(raw_pages, list):
                for item in raw_pages:
                    if not isinstance(item, dict): continue
                    page_id = str(item.get('page_id') or '').strip()
                    if not page_id or (valid_set and page_id not in valid_set): continue
                    instruction = str(item.get('instruction') or '').strip()
                    reason = str(item.get('reason') or '').strip()
                    if not instruction and reason: instruction = f"修复问题：{reason}"
                    if not instruction: instruction = "补齐与前后文的衔接，兑现未完成承诺，避免重复表达。"
                    rewrite_pages.append({
                        'page_id': page_id, 'reason': reason or '叙事连贯性问题',
                        'instruction': instruction,
                        'close_promises': item.get('close_promises') if isinstance(item.get('close_promises'), list) else []
                    })

        deduped: List[Dict[str, Any]] = []
        seen = set()
        for item in rewrite_pages:
            if item['page_id'] in seen: continue
            seen.add(item['page_id'])
            deduped.append(item)

        return {
            'rewrite_pages': deduped[:4],
            'global_notes': result.get('global_notes', []) if isinstance(result, dict) and isinstance(result.get('global_notes'), list) else []
        }

    def review_structured_document_continuity(self, outline_doc: Dict[str, Any],
                                              generated_pages: List[Dict[str, Any]],
                                              deterministic_issues: Optional[List[Dict[str, Any]]] = None,
                                              language: str = 'zh') -> Dict[str, Any]:
        from services.prompts.language import get_language_instruction
        from services.presentation.narrative_continuity import build_page_summary

        if not isinstance(outline_doc, dict) or not isinstance(generated_pages, list):
            return {'rewrite_pages': [], 'global_notes': []}

        outline_pages = outline_doc.get('pages') if isinstance(outline_doc.get('pages'), list) else []
        valid_page_ids = [str(p.get('page_id')) for p in outline_pages if isinstance(p, dict) and p.get('page_id')]

        compact_outline = [
            {'page_id': p.get('page_id'), 'title': p.get('title'), 'layout_id': p.get('layout_id'),
             'depends_on': p.get('depends_on', []), 'must_cover': p.get('must_cover', []),
             'promises_open': p.get('promises_open', []), 'promises_close': p.get('promises_close', [])}
            for p in outline_pages if isinstance(p, dict)
        ]

        compact_generated = []
        for item in generated_pages:
            if not isinstance(item, dict): continue
            model = item.get('model') if isinstance(item.get('model'), dict) else {}
            title = item.get('title') or model.get('title') or ''
            summary = build_page_summary({'layout_id': item.get('layout_id'), 'title': title}, model)
            compact_generated.append({'page_id': item.get('page_id'), 'title': title, 'layout_id': item.get('layout_id'), 'summary': summary})

        deterministic_payload = deterministic_issues if isinstance(deterministic_issues, list) else []
        prompt = f"""\
你是一位PPT叙事审校专家。请审查以下文档是否存在：
1) 前后内容断裂
2) 承诺未兑现（前页提到后续展开但后面没讲）
3) 重复内容
4) 突兀跳转

请严格返回 JSON：
{{
  "rewrite_pages": [
    {{
      "page_id": "p05",
      "reason": "该页问题",
      "instruction": "具体重写指令（可直接喂给模型）",
      "close_promises": ["pr_xxx"]
    }}
  ],
  "global_notes": ["整体建议1", "整体建议2"]
}}

限制：
- rewrite_pages 最多 4 页
- page_id 必须来自输入页面
- instruction 必须具体、可执行，不要泛泛而谈

结构化大纲：
{json.dumps(compact_outline, ensure_ascii=False, indent=2)}

页面摘要：
{json.dumps(compact_generated, ensure_ascii=False, indent=2)}

规则校验已发现的问题（可参考）：
{json.dumps(deterministic_payload, ensure_ascii=False, indent=2)}

只返回 JSON，不要包含其他文字。
{get_language_instruction(language)}
"""

        try:
            review_result = self.generate_json(prompt, thinking_budget=800)
        except Exception as e:
            logger.warning(f"文档叙事审校失败，跳过语义审校: {e}")
            return {'rewrite_pages': [], 'global_notes': []}

        return self._normalize_continuity_review_result(review_result, valid_page_ids)

    @staticmethod
    def _plan_rewrites_from_reports(deterministic_issues: List[Dict[str, Any]],
                                    semantic_review: Dict[str, Any],
                                    max_pages: int = 4) -> List[Dict[str, Any]]:
        tasks: List[Dict[str, Any]] = []
        severity_rank = {'high': 0, 'medium': 1, 'low': 2}
        deterministic_issues = deterministic_issues if isinstance(deterministic_issues, list) else []
        sorted_issues = sorted(deterministic_issues, key=lambda x: severity_rank.get(str(x.get('severity', 'medium')).lower(), 1))

        for issue in sorted_issues:
            page_id = str(issue.get('page_id') or '').strip()
            if not page_id: continue
            instruction = str(issue.get('instruction') or '').strip()
            reason = str(issue.get('reason') or '').strip() or str(issue.get('type') or '规则校验问题')
            if not instruction: instruction = "补齐本页与前后页衔接，并兑现未完成主题。"
            tasks.append({'page_id': page_id, 'reason': reason, 'instruction': instruction})

        if isinstance(semantic_review, dict):
            for item in semantic_review.get('rewrite_pages', []):
                if not isinstance(item, dict): continue
                page_id = str(item.get('page_id') or '').strip()
                if not page_id: continue
                tasks.append({
                    'page_id': page_id,
                    'reason': str(item.get('reason') or '').strip() or '语义审校建议重写',
                    'instruction': str(item.get('instruction') or '').strip() or '增强本页逻辑连贯性。'
                })

        merged: List[Dict[str, Any]] = []
        seen_page = set()
        for item in tasks:
            if item['page_id'] in seen_page: continue
            seen_page.add(item['page_id'])
            merged.append(item)
            if len(merged) >= max_pages: break
        return merged

    def generate_full_ppt_document(self, topic: str, requirements: str = "",
                                   language: str = 'zh', scheme_id: str = 'edu_dark',
                                   content_depth: str = 'balanced',
                                   generation_mode: str = 'fast') -> Dict:
        import uuid
        from services.presentation.narrative_continuity import (
            NarrativeRuntimeTracker, enrich_outline_with_narrative_contract,
            inject_unresolved_promise_closure_blocks,
        )
        from services.presentation.layout_planner import assign_layout_variants

        mode = str(generation_mode or 'fast').strip().lower()
        if mode not in {'fast', 'strict'}: mode = 'fast'
        first_pass_budget = 280 if mode == 'fast' else 350
        rewrite_budget = 850

        outline = self.generate_structured_outline(topic, requirements, language, scheme_id=scheme_id)
        outline = enrich_outline_with_narrative_contract(outline)
        tracker = NarrativeRuntimeTracker(outline)
        outline_pages = outline.get('pages', []) if isinstance(outline.get('pages'), list) else []

        try:
            outline_pages = assign_layout_variants(outline_pages, scheme_id=scheme_id)
            outline['pages'] = outline_pages
        except Exception as e:
            logger.warning(f"布局变体分配失败，使用默认 variant=a: {e}")

        page_outline_by_id = {
            str(page.get('page_id')): page for page in outline_pages
            if isinstance(page, dict) and page.get('page_id')
        }

        ppt_document = {
            'project_id': f'ai-gen-{uuid.uuid4().hex[:8]}',
            'ppt_meta': {
                'title': outline.get('title', topic), 'theme_id': scheme_id or 'edu_dark',
                'aspect_ratio': '16:9', 'author': ''
            },
            'pages': []
        }

        generated_pages: List[Dict[str, Any]] = []
        for idx, page_outline in enumerate(outline_pages):
            page_id = page_outline.get('page_id', f'p{idx+1:02d}')
            layout_id = page_outline.get('layout_id', 'title_content')
            page_title = page_outline.get('title', f'第{idx+1}页')
            try:
                continuity_context = tracker.build_context_for_page(page_id)
                full_outline_for_prompt = outline if 'toc' in str(layout_id).lower() else None
                result = self.generate_structured_page_content(
                    page_outline=page_outline, full_outline=full_outline_for_prompt,
                    language=language, scheme_id=scheme_id, content_depth=content_depth,
                    continuity_context=continuity_context, thinking_budget=first_pass_budget,
                    return_metadata=True
                )
                model = result.get('model') if isinstance(result, dict) else {}
                closed_ids = result.get('closed_promise_ids') if isinstance(result, dict) else []
                generated_pages.append({
                    'page_id': page_id, 'order_index': idx, 'layout_id': layout_id,
                    'title': page_title, 'model': model,
                    'closed_promise_ids': closed_ids if isinstance(closed_ids, list) else []
                })
                tracker.apply_generated_page(page_id=page_id, layout_id=layout_id, title=page_title,
                                             model=model, closed_promise_ids=closed_ids if isinstance(closed_ids, list) else [])
            except Exception as e:
                logger.error(f"生成第 {idx+1} 页内容失败: {str(e)}")
                fallback_model = {'title': page_title, 'content': ['内容生成失败，请手动编辑']}
                generated_pages.append({
                    'page_id': page_id, 'order_index': idx, 'layout_id': 'title_content',
                    'title': page_title, 'model': fallback_model, 'closed_promise_ids': []
                })
                tracker.apply_generated_page(page_id=page_id, layout_id='title_content', title=page_title,
                                             model=fallback_model, closed_promise_ids=[])

        deterministic_report = tracker.quality_report()
        deterministic_issues = deterministic_report.get('issues', []) if isinstance(deterministic_report, dict) else []
        rewrite_tasks: List[Dict[str, Any]] = []
        if mode == 'strict':
            semantic_review = self.review_structured_document_continuity(
                outline_doc=outline, generated_pages=generated_pages,
                deterministic_issues=deterministic_issues, language=language
            )
            rewrite_tasks = self._plan_rewrites_from_reports(
                deterministic_issues=deterministic_issues, semantic_review=semantic_review, max_pages=4
            )

        if rewrite_tasks:
            logger.info(f"叙事审校触发定向重写: {len(rewrite_tasks)} 页")
            page_entry_by_id = {item.get('page_id'): item for item in generated_pages if isinstance(item, dict)}
            for task in rewrite_tasks:
                target_page_id = task.get('page_id')
                entry = page_entry_by_id.get(target_page_id)
                po = page_outline_by_id.get(target_page_id)
                if not entry or not po: continue
                continuity_context = tracker.build_context_for_page(target_page_id)
                rewrite_instruction = f"{task.get('reason', '').strip()}。{task.get('instruction', '').strip()}".strip('。')
                if rewrite_instruction: rewrite_instruction += "。"
                try:
                    rewrite_result = self.generate_structured_page_content(
                        page_outline=po, full_outline=outline if 'toc' in str(po.get('layout_id', '')).lower() else None,
                        language=language, scheme_id=scheme_id, content_depth=content_depth,
                        continuity_context=continuity_context, rewrite_instruction=rewrite_instruction,
                        thinking_budget=rewrite_budget, return_metadata=True
                    )
                    rewritten_model = rewrite_result.get('model') if isinstance(rewrite_result, dict) else {}
                    closed_ids = rewrite_result.get('closed_promise_ids') if isinstance(rewrite_result, dict) else []
                    entry['model'] = rewritten_model
                    entry['closed_promise_ids'] = closed_ids if isinstance(closed_ids, list) else []
                    entry['layout_id'] = po.get('layout_id', entry.get('layout_id', 'title_content'))
                    tracker.apply_generated_page(page_id=target_page_id, layout_id=entry['layout_id'],
                                                 title=entry.get('title') or po.get('title', ''),
                                                 model=rewritten_model, closed_promise_ids=closed_ids if isinstance(closed_ids, list) else [])
                except Exception as rewrite_error:
                    logger.warning(f"页面 {target_page_id} 重写失败，保留首轮结果: {rewrite_error}")

        fallback_result = inject_unresolved_promise_closure_blocks(outline, generated_pages)
        if isinstance(fallback_result, dict):
            generated_pages = fallback_result.get('generated_pages', generated_pages)
            fallback_outline = fallback_result.get('outline')
            if isinstance(fallback_outline, dict): outline = fallback_outline
            tracker = NarrativeRuntimeTracker(outline)
            for entry in generated_pages:
                if not isinstance(entry, dict): continue
                tracker.apply_generated_page(
                    page_id=entry.get('page_id'), layout_id=entry.get('layout_id'),
                    title=entry.get('title', ''),
                    model=entry.get('model') if isinstance(entry.get('model'), dict) else {},
                    closed_promise_ids=entry.get('closed_promise_ids') if isinstance(entry.get('closed_promise_ids'), list) else []
                )

        ppt_document['pages'] = []
        for item in generated_pages:
            if not isinstance(item, dict): continue
            model = item.get('model', {})
            page_id = item.get('page_id')
            source_outline = page_outline_by_id.get(page_id, {})
            layout_variant = str(source_outline.get('layout_variant') or 'a').strip().lower()
            if isinstance(model, dict) and layout_variant:
                model['variant'] = layout_variant
                model['layout_variant'] = layout_variant
                if source_outline.get('layout_archetype'):
                    model['layout_archetype'] = source_outline.get('layout_archetype')
            ppt_document['pages'].append({
                'page_id': page_id, 'order_index': item.get('order_index', 0),
                'layout_id': item.get('layout_id', 'title_content'), 'model': model,
                'closed_promise_ids': item.get('closed_promise_ids', [])
            })

        return ppt_document

    async def generate_structured_outline_async(self, topic: str, requirements: str = "", language: str = 'zh', scheme_id: str = 'edu_dark') -> Dict:
        from services.prompts.layouts import LAYOUT_SCHEMES, SCHEME_ROLE_LAYOUTS
        from services.prompts.structured_content import get_structured_outline_prompt
        from services.presentation.ppt_quality_guard import apply_structured_outline_quality_guard
        from services.presentation.narrative_continuity import enrich_outline_with_narrative_contract

        prompt = get_structured_outline_prompt(topic, requirements, language, scheme_id=scheme_id)
        outline = await self.generate_json_async(prompt, thinking_budget=1000)

        scheme = LAYOUT_SCHEMES.get(scheme_id, LAYOUT_SCHEMES['edu_dark'])
        valid_layouts = list(scheme.get('layouts', {}).keys())

        if 'pages' in outline:
            for page in outline['pages']:
                if page.get('layout_id') not in valid_layouts:
                    role = SCHEME_ROLE_LAYOUTS.get(scheme_id, SCHEME_ROLE_LAYOUTS['edu_dark'])
                    fallback = role.get('cover') if page.get('page_id') == 'p01' else (valid_layouts[0] if valid_layouts else 'title_content')
                    page['layout_id'] = fallback
                if 'has_image' not in page:
                    page['has_image'] = False
                if 'keywords' not in page:
                    page['keywords'] = []

            outline = self._fix_empty_sections(outline, scheme_id)
            outline['pages'] = self.normalize_outline_layouts(
                outline.get('pages', []), render_mode='html', scheme_id=scheme_id
            )

        guarded = apply_structured_outline_quality_guard(outline, scheme_id=scheme_id)
        return enrich_outline_with_narrative_contract(guarded)

    async def generate_structured_page_content_async(self, page_outline: Dict,
                                                     full_outline: Dict = None,
                                                     language: str = 'zh',
                                                     scheme_id: str = 'edu_dark',
                                                     content_depth: str = 'balanced',
                                                     continuity_context: Dict = None,
                                                     rewrite_instruction: str = "",
                                                     thinking_budget: int = 320,
                                                     return_metadata: bool = False) -> Dict:
        from services.prompts.layouts import LAYOUT_ID_ALIASES
        from services.prompts.structured_content import get_structured_page_content_prompt
        from services.presentation.ppt_quality_guard import apply_page_model_quality_guard
        from services.presentation.narrative_continuity import apply_template_capacity

        layout_id = page_outline.get('layout_id', 'title_content').lower()

        if 'toc' in layout_id and full_outline:
            toc_model = self._generate_toc_model(page_outline, full_outline, language)
            if return_metadata:
                return {'model': toc_model, 'closed_promise_ids': []}
            return toc_model

        prompt = get_structured_page_content_prompt(
            page_outline=page_outline, full_outline=full_outline,
            language=language, scheme_id=scheme_id,
            continuity_context=continuity_context, rewrite_instruction=rewrite_instruction
        )
        raw_result = await self.generate_json_async(prompt, thinking_budget=max(100, int(thinking_budget or 320)))

        def _normalize_closed_ids(value: Any) -> List[str]:
            if not isinstance(value, list):
                return []
            cleaned: List[str] = []
            seen = set()
            for item in value:
                text = str(item or "").strip()
                if not text or text in seen:
                    continue
                seen.add(text)
                cleaned.append(text)
                if len(cleaned) >= 12:
                    break
            return cleaned

        model: Dict[str, Any]
        closed_promise_ids: List[str] = []
        if isinstance(raw_result, dict) and isinstance(raw_result.get('model'), dict):
            model = raw_result.get('model') or {}
            closed_promise_ids = _normalize_closed_ids(raw_result.get('closed_promise_ids'))
        elif isinstance(raw_result, dict):
            model = raw_result
        else:
            model = {}

        def extract_text_fields(lid: str, model_data: Dict) -> List[str]:
            parts: List[str] = []
            if lid == 'title_content':
                parts.extend([str(x) for x in model_data.get('content', []) if x])
                if model_data.get('highlight'):
                    parts.append(str(model_data.get('highlight')))
            elif lid == 'title_bullets':
                for b in model_data.get('bullets', []):
                    if isinstance(b, dict):
                        if b.get('text'):
                            parts.append(str(b['text']))
                        if b.get('description'):
                            parts.append(str(b['description']))
                    else:
                        parts.append(str(b))
            elif lid == 'two_column':
                for side in ['left', 'right']:
                    col = model_data.get(side) or {}
                    if col.get('header'):
                        parts.append(str(col['header']))
                    for c in col.get('content', []) or []:
                        parts.append(str(c))
                    for b in col.get('bullets', []) or []:
                        if isinstance(b, dict):
                            if b.get('text'):
                                parts.append(str(b['text']))
                            if b.get('description'):
                                parts.append(str(b['description']))
                        else:
                            parts.append(str(b))
            elif lid == 'process_steps':
                for s in model_data.get('steps', []) or []:
                    if s.get('label'):
                        parts.append(str(s['label']))
                    if s.get('description'):
                        parts.append(str(s['description']))
            return parts

        def ensure_length(lid: str, model_data: Dict, title: str, depth: str = 'balanced') -> Dict:
            depth_configs = {
                'concise': (80, 120), 'balanced': (120, 180), 'detailed': (180, 280)
            }
            target_min, target_max = depth_configs.get(depth, (120, 180))
            if lid not in {'title_content', 'title_bullets', 'two_column', 'process_steps'}:
                return model_data

            parts = extract_text_fields(lid, model_data)
            total_len = len("".join(parts))

            def add_sentence(text: str) -> str:
                return f"{text}。理解其适用条件与常见误区，可提升实际应用效果。"

            if total_len < target_min:
                if lid == 'title_content':
                    content = model_data.get('content', [])
                    if not isinstance(content, list):
                        content = [str(content)]
                    if not content:
                        content = [add_sentence(title)]
                    else:
                        content[-1] = str(content[-1]) + add_sentence(title)
                    model_data['content'] = content
                elif lid == 'title_bullets':
                    bullets = model_data.get('bullets', [])
                    if bullets:
                        b0 = bullets[0]
                        if isinstance(b0, dict):
                            b0['description'] = (b0.get('description') or '') + add_sentence(title)
                        else:
                            bullets[0] = str(b0) + add_sentence(title)
                    else:
                        bullets = [{'icon': 'fa-lightbulb', 'text': title, 'description': add_sentence(title)}]
                    model_data['bullets'] = bullets
                elif lid == 'two_column':
                    right = model_data.get('right') or {}
                    content = right.get('content', [])
                    if not isinstance(content, list):
                        content = [str(content)]
                    content.append(f"结论：{title}需要结合目标与场景权衡选择。")
                    right['content'] = content
                    model_data['right'] = right
                elif lid == 'process_steps':
                    steps = model_data.get('steps', [])
                    if steps:
                        steps[-1]['description'] = (steps[-1].get('description') or '') + add_sentence(title)
                    else:
                        steps = [{'number': 1, 'label': title or '步骤', 'description': add_sentence(title), 'icon': 'fa-check'}]
                    model_data['steps'] = steps

            if lid == 'title_bullets':
                for b in model_data.get('bullets', []):
                    if isinstance(b, dict) and not b.get('description'):
                        b['description'] = f"说明：{b.get('text', '')}的关键点与适用场景。"

            total_len = len("".join(extract_text_fields(lid, model_data)))
            if total_len > target_max:
                overflow = total_len - target_max

                def trim_text(text: str, diff: int) -> str:
                    return text if len(text) <= diff else text[:-diff]

                if lid == 'title_content':
                    content = model_data.get('content', [])
                    if content:
                        content[-1] = trim_text(str(content[-1]), overflow)
                        model_data['content'] = content
                elif lid == 'title_bullets':
                    bullets = model_data.get('bullets', [])
                    if bullets:
                        b0 = bullets[0]
                        if isinstance(b0, dict) and b0.get('description'):
                            b0['description'] = trim_text(str(b0['description']), overflow)
                        elif isinstance(b0, str):
                            bullets[0] = trim_text(b0, overflow)
                        model_data['bullets'] = bullets
                elif lid == 'two_column':
                    right = model_data.get('right') or {}
                    content = right.get('content', [])
                    if content:
                        content[-1] = trim_text(str(content[-1]), overflow)
                        right['content'] = content
                        model_data['right'] = right
                elif lid == 'process_steps':
                    steps = model_data.get('steps', [])
                    if steps:
                        steps[-1]['description'] = trim_text(str(steps[-1].get('description', '')), overflow)
                        model_data['steps'] = steps

            return model_data

        layout_id = page_outline.get('layout_id', 'title_content')
        resolved_layout_id = LAYOUT_ID_ALIASES.get(layout_id, layout_id)
        if page_outline.get('has_image') and resolved_layout_id in ['title_content', 'title_bullets', 'process_steps']:
            if 'image' not in model:
                model['image'] = {
                    'src': '', 'alt': ' '.join(page_outline.get('keywords', [])),
                    'position': 'right', 'width': '40%'
                }
            elif not model['image'].get('src'):
                model['image']['src'] = ''

        model = ensure_length(resolved_layout_id, model, page_outline.get('title', ''), content_depth)
        model = apply_page_model_quality_guard(layout_id=layout_id, model=model, page_outline=page_outline)
        model = apply_template_capacity(
            layout_id=layout_id, model=model,
            constraints=(continuity_context or {}).get('template_constraints') if isinstance(continuity_context, dict) else None
        )
        layout_variant = str(page_outline.get('layout_variant') or 'a').strip().lower() or 'a'
        if isinstance(model, dict):
            model['variant'] = layout_variant
            model['layout_variant'] = layout_variant
            if page_outline.get('layout_archetype'):
                model['layout_archetype'] = page_outline.get('layout_archetype')

        if return_metadata:
            return {'model': model, 'closed_promise_ids': closed_promise_ids}
        return model

    async def review_structured_document_continuity_async(self, outline_doc: Dict[str, Any],
                                                          generated_pages: List[Dict[str, Any]],
                                                          deterministic_issues: Optional[List[Dict[str, Any]]] = None,
                                                          language: str = 'zh') -> Dict[str, Any]:
        from services.prompts.language import get_language_instruction
        from services.presentation.narrative_continuity import build_page_summary

        if not isinstance(outline_doc, dict) or not isinstance(generated_pages, list):
            return {'rewrite_pages': [], 'global_notes': []}

        outline_pages = outline_doc.get('pages') if isinstance(outline_doc.get('pages'), list) else []
        valid_page_ids = [str(p.get('page_id')) for p in outline_pages if isinstance(p, dict) and p.get('page_id')]

        compact_outline = [
            {'page_id': p.get('page_id'), 'title': p.get('title'), 'layout_id': p.get('layout_id'),
             'depends_on': p.get('depends_on', []), 'must_cover': p.get('must_cover', []),
             'promises_open': p.get('promises_open', []), 'promises_close': p.get('promises_close', [])}
            for p in outline_pages if isinstance(p, dict)
        ]

        compact_generated = []
        for item in generated_pages:
            if not isinstance(item, dict):
                continue
            model = item.get('model') if isinstance(item.get('model'), dict) else {}
            title = item.get('title') or model.get('title') or ''
            summary = build_page_summary({'layout_id': item.get('layout_id'), 'title': title}, model)
            compact_generated.append({'page_id': item.get('page_id'), 'title': title, 'layout_id': item.get('layout_id'), 'summary': summary})

        deterministic_payload = deterministic_issues if isinstance(deterministic_issues, list) else []
        prompt = f"""\
你是一位PPT叙事审校专家。请审查以下文档是否存在：
1) 前后内容断裂
2) 承诺未兑现（前页提到后续展开但后面没讲）
3) 重复内容
4) 突兀跳转

请严格返回 JSON：
{{
  "rewrite_pages": [
    {{
      "page_id": "p05",
      "reason": "该页问题",
      "instruction": "具体重写指令（可直接喂给模型）",
      "close_promises": ["pr_xxx"]
    }}
  ],
  "global_notes": ["整体建议1", "整体建议2"]
}}

限制：
- rewrite_pages 最多 4 页
- page_id 必须来自输入页面
- instruction 必须具体、可执行，不要泛泛而谈

结构化大纲：
{json.dumps(compact_outline, ensure_ascii=False, indent=2)}

页面摘要：
{json.dumps(compact_generated, ensure_ascii=False, indent=2)}

规则校验已发现的问题（可参考）：
{json.dumps(deterministic_payload, ensure_ascii=False, indent=2)}

只返回 JSON，不要包含其他文字。
{get_language_instruction(language)}
"""

        try:
            review_result = await self.generate_json_async(prompt, thinking_budget=800)
        except Exception as e:
            logger.warning(f"文档叙事审校失败，跳过语义审校: {e}")
            return {'rewrite_pages': [], 'global_notes': []}

        return self._normalize_continuity_review_result(review_result, valid_page_ids)

    async def generate_full_ppt_document_async(self, topic: str, requirements: str = "",
                                               language: str = 'zh', scheme_id: str = 'edu_dark',
                                               content_depth: str = 'balanced',
                                               generation_mode: str = 'fast') -> Dict:
        import uuid
        from services.presentation.narrative_continuity import (
            NarrativeRuntimeTracker, enrich_outline_with_narrative_contract,
            inject_unresolved_promise_closure_blocks,
        )
        from services.presentation.layout_planner import assign_layout_variants

        mode = str(generation_mode or 'fast').strip().lower()
        if mode not in {'fast', 'strict'}:
            mode = 'fast'
        first_pass_budget = 280 if mode == 'fast' else 350
        rewrite_budget = 850

        outline = await self.generate_structured_outline_async(topic, requirements, language, scheme_id=scheme_id)
        outline = enrich_outline_with_narrative_contract(outline)
        tracker = NarrativeRuntimeTracker(outline)
        outline_pages = outline.get('pages', []) if isinstance(outline.get('pages'), list) else []

        try:
            outline_pages = assign_layout_variants(outline_pages, scheme_id=scheme_id)
            outline['pages'] = outline_pages
        except Exception as e:
            logger.warning(f"布局变体分配失败，使用默认 variant=a: {e}")

        page_outline_by_id = {
            str(page.get('page_id')): page for page in outline_pages
            if isinstance(page, dict) and page.get('page_id')
        }

        ppt_document = {
            'project_id': f'ai-gen-{uuid.uuid4().hex[:8]}',
            'ppt_meta': {
                'title': outline.get('title', topic), 'theme_id': scheme_id or 'edu_dark',
                'aspect_ratio': '16:9', 'author': ''
            },
            'pages': []
        }

        generated_pages: List[Dict[str, Any]] = []
        for idx, page_outline in enumerate(outline_pages):
            page_id = page_outline.get('page_id', f'p{idx+1:02d}')
            layout_id = page_outline.get('layout_id', 'title_content')
            page_title = page_outline.get('title', f'第{idx+1}页')
            try:
                continuity_context = tracker.build_context_for_page(page_id)
                full_outline_for_prompt = outline if 'toc' in str(layout_id).lower() else None
                result = await self.generate_structured_page_content_async(
                    page_outline=page_outline, full_outline=full_outline_for_prompt,
                    language=language, scheme_id=scheme_id, content_depth=content_depth,
                    continuity_context=continuity_context, thinking_budget=first_pass_budget,
                    return_metadata=True
                )
                model = result.get('model') if isinstance(result, dict) else {}
                closed_ids = result.get('closed_promise_ids') if isinstance(result, dict) else []
                generated_pages.append({
                    'page_id': page_id, 'order_index': idx, 'layout_id': layout_id,
                    'title': page_title, 'model': model,
                    'closed_promise_ids': closed_ids if isinstance(closed_ids, list) else []
                })
                tracker.apply_generated_page(
                    page_id=page_id, layout_id=layout_id, title=page_title,
                    model=model, closed_promise_ids=closed_ids if isinstance(closed_ids, list) else []
                )
            except Exception as e:
                logger.error(f"生成第 {idx+1} 页内容失败: {str(e)}")
                fallback_model = {'title': page_title, 'content': ['内容生成失败，请手动编辑']}
                generated_pages.append({
                    'page_id': page_id, 'order_index': idx, 'layout_id': 'title_content',
                    'title': page_title, 'model': fallback_model, 'closed_promise_ids': []
                })
                tracker.apply_generated_page(
                    page_id=page_id, layout_id='title_content', title=page_title,
                    model=fallback_model, closed_promise_ids=[]
                )

        deterministic_report = tracker.quality_report()
        deterministic_issues = deterministic_report.get('issues', []) if isinstance(deterministic_report, dict) else []
        rewrite_tasks: List[Dict[str, Any]] = []
        if mode == 'strict':
            semantic_review = await self.review_structured_document_continuity_async(
                outline_doc=outline, generated_pages=generated_pages,
                deterministic_issues=deterministic_issues, language=language
            )
            rewrite_tasks = self._plan_rewrites_from_reports(
                deterministic_issues=deterministic_issues, semantic_review=semantic_review, max_pages=4
            )

        if rewrite_tasks:
            logger.info(f"叙事审校触发定向重写: {len(rewrite_tasks)} 页")
            page_entry_by_id = {item.get('page_id'): item for item in generated_pages if isinstance(item, dict)}
            for task in rewrite_tasks:
                target_page_id = task.get('page_id')
                entry = page_entry_by_id.get(target_page_id)
                po = page_outline_by_id.get(target_page_id)
                if not entry or not po:
                    continue
                continuity_context = tracker.build_context_for_page(target_page_id)
                rewrite_instruction = f"{task.get('reason', '').strip()}。{task.get('instruction', '').strip()}".strip('。')
                if rewrite_instruction:
                    rewrite_instruction += "。"
                try:
                    rewrite_result = await self.generate_structured_page_content_async(
                        page_outline=po, full_outline=outline if 'toc' in str(po.get('layout_id', '')).lower() else None,
                        language=language, scheme_id=scheme_id, content_depth=content_depth,
                        continuity_context=continuity_context, rewrite_instruction=rewrite_instruction,
                        thinking_budget=rewrite_budget, return_metadata=True
                    )
                    rewritten_model = rewrite_result.get('model') if isinstance(rewrite_result, dict) else {}
                    closed_ids = rewrite_result.get('closed_promise_ids') if isinstance(rewrite_result, dict) else []
                    entry['model'] = rewritten_model
                    entry['closed_promise_ids'] = closed_ids if isinstance(closed_ids, list) else []
                    entry['layout_id'] = po.get('layout_id', entry.get('layout_id', 'title_content'))
                    tracker.apply_generated_page(
                        page_id=target_page_id, layout_id=entry['layout_id'],
                        title=entry.get('title') or po.get('title', ''),
                        model=rewritten_model, closed_promise_ids=closed_ids if isinstance(closed_ids, list) else []
                    )
                except Exception as rewrite_error:
                    logger.warning(f"页面 {target_page_id} 重写失败，保留首轮结果: {rewrite_error}")

        fallback_result = inject_unresolved_promise_closure_blocks(outline, generated_pages)
        if isinstance(fallback_result, dict):
            generated_pages = fallback_result.get('generated_pages', generated_pages)
            fallback_outline = fallback_result.get('outline')
            if isinstance(fallback_outline, dict):
                outline = fallback_outline
            tracker = NarrativeRuntimeTracker(outline)
            for entry in generated_pages:
                if not isinstance(entry, dict):
                    continue
                tracker.apply_generated_page(
                    page_id=entry.get('page_id'), layout_id=entry.get('layout_id'),
                    title=entry.get('title', ''),
                    model=entry.get('model') if isinstance(entry.get('model'), dict) else {},
                    closed_promise_ids=entry.get('closed_promise_ids') if isinstance(entry.get('closed_promise_ids'), list) else []
                )

        ppt_document['pages'] = []
        for item in generated_pages:
            if not isinstance(item, dict):
                continue
            model = item.get('model', {})
            page_id = item.get('page_id')
            source_outline = page_outline_by_id.get(page_id, {})
            layout_variant = str(source_outline.get('layout_variant') or 'a').strip().lower()
            if isinstance(model, dict) and layout_variant:
                model['variant'] = layout_variant
                model['layout_variant'] = layout_variant
                if source_outline.get('layout_archetype'):
                    model['layout_archetype'] = source_outline.get('layout_archetype')
            ppt_document['pages'].append({
                'page_id': page_id, 'order_index': item.get('order_index', 0),
                'layout_id': item.get('layout_id', 'title_content'), 'model': model,
                'closed_promise_ids': item.get('closed_promise_ids', [])
            })

        return ppt_document
