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
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();

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

/* ==================== Variant B (Glass Grid) ==================== */

const EduTocVariantB: React.FC<{ data: EduTocModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const items = data.items;
  const count = items.length;
  
  // 动态网格计算
  const cols = count <= 4 ? 2 : 3;
  const gap = 24;
  
  const glass = glassStyle(theme);

  return (
    <section style={{
      width: 1280, height: 720, flexShrink: 0,
      background: deepSpaceBg(theme, data.background_image),
      padding: theme.spacing.padding, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: theme.fonts.body,
      color: theme.colors.text,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24, marginBottom: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 6, height: 42, borderRadius: 3, background: theme.colors.accent }} />
          <h2 style={{ fontSize: 42, color: theme.colors.primary, margin: 0, fontWeight: 'bold', fontFamily: theme.fonts.title }}>
            {data.title}
          </h2>
        </div>
        {data.subtitle && <div style={{ fontSize: 20, color: theme.colors.textLight }}>{data.subtitle}</div>}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: gap,
        alignContent: 'center',
        flexGrow: 1,
      }}>
        {items.map((item, i) => (
          <div key={i} style={{
            ...glass,
            borderRadius: 24,
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            minHeight: count <= 4 ? 180 : 140,
            transition: 'transform 0.3s ease',
          }}>
            <div style={{
              fontSize: 64,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.05)',
              position: 'absolute',
              top: 10,
              right: 20,
              lineHeight: 1,
            }}>
              {String(item.index).padStart(2, '0')}
            </div>
            
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              background: theme.colors.accent,
              marginBottom: 16,
              boxShadow: `0 0 10px ${theme.colors.accent}66`
            }} />
            
            <div style={{ 
              fontSize: 24, fontWeight: 700, color: theme.colors.primary,
              lineHeight: 1.4, zIndex: 1
            }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ==================== HTML Renderers ==================== */

export function renderEduTocLayoutHTML(model: EduTocModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduTocModel);
  const variant = String(data.variant || 'a').toLowerCase();

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

export function renderEduTocVariantBHTML(data: EduTocModel, theme: ThemeConfig): string {
  const items = data.items;
  const count = items.length;
  const cols = count <= 4 ? 2 : 3;
  const gap = 24;

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const itemsHTML = items.map(item => `
    <div style="background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);border-radius:24px;padding:32px;display:flex;flex-direction:column;justify-content:space-between;position:relative;min-height:${count <= 4 ? 180 : 140}px;">
      <div style="font-size:64px;font-weight:900;color:rgba(255,255,255,0.05);position:absolute;top:10px;right:20px;line-height:1;">
        ${String(item.index).padStart(2, '0')}
      </div>
      <div style="width:40px;height:4px;border-radius:2px;background:${theme.colors.accent};margin-bottom:16px;box-shadow:0 0 10px ${theme.colors.accent}66;"></div>
      <div style="font-size:24px;font-weight:700;color:${theme.colors.primary};line-height:1.4;z-index:1;">
        ${item.text}
      </div>
    </div>
  `).join('');

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};padding:${theme.spacing.padding};box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;font-family:${theme.fonts.body};color:${theme.colors.text};">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:24px;margin-bottom:40px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:6px;height:42px;border-radius:3px;background:${theme.colors.accent};"></div>
        <h2 style="font-size:42px;color:${theme.colors.primary};margin:0;font-weight:bold;font-family:${theme.fonts.title};">
          ${data.title}
        </h2>
      </div>
      ${data.subtitle ? `<div style="font-size:20px;color:${theme.colors.textLight};">${data.subtitle}</div>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:${gap}px;align-content:center;flex-grow:1;">
      ${itemsHTML}
    </div>
  </section>`;
}
