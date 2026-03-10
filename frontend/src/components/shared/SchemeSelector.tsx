import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Eye, Sparkles } from 'lucide-react';

import { layoutSchemes, type LayoutScheme } from '@/data/layoutSchemes';
import { SlideRenderer } from '@/experimental/html-renderer/components/SlideRenderer';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';

interface SchemeSelectorProps {
  value: string;
  onChange: (schemeId: string) => void;
}

const PREVIEW_PANEL_MAX_WIDTH = 980;
const PREVIEW_PANEL_HORIZONTAL_PADDING = 152;
const COVER_IMAGE_KEYS = ['hero_image', 'background_image', 'diagram_url', 'image_src'] as const;

const schemeCollections = [
  {
    id: 'ai_recommended',
    label: '🌟 AI 推荐',
    hint: '优先展示最适合教师首屏快速决策的模板。',
  },
  {
    id: 'classroom',
    label: '👩‍🏫 课堂互动',
    hint: '适合公开课、实训课和互动式讲授。',
  },
  {
    id: 'academic',
    label: '📊 学术汇报',
    hint: '适合课程讲义、研究汇报和严谨推导。',
  },
  {
    id: 'brand',
    label: '🏢 品牌宣传',
    hint: '适合品牌故事、发布会和视觉提案。',
  },
] as const;

type SchemeCollectionId = (typeof schemeCollections)[number]['id'];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getPreviewScale = (slideWidth: number) => {
  if (typeof window === 'undefined') {
    return 0.42;
  }

  const usablePanelWidth = Math.min(
    PREVIEW_PANEL_MAX_WIDTH - 112,
    window.innerWidth - PREVIEW_PANEL_HORIZONTAL_PADDING
  );

  return clamp(usablePanelWidth / slideWidth, 0.2, 0.46);
};

const getSchemeCoverImage = (scheme: LayoutScheme) => {
  const firstPageModel = scheme.preview.pages[0]?.page.model as unknown as
    | Record<string, unknown>
    | undefined;

  if (!firstPageModel) {
    return undefined;
  }

  for (const key of COVER_IMAGE_KEYS) {
    const value = firstPageModel[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
};

const SchemeCard: React.FC<{
  scheme: LayoutScheme;
  selected: boolean;
  previewOpen: boolean;
  onSelect: () => void;
  onPreviewOpen: (schemeId: string, button: HTMLButtonElement) => void;
}> = ({ scheme, selected, previewOpen, onSelect, onPreviewOpen }) => {
  const coverImage = getSchemeCoverImage(scheme);

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`w-full overflow-hidden rounded-[30px] border text-left transition-[border-color,box-shadow,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana-300/80 focus-visible:ring-offset-2 ${
          selected
            ? 'border-banana-400 bg-white shadow-[0_24px_70px_-38px_rgba(245,146,22,0.55)]'
            : 'border-slate-200/90 bg-white/92 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.42)] hover:-translate-y-1 hover:border-banana-200 hover:shadow-[0_28px_72px_-40px_rgba(15,23,42,0.45)]'
        }`}
      >
        <div className="relative flex min-h-[320px] flex-col">
          <div className="relative flex-[7] overflow-hidden bg-slate-900">
            {coverImage ? (
              <img
                src={coverImage}
                alt={`${scheme.name} 模板缩略图`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] group-focus-within:scale-[1.03]"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(135deg, ${scheme.accent} 0%, rgba(15,23,42,0.92) 100%)`,
                }}
              />
            )}

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12)_0%,rgba(15,23,42,0.08)_38%,rgba(15,23,42,0.78)_100%)]" />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-slate-950/42 px-3 py-1.5 text-[11px] font-medium text-white/92 backdrop-blur-md">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: scheme.accent }}
              />
              {selected ? '当前模板' : `${scheme.preview.pages.length} 张布局`}
            </div>
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
              <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/62">
                  Editable Series
                </div>
                <h4 className="mt-1 text-xl font-semibold text-white">{scheme.name}</h4>
              </div>
            </div>
          </div>

          <div className="flex flex-[3] items-center justify-between gap-4 bg-white/94 px-4 py-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">默认只显示标题，悬停查看详情</p>
            </div>
            {selected ? (
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-banana-500 text-white shadow-[0_12px_24px_rgba(245,146,22,0.28)]">
                <Check size={18} />
              </span>
            ) : (
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                点击选中
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[linear-gradient(180deg,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.72)_46%,rgba(15,23,42,0.96)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="absolute inset-x-0 bottom-0 rounded-b-[30px] border-t border-white/10 bg-slate-950/78 px-5 pb-5 pt-4 backdrop-blur-xl">
          <p className="text-sm leading-6 text-white/86">{scheme.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {scheme.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/14 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-white/74"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-white/68">
              {scheme.preview.pages.length} 种布局可预览
            </span>
            <button
              type="button"
              aria-label={`预览 ${scheme.name} 模板`}
              aria-haspopup="dialog"
              aria-expanded={previewOpen}
              aria-controls={previewOpen ? 'scheme-preview-dialog' : undefined}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/16 bg-white/12 px-3.5 py-2 text-xs font-medium text-white transition-[background-color,border-color,color] duration-200 hover:border-white/40 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              onClick={(event) => {
                event.stopPropagation();
                onPreviewOpen(scheme.id, event.currentTarget);
              }}
            >
              <Eye size={14} />
              预览模板
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export const SchemeSelector: React.FC<SchemeSelectorProps> = ({ value, onChange }) => {
  const [activeCollectionId, setActiveCollectionId] = useState<SchemeCollectionId>('ai_recommended');
  const [activePreviewSchemeId, setActivePreviewSchemeId] = useState<string | null>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);

  const activeScheme = useMemo(
    () => layoutSchemes.find((scheme) => scheme.id === activePreviewSchemeId) || null,
    [activePreviewSchemeId]
  );

  const activeCollection = useMemo(
    () =>
      schemeCollections.find((collection) => collection.id === activeCollectionId) ||
      schemeCollections[0],
    [activeCollectionId]
  );

  const filteredSchemes = useMemo(
    () =>
      layoutSchemes.filter((scheme) => scheme.collections.includes(activeCollection.id)),
    [activeCollection]
  );

  const closePreview = () => {
    setActivePreviewSchemeId(null);

    if (previewTriggerRef.current) {
      window.setTimeout(() => {
        previewTriggerRef.current?.focus();
      }, 0);
    }
  };

  const openPreview = (schemeId: string, button: HTMLButtonElement) => {
    previewTriggerRef.current = button;
    setActivePreviewSchemeId(schemeId);
  };

  useEffect(() => {
    if (!activePreviewSchemeId || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activePreviewSchemeId]);

  useEffect(() => {
    if (!activePreviewSchemeId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePreviewSchemeId]);

  const activeTheme = activeScheme ? getThemeByScheme(activeScheme.id) : null;
  const previewScale = activeTheme ? getPreviewScale(activeTheme.sizes.slideWidth) : 0.42;

  return (
    <>
      <div className="space-y-5">
        <section className="flex flex-col gap-3 rounded-[24px] border border-slate-200/70 bg-white/88 px-4 py-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.35)] md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              <Sparkles size={13} />
              模板筛选
            </div>
            <p className="mt-2 text-sm text-slate-500">{activeCollection.hint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {schemeCollections.map((collection) => {
              const isActive = activeCollectionId === collection.id;
              return (
                <button
                  key={collection.id}
                  type="button"
                  aria-pressed={isActive}
                  title={collection.hint}
                  onClick={() => setActiveCollectionId(collection.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-[border-color,background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana-300/80 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-banana-400 bg-banana-500 text-white shadow-[0_12px_28px_-18px_rgba(245,146,22,0.6)]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-banana-300 hover:bg-banana-50 hover:text-banana-700'
                  }`}
                >
                  {collection.label}
                </button>
              );
            })}
          </div>
        </section>

        {filteredSchemes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSchemes.map((scheme) => (
              <SchemeCard
                key={scheme.id}
                scheme={scheme}
                selected={scheme.id === value}
                previewOpen={scheme.id === activePreviewSchemeId}
                onSelect={() => onChange(scheme.id)}
                onPreviewOpen={openPreview}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/78 px-6 py-10 text-center text-sm text-slate-500">
            当前分类下暂无模板，请切换其它分类查看。
          </div>
        )}
      </div>

      {activeScheme && activeTheme && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[90]" data-testid="scheme-preview-overlay">
              <div
                className="absolute inset-0 bg-slate-950/28 backdrop-blur-[3px]"
                onClick={closePreview}
              />
              <div className="relative flex h-full items-center justify-center p-4 md:p-8">
                <div
                  id="scheme-preview-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="scheme-preview-title"
                  aria-describedby="scheme-preview-description"
                  className="relative flex h-[min(84vh,980px)] w-full max-w-[980px] flex-col overflow-hidden rounded-[34px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.9)_100%)] shadow-[0_36px_120px_rgba(15,23,42,0.26)] backdrop-blur-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="border-b border-slate-200/80 bg-white/68 px-5 py-5 backdrop-blur-xl md:px-8">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: activeScheme.accent }}
                          />
                          模板故事板
                        </div>
                        <h4
                          id="scheme-preview-title"
                          className="text-pretty text-2xl font-semibold text-slate-900 md:text-[30px]"
                        >
                          {activeScheme.name}
                        </h4>
                        <p
                          id="scheme-preview-description"
                          className="mt-2 max-w-[720px] break-words text-sm leading-6 text-slate-600 md:text-[15px]"
                        >
                          {activeScheme.preview.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closePreview}
                        className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-500 duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-[border-color,color,background-color]"
                      >
                        关闭
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-white">
                        {activeScheme.preview.pages.length} 张真实布局示例
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-500">
                        向下滚动查看完整故事预览
                      </span>
                      {activeScheme.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5"
                    data-testid="scheme-preview-scroll-area"
                  >
                    <div className="space-y-4 md:space-y-5">
                      {activeScheme.preview.pages.map((previewPage, index) => (
                        <section
                          key={previewPage.id}
                          data-testid="scheme-preview-story-card"
                          className="rounded-[28px] border border-slate-200/80 bg-white/78 p-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-5"
                        >
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                                第 {index + 1} 张 / 共 {activeScheme.preview.pages.length} 张
                              </div>
                              <h5 className="text-pretty text-lg font-semibold text-slate-900 md:text-xl">
                                {previewPage.label}
                              </h5>
                              <p className="mt-2 max-w-[720px] break-words text-sm leading-6 text-slate-600">
                                {previewPage.summary}
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">
                              实时布局渲染
                            </span>
                          </div>

                          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-3 md:p-4">
                            <div
                              className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_20px_54px_rgba(15,23,42,0.16)]"
                              style={{
                                width: `${activeTheme.sizes.slideWidth * previewScale}px`,
                                height: `${activeTheme.sizes.slideHeight * previewScale}px`,
                              }}
                            >
                              <SlideRenderer
                                page={previewPage.page}
                                theme={activeTheme}
                                scale={previewScale}
                              />
                            </div>
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default SchemeSelector;
