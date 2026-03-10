import json

from services.ai_providers.image.qwen_provider import QwenImageProvider


class _DummyResponse:
    def __init__(self, status_code: int, payload: dict | None = None, text: str = ""):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


def test_qwen_provider_waits_before_retrying_rate_limited_requests(monkeypatch):
    responses = [
        _DummyResponse(
            429,
            text=json.dumps(
                {
                    "code": "Throttling.RateQuota",
                    "message": "Requests rate limit exceeded",
                }
            ),
        ),
        _DummyResponse(
            200,
            payload={
                "output": {
                    "choices": [
                        {
                            "message": {
                                "content": [
                                    {"image": "https://example.com/generated.png"},
                                ]
                            }
                        }
                    ]
                }
            },
        ),
    ]
    sleep_calls: list[float] = []

    def fake_post(*args, **kwargs):
        return responses.pop(0)

    monkeypatch.setattr("services.ai_providers.image.qwen_provider.requests.post", fake_post)
    monkeypatch.setattr("services.ai_providers.image.qwen_provider.time.sleep", sleep_calls.append)

    provider = QwenImageProvider(
        api_key="test-key",
        api_base="https://dashscope.aliyuncs.com/api/v1",
        model="qwen-image-2.0-pro",
    )
    provider.max_retries = 1
    provider.rate_limit_backoff_seconds = 8.0
    monkeypatch.setattr(provider, "_download_image", lambda _url: "image-ok")

    result = provider.generate_image("generate a slide cover")

    assert result == "image-ok"
    assert sleep_calls == [8.0]
