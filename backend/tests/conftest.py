"""Shared pytest fixtures for the FastAPI refactor branch."""

from __future__ import annotations

import io
import importlib
import os
import sys
import tempfile
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

os.environ.setdefault("TESTING", "true")
os.environ.setdefault("USE_MOCK_AI", "true")
os.environ.setdefault("OPENAI_API_KEY", "mock-api-key-for-testing")
os.environ.setdefault("GOOGLE_API_KEY", "mock-api-key-for-testing")
os.environ.setdefault("FLASK_ENV", "testing")


class CompatResponse:
    """Provide Flask-like helpers on top of httpx responses for legacy tests."""

    def __init__(self, response):
        self._response = response

    def get_json(self) -> Any:
        return self._response.json()

    def __getattr__(self, name: str) -> Any:
        return getattr(self._response, name)


class CompatClient:
    """Keep the existing test call sites working while using FastAPI TestClient."""

    def __init__(self, client: TestClient):
        self._client = client

    def _request(self, method: str, url: str, **kwargs: Any) -> CompatResponse:
        content_type = kwargs.pop("content_type", None)
        headers = dict(kwargs.pop("headers", {}) or {})
        if content_type and content_type != "multipart/form-data":
            headers.setdefault("Content-Type", content_type)

        if content_type == "multipart/form-data" and "data" in kwargs:
            form_data = kwargs.pop("data")
            files = {}
            for key, value in form_data.items():
                if isinstance(value, tuple) and len(value) == 2:
                    fileobj, filename = value
                    fileobj.seek(0)
                    files[key] = (filename, fileobj, "application/octet-stream")
                else:
                    files[key] = value
            kwargs["files"] = files

        response = self._client.request(method, url, headers=headers, **kwargs)
        return CompatResponse(response)

    def get(self, url: str, **kwargs: Any) -> CompatResponse:
        return self._request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> CompatResponse:
        return self._request("POST", url, **kwargs)

    def put(self, url: str, **kwargs: Any) -> CompatResponse:
        return self._request("PUT", url, **kwargs)

    def patch(self, url: str, **kwargs: Any) -> CompatResponse:
        return self._request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs: Any) -> CompatResponse:
        return self._request("DELETE", url, **kwargs)


@pytest.fixture(scope="session", autouse=True)
def _configure_test_database():
    project_root = backend_path.parent
    env_path = project_root / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    original_database_url = os.environ.get("DATABASE_URL")
    if not original_database_url:
        raise RuntimeError("DATABASE_URL is required for MySQL-backed tests")

    base_url = make_url(original_database_url)
    if base_url.drivername != "mysql+pymysql":
        raise RuntimeError(
            f"MySQL tests require mysql+pymysql DATABASE_URL, got {base_url.drivername}"
        )

    test_database = f"{base_url.database}_test"
    admin_url = base_url.set(database="mysql")
    test_url = base_url.set(database=test_database)

    admin_engine = create_engine(
        admin_url.render_as_string(hide_password=False),
        isolation_level="AUTOCOMMIT",
    )
    with admin_engine.connect() as connection:
        connection.execute(text(f"DROP DATABASE IF EXISTS `{test_database}`"))
        connection.execute(
            text(
                f"CREATE DATABASE `{test_database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
    admin_engine.dispose()

    os.environ["DATABASE_URL"] = test_url.render_as_string(hide_password=False)
    yield

    admin_engine = create_engine(
        admin_url.render_as_string(hide_password=False),
        isolation_level="AUTOCOMMIT",
    )
    with admin_engine.connect() as connection:
        connection.execute(text(f"DROP DATABASE IF EXISTS `{test_database}`"))
    admin_engine.dispose()

    if original_database_url is not None:
        os.environ["DATABASE_URL"] = original_database_url


@pytest.fixture(scope="session")
def app(_configure_test_database):
    import config_fastapi
    import services.runtime_state
    import app_fastapi

    # Ensure singleton settings/engines are reloaded after DATABASE_URL is switched to *_test.
    config_fastapi = importlib.reload(config_fastapi)
    # Rebuild settings from current env (DATABASE_URL points to *_test in this fixture).
    config_fastapi.settings = config_fastapi.Settings()
    services.runtime_state = importlib.reload(services.runtime_state)
    app_fastapi = importlib.reload(app_fastapi)
    fastapi_app = app_fastapi.app

    from config_fastapi import settings
    from models import db
    from services.runtime_state import install_runtime_orm

    url = make_url(settings.sqlalchemy_sync_url)
    if not (url.database and url.database.endswith("_test")):
        raise RuntimeError(
            f"Refusing to run tests against non-test database: {url.database}"
        )

    engine = create_engine(url.render_as_string(hide_password=False))
    install_runtime_orm()
    db.metadata.drop_all(bind=engine)
    db.metadata.create_all(bind=engine)

    yield fastapi_app

    db.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def client(app):
    from config_fastapi import settings
    from models import db

    url = make_url(settings.sqlalchemy_sync_url)
    if not (url.database and url.database.endswith("_test")):
        raise RuntimeError(
            f"Refusing to clean tables on non-test database: {url.database}"
        )

    engine = create_engine(url.render_as_string(hide_password=False))
    with engine.begin() as connection:
        for table in reversed(db.metadata.sorted_tables):
            connection.execute(table.delete())

    with TestClient(app) as test_client:
        yield CompatClient(test_client)


@pytest.fixture(scope="function")
def db_session(app):
    from services.runtime_state import get_sync_session, runtime_context

    with runtime_context():
        session = get_sync_session()
        try:
            yield session
        finally:
            session.rollback()


@pytest.fixture
def sample_project(client):
    response = client.post(
        "/api/projects",
        json={
            "creation_type": "idea",
            "idea_prompt": "测试PPT生成",
        },
    )
    data = response.get_json()
    return data["data"] if data.get("success") else None


@pytest.fixture
def mock_ai_service():
    with patch("services.ai_service.AIService") as mock:
        mock_instance = MagicMock()
        mock.return_value = mock_instance
        mock_instance.generate_outline.return_value = [
            {"title": "测试页面1", "points": ["要点1", "要点2"]},
            {"title": "测试页面2", "points": ["要点3", "要点4"]},
        ]
        mock_instance.flatten_outline.return_value = [
            {"title": "测试页面1", "points": ["要点1", "要点2"]},
            {"title": "测试页面2", "points": ["要点3", "要点4"]},
        ]
        mock_instance.generate_page_description.return_value = {
            "title": "测试标题",
            "text_content": ["内容1", "内容2"],
            "layout_suggestion": "居中布局",
        }
        mock_instance.generate_image.return_value = Image.new("RGB", (1920, 1080), color="blue")
        yield mock_instance


@pytest.fixture
def temp_upload_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def sample_image_file():
    img = Image.new("RGB", (100, 100), color="red")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)
    return img_bytes


def assert_success_response(response, status_code=200):
    assert response.status_code == status_code
    data = response.get_json()
    assert data is not None
    assert data.get("success") is True or data.get("status") == "success"
    return data


def assert_error_response(response, expected_status=None):
    if expected_status:
        assert response.status_code == expected_status
    data = response.get_json()
    assert data is not None
    assert (
        data.get("success") is False
        or data.get("status") == "error"
        or "error" in data
        or "detail" in data
    )
    return data
