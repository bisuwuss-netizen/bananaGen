import React, { useMemo } from 'react';
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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.55)] transition-transform duration-300 hover:-translate-y-0.5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-banana-400/80 to-transparent" />
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-banana-100 text-sm font-semibold text-banana-700">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-900 md:text-base">
              {card.title || '正在生成标题'}
            </h4>
            <span
              className={[
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                isReady ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
              ].join(' ')}
            >
              {isReady ? '已成形' : '规划中'}
            </span>
          </div>

          {points.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600 md:text-sm">
              {points.map((point, pointIndex) => (
                <li key={`${card.id || card.title}-${pointIndex}`} className="flex items-start gap-2">
                  <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-banana-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-11/12 rounded-full" />
              <Skeleton className="h-3 w-8/12 rounded-full" />
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
        <section className="app-panel overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(255,214,140,0.35),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,251,255,0.92))] p-5 md:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-banana-200 bg-banana-50/90 px-3 py-1 text-xs font-medium text-banana-700">
            <Sparkles size={14} />
            AI 正在起草大纲
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div>
              <h2 className="page-title text-2xl font-semibold tracking-tight text-slate-900 md:text-[30px]">
                AI 正在为您规划大纲结构
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-[15px]">
                {stageText}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">已生成页数</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{generatedCards.length}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">待生成页数</div>
                <div className={`mt-2 font-semibold text-slate-900 ${hasConfirmedPageCount ? 'text-2xl' : 'text-lg'}`}>
                  {hasConfirmedPageCount ? queuedCards.length : '待确定'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">总页数 / 模式</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {hasConfirmedPageCount ? `${actualTotalPages} · ${renderMode}` : `待规划 · ${renderMode}`}
                </div>
                {!hasConfirmedPageCount ? (
                  <div className="mt-1 text-xs text-slate-400">结构确定后再显示真实页数</div>
                ) : null}
                {hasReferenceFiles ? (
                  <div className="mt-1 text-xs text-slate-400">已上传资料 {referenceCount}</div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">生成进度</span>
                <span className="font-semibold text-banana-700">{percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_45%,#eab308_100%)] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 md:text-sm">
                <Clock3 size={14} />
                <span>完成后会自动刷新为可编辑大纲列表。</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-950/[0.025] p-4">
              <div className="mb-3 text-sm font-medium text-slate-700">实时阶段日志</div>
              <div className="space-y-2">
                {messages.map((message, index) => {
                  const isLatest = index === messages.length - 1;
                  return (
                    <div
                      key={`${message}-${index}`}
                      className={[
                        'flex items-start gap-2 rounded-xl px-3 py-2 text-sm',
                        isLatest ? 'bg-banana-50 text-banana-800' : 'bg-white/70 text-slate-500',
                      ].join(' ')}
                    >
                      {isLatest ? <Clock3 size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
                      <span>{message}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="app-panel rounded-[28px] border border-white/70 bg-white/90 p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Preview</div>
              <h3 className="mt-1 text-lg font-semibold text-slate-900 md:text-xl">{previewHeading}</h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {hasConfirmedPageCount && actualTotalPages ? `${generatedCards.length}/${actualTotalPages} 已完成` : '页数规划中'}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700">已生成卡片</div>
              <div className="text-xs text-emerald-600">{generatedCards.length} 张</div>
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
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
                {generatedPlaceholderText}
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700">{queueSectionTitle}</div>
              <div className="text-xs text-slate-400">{queueSectionMeta}</div>
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
        </section>
      </div>
    </div>
  );
};
