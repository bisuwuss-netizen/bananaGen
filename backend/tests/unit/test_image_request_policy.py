import asyncio

import pytest

from services.image_request_policy import ImageRequestGate, resolve_image_request_policy


def test_qwen_models_are_clamped_to_safer_concurrency_and_interval():
    policy = resolve_image_request_policy(
        requested_workers=8,
        image_model="qwen-image-2.0-pro",
        runtime_config={"MAX_IMAGE_WORKERS": 8},
    )

    assert policy.max_workers == 1
    assert policy.min_interval_seconds == 8.0


def test_non_qwen_models_keep_requested_workers_with_zero_interval():
    policy = resolve_image_request_policy(
        requested_workers=4,
        image_model="wanx-v1",
        runtime_config={"MAX_IMAGE_WORKERS": 8},
    )

    assert policy.max_workers == 4
    assert policy.min_interval_seconds == 0.0


@pytest.mark.asyncio
async def test_image_request_gate_spaces_request_starts():
    gate = ImageRequestGate(max_workers=2, min_interval_seconds=0.05)
    started_at: list[float] = []

    async def worker():
        async with gate.acquire():
            started_at.append(asyncio.get_running_loop().time())
            await asyncio.sleep(0.01)

    await asyncio.gather(worker(), worker(), worker())

    assert len(started_at) == 3
    assert started_at[1] - started_at[0] >= 0.045
    assert started_at[2] - started_at[1] >= 0.045
