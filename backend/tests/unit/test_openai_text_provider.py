import types

import pytest

from services.ai_providers.text.openai_provider import OpenAITextProvider


class _FakeSyncCompletions:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=types.SimpleNamespace(content="ok-sync"))]
        )


class _FakeAsyncCompletions:
    def __init__(self):
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=types.SimpleNamespace(content="ok-async"))]
        )


def test_generate_text_forces_disable_thinking(monkeypatch):
    sync_completions = _FakeSyncCompletions()
    async_completions = _FakeAsyncCompletions()

    sync_client = types.SimpleNamespace(
        chat=types.SimpleNamespace(completions=sync_completions)
    )
    async_client = types.SimpleNamespace(
        chat=types.SimpleNamespace(completions=async_completions)
    )

    monkeypatch.setattr(
        "services.ai_providers.text.openai_provider.OpenAI",
        lambda **_: sync_client,
    )
    monkeypatch.setattr(
        "services.ai_providers.text.openai_provider.AsyncOpenAI",
        lambda **_: async_client,
    )

    provider = OpenAITextProvider(api_key="k", api_base="https://example.com", model="qwen3.5-flash")
    result = provider.generate_text("hello")

    assert result == "ok-sync"
    assert len(sync_completions.calls) == 1
    call = sync_completions.calls[0]
    assert call["extra_body"] == {"enable_thinking": False}


@pytest.mark.asyncio
async def test_generate_text_async_forces_disable_thinking(monkeypatch):
    sync_completions = _FakeSyncCompletions()
    async_completions = _FakeAsyncCompletions()

    sync_client = types.SimpleNamespace(
        chat=types.SimpleNamespace(completions=sync_completions)
    )
    async_client = types.SimpleNamespace(
        chat=types.SimpleNamespace(completions=async_completions)
    )

    monkeypatch.setattr(
        "services.ai_providers.text.openai_provider.OpenAI",
        lambda **_: sync_client,
    )
    monkeypatch.setattr(
        "services.ai_providers.text.openai_provider.AsyncOpenAI",
        lambda **_: async_client,
    )

    provider = OpenAITextProvider(api_key="k", api_base="https://example.com", model="qwen3.5-flash")
    result = await provider.generate_text_async("hello")

    assert result == "ok-async"
    assert len(async_completions.calls) == 1
    call = async_completions.calls[0]
    assert call["extra_body"] == {"enable_thinking": False}
