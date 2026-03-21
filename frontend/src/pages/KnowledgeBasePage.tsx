import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Loader2, Sparkles, ArrowRight, FileText, ArrowLeft, RefreshCw } from 'lucide-react';

import { Button, useToast, ReferenceFileCard, SchemeSelector, FilePreviewModal } from '@/components/shared';
import {
  createProjectFromKnowledgeBase,
  listKnowledgeBaseFiles,
  parseKnowledgeBaseFile,
  startKnowledgeBaseOutlineTask,
  uploadKnowledgeBaseDoc,
  type ReferenceFile,
} from '@/api/endpoints';
import {
  listRecoverableTasks,
  upsertRecoverableTask,
  watchRecoverableTask,
  type RecoverableTaskRecord,
} from '@/store/projectStore/taskRecovery';
import type { ProjectTaskPayload } from '@/store/projectStore/types';

const KNOWLEDGE_BASE_PROJECT_ID = 'global';
const KNOWLEDGE_BASE_DRAFT_KEY = 'banana-slides:knowledge-base-outline-draft';
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.txt', '.md'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

interface KnowledgeBaseDraft {
  taskId: string | null;
  outlineText: string;
  referenceFileIds: string[];
  extraRequirements: string;
  progressMessage: string;
  isComplete: boolean;
  updatedAt: number;
}

const canUseDraftStorage = (): boolean =>
  typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const readKnowledgeBaseDraft = (): KnowledgeBaseDraft | null => {
  if (!canUseDraftStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(KNOWLEDGE_BASE_DRAFT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<KnowledgeBaseDraft>;
    return {
      taskId: typeof parsed.taskId === 'string' ? parsed.taskId : null,
      outlineText: typeof parsed.outlineText === 'string' ? parsed.outlineText : '',
      referenceFileIds: Array.isArray(parsed.referenceFileIds)
        ? parsed.referenceFileIds.filter(Boolean).map(String)
        : [],
      extraRequirements: typeof parsed.extraRequirements === 'string' ? parsed.extraRequirements : '',
      progressMessage: typeof parsed.progressMessage === 'string' ? parsed.progressMessage : '',
      isComplete: Boolean(parsed.isComplete),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch (error) {
    console.warn('[KnowledgeBasePage] Failed to read draft:', error);
    return null;
  }
};

const writeKnowledgeBaseDraft = (draft: KnowledgeBaseDraft): void => {
  if (!canUseDraftStorage()) {
    return;
  }

  try {
    localStorage.setItem(KNOWLEDGE_BASE_DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch (error) {
    console.warn('[KnowledgeBasePage] Failed to write draft:', error);
  }
};

const clearKnowledgeBaseDraft = (): void => {
  if (!canUseDraftStorage()) {
    return;
  }
  localStorage.removeItem(KNOWLEDGE_BASE_DRAFT_KEY);
};

const parseTaskProgress = (task: ProjectTaskPayload): Record<string, any> => {
  if (!task.progress) {
    return {};
  }
  if (typeof task.progress === 'string') {
    try {
      return JSON.parse(task.progress) as Record<string, any>;
    } catch (error) {
      console.warn('[KnowledgeBasePage] Failed to parse task progress:', error);
      return {};
    }
  }
  return task.progress as Record<string, any>;
};

const buildTaskRecord = (taskId: string): RecoverableTaskRecord => ({
  kind: 'knowledgeBase',
  projectId: KNOWLEDGE_BASE_PROJECT_ID,
  taskId,
  pageIds: [],
  updatedAt: Date.now(),
});

const debounce = <T extends (...args: any[]) => void>(fn: T, ms: number): T => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
};

export const KnowledgeBasePage: React.FC = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const showRef = useRef(show);
  showRef.current = show;

  const [files, setFiles] = useState<ReferenceFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [extraRequirements, setExtraRequirements] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState('edu_dark');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [outlineText, setOutlineText] = useState('');
  const [outlineReferenceFileIds, setOutlineReferenceFileIds] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskSubscriptionRef = useRef<{ close: () => void } | null>(null);
  const lastFailedTaskKeyRef = useRef<string | null>(null);
  const outlineReferenceFileIdsRef = useRef<string[]>([]);
  const extraRequirementsRef = useRef('');
  const debouncedPersistDraftRef = useRef<((next: Partial<KnowledgeBaseDraft>) => void) | null>(null);

  const persistDraft = useCallback((next: Partial<KnowledgeBaseDraft>) => {
    const previous = readKnowledgeBaseDraft();
    writeKnowledgeBaseDraft({
      taskId: next.taskId !== undefined ? next.taskId ?? null : previous?.taskId ?? null,
      outlineText: next.outlineText !== undefined ? next.outlineText : previous?.outlineText ?? '',
      referenceFileIds:
        next.referenceFileIds !== undefined ? next.referenceFileIds : previous?.referenceFileIds ?? [],
      extraRequirements:
        next.extraRequirements !== undefined ? next.extraRequirements : previous?.extraRequirements ?? '',
      progressMessage:
        next.progressMessage !== undefined ? next.progressMessage : previous?.progressMessage ?? '',
      isComplete: next.isComplete !== undefined ? next.isComplete : previous?.isComplete ?? false,
      updatedAt: Date.now(),
    });
  }, []);

  if (!debouncedPersistDraftRef.current) {
    debouncedPersistDraftRef.current = debounce(persistDraft, 300);
  }

  const applyDraft = useCallback((draft: KnowledgeBaseDraft) => {
    setCurrentTaskId(draft.taskId);
    setOutlineText(draft.outlineText);
    setOutlineReferenceFileIds(draft.referenceFileIds);
    setExtraRequirements(draft.extraRequirements);
    outlineReferenceFileIdsRef.current = draft.referenceFileIds;
    extraRequirementsRef.current = draft.extraRequirements;
    setProgressMessage(draft.isComplete ? '' : draft.progressMessage);
    setIsComplete(draft.isComplete);
    setIsGenerating(Boolean(draft.taskId) && !draft.isComplete);
  }, []);

  const applyTaskSnapshot = useCallback((task: ProjectTaskPayload) => {
    const progress = parseTaskProgress(task);
    const draft = readKnowledgeBaseDraft();
    const taskId = task.task_id || task.id || null;
    const nextOutlineText = typeof progress.outline_text === 'string' ? progress.outline_text : '';
    const nextReferenceFileIds = Array.isArray(progress.reference_file_ids)
      ? progress.reference_file_ids.filter(Boolean).map(String)
      : outlineReferenceFileIdsRef.current.length > 0
        ? outlineReferenceFileIdsRef.current
        : draft?.referenceFileIds ?? [];
    const nextExtraRequirements = typeof progress.extra_requirements === 'string'
      ? progress.extra_requirements
      : extraRequirementsRef.current || draft?.extraRequirements || '';
    const currentStep = typeof progress.current_step === 'string'
      ? progress.current_step
      : '';
    const failedMessage = task.error_message || task.error || currentStep || '生成大纲失败';
    const nextProgressMessage = task.status === 'FAILED'
      ? failedMessage
      : task.status === 'COMPLETED'
        ? ''
        : currentStep;
    const nextIsComplete = task.status === 'COMPLETED';

    setCurrentTaskId(taskId);
    setOutlineText(nextOutlineText);
    setOutlineReferenceFileIds(nextReferenceFileIds);
    setExtraRequirements(nextExtraRequirements);
    outlineReferenceFileIdsRef.current = nextReferenceFileIds;
    extraRequirementsRef.current = nextExtraRequirements;
    setProgressMessage(nextProgressMessage);
    setIsGenerating(task.status === 'PENDING' || task.status === 'PROCESSING' || task.status === 'RUNNING');
    setIsComplete(nextIsComplete);

    persistDraft({
      taskId,
      outlineText: nextOutlineText,
      referenceFileIds: nextReferenceFileIds,
      extraRequirements: nextExtraRequirements,
      progressMessage: nextProgressMessage,
      isComplete: nextIsComplete,
    });

    if (task.status === 'FAILED') {
      const failedKey = `${taskId || 'unknown'}:${failedMessage}`;
      if (lastFailedTaskKeyRef.current !== failedKey) {
        lastFailedTaskKeyRef.current = failedKey;
        showRef.current(failedMessage, 'error');
      }
    }
  }, [persistDraft]);

  const attachTaskWatcher = useCallback((record: RecoverableTaskRecord) => {
    taskSubscriptionRef.current?.close?.();
    taskSubscriptionRef.current = watchRecoverableTask({
      record,
      onMessage: async (task) => {
        applyTaskSnapshot(task);
      },
    });
  }, [applyTaskSnapshot]);

  useEffect(() => {
    void (async () => {
      setIsLoadingFiles(true);
      try {
        const list = await listKnowledgeBaseFiles();
        const sorted = list.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setFiles(sorted);
        setSelectedFileIds(new Set(sorted.filter((f) => f.parse_status === 'completed').map((f) => f.id)));
      } catch (err) {
        console.error('Failed to load knowledge base files:', err);
        showRef.current('加载文件列表失败', 'error');
      } finally {
        setIsLoadingFiles(false);
      }
    })();

    const draft = readKnowledgeBaseDraft();
    if (draft) {
      applyDraft(draft);
    }

    const records = listRecoverableTasks(KNOWLEDGE_BASE_PROJECT_ID)
      .filter((record) => record.kind === 'knowledgeBase')
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (records[0]) {
      attachTaskWatcher(records[0]);
    } else if (draft?.taskId && !draft.isComplete) {
      const record = buildTaskRecord(draft.taskId);
      upsertRecoverableTask(record);
      attachTaskWatcher(record);
    }

    return () => {
      const latestDraft = readKnowledgeBaseDraft();
      taskSubscriptionRef.current?.close?.();
      taskSubscriptionRef.current = null;
      if (latestDraft?.taskId && !latestDraft.isComplete) {
        upsertRecoverableTask(buildTaskRecord(latestDraft.taskId));
      }
    };
  }, [applyDraft, attachTaskWatcher]);

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const allFiles = Array.from(fileList);

    const oversizedFiles = allFiles.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    for (const file of oversizedFiles) {
      show(`${file.name} 超过 50MB 限制，已跳过`, 'error');
    }

    const validFiles = allFiles
      .filter((file) => file.size <= MAX_FILE_SIZE_BYTES)
      .filter((file) => ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)));

    if (validFiles.length === 0 && oversizedFiles.length === 0) {
      show('仅支持 PDF、Word、PPT、Excel、CSV、TXT、Markdown 格式', 'error');
      return;
    }
    if (validFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    const uploadResults = await Promise.allSettled(
      validFiles.map((file) => uploadKnowledgeBaseDoc(file)),
    );

    const uploaded: ReferenceFile[] = [];
    uploadResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        uploaded.push(result.value);
        setFiles((prev) => {
          const next = [result.value, ...prev];
          return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
        setSelectedFileIds((prev) => new Set([...prev, result.value.id]));
      } else {
        console.error('Upload failed:', result.reason);
        show(`上传 ${validFiles[idx].name} 失败`, 'error');
      }
    });

    await Promise.allSettled(
      uploaded.map(async (ref) => {
        try {
          await parseKnowledgeBaseFile(ref.id);
        } catch (err) {
          console.error('Parse trigger failed:', err);
          show(`${ref.filename} 解析触发失败，可手动重试`, 'error');
        }
      }),
    );

    setIsUploading(false);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    void handleUploadFiles(event.target.files);
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isUploading) {
      void handleUploadFiles(event.dataTransfer.files);
    }
  };

  const handleFileDelete = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
    setSelectedFileIds((prev) => { const next = new Set(prev); next.delete(fileId); return next; });
  };

  const handleToggleFile = useCallback((fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) { next.delete(fileId); } else { next.add(fileId); }
      return next;
    });
  }, []);

  const handleStatusChange = useCallback((updated: ReferenceFile) => {
    setFiles((prev) => prev.map((file) => (file.id === updated.id ? updated : file)));
    if (updated.parse_status === 'completed') {
      setSelectedFileIds((prev) => new Set([...prev, updated.id]));
    }
  }, []);

  const handleGenerateOutline = async () => {
    if (isComplete && outlineText.trim()) {
      if (!window.confirm('当前大纲将被覆盖，确认重新生成？')) {
        return;
      }
    }

    const completedIds = files
      .filter((file) => file.parse_status === 'completed' && selectedFileIds.has(file.id))
      .map((file) => file.id);

    if (completedIds.length === 0) {
      return;
    }

    setIsGenerating(true);
    setIsComplete(false);
    setOutlineText('');
    setOutlineReferenceFileIds(completedIds);
    outlineReferenceFileIdsRef.current = completedIds;
    extraRequirementsRef.current = extraRequirements;
    setProgressMessage('等待开始...');
    setCurrentTaskId(null);
    clearKnowledgeBaseDraft();
    taskSubscriptionRef.current?.close?.();
    taskSubscriptionRef.current = null;

    try {
      const task = await startKnowledgeBaseOutlineTask(
        completedIds,
        extraRequirements.trim() || undefined,
      );

      const record = buildTaskRecord(task.task_id);
      setCurrentTaskId(task.task_id);
      persistDraft({
        taskId: task.task_id,
        outlineText: '',
        referenceFileIds: completedIds,
        extraRequirements,
        progressMessage: '等待开始...',
        isComplete: false,
      });
      upsertRecoverableTask(record);
      attachTaskWatcher(record);
    } catch (err) {
      console.error('Generate outline failed:', err);
      setIsGenerating(false);
      setProgressMessage('');
      show('生成大纲失败，请重试', 'error');
    }
  };

  const handleOutlineChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextOutlineText = event.target.value;
    setOutlineText(nextOutlineText);
    debouncedPersistDraftRef.current?.({
      taskId: currentTaskId,
      outlineText: nextOutlineText,
      referenceFileIds: outlineReferenceFileIds,
      extraRequirements,
      progressMessage,
      isComplete,
    });
  };

  const handleUseOutline = async () => {
    const finalOutline = outlineText.trim();
    if (!finalOutline) {
      return;
    }

    setIsCreatingProject(true);
    try {
      const schemeId = selectedSchemeId;
      const draft = readKnowledgeBaseDraft();
      const referenceFileIds = outlineReferenceFileIds.length > 0
        ? outlineReferenceFileIds
        : outlineReferenceFileIdsRef.current.length > 0
          ? outlineReferenceFileIdsRef.current
          : draft?.referenceFileIds ?? [];
      const response = await createProjectFromKnowledgeBase({
        outlineText: finalOutline,
        referenceFileIds,
        renderMode: 'html',
        schemeId,
      });
      const projectId = response.data?.project_id;
      if (!projectId) {
        throw new Error('未收到项目 ID');
      }

      clearKnowledgeBaseDraft();
      navigate(`/project/${projectId}/outline`, {
        state: { autoStartOutline: true, from: 'knowledge-base' },
      });
    } catch (error) {
      console.error('Create project from knowledge base failed:', error);
      show('创建项目失败，请重试', 'error');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const hasCompleted = files.some((file) => file.parse_status === 'completed' && selectedFileIds.has(file.id));
  const completedCount = files.filter((f) => f.parse_status === 'completed').length;
  const parsingCount = files.filter((f) => f.parse_status === 'parsing' || f.parse_status === 'pending').length;
  const failedCount = files.filter((f) => f.parse_status === 'failed').length;
  const selectedCompletedCount = files.filter((f) => f.parse_status === 'completed' && selectedFileIds.has(f.id)).length;

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-banana-500" />
            知识库生成大纲
          </h1>
          <p className="mt-1 text-sm text-gray-500">上传文档，AI 将根据内容自动生成 PPT 大纲</p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-6 ${
            isDragging
              ? 'border-banana-500 bg-banana-50'
              : 'border-gray-300 bg-white hover:border-banana-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && !isUploading) {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="上传知识库文档"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-banana-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">上传中...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium text-gray-600">拖拽文件到此处，或点击上传</p>
              <p className="text-xs">支持 PDF、Word、PPT、Excel、CSV、TXT、Markdown</p>
            </div>
          )}
        </div>

        {isLoadingFiles ? (
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">加载文件列表...</span>
          </div>
        ) : files.length > 0 ? (
          <>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-1">
              <span>
                已选 <span className="font-medium text-gray-700">{selectedCompletedCount}</span> 个文件参与生成
                {parsingCount > 0 && <span className="ml-2 text-banana-500">· {parsingCount} 个解析中</span>}
                {failedCount > 0 && <span className="ml-2 text-red-500">· {failedCount} 个失败</span>}
                {completedCount > selectedCompletedCount && (
                  <span className="ml-2 text-gray-400">· {completedCount - selectedCompletedCount} 个未选</span>
                )}
              </span>
            </div>
            <ul role="list" aria-label="已上传文件列表" className="space-y-2 mb-6">
              {files.map((file) => (
                <li key={file.id}>
                  <ReferenceFileCard
                    file={file}
                    onDelete={handleFileDelete}
                    onStatusChange={handleStatusChange}
                    deleteMode="delete"
                    selected={selectedFileIds.has(file.id)}
                    onToggle={handleToggleFile}
                    onClick={file.parse_status === 'completed' ? () => setPreviewFileId(file.id) : undefined}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-center text-gray-400 py-4">
            暂无文件，上传文档后即可生成大纲
          </p>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            额外要求
            <span className="ml-1 text-gray-400 font-normal">（可选）</span>
          </label>
          <textarea
            value={extraRequirements}
            onChange={(event) => {
              setExtraRequirements(event.target.value);
              extraRequirementsRef.current = event.target.value;
            }}
            placeholder="例如：重点突出技术架构，控制在 10 页以内..."
            rows={3}
            aria-label="额外要求（可选）"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-banana-500 focus:border-transparent bg-white"
          />
        </div>

        <div className="mb-6">
          <p className="block text-sm font-medium text-gray-700 mb-2">选择 PPT 主题</p>
          <SchemeSelector value={selectedSchemeId} onChange={setSelectedSchemeId} />
        </div>

        <Button
          onClick={handleGenerateOutline}
          disabled={!hasCompleted || isGenerating || isCreatingProject}
          className="w-full flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中...
            </>
          ) : isComplete ? (
            <>
              <RefreshCw className="w-4 h-4" />
              重新生成大纲
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              生成大纲
            </>
          )}
        </Button>

        {!hasCompleted && files.length > 0 && (
          <p className="mt-2 text-xs text-center text-gray-400">
            {selectedCompletedCount === 0 && completedCount > 0
              ? '请勾选至少一个已解析文件'
              : '等待至少一个文件解析完成后可生成大纲'}
          </p>
        )}

        {(isGenerating || outlineText) && (
          <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
            {progressMessage && (
              <div className="flex items-center gap-2 text-sm text-banana-500 mb-3">
                {isGenerating && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                <span aria-live="polite">{progressMessage}</span>
              </div>
            )}

            <textarea
              value={outlineText}
              onChange={handleOutlineChange}
              readOnly={!isComplete}
              rows={16}
              placeholder="大纲将在此处生成，刷新后也可继续恢复..."
              className="w-full text-sm text-gray-800 border-0 resize-none focus:outline-none bg-transparent"
            />

            {isComplete && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button
                  onClick={handleUseOutline}
                  disabled={isCreatingProject}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isCreatingProject ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      创建项目中...
                    </>
                  ) : (
                    <>
                      使用此大纲创建 PPT
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    <FilePreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />
    </>
  );
};
