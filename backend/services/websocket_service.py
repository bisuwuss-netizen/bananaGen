"""
WebSocket 服务 - 用于图片生成实时进度通知
"""

import logging
from typing import Dict, Optional, Callable
from flask_socketio import SocketIO, emit, join_room, leave_room

logger = logging.getLogger(__name__)

# 全局 SocketIO 实例
socketio: Optional[SocketIO] = None

# 存储活跃的任务监听器
_task_listeners: Dict[str, set] = {}


def init_socketio(app, **kwargs):
    """
    初始化 SocketIO
    
    Args:
        app: Flask 应用实例
        **kwargs: SocketIO 配置参数
    """
    global socketio
    
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode='gevent',
        logger=True,
        engineio_logger=True,
        **kwargs
    )
    
    # 注册事件处理器
    _register_handlers()
    
    logger.info("[WebSocket] SocketIO 初始化完成")
    
    return socketio


def _register_handlers():
    """注册 WebSocket 事件处理器"""
    
    @socketio.on('connect')
    def handle_connect():
        logger.info(f"[WebSocket] 客户端连接")
        emit('connected', {'status': 'ok'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info(f"[WebSocket] 客户端断开")
    
    @socketio.on('subscribe_task')
    def handle_subscribe_task(data):
        """
        订阅任务进度
        
        Data:
        {
            "project_id": "xxx",
            "task_id": "yyy"
        }
        """
        project_id = data.get('project_id')
        task_id = data.get('task_id')
        
        if not project_id or not task_id:
            emit('error', {'message': 'project_id and task_id are required'})
            return
        
        room = f"task_{project_id}_{task_id}"
        join_room(room)
        
        # 记录监听器
        if room not in _task_listeners:
            _task_listeners[room] = set()
        # 注意：这里使用 request.sid，但在 SocketIO 中需要从 flask.request 获取
        from flask import request
        _task_listeners[room].add(request.sid)
        
        logger.info(f"[WebSocket] 客户端订阅任务: {room}")
        emit('subscribed', {'room': room, 'task_id': task_id})
    
    @socketio.on('unsubscribe_task')
    def handle_unsubscribe_task(data):
        """取消订阅任务进度"""
        project_id = data.get('project_id')
        task_id = data.get('task_id')
        
        if not project_id or not task_id:
            return
        
        room = f"task_{project_id}_{task_id}"
        leave_room(room)
        
        # 移除监听器
        if room in _task_listeners:
            from flask import request
            _task_listeners[room].discard(request.sid)
            if not _task_listeners[room]:
                del _task_listeners[room]
        
        logger.info(f"[WebSocket] 客户端取消订阅任务: {room}")


def notify_slot_started(project_id: str, task_id: str, slot_id: str):
    """
    通知：插槽开始生成
    
    Args:
        project_id: 项目 ID
        task_id: 任务 ID
        slot_id: 插槽 ID
    """
    if not socketio:
        return
    
    room = f"task_{project_id}_{task_id}"
    socketio.emit('slot_started', {
        'type': 'slot_started',
        'task_id': task_id,
        'slot_id': slot_id
    }, room=room)
    
    logger.debug(f"[WebSocket] 通知 slot_started: {slot_id}")


def notify_slot_completed(
    project_id: str, 
    task_id: str, 
    slot_id: str, 
    image_path: str,
    progress: Dict
):
    """
    通知：插槽生成完成
    
    Args:
        project_id: 项目 ID
        task_id: 任务 ID
        slot_id: 插槽 ID
        image_path: 图片路径
        progress: 进度信息
    """
    if not socketio:
        return
    
    room = f"task_{project_id}_{task_id}"
    socketio.emit('slot_completed', {
        'type': 'slot_completed',
        'task_id': task_id,
        'slot_id': slot_id,
        'image_path': image_path,
        'progress': progress
    }, room=room)
    
    logger.debug(f"[WebSocket] 通知 slot_completed: {slot_id}")


def notify_slot_failed(
    project_id: str, 
    task_id: str, 
    slot_id: str, 
    error: str,
    progress: Dict
):
    """
    通知：插槽生成失败
    
    Args:
        project_id: 项目 ID
        task_id: 任务 ID
        slot_id: 插槽 ID
        error: 错误信息
        progress: 进度信息
    """
    if not socketio:
        return
    
    room = f"task_{project_id}_{task_id}"
    socketio.emit('slot_failed', {
        'type': 'slot_failed',
        'task_id': task_id,
        'slot_id': slot_id,
        'error': error,
        'progress': progress
    }, room=room)
    
    logger.debug(f"[WebSocket] 通知 slot_failed: {slot_id}")


def notify_task_completed(project_id: str, task_id: str, progress: Dict):
    """
    通知：任务完成
    
    Args:
        project_id: 项目 ID
        task_id: 任务 ID
        progress: 最终进度信息
    """
    if not socketio:
        return
    
    room = f"task_{project_id}_{task_id}"
    socketio.emit('task_completed', {
        'type': 'task_completed',
        'task_id': task_id,
        'progress': progress
    }, room=room)
    
    logger.info(f"[WebSocket] 通知 task_completed: {task_id}")


def notify_task_failed(project_id: str, task_id: str, error: str):
    """
    通知：任务失败
    
    Args:
        project_id: 项目 ID
        task_id: 任务 ID
        error: 错误信息
    """
    if not socketio:
        return
    
    room = f"task_{project_id}_{task_id}"
    socketio.emit('task_failed', {
        'type': 'task_failed',
        'task_id': task_id,
        'error': error
    }, room=room)
    
    logger.info(f"[WebSocket] 通知 task_failed: {task_id}")


def create_progress_callback(project_id: str, task_id: str) -> Callable:
    """
    创建带 WebSocket 通知的进度回调函数
    
    Args:
        project_id: 项目 ID
        task_id: 任务 ID
    
    Returns:
        进度回调函数
    """
    def callback(completed: int, total: int, status: str, slot_id: str = None, **kwargs):
        progress = {
            'total': total,
            'completed': completed,
            'failed': kwargs.get('failed', 0)
        }
        
        if status == 'started' and slot_id:
            notify_slot_started(project_id, task_id, slot_id)
        elif status == 'completed' and slot_id:
            notify_slot_completed(
                project_id, task_id, slot_id,
                kwargs.get('image_path', ''),
                progress
            )
        elif status == 'failed' and slot_id:
            notify_slot_failed(
                project_id, task_id, slot_id,
                kwargs.get('error', 'Unknown error'),
                progress
            )
        elif status == 'task_completed':
            notify_task_completed(project_id, task_id, progress)
        elif status == 'task_failed':
            notify_task_failed(project_id, task_id, kwargs.get('error', 'Unknown error'))
    
    return callback
