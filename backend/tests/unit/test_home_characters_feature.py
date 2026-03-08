"""Tests for the standalone home characters feature API."""

from fastapi.testclient import TestClient

from app_fastapi import app


def test_home_characters_config_endpoint_returns_four_characters():
    with TestClient(app) as client:
        response = client.get("/api/home-characters/config")

    assert response.status_code == 200

    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["config"]["title"]
    assert len(payload["data"]["config"]["characters"]) == 4
