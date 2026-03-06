import React from 'react';
import { EduTocModel, ThemeConfig } from '../types/schema';

interface EduTocLayoutProps {
  model: EduTocModel;
  theme: ThemeConfig;
}

type LooseEduTocModel = Partial<EduTocModel> & {
  bullets?: Array<{ text?: string } | string>;
  content?: string[] | string;
};

function normalizeItems(model: LooseEduTocModel): { index: number; text: string }[] {
  if (Array.isArray(model.items) && model.items.length > 0) {
    return model.items.map((item, idx) => ({
      index: Number(item.index) || idx + 1,
      text: String(item.text || '').trim() || `章节 ${idx + 1}`,
    }));
  }

  if (Array.isArray(model.bullets) && model.bullets.length > 0) {
    return model.bullets
      .map((item, idx) => {
        if (typeof item === 'string') return { index: idx + 1, text: item.trim() };
        return { index: idx + 1, text: String(item?.text || '').trim() };
      })
      .filter((item) => item.text);
  }

  const rawContent = Array.isArray(model.content)
    ? model.content
    : typeof model.content === 'string'
      ? [model.content]
      : [];
  const fromContent = rawContent
    .map((text, idx) => ({ index: idx + 1, text: String(text || '').trim() }))
    .filter((item) => item.text);

  return fromContent.length > 0
    ? fromContent
    : [
      { index: 1, text: '教学整体分析与背景剖析' },
      { index: 2, text: '核心理念与教学实施模型' },
      { index: 3, text: '多阶段教学实施流程拆解' },
      { index: 4, text: '学生学习效果与数据评估' },
    ];
}

function normalizeModel(input: LooseEduTocModel): EduTocModel {
  return {
    title: String(input.title || '').trim() || '目录大纲',
    subtitle: input.subtitle,
    variant: input.variant,
    items: normalizeItems(input),
    background_image: input.background_image,
  };
}

function deepSpaceBg(theme: ThemeConfig, backgroundImage?: string): string {
  const base = theme.colors.background || '#020617';
  const gradient = `radial-gradient(circle at 50% 0%, ${theme.colors.secondary} 0%, transparent 70%), linear-gradient(180deg, ${base} 0%, ${theme.colors.backgroundAlt} 100%)`;
  
  if (!backgroundImage) return gradient;
  return `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.9)), url(${backgroundImage}) center/cover no-repeat`;
}

// 玻璃态卡片样式辅助函数
function glassStyle(theme: ThemeConfig): React.CSSProperties {
  return {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
  };
}

/* ==================== Variant A (Deep Space List) ==================== */

export const EduTocLayout: React.FC<EduTocLayoutProps> = ({ model, theme }) => {
  const variant = String((model as any).variant || 'a').toLowerCase();
  const data = normalizeModel(model);

  if (variant === 'b') {
    return <EduTocVariantB data={data} theme={theme} />;
  }

  const items = data.items;
  const count = items.length;
  const gap = count <= 4 ? 24 : count <= 6 ? 16 : 12;
  const padV = count <= 4 ? 24 : count <= 6 ? 16 : 12;
  const idxFont = count <= 4 ? 48 : 32;
  const txtFont = count <= 4 ? 24 : 20;

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
    fontFamily: theme.fonts.body,
    background: deepSpaceBg(theme, data.background_image),
    color: theme.colors.text,
  };

  const glass = glassStyle(theme);

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: 24,
        marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 6, height: 42, borderRadius: 3, 
            background: `linear-gradient(180deg, ${theme.colors.accent}, transparent)` 
          }} />
          <h2 style={{ 
            margin: 0, color: theme.colors.primary, fontSize: 42, 
            fontFamily: theme.fonts.title, textShadow: '0 0 20px rgba(6,182,212,0.5)'
          }}>
            {data.title}
          </h2>
        </div>
        {data.subtitle && <div style={{ color: theme.colors.textLight, fontSize: 20 }}>{data.subtitle}</div>}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        justifyContent: 'center',
        padding: count <= 6 ? '0 80px' : '0 40px',
        height: 'calc(100% - 100px)',
        boxSizing: 'border-box',
      }}>
        {items.map((item) => (
          <div key={item.index} style={{
            ...glass,
            display: 'flex',
            alignItems: 'center',
            padding: `${padV}px 32px`,
            borderRadius: 16,
            transition: 'transform 0.3s ease, border-color 0.3s ease',
          }}>
            <span style={{
              minWidth: 60,
              marginRight: 24,
              color: theme.colors.accent,
              fontSize: idxFont,
              fontWeight: 900,
              fontStyle: 'italic',
              textShadow: `0 0 20px ${theme.colors.accent}66`,
              opacity: 0.8
            }}>
              {String(item.index).padStart(2, '0')}
            </span>
            <span style={{ 
              color: theme.colors.primary, fontSize: txtFont, fontWeight: 600, letterSpacing: 1 
            }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

const TOC_CARD_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

const EduTocVariantB: React.FC<{ data: EduTocModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const items = data.items.slice(0, 6);
  const cols = items.length <= 4 ? 2 : 3;
  const slideStyle: React.CSSProperties = {
    width: 1280, height: 720, position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
    padding: '58px 78px', fontFamily: theme.fonts.body,
    background: data.background_image
      ? `linear-gradient(rgba(8,14,32,0.88), rgba(8,14,32,0.9)), url(${data.background_image}) center/cover no-repeat`
      : 'linear-gradient(180deg, #0b1120 0%, #111827 100%)',
  };
  return (
    <section style={slideStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid rgba(6,182,212,0.35)', paddingBottom: 18, marginBottom: 38 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 42, borderRadius: 4, marginRight: 18, background: '#06b6d4', boxShadow: '0 0 14px rgba(6,182,212,0.72)' }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 42, letterSpacing: 2, fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.subtitle && <div style={{ color: '#93c5fd', fontSize: 22 }}>{data.subtitle}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20, height: 'calc(100% - 128px)', boxSizing: 'border-box' }}>
        {items.map((item, i) => (
          <div key={item.index} style={{
            borderRadius: 16, border: `1px solid ${TOC_CARD_COLORS[i]}55`,
            background: `linear-gradient(135deg, ${TOC_CARD_COLORS[i]}18, rgba(0,0,0,0))`,
            padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <span style={{ color: TOC_CARD_COLORS[i], fontSize: 42, fontWeight: 900, fontStyle: 'italic', marginBottom: 8 }}>{String(item.index).padStart(2, '0')}</span>
            <span style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 700 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export function renderEduTocLayoutHTML(model: EduTocModel, theme: ThemeConfig): string {
  const variant = String((model as any).variant || 'a').toLowerCase();
  const data = normalizeModel(model as LooseEduTocModel);
  if (variant === 'b') {
    return renderEduTocVariantBHTML(data, theme);
  }

  const items = data.items;
  const count = items.length;
  const gap = count <= 4 ? 24 : count <= 6 ? 16 : 12;
  const padV = count <= 4 ? 24 : count <= 6 ? 16 : 12;
  const idxFont = count <= 4 ? 48 : 32;
  const txtFont = count <= 4 ? 24 : 20;

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const itemsHTML = items.map(item => `
    <div style="background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);display:flex;align-items:center;padding:${padV}px 32px;border-radius:16px;">
      <span style="min-width:60px;margin-right:24px;color:${theme.colors.accent};font-size:${idxFont}px;font-weight:900;font-style:italic;text-shadow:0 0 20px ${theme.colors.accent}66;opacity:0.8;">
        ${String(item.index).padStart(2, '0')}
      </span>
      <span style="color:${theme.colors.primary};font-size:${txtFont}px;font-weight:600;letter-spacing:1px;">
        ${item.text}
      </span>
    </div>
  `).join('');

  return `<section style="width:1280px;height:720px;position:relative;overflow:hidden;box-sizing:border-box;padding:${theme.spacing.padding};font-family:${theme.fonts.body};background:${background};color:${theme.colors.text};">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:24px;margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:6px;height:42px;border-radius:3px;background:linear-gradient(180deg, ${theme.colors.accent}, transparent);"></div>
        <h2 style="margin:0;color:${theme.colors.primary};font-size:42px;font-family:${theme.fonts.title};text-shadow:0 0 20px rgba(6,182,212,0.5);">
          ${data.title}
        </h2>
      </div>
      ${data.subtitle ? `<div style="color:${theme.colors.textLight};font-size:20px;">${data.subtitle}</div>` : ''}
    </div>

    <div style="display:flex;flex-direction:column;gap:${gap}px;justify-content:center;padding:${count <= 6 ? '0 80px' : '0 40px'};height:calc(100% - 100px);box-sizing:border-box;">
      ${itemsHTML}
    </div>
  </section>`;
}

function renderEduTocVariantBHTML(data: EduTocModel, theme: ThemeConfig): string {
  const background = data.background_image
    ? `linear-gradient(rgba(8,14,32,0.88), rgba(8,14,32,0.9)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(180deg, #0b1120 0%, #111827 100%)';
  const items = data.items.slice(0, 6);
  const cols = items.length <= 4 ? 2 : 3;
  const subtitleHTML = data.subtitle ? `<div style="color:#93c5fd;font-size:22px;">${data.subtitle}</div>` : '';
  const cardsHTML = items.map((item, i) => {
    const c = TOC_CARD_COLORS[i];
    return `<div style="border-radius:16px;border:1px solid ${c}55;background:linear-gradient(135deg,${c}18,rgba(0,0,0,0));padding:24px 28px;display:flex;flex-direction:column;justify-content:center;">
      <span style="color:${c};font-size:42px;font-weight:900;font-style:italic;margin-bottom:8px;">${String(item.index).padStart(2, '0')}</span>
      <span style="color:#e2e8f0;font-size:24px;font-weight:700;">${item.text}</span>
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;position:relative;overflow:hidden;box-sizing:border-box;padding:58px 78px;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.35);padding-bottom:18px;margin-bottom:38px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:42px;border-radius:4px;margin-right:18px;background:#06b6d4;box-shadow:0 0 14px rgba(6,182,212,0.72);"></div>
      <h2 style="margin:0;color:#ffffff;font-size:42px;letter-spacing:2px;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:20px;height:calc(100% - 128px);box-sizing:border-box;">${cardsHTML}</div>
</section>`;
}

export default EduTocLayout;
