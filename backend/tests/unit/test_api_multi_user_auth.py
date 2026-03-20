import pytest
from pathlib import Path

from conftest import assert_error_response, assert_success_response


def _configure_accounts(monkeypatch):
    monkeypatch.setenv("AUTH_USERS", "alice:alice-pass,bob:bob-pass")


def _login(client, username: str, password: str):
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    return assert_success_response(response)


def test_login_sets_cookie_and_me_returns_current_user(client, monkeypatch):
    _configure_accounts(monkeypatch)

    payload = _login(client, "alice", "alice-pass")

    assert payload["data"]["user"]["user_id"] == "alice"
    assert payload["data"]["user"]["username"] == "alice"

    me_response = client.get("/api/auth/me")
    me_payload = assert_success_response(me_response)
    assert me_payload["data"]["user"]["user_id"] == "alice"


def test_projects_requires_login(client, monkeypatch):
    _configure_accounts(monkeypatch)

    response = client.get("/api/projects")

    assert_error_response(response, 401)


def test_different_users_only_see_their_own_projects(client, monkeypatch):
    _configure_accounts(monkeypatch)

    _login(client, "alice", "alice-pass")
    create_a = client.post(
        "/api/projects",
        json={"creation_type": "idea", "idea_prompt": "Alice 项目"},
    )
    project_a_id = assert_success_response(create_a, 201)["data"]["project_id"]

    logout_a = client.post("/api/auth/logout")
    assert_success_response(logout_a)

    _login(client, "bob", "bob-pass")
    create_b = client.post(
        "/api/projects",
        json={"creation_type": "idea", "idea_prompt": "Bob 项目"},
    )
    project_b_id = assert_success_response(create_b, 201)["data"]["project_id"]

    list_payload = assert_success_response(client.get("/api/projects"))
    project_ids = {project["project_id"] for project in list_payload["data"]["projects"]}

    assert project_b_id in project_ids
    assert project_a_id not in project_ids


def test_other_user_cannot_get_update_or_delete_project(client, monkeypatch):
    _configure_accounts(monkeypatch)

    _login(client, "alice", "alice-pass")
    create_a = client.post(
        "/api/projects",
        json={"creation_type": "idea", "idea_prompt": "Alice 私有项目"},
    )
    project_a_id = assert_success_response(create_a, 201)["data"]["project_id"]
    assert_success_response(client.post("/api/auth/logout"))

    _login(client, "bob", "bob-pass")

    get_resp = client.get(f"/api/projects/{project_a_id}")
    assert_error_response(get_resp, 404)

    update_resp = client.put(
        f"/api/projects/{project_a_id}",
        json={"status": "GENERATING"},
    )
    assert_error_response(update_resp, 404)

    delete_resp = client.delete(f"/api/projects/{project_a_id}")
    assert_error_response(delete_resp, 404)


def test_other_user_cannot_access_project_core_chain_endpoints(client, monkeypatch):
    _configure_accounts(monkeypatch)

    _login(client, "alice", "alice-pass")
    create_a = client.post(
        "/api/projects",
        json={"creation_type": "idea", "idea_prompt": "Alice 工作流项目"},
    )
    project_a_id = assert_success_response(create_a, 201)["data"]["project_id"]

    create_page = client.post(
        f"/api/projects/{project_a_id}/pages",
        json={"order_index": 0, "part": "第一部分", "outline_content": {"title": "封面", "points": ["要点"]}},
    )
    page_id = assert_success_response(create_page, 201)["data"]["page_id"]

    task_response = client.post(
        f"/api/projects/{project_a_id}/generate/outline",
        json={"language": "zh"},
    )
    task_id = assert_success_response(task_response, 202)["data"]["task_id"]
    assert_success_response(client.post("/api/auth/logout"))

    _login(client, "bob", "bob-pass")

    page_update_resp = client.put(
        f"/api/projects/{project_a_id}/pages/{page_id}",
        json={"status": "DRAFT"},
    )
    assert_error_response(page_update_resp, 404)

    export_resp = client.get(f"/api/projects/{project_a_id}/export/pptx")
    assert_error_response(export_resp, 404)

    task_resp = client.get(f"/api/projects/{project_a_id}/tasks/{task_id}")
    assert_error_response(task_resp, 404)


def test_other_user_cannot_access_project_static_files(client, monkeypatch):
    _configure_accounts(monkeypatch)

    _login(client, "alice", "alice-pass")
    create_a = client.post(
        "/api/projects",
        json={"creation_type": "idea", "idea_prompt": "Alice 文件项目"},
    )
    project_a_id = assert_success_response(create_a, 201)["data"]["project_id"]

    from config_fastapi import settings

    export_dir = Path(settings.upload_folder) / project_a_id / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    export_path = export_dir / "alice-test.txt"
    export_path.write_text("private file", encoding="utf-8")

    own_file_resp = client.get(f"/files/{project_a_id}/exports/alice-test.txt")
    assert own_file_resp.status_code == 200

    assert_success_response(client.post("/api/auth/logout"))
    _login(client, "bob", "bob-pass")

    other_file_resp = client.get(f"/files/{project_a_id}/exports/alice-test.txt")
    assert_error_response(other_file_resp, 404)
