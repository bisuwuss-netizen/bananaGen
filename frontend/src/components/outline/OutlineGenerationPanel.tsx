import React, { useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, Clock3, Sparkles } from 'lucide-react';

import { Skeleton } from '@/components/shared';
import type {
  OutlinePreviewCard,
  Project,
  TaskProgress,
} from '@/types';
import {
  getOutlineProgressMessages,
  getOutlineProgressStageText,
  hasConfirmedOutlinePageCount,
  resolveGeneratedOutlineCards,
  resolveQueuedOutlineCards,
} from '@/utils/outlineProgress';

interface OutlineGenerationPanelProps {
  project: Project;
  progress?: TaskProgress | null;
}

const getPercent = (progress?: TaskProgress | null): number => {
  if (!progress) return 0;
  if (typeof progress.percent === 'number') return progress.percent;
  if ((progress.total || 0) > 0) {
    return Math.round(((progress.completed || 0) / progress.total) * 100);
  }
  return 0;
};

const modeLabelMap: Record<string, string> = {
  html: '结构化生成',
  image: '图片渲染',
};

const PreviewCardItem: React.FC<{
  card: OutlinePreviewCard;
  index: number;
}> = ({ card, index }) => {
  const points = Array.isArray(card.points) ? card.points.filter(Boolean).slice(0, 2) : [];
  const isReady = card.status === 'ready';

  return (
    <div className="rounded-md bg-white p-4" style={{ border: '2px solid #1a1a1a' }}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border-2 border-gray-900 bg-[#f5d040] text-sm font-black text-gray-900">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="truncate text-sm font-bold text-gray-900 md:text-base">
              {card.title || '正在生成标题'}
            </h4>
            <span
              className={[
                'inline-flex rounded-md border-2 border-gray-900 px-2 py-0.5 text-[11px] font-bold',
                isReady ? 'bg-[#f5d040] text-gray-900' : 'bg-gray-100 text-gray-600',
              ].join(' ')}
            >
              {isReady ? '已成形' : '规划中'}
            </span>
          </div>

          {points.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-gray-600 md:text-sm">
              {points.map((point, pointIndex) => (
                <li key={`${card.id || card.title}-${pointIndex}`} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-900" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-3 w-11/12 rounded" />
              <Skeleton className="h-3 w-8/12 rounded" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const OutlineGenerationPanel: React.FC<OutlineGenerationPanelProps> = ({
  project,
  progress,
}) => {
  const percent = getPercent(progress);
  const generatedCards = useMemo(
    () => resolveGeneratedOutlineCards(project, progress),
    [project, progress]
  );
  const queuedCards = useMemo(
    () => resolveQueuedOutlineCards(project, progress),
    [project, progress]
  );
  const messages = useMemo(() => getOutlineProgressMessages(progress), [progress]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  const stageText = getOutlineProgressStageText(progress);
  const hasConfirmedPageCount = hasConfirmedOutlinePageCount(progress);
  const actualTotalPages = hasConfirmedPageCount
    ? (progress?.actual_total_pages || generatedCards.length + queuedCards.length)
    : null;
  const referenceCount = progress?.reference_count ?? 0;
  const hasReferenceFiles = referenceCount > 0;
  const resolvedRenderMode = progress?.render_mode || project.render_mode || 'image';
  const isHtmlOutlineMode = resolvedRenderMode === 'html';
  const renderMode = modeLabelMap[resolvedRenderMode] || '图片渲染';
  const queueSectionTitle = hasConfirmedPageCount ? '排队中的页面' : '正在规划的页面结构';
  const queueSectionMeta = hasConfirmedPageCount ? `${queuedCards.length} 张` : isHtmlOutlineMode ? '结构整体规划中' : '页数待确定';
  const previewHeading = isHtmlOutlineMode ? '结构化大纲会在规划完成后整体出现' : '大纲卡片正在逐页长出来';
  const generatedPlaceholderText = isHtmlOutlineMode
    ? '结构化模式会先整体规划页面结构，再统一展示可编辑大纲。'
    : '第一张卡片生成后会立即出现在这里。';

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 md:px-6 md:py-8">
      <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">

        {/* 左栏：进度面板 */}
        <section className="rounded-lg bg-white p-5 md:p-7" style={{ border: '2px solid #1a1a1a', boxShadow: '4px 4px 0 #1a1a1a' }}>
          {/* 状态徽标 */}
          <div className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-[#f5d040] px-3 py-1 text-xs font-bold text-gray-900" style={{ boxShadow: '2px 2px 0 #1a1a1a' }}>
            <Sparkles size={13} />
            AI 正在起草大纲
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 md:text-[28px]">
                AI 正在为您规划大纲结构
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-gray-600 md:text-[15px]">
                {stageText}
              </p>
            </div>

            {/* 数据统计格 */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-gray-50 p-4" style={{ border: '2px solid #1a1a1a' }}>
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">已生成页数</div>
                <div className="mt-2 text-2xl font-black text-gray-900">{generatedCards.length}</div>
              </div>
              <div className="rounded-md bg-gray-50 p-4" style={{ border: '2px solid #1a1a1a' }}>
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">待生成页数</div>
                <div className={`mt-2 font-black text-gray-900 ${hasConfirmedPageCount ? 'text-2xl' : 'text-lg'}`}>
                  {hasConfirmedPageCount ? queuedCards.length : '待确定'}
                </div>
              </div>
              <div className="rounded-md bg-gray-50 p-4" style={{ border: '2px solid #1a1a1a' }}>
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">总页数 / 模式</div>
                <div className="mt-2 text-lg font-black text-gray-900">
                  {hasConfirmedPageCount ? `${actualTotalPages} · ${renderMode}` : `待规划 · ${renderMode}`}
                </div>
                {!hasConfirmedPageCount && (
                  <div className="mt-1 text-xs text-gray-400">结构确定后再显示真实页数</div>
                )}
                {hasReferenceFiles && (
                  <div className="mt-1 text-xs text-gray-400">已上传资料 {referenceCount}</div>
                )}
              </div>
            </div>

            {/* 进度条 */}
            <div className="rounded-md bg-white p-4" style={{ border: '2px solid #1a1a1a' }}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-bold text-gray-900">生成进度</span>
                <span className="font-black text-gray-900">{percent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-sm bg-gray-200" style={{ border: '1.5px solid #1a1a1a' }}>
                <div
                  className="h-full bg-[#f5d040] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Clock3 size={13} />
                <span>完成后会自动刷新为可编辑大纲列表。</span>
              </div>
            </div>

            {/* 实时日志 */}
            <div className="rounded-md bg-white p-4" style={{ border: '2px solid #1a1a1a' }}>
              <div className="mb-3 text-sm font-black text-gray-900">实时阶段日志</div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {messages.map((message, index) => {
                  const isLatest = index === messages.length - 1;
                  return (
                    <div
                      key={`${message}-${index}`}
                      className={[
                        'flex items-start gap-2 rounded-md px-3 py-2 text-sm',
                        isLatest
                          ? 'bg-[#f5d040] font-bold text-gray-900'
                          : 'bg-gray-50 text-gray-500',
                      ].join(' ')}
                    >
                      {isLatest
                        ? <Clock3 size={14} className="mt-0.5 flex-shrink-0" />
                        : <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />}
                      <span>{message}</span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </section>

        {/* 右栏：预览 */}
        <section className="rounded-lg bg-white p-5 md:p-7" style={{ border: '2px solid #1a1a1a', boxShadow: '4px 4px 0 #1a1a1a' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Preview</div>
              <h3 className="mt-1 text-base font-black text-gray-900 md:text-lg">{previewHeading}</h3>
            </div>
            <span className="flex-shrink-0 rounded-md border-2 border-gray-900 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
              {hasConfirmedPageCount && actualTotalPages ? `${generatedCards.length}/${actualTotalPages} 已完成` : '页数规划中'}
            </span>
          </div>

          <div className="mt-5 max-h-[520px] overflow-y-auto pr-1 space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-black text-gray-900">已生成卡片</div>
                <div className="text-xs font-bold text-gray-500">{generatedCards.length} 张</div>
              </div>
              {generatedCards.length > 0 ? (
                <div className="space-y-3">
                  {generatedCards.map((card, index) => (
                    <PreviewCardItem
                      key={card.id || `${card.title}-${index}`}
                      card={card}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border-2 border-dashed border-gray-900 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  {generatedPlaceholderText}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-black text-gray-900">{queueSectionTitle}</div>
                <div className="text-xs font-bold text-gray-500">{queueSectionMeta}</div>
              </div>
              <div className="space-y-3">
                {queuedCards.map((card, index) => (
                  <PreviewCardItem
                    key={card.id || `${card.title}-${index}`}
                    card={card}
                    index={generatedCards.length + index}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
