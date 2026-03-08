from datetime import datetime

from api.routes.projects import _project_to_dict
from models.page import Page
from models.project import Project
from models.task import Task


def test_list_projects_includes_page_summaries_for_history(db_session):
    project = Project(
        idea_prompt="历史 HTML 项目",
        render_mode="html",
        status="DESCRIPTIONS_GENERATED",
        user_id="1",
    )
    db_session.add(project)
    db_session.flush()

    page = Page(
        project_id=project.id,
        order_index=0,
        status="HTML_MODEL_GENERATED",
    )
    page.set_outline_content({"title": "封面", "points": ["要点"]})
    page.set_description_content({"continuity": {}, "generated_at": "2026-03-08T09:00:00"})
    page.set_html_model({"title": "封面", "layout_variant": "a"})
    db_session.add(page)
    db_session.commit()

    target_project = _project_to_dict(
        project,
        include_pages=True,
        page_summary=True,
        include_latest_generation_task=True,
    )

    assert target_project["preview_page"]["page_id"] == page.id
    assert target_project["preview_page"]["html_model"]["title"] == "封面"
    assert "pages" in target_project
    assert len(target_project["pages"]) == 1
    assert target_project["pages"][0]["outline_content"]["title"] == "封面"
    assert target_project["pages"][0]["has_description_content"] is True
    assert target_project["pages"][0]["has_html_model"] is True
    assert "description_content" not in target_project["pages"][0]
    assert "html_model" not in target_project["pages"][0]


def test_list_projects_includes_latest_generation_task_summary(db_session):
    project = Project(
        idea_prompt="失败项目",
        render_mode="html",
        status="FAILED",
        scheme_id="interactive",
        user_id="1",
    )
    db_session.add(project)
    db_session.flush()

    db_session.add_all([
        Task(
            project_id=project.id,
            task_type="GENERATE_DESCRIPTIONS",
            status="COMPLETED",
            created_at=datetime(2026, 3, 8, 16, 0, 0),
        ),
        Task(
            project_id=project.id,
            task_type="EXPORT_EDITABLE_PPTX",
            status="FAILED",
            error_message="export failed",
            created_at=datetime(2026, 3, 8, 16, 5, 0),
        ),
        Task(
            project_id=project.id,
            task_type="GENERATE_IMAGES",
            status="FAILED",
            error_message="页面图片生成失败，请重新尝试。",
            created_at=datetime(2026, 3, 8, 16, 10, 0),
        ),
    ])
    db_session.commit()

    target_project = _project_to_dict(
        project,
        include_pages=True,
        page_summary=True,
        include_latest_generation_task=True,
    )

    assert target_project["scheme_id"] == "interactive"
    assert target_project["latest_generation_task"]["task_type"] == "GENERATE_IMAGES"
    assert target_project["latest_generation_task"]["status"] == "FAILED"
    assert target_project["latest_generation_task"]["error_message"] == "页面图片生成失败，请重新尝试。"
