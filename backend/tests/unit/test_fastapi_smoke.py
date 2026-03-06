"""Smoke tests for the FastAPI app assembly on the refactor branch."""

from fastapi.testclient import TestClient

from app_fastapi import app


def test_fastapi_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_fastapi_docs_and_core_routes_are_registered():
    paths = {route.path for route in app.routes}

    assert "/docs" in paths
    assert "/api/projects" in paths
    assert "/api/html-renderer/health" in paths
    assert "/api/projects/{project_id}/tasks/{task_id}/ws" in paths
