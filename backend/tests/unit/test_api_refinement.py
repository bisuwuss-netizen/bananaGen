from unittest.mock import AsyncMock, MagicMock

from conftest import assert_success_response


def _create_project(client, *, render_mode: str = "image", idea_prompt: str = "测试 refine") -> str:
    response = client.post(
        "/api/projects",
        json={
            "creation_type": "idea",
            "idea_prompt": idea_prompt,
            "render_mode": render_mode,
            "user_id": "1",
        },
    )
    payload = assert_success_response(response, 201)
    return payload["data"]["project_id"]


def _create_page(
    client,
    project_id: str,
    order_index: int,
    title: str,
    points: list[str],
    *,
    part: str | None = None,
) -> dict:
    response = client.post(
        f"/api/projects/{project_id}/pages",
        json={
            "order_index": order_index,
            "part": part,
            "outline_content": {
                "title": title,
                "points": points,
            },
        },
    )
    payload = assert_success_response(response, 201)
    return payload["data"]


def _update_page_metadata(
    client,
    project_id: str,
    page_id: str,
    *,
    layout_id: str | None = None,
    html_model: dict | None = None,
    status: str | None = None,
) -> dict:
    response = client.put(
        f"/api/projects/{project_id}/pages/{page_id}",
        json={
            "layout_id": layout_id,
            "html_model": html_model,
            "status": status,
        },
    )
    payload = assert_success_response(response)
    return payload["data"]


def _update_page_description(client, project_id: str, page_id: str, text: str) -> dict:
    response = client.put(
        f"/api/projects/{project_id}/pages/{page_id}/description",
        json={
            "description_content": {"text": text},
        },
    )
    payload = assert_success_response(response)
    return payload["data"]


def _mock_ai_service(monkeypatch, *, return_value, flatten_return=None):
    service = MagicMock()
    service.call_async = AsyncMock(return_value=return_value)
    if flatten_return is None:
        service.flatten_outline = MagicMock(side_effect=lambda outline: outline)
    else:
        service.flatten_outline = MagicMock(return_value=flatten_return)

    async def _get_ai_service_async():
        return service

    monkeypatch.setattr("services.ai_service_manager.get_ai_service_async", _get_ai_service_async)
    return service


def test_refine_outline_allows_empty_project_and_forwards_context(monkeypatch, client):
    project_id = _create_project(client, render_mode="html", idea_prompt="3D建模讲解ppt")

    service = _mock_ai_service(
        monkeypatch,
        return_value={
            "pages": [
                {"title": "封面", "points": ["3D建模讲解"], "layout_id": "cover"},
                {"title": "目录", "points": ["基础概念", "建模流程"], "layout_id": "toc"},
            ]
        },
    )

    response = client.post(
        f"/api/projects/{project_id}/refine/outline",
        json={
            "user_requirement": "直接生成一份 2 页的大纲",
            "previous_requirements": ["保留教学场景"],
        },
    )

    payload = assert_success_response(response)
    pages = payload["data"]["pages"]

    assert len(pages) == 2
    assert pages[0]["outline_content"]["title"] == "封面"
    assert pages[0]["layout_id"] == "cover"
    assert pages[1]["layout_id"] == "toc"

    awaited = service.call_async.await_args
    assert awaited.args[0] == "refine_outline"
    assert awaited.args[1] == []
    assert awaited.args[2] == "直接生成一份 2 页的大纲"
    assert awaited.kwargs["render_mode"] == "html"
    assert awaited.kwargs["previous_requirements"] == ["保留教学场景"]
    assert awaited.kwargs["project_context"].idea_prompt == "3D建模讲解ppt"

    persisted = client.get(f"/api/projects/{project_id}")
    persisted_payload = assert_success_response(persisted)
    assert len(persisted_payload["data"]["pages"]) == 2


def test_refine_outline_flattens_part_based_ai_result_for_image_mode(monkeypatch, client):
    project_id = _create_project(client, render_mode="image", idea_prompt="测试删除页面")

    raw_outline = [
        {
            "part": "引言",
            "pages": [
                {"title": "封面", "points": ["项目背景"]},
                {"title": "目录", "points": ["目标", "范围"]},
            ],
        },
        {
            "part": "主体",
            "pages": [
                {"title": "核心结论", "points": ["删除第三页后保留剩余页面"]},
            ],
        },
    ]
    flattened_pages = [
        {"title": "封面", "points": ["项目背景"], "part": "引言"},
        {"title": "目录", "points": ["目标", "范围"], "part": "引言"},
        {"title": "核心结论", "points": ["删除第三页后保留剩余页面"], "part": "主体"},
    ]

    service = _mock_ai_service(
        monkeypatch,
        return_value=raw_outline,
        flatten_return=flattened_pages,
    )

    response = client.post(
        f"/api/projects/{project_id}/refine/outline",
        json={
            "user_requirement": "删除第三页",
        },
    )

    payload = assert_success_response(response)
    pages = payload["data"]["pages"]

    service.flatten_outline.assert_called_once_with(raw_outline)
    assert [page["outline_content"]["title"] for page in pages] == ["封面", "目录", "核心结论"]
    assert [page["part"] for page in pages] == ["引言", "引言", "主体"]

    persisted = client.get(f"/api/projects/{project_id}")
    persisted_payload = assert_success_response(persisted)
    persisted_pages = persisted_payload["data"]["pages"]
    assert [page["outline_content"]["title"] for page in persisted_pages] == ["封面", "目录", "核心结论"]


def test_refine_outline_rejects_empty_ai_result_without_deleting_existing_pages(monkeypatch, client):
    project_id = _create_project(client, render_mode="html", idea_prompt="测试异常保护")
    original_page = _create_page(client, project_id, 0, "原始封面", ["保留我"])
    _update_page_metadata(
        client,
        project_id,
        original_page["page_id"],
        layout_id="cover",
        status="OUTLINE_GENERATED",
    )

    _mock_ai_service(monkeypatch, return_value={"pages": []})

    response = client.post(
        f"/api/projects/{project_id}/refine/outline",
        json={
            "user_requirement": "重新改写大纲",
        },
    )

    assert response.status_code == 502

    persisted = client.get(f"/api/projects/{project_id}")
    persisted_payload = assert_success_response(persisted)
    pages = persisted_payload["data"]["pages"]
    assert len(pages) == 1
    assert pages[0]["outline_content"]["title"] == "原始封面"
    assert pages[0]["page_id"] == original_page["page_id"]


def test_refine_descriptions_updates_image_pages_in_order(monkeypatch, client):
    project_id = _create_project(client, render_mode="image")
    page1 = _create_page(client, project_id, 0, "封面", ["主题引入"])
    page2 = _create_page(client, project_id, 1, "核心内容", ["技术原理"])
    _update_page_description(client, project_id, page1["page_id"], "旧封面描述")
    _update_page_metadata(client, project_id, page1["page_id"], status="DESCRIPTION_GENERATED")
    _update_page_metadata(client, project_id, page2["page_id"], status="OUTLINE_GENERATED")

    service = _mock_ai_service(
        monkeypatch,
        return_value=[
            "页面标题：封面\n页面文字：\n- 新封面描述",
            "页面标题：核心内容\n页面文字：\n- 新核心内容描述",
        ],
    )

    response = client.post(
        f"/api/projects/{project_id}/refine/descriptions",
        json={
            "user_requirement": "让每页更详细",
            "previous_requirements": ["保留老师讲课语气"],
        },
    )

    payload = assert_success_response(response)
    pages = payload["data"]["pages"]

    assert pages[0]["description_content"]["text"].startswith("页面标题：封面")
    assert pages[1]["description_content"]["text"].startswith("页面标题：核心内容")
    assert pages[0]["status"] == "DESCRIPTION_GENERATED"
    assert pages[1]["status"] == "DESCRIPTION_GENERATED"

    awaited = service.call_async.await_args
    assert awaited.args[0] == "refine_descriptions"
    assert awaited.args[2] == "让每页更详细"
    assert awaited.args[1][0]["index"] == 0
    assert awaited.args[1][0]["title"] == "封面"
    assert awaited.args[1][0]["description_content"]["text"] == "旧封面描述"
    assert awaited.args[1][1]["index"] == 1
    assert awaited.args[1][1]["title"] == "核心内容"
    assert awaited.args[1][1]["description_content"] == {}
    assert awaited.kwargs["previous_requirements"] == ["保留老师讲课语气"]
    assert awaited.kwargs["outline"][1]["title"] == "核心内容"
    assert awaited.kwargs["project_context"].idea_prompt == "测试 refine"


def test_refine_descriptions_updates_html_models_by_page_order(monkeypatch, client):
    project_id = _create_project(client, render_mode="html")
    page1 = _create_page(client, project_id, 0, "封面", ["主题引入"])
    page2 = _create_page(client, project_id, 1, "核心内容", ["技术原理"])
    _update_page_metadata(
        client,
        project_id,
        page1["page_id"],
        layout_id="cover",
        html_model={"title": "旧封面"},
        status="HTML_MODEL_GENERATED",
    )
    _update_page_metadata(
        client,
        project_id,
        page2["page_id"],
        layout_id="title_content",
        status="OUTLINE_GENERATED",
    )

    service = _mock_ai_service(
        monkeypatch,
        return_value=[
            {"title": "新封面", "subtitle": "副标题"},
            {"title": "新核心内容", "content": ["技术原理展开"]},
        ],
    )

    response = client.post(
        f"/api/projects/{project_id}/refine/descriptions",
        json={
            "user_requirement": "调整为更现代的表达",
            "previous_requirements": ["保持当前布局类型不变"],
        },
    )

    payload = assert_success_response(response)
    pages = payload["data"]["pages"]

    assert pages[0]["html_model"]["title"] == "新封面"
    assert pages[1]["html_model"]["title"] == "新核心内容"
    assert pages[0]["layout_id"] == "cover"
    assert pages[1]["layout_id"] == "title_content"
    assert pages[0]["status"] == "HTML_MODEL_GENERATED"
    assert pages[1]["status"] == "HTML_MODEL_GENERATED"

    awaited = service.call_async.await_args
    assert awaited.args[0] == "refine_html_models"
    assert awaited.args[2] == "调整为更现代的表达"
    assert awaited.args[1][0]["index"] == 0
    assert awaited.args[1][0]["title"] == "封面"
    assert awaited.args[1][0]["layout_id"] == "cover"
    assert awaited.args[1][0]["html_model"] == {"title": "旧封面"}
    assert awaited.args[1][1]["index"] == 1
    assert awaited.args[1][1]["title"] == "核心内容"
    assert awaited.args[1][1]["layout_id"] == "title_content"
    assert awaited.args[1][1]["html_model"] == {}
    assert awaited.kwargs["previous_requirements"] == ["保持当前布局类型不变"]
    assert awaited.kwargs["outline"][0]["layout_id"] == "cover"
