import asyncio

import pytest

from services.tasks.manager import TaskManager


@pytest.mark.asyncio
async def test_publish_task_update_delivers_latest_payload_to_subscriber():
    manager = TaskManager()
    queue = manager.subscribe_task("task-1")

    payload = {"task_id": "task-1", "status": "PROCESSING", "progress": {"completed": 1}}
    await manager.publish_task_update("task-1", payload)

    received = await asyncio.wait_for(queue.get(), timeout=0.1)
    assert received == payload

    manager.unsubscribe_task("task-1", queue)


@pytest.mark.asyncio
async def test_publish_task_update_replaces_stale_payload_when_consumer_lags():
    manager = TaskManager()
    queue = manager.subscribe_task("task-2")

    await manager.publish_task_update("task-2", {"task_id": "task-2", "progress": {"completed": 1}})
    await manager.publish_task_update("task-2", {"task_id": "task-2", "progress": {"completed": 2}})

    received = await asyncio.wait_for(queue.get(), timeout=0.1)
    assert received["progress"]["completed"] == 2

    manager.unsubscribe_task("task-2", queue)
