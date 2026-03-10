"""Shared throttling policy for outbound image generation requests."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass
from threading import Lock
from typing import Any

from config_fastapi import settings


@dataclass(frozen=True)
class ImageRequestPolicy:
    max_workers: int
    min_interval_seconds: float


def _safe_int(value: Any, default: int) -> int:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else default
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float) -> float:
    try:
        parsed = float(value)
        return parsed if parsed >= 0 else default
    except (TypeError, ValueError):
        return default


def _normalize_model_name(image_model: str | None) -> str:
    return str(image_model or "").strip().lower()


def _is_qwen_image_model(image_model: str | None) -> bool:
    return _normalize_model_name(image_model).startswith("qwen-image")


def resolve_image_request_policy(
    *,
    requested_workers: int | None,
    image_model: str | None,
    runtime_config: dict[str, Any] | None = None,
) -> ImageRequestPolicy:
    config = runtime_config or {}
    runtime_worker_limit = _safe_int(
        config.get("MAX_IMAGE_WORKERS"),
        settings.max_image_workers,
    )
    effective_requested_workers = _safe_int(requested_workers, runtime_worker_limit)
    max_workers = max(1, min(effective_requested_workers, runtime_worker_limit))

    default_interval = _safe_float(
        config.get("IMAGE_REQUEST_MIN_INTERVAL_SECONDS"),
        settings.image_request_min_interval_seconds,
    )

    if _is_qwen_image_model(image_model):
        qwen_worker_limit = _safe_int(
            config.get("QWEN_IMAGE_MAX_WORKERS"),
            settings.qwen_image_max_workers,
        )
        qwen_interval = _safe_float(
            config.get("QWEN_IMAGE_MIN_INTERVAL_SECONDS"),
            settings.qwen_image_min_interval_seconds,
        )
        return ImageRequestPolicy(
            max_workers=max(1, min(max_workers, qwen_worker_limit)),
            min_interval_seconds=max(default_interval, qwen_interval),
        )

    return ImageRequestPolicy(
        max_workers=max_workers,
        min_interval_seconds=default_interval,
    )


class ImageRequestGate:
    """Serialize request starts with an optional minimum interval and concurrency cap."""

    def __init__(self, *, max_workers: int, min_interval_seconds: float) -> None:
        self.max_workers = max(1, int(max_workers))
        self.min_interval_seconds = max(0.0, float(min_interval_seconds))
        self._semaphore = asyncio.Semaphore(self.max_workers)
        self._start_lock = asyncio.Lock()
        self._last_started_at = 0.0

    @asynccontextmanager
    async def acquire(self):
        async with self._semaphore:
            async with self._start_lock:
                if self.min_interval_seconds > 0:
                    loop = asyncio.get_running_loop()
                    now = loop.time()
                    wait_seconds = self._last_started_at + self.min_interval_seconds - now
                    if wait_seconds > 0:
                        await asyncio.sleep(wait_seconds)
                    self._last_started_at = loop.time()
                else:
                    self._last_started_at = asyncio.get_running_loop().time()
            yield


_shared_gates: dict[tuple[str, int, float], ImageRequestGate] = {}
_shared_gates_lock = Lock()


def get_shared_image_request_gate(
    *,
    image_model: str | None,
    runtime_config: dict[str, Any] | None = None,
) -> ImageRequestGate:
    config = runtime_config or {}
    runtime_worker_limit = _safe_int(
        config.get("MAX_IMAGE_WORKERS"),
        settings.max_image_workers,
    )
    policy = resolve_image_request_policy(
        requested_workers=runtime_worker_limit,
        image_model=image_model,
        runtime_config=config,
    )
    cache_key = (_normalize_model_name(image_model), policy.max_workers, policy.min_interval_seconds)

    with _shared_gates_lock:
        gate = _shared_gates.get(cache_key)
        if gate is None:
            gate = ImageRequestGate(
                max_workers=policy.max_workers,
                min_interval_seconds=policy.min_interval_seconds,
            )
            _shared_gates[cache_key] = gate
        return gate


__all__ = [
    "ImageRequestGate",
    "ImageRequestPolicy",
    "get_shared_image_request_gate",
    "resolve_image_request_policy",
]
