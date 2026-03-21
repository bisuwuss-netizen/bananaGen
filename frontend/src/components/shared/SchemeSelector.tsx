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

const SchemeCard: React.FC<{
  scheme: LayoutScheme;
  selected: boolean;
  previewOpen: boolean;
  onSelect: () => void;
  onPreviewOpen: (schemeId: string, button: HTMLButtonElement) => void;
}> = ({ scheme, selected, previewOpen, onSelect, onPreviewOpen }) => {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`relative w-full touch-manipulation text-left rounded-[26px] border p-5 pr-28 duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e7] transition-[border-color,box-shadow,background-color] ${
          selected
            ? 'border-banana-400 bg-gradient-to-br from-[#fff9f0] via-white to-[#fff5e8] shadow-[0_18px_50px_rgba(245,158,11,0.12)]'
            : 'border-slate-200 bg-white/80 hover:border-banana-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]'
        }`}
      >
        <div
          className="absolute inset-x-5 top-0 h-[1px] rounded-full opacity-80"
          style={{ background: `linear-gradient(90deg, ${scheme.accent}, transparent)` }}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full shadow-sm"
                style={{ backgroundColor: scheme.accent }}
              />
              <h4 className="text-lg font-semibold text-slate-900">{scheme.name}</h4>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{scheme.description}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {scheme.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          <Sparkles size={12} />
          <span>{scheme.preview.label}</span>
        </div>
        <div className="mt-2 text-sm text-slate-500">
          {scheme.preview.pages.length} 种布局 · 可滚动故事预览
        </div>
      </button>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          aria-label={`预览 ${scheme.name} 模板`}
          aria-haspopup="dialog"
          aria-expanded={previewOpen}
          aria-controls={previewOpen ? 'scheme-preview-dialog' : undefined}
          className="inline-flex touch-manipulation items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm duration-200 hover:border-banana-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e7] transition-[border-color,color,box-shadow,background-color]"
          onClick={(event) => {
            event.stopPropagation();
            onPreviewOpen(scheme.id, event.currentTarget);
          }}
        >
          <Eye size={14} />
          预览模板
        </button>

        {selected && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-banana-500 text-white shadow-sm">
            <Check size={16} />
          </span>
        )}
      </div>
    </div>
  );
};

export const SchemeSelector: React.FC<SchemeSelectorProps> = ({ value, onChange }) => {
  const [activePreviewSchemeId, setActivePreviewSchemeId] = useState<string | null>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);

  const activeScheme = useMemo(
    () => layoutSchemes.find((scheme) => scheme.id === activePreviewSchemeId) || null,
    [activePreviewSchemeId]
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
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        {layoutSchemes.map((scheme) => (
          <div key={scheme.id} className="flex-shrink-0 w-[340px] snap-start">
            <SchemeCard
              scheme={scheme}
              selected={scheme.id === value}
              previewOpen={scheme.id === activePreviewSchemeId}
              onSelect={() => onChange(scheme.id)}
              onPreviewOpen={openPreview}
            />
          </div>
        ))}
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
