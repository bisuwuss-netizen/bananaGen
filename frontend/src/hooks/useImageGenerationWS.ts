import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useVocationalStore } from '@/store/useVocationalStore';

interface WSMessage {
  type: 'slot_started' | 'slot_completed' | 'slot_failed' | 'task_completed' | 'task_failed';
  task_id?: string;
  slot_id?: string;
  image_path?: string;
  error?: string;
  progress?: {
    total: number;
    completed: number;
    failed: number;
  };
}

interface UseImageGenerationWSOptions {
  projectId: string | null;
  taskId: string | null;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

// 指数退避重连配置
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const useImageGenerationWS = ({
  projectId,
  taskId,
  onComplete,
  onError,
}: UseImageGenerationWSOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const {
    updateSlotStatus,
    updateImageProgress,
    setImageTaskId,
    setWsConnected,
  } = useVocationalStore();
  
  // 处理消息
  const handleSlotStarted = useCallback((data: WSMessage) => {
    if (data.slot_id) {
      updateSlotStatus(data.slot_id, 'generating');
    }
  }, [updateSlotStatus]);
  
  const handleSlotCompleted = useCallback((data: WSMessage) => {
    if (data.slot_id) {
      updateSlotStatus(data.slot_id, 'completed', data.image_path);
    }
    if (data.progress) {
      updateImageProgress(data.progress);
    }
  }, [updateSlotStatus, updateImageProgress]);
  
  const handleSlotFailed = useCallback((data: WSMessage) => {
    if (data.slot_id) {
      updateSlotStatus(data.slot_id, 'failed');
    }
    if (data.progress) {
      updateImageProgress(data.progress);
    }
  }, [updateSlotStatus, updateImageProgress]);
  
  const handleTaskCompleted = useCallback((data: WSMessage) => {
    setImageTaskId(null);
    if (data.progress) {
      updateImageProgress(data.progress);
    }
    onComplete?.();
  }, [setImageTaskId, updateImageProgress, onComplete]);
  
  const handleTaskFailed = useCallback((data: WSMessage) => {
    setImageTaskId(null);
    onError?.(data.error || '任务失败');
  }, [setImageTaskId, onError]);
  
  // 连接 SocketIO
  const connect = useCallback(() => {
    if (!projectId || !taskId) return;
    
    // 关闭现有连接
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // 构建 SocketIO URL（后端地址）
    const backendUrl = import.meta.env.VITE_API_BASE_URL || '';
    
    console.log('[SocketIO] 连接中...', backendUrl);
    
    try {
      const socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: INITIAL_RECONNECT_DELAY,
        reconnectionDelayMax: MAX_RECONNECT_DELAY,
      });
      
      socket.on('connect', () => {
        console.log('[SocketIO] 连接成功');
        setIsConnected(true);
        setWsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // 订阅任务
        socket.emit('subscribe_task', { project_id: projectId, task_id: taskId });
      });
      
      socket.on('disconnect', (reason) => {
        console.log('[SocketIO] 连接断开', reason);
        setIsConnected(false);
        setWsConnected(false);
      });
      
      socket.on('connect_error', (error) => {
        console.error('[SocketIO] 连接错误:', error);
        setConnectionError('连接错误');
        reconnectAttempts.current++;
        
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('WebSocket 连接失败，请刷新页面重试');
        }
      });
      
      // 监听事件
      socket.on('subscribed', (data) => {
        console.log('[SocketIO] 订阅成功', data);
      });
      
      socket.on('slot_started', handleSlotStarted);
      socket.on('slot_completed', handleSlotCompleted);
      socket.on('slot_failed', handleSlotFailed);
      socket.on('task_completed', handleTaskCompleted);
      socket.on('task_failed', handleTaskFailed);
      
      socketRef.current = socket;
    } catch (error) {
      console.error('[SocketIO] 创建连接失败:', error);
      setConnectionError('SocketIO 创建失败');
    }
  }, [
    projectId, taskId,
    handleSlotStarted, handleSlotCompleted, handleSlotFailed,
    handleTaskCompleted, handleTaskFailed,
    setWsConnected
  ]);
  
  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // 取消订阅
      if (projectId && taskId) {
        socketRef.current.emit('unsubscribe_task', { project_id: projectId, task_id: taskId });
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setWsConnected(false);
  }, [projectId, taskId, setWsConnected]);
  
  // 当 taskId 变化时连接/断开
  useEffect(() => {
    if (taskId && projectId) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [taskId, projectId, connect, disconnect]);
  
  return {
    isConnected,
    connectionError,
    reconnect: connect,
    disconnect,
  };
};
