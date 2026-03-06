import pytest

from services.ai.base import AIBase, ProjectContext
from services.ai_service import AIService


class DummyTextProvider:
    def __init__(self, sync_response="{}", async_response="{}"):
        self.sync_response = sync_response
        self.async_response = async_response
        self.sync_calls = 0
        self.async_calls = 0

    def generate_text(self, prompt: str, thinking_budget: int = 1000) -> str:
        self.sync_calls += 1
        return self.sync_response

    async def generate_text_async(self, prompt: str, thinking_budget: int = 1000) -> str:
        self.async_calls += 1
        return self.async_response

    def generate_with_image(self, prompt: str, image_path: str, thinking_budget: int = 1000) -> str:
        return self.sync_response

    async def generate_with_image_async(self, prompt: str, image_path: str, thinking_budget: int = 1000) -> str:
        self.async_calls += 1
        return self.async_response


class DummyImageProvider:
    def generate_image(self, *args, **kwargs):
        return None

    async def generate_image_async(self, *args, **kwargs):
        return None


@pytest.mark.asyncio
async def test_ai_base_generate_json_async_prefers_provider_native_async():
    provider = DummyTextProvider(sync_response='{"mode":"sync"}', async_response='{"mode":"async"}')
    base = AIBase(text_provider=provider, image_provider=DummyImageProvider())

    result = await base.generate_json_async("test")

    assert result == {"mode": "async"}
    assert provider.async_calls == 1
    assert provider.sync_calls == 0


@pytest.mark.asyncio
async def test_ai_service_call_async_prefers_async_variant(monkeypatch):
    provider = DummyTextProvider(async_response='[{"title":"Page 1","points":["A"]}]')
    service = AIService(text_provider=provider, image_provider=DummyImageProvider())

    monkeypatch.setattr(
        "services.prompts.outline.get_outline_generation_prompt",
        lambda *args, **kwargs: "outline prompt",
    )
    monkeypatch.setattr(
        "services.presentation.ppt_quality_guard.apply_outline_quality_guard",
        lambda outline, **kwargs: outline,
    )

    ctx = ProjectContext({"idea_prompt": "topic", "scheme_id": "edu_dark"})
    outline = await service.call_async("generate_outline", ctx, language="zh")

    assert outline == [{"title": "Page 1", "points": ["A"]}]
    assert provider.async_calls == 1


@pytest.mark.asyncio
async def test_generate_page_description_async_uses_async_text_provider(monkeypatch):
    provider = DummyTextProvider(async_response="  page body  ")
    service = AIService(text_provider=provider, image_provider=DummyImageProvider())

    monkeypatch.setattr(
        "services.prompts.description.get_page_description_prompt",
        lambda **kwargs: "description prompt",
    )

    ctx = ProjectContext({"idea_prompt": "topic"})
    result = await service.generate_page_description_async(ctx, [], {"title": "P1"}, 1, language="zh")

    assert result.strip() == "page body"
    assert provider.async_calls == 1


@pytest.mark.asyncio
async def test_generate_structured_outline_async_uses_async_json(monkeypatch):
    provider = DummyTextProvider(async_response='{"title":"Doc","pages":[{"page_id":"p01","title":"Cover","layout_id":"cover"}]}')
    service = AIService(text_provider=provider, image_provider=DummyImageProvider())

    monkeypatch.setattr(
        "services.prompts.structured_content.get_structured_outline_prompt",
        lambda *args, **kwargs: "structured outline prompt",
    )
    monkeypatch.setattr(
        "services.presentation.ppt_quality_guard.apply_structured_outline_quality_guard",
        lambda outline, **kwargs: outline,
    )
    monkeypatch.setattr(
        "services.presentation.narrative_continuity.enrich_outline_with_narrative_contract",
        lambda outline: outline,
    )

    result = await service.generate_structured_outline_async("topic", "req", "zh", scheme_id="edu_dark")

    assert result["title"] == "Doc"
    assert result["pages"][0]["layout_id"].endswith("cover")
    assert provider.async_calls == 1
