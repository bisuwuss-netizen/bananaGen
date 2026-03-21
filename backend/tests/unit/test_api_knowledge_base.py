import api.routes.knowledge_base as knowledge_base_module

from models.project import Project
from models.reference_file import ReferenceFile
from models.task import Task

from conftest import assert_success_response


def _create_reference_file(db_session, *, filename: str = "kb.pdf") -> ReferenceFile:
    ref = ReferenceFile(
        project_id=None,
        user_id="1",
        filename=filename,
        file_path=f"reference_files/{filename}",
        file_size=1024,
        file_type="pdf",
        parse_status="completed",
        markdown_content="# 测试资料\n\n- 要点 A\n- 要点 B",
    )
    db_session.add(ref)
    db_session.commit()
    return ref


def test_start_knowledge_base_outline_task_creates_recoverable_global_task(client, db_session, monkeypatch):
    ref = _create_reference_file(db_session)
    submitted: dict[str, object] = {}

    def fake_submit(task_id, coro_func, *args, **kwargs):
        submitted["task_id"] = task_id
        submitted["coro_func"] = coro_func
        submitted["kwargs"] = kwargs

    task_manager_stub = type("TaskManagerStub", (), {"submit_task": staticmethod(fake_submit)})()
    monkeypatch.setattr(knowledge_base_module, "task_manager", task_manager_stub, raising=False)

    response = client.post(
        "/api/knowledge-base/generate-outline",
        json={
            "reference_file_ids": [ref.id],
            "extra_requirements": "控制在 10 页以内",
        },
    )

    payload = assert_success_response(response, 202)
    task_id = payload["data"]["task_id"]
    assert task_id == submitted["task_id"]

    task = db_session.get(Task, task_id)
    assert task is not None
    assert task.project_id is None
    assert task.task_type == "GENERATE_KNOWLEDGE_BASE_OUTLINE"
    progress = task.get_progress()
    assert progress["reference_file_ids"] == [ref.id]
    assert progress["extra_requirements"] == "控制在 10 页以内"


def test_create_project_from_knowledge_base_associates_reference_files(client, db_session):
    ref = _create_reference_file(db_session, filename="sample.pdf")

    response = client.post(
        "/api/knowledge-base/create-project",
        json={
            "outline_text": "# 研究汇报\n\n## 背景\n- 要点",
            "reference_file_ids": [ref.id],
            "render_mode": "html",
            "scheme_id": "academic",
        },
    )

    payload = assert_success_response(response, 201)
    project_id = payload["data"]["project_id"]

    project = db_session.get(Project, project_id)
    assert project is not None
    assert project.creation_type == "outline"
    assert project.outline_text == "# 研究汇报\n\n## 背景\n- 要点"
    assert project.render_mode == "html"
    assert project.scheme_id == "academic"

    db_session.refresh(ref)
    assert ref.project_id == project_id
