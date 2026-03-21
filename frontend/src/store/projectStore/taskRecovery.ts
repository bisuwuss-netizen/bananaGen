import { openTaskWebSocket } from '@/api/client';
import type { ProjectTaskPayload } from './types';

export type RecoverableTaskKind = 'active' | 'descriptions' | 'images' | 'knowledgeBase';

export interface RecoverableTaskRecord {
  kind: RecoverableTaskKind;
  projectId: string;
  taskId: string;
  pageIds: string[];
  updatedAt: number;
}

interface WatchRecoverableTaskOptions {
  record: RecoverableTaskRecord;
  onMessage: (task: ProjectTaskPayload) => Promise<void> | void;
}

interface RecoverableTaskSubscription {
  completion: Promise<void>;
  close: () => void;
}

const STORAGE_KEY = 'banana-slides:recoverable-generation-tasks';
const MAX_RECORD_AGE_MS = 24 * 60 * 60 * 1000;
const subscriptions = new Map<string, RecoverableTaskSubscription>();

const getRecordKey = (kind: RecoverableTaskKind, taskId: string): string => `${kind}:${taskId}`;

const canUseBrowserStorage = (): boolean => typeof window !== 'undefined' && typeof localStorage !== 'undefined';
const canUseWindow = (): boolean => typeof window !== 'undefined';

const readRecords = (): Record<string, RecoverableTaskRecord> => {
  if (!canUseBrowserStorage()) {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, RecoverableTaskRecord>;
    const now = Date.now();
    const next: Record<string, RecoverableTaskRecord> = {};

    Object.entries(parsed).forEach(([key, record]) => {
      if (!record?.taskId || !record?.projectId || !record?.kind) {
        return;
      }

      const ageMs = now - (record.updatedAt || 0);
      if (ageMs > MAX_RECORD_AGE_MS) {
        return;
      }

      next[key] = {
        ...record,
        pageIds: Array.isArray(record.pageIds) ? record.pageIds.filter(Boolean) : [],
      };
    });

    return next;
  } catch (error) {
    console.warn('[taskRecovery] Failed to read task records:', error);
    return {};
  }
};

const writeRecords = (records: Record<string, RecoverableTaskRecord>): void => {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn('[taskRecovery] Failed to write task records:', error);
  }
};

export const upsertRecoverableTask = (record: RecoverableTaskRecord): void => {
  const records = readRecords();
  const key = getRecordKey(record.kind, record.taskId);
  records[key] = {
    ...record,
    pageIds: Array.isArray(record.pageIds) ? record.pageIds.filter(Boolean) : [],
    updatedAt: Date.now(),
  };
  writeRecords(records);
};

export const removeRecoverableTask = (kind: RecoverableTaskKind, taskId: string): void => {
  const records = readRecords();
  const key = getRecordKey(kind, taskId);
  if (!records[key]) {
    return;
  }
  delete records[key];
  writeRecords(records);
};

export const listRecoverableTasks = (projectId?: string): RecoverableTaskRecord[] => {
  const records = Object.values(readRecords());
  if (!projectId) {
    return records;
  }
  return records.filter((record) => record.projectId === projectId);
};

export const hasRecoverableTaskSubscription = (
  kind: RecoverableTaskKind,
  taskId: string,
): boolean => subscriptions.has(getRecordKey(kind, taskId));

export const watchRecoverableTask = (
  options: WatchRecoverableTaskOptions,
): RecoverableTaskSubscription => {
  const { record, onMessage } = options;
  const key = getRecordKey(record.kind, record.taskId);
  const existing = subscriptions.get(key);
  if (existing) {
    return existing;
  }

  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let disposed = false;
  let terminal = false;
  let reconnectAttempt = 0;
  let resolveCompletion: (() => void) | null = null;

  const completion = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });

  const resolveOnce = () => {
    if (!resolveCompletion) {
      return;
    }
    resolveCompletion();
    resolveCompletion = null;
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) {
      return;
    }
    if (canUseWindow()) {
      window.clearTimeout(reconnectTimer);
    }
    reconnectTimer = null;
  };

  const handleOnline = () => {
    if (disposed || terminal || socket || reconnectTimer !== null) {
      return;
    }
    reconnectAttempt = 0;
    connect();
  };

  const cleanup = (removeRecord: boolean) => {
    clearReconnectTimer();

    if (canUseWindow()) {
      window.removeEventListener('online', handleOnline);
    }

    if (socket) {
      const currentSocket = socket;
      socket = null;
      currentSocket.onclose = null;
      currentSocket.onerror = null;
      currentSocket.onmessage = null;
      try {
        currentSocket.close();
      } catch (error) {
        console.warn('[taskRecovery] Failed to close task socket:', error);
      }
    }

    subscriptions.delete(key);

    if (removeRecord) {
      removeRecoverableTask(record.kind, record.taskId);
    }

    resolveOnce();
  };

  const finish = () => {
    terminal = true;
    cleanup(true);
  };

  const scheduleReconnect = () => {
    if (disposed || terminal || reconnectTimer !== null) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    const delayMs = Math.min(1000 * (2 ** reconnectAttempt), 10000);
    reconnectAttempt += 1;
    if (!canUseWindow()) {
      return;
    }

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delayMs);
  };

  const connect = () => {
    if (disposed || terminal || socket) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      socket = openTaskWebSocket<ProjectTaskPayload>(record.projectId, record.taskId, {
        onMessage: async (task) => {
          reconnectAttempt = 0;
          await onMessage(task);

          if (task.status === 'COMPLETED' || task.status === 'FAILED') {
            finish();
          }
        },
        onError: () => {
          const currentSocket = socket;
          socket = null;
          if (currentSocket && currentSocket.readyState < WebSocket.CLOSING) {
            try {
              currentSocket.close();
            } catch (error) {
              console.warn('[taskRecovery] Failed to close errored task socket:', error);
            }
          }
          scheduleReconnect();
        },
        onClose: () => {
          socket = null;
          if (!disposed && !terminal) {
            scheduleReconnect();
          }
        },
      });
    } catch (error) {
      console.warn('[taskRecovery] Failed to open task socket:', error);
      socket = null;
      scheduleReconnect();
    }
  };

  if (canUseWindow()) {
    window.addEventListener('online', handleOnline);
  }

  const subscription: RecoverableTaskSubscription = {
    completion,
    close: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      cleanup(true);
    },
  };

  subscriptions.set(key, subscription);
  connect();
  return subscription;
};
