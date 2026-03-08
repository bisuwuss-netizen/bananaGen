import React from 'react';
import { EduTriCompareModel, ThemeConfig } from '../../types/schema';

interface EduTriCompareLayoutProps {
  model: EduTriCompareModel;
  theme: ThemeConfig;
}

type LooseEduTriCompareModel = Partial<EduTriCompareModel> & {
  left?: { header?: string; content?: string[] | string; bullets?: Array<{ text?: string } | string> };
  right?: { header?: string; content?: string[] | string; bullets?: Array<{ text?: string } | string> };
  bullets?: Array<{ text?: string; description?: string } | string>;
};

function normalizePoints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

function extractList(source: { content?: string[] | string; bullets?: Array<{ text?: string } | string> } | undefined): string[] {
  if (!source) return [];
  if (Array.isArray(source.bullets) && source.bullets.length > 0) {
    return source.bullets
      .map((item) => (typeof item === 'string' ? item : String(item?.text || '')))
      .map((text) => text.trim())
      .filter(Boolean)
      .slice(0, 4);
  }
  if (Array.isArray(source.content)) {
    return source.content.map((text) => String(text || '').trim()).filter(Boolean).slice(0, 4);
  }
  if (typeof source.content === 'string' && source.content.trim()) {
    return [source.content.trim()];
  }
  return [];
}

function normalizeModel(input: LooseEduTriCompareModel): EduTriCompareModel {
  if (Array.isArray(input.columns) && input.columns.length > 0) {
    return {
      title: String(input.title || '').trim() || '关键对比分析',
      badge: input.badge,
      variant: input.variant,
      columns: input.columns.slice(0, 3).map((column, idx) => ({
        title: String(column.title || '').trim() || `维度 ${idx + 1}`,
        points: normalizePoints(column.points).slice(0, 4),
      })),
      background_image: input.background_image,
    };
  }

  const fromBullets = Array.isArray(input.bullets)
    ? input.bullets
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        const text = String(item?.text || '').trim();
        const desc = String(item?.description || '').trim();
        return [text, desc].filter(Boolean).join('：');
      })
      .filter(Boolean)
      .slice(0, 4)
    : [];

  const leftList = extractList(input.left);
  const rightList = extractList(input.right);
  const columns = [
    { title: String(input.left?.header || '').trim() || '痛点与现状分析', points: leftList },
    { title: '系统改革内容', points: fromBullets.slice(0, 4) },
    { title: String(input.right?.header || '').trim() || '最终改革目标', points: rightList },
  ].map((column) => ({
    title: column.title,
    points: column.points.length > 0 ? column.points : ['要点待补充'],
  }));

  return {
    title: String(input.title || '').trim() || '关键对比分析',
    badge: input.badge || '聚焦痛点、行动与目标闭环',
    variant: input.variant,
    columns,
    background_image: input.background_image,
  };
}

function deepSpaceBg(theme: ThemeConfig, backgroundImage?: string): string {
  const base = theme.colors.background || '#020617';
  const gradient = `radial-gradient(circle at 50% 0%, ${theme.colors.secondary} 0%, transparent 70%), linear-gradient(180deg, ${base} 0%, ${theme.colors.backgroundAlt} 100%)`;
  
  if (!backgroundImage) return gradient;
  return `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.9)), url(${backgroundImage}) center/cover no-repeat`;
}

function glassStyle(theme: ThemeConfig): React.CSSProperties {
  return {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
  };
}

/* ==================== Variant A (Deep Space Columns) ==================== */

export const EduTriCompareLayout: React.FC<EduTriCompareLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return <EduTriCompareVariantB data={data} theme={theme} />;
  }

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    padding: theme.spacing.padding,
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: deepSpaceBg(theme, data.background_image),
    color: theme.colors.text,
  };

  const glass = glassStyle(theme);
  const headerColors = [theme.colors.accent, '#3b82f6', '#10b981'];

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
        {data.badge && (
          <div style={{ 
            borderRadius: 100, border: `1px solid ${theme.colors.accent}44`, 
            background: `${theme.colors.accent}11`, color: theme.colors.accent, 
            padding: '8px 24px', fontSize: 18, fontWeight: 600,
            boxShadow: `0 0 15px ${theme.colors.accent}22`
          }}>
            {data.badge}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, height: 'calc(100% - 110px)' }}>
        {data.columns.slice(0, 3).map((column, index) => (
          <div key={index} style={{
            ...glass,
            flex: 1,
            borderRadius: 24,
            padding: '32px 24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            borderTop: `4px solid ${headerColors[index % 3]}`,
          }}>
            {/* 顶部微光 */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 60,
              background: `linear-gradient(180deg, ${headerColors[index % 3]}22 0%, transparent 100%)`,
              pointerEvents: 'none'
            }} />

            <h3 style={{ 
              margin: '0 0 24px 0', color: theme.colors.primary, fontSize: 26, 
              textAlign: 'center', fontFamily: theme.fonts.title, fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {column.title}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {column.points.slice(0, 5).map((point, rowIndex) => (
                <div key={rowIndex} style={{
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: theme.colors.text,
                  fontSize: 18,
                  lineHeight: 1.5,
                  padding: '16px',
                  transition: 'background 0.3s ease',
                }}>
                  {point}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ==================== Variant B (Asymmetric Stack) ==================== */

const EduTriCompareVariantB: React.FC<{ data: EduTriCompareModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    flexShrink: 0,
    background: deepSpaceBg(theme, data.background_image),
    padding: theme.spacing.padding,
    boxSizing: 'border-box',
    display: 'flex',
    gap: 60,
    overflow: 'hidden',
    position: 'relative',
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
  };

  const glass = glassStyle(theme);

  return (
    <section style={slideStyle}>
      {/* 左侧：标题与视觉区 */}
      <div style={{ width: '35%', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ 
          width: 8, height: 60, borderRadius: 4, marginBottom: 24, 
          background: `linear-gradient(180deg, ${theme.colors.accent}, #3b82f6)`,
          boxShadow: `0 0 20px ${theme.colors.accent}66`
        }} />
        
        <h2 style={{ 
          fontSize: 56, color: theme.colors.primary, margin: '0 0 24px 0', 
          fontWeight: 900, fontFamily: theme.fonts.title, lineHeight: 1.1,
          textShadow: '0 0 40px rgba(0,0,0,0.5)'
        }}>
          {data.title}
        </h2>
        
        {data.badge && (
          <div style={{ 
            fontSize: 24, color: theme.colors.textLight, fontWeight: 300,
            borderLeft: `2px solid ${theme.colors.accent}44`, paddingLeft: 20
          }}>
            {data.badge}
          </div>
        )}
      </div>

      {/* 右侧：横向堆叠卡片 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center', zIndex: 2 }}>
        {data.columns.slice(0, 3).map((column, index) => (
          <div key={index} style={{
            ...glass,
            borderRadius: 20,
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            transition: 'transform 0.3s ease',
            borderLeft: `4px solid ${index === 0 ? '#f43f5e' : index === 1 ? '#06b6d4' : '#10b981'}`
          }}>
            <div style={{ minWidth: 140, fontWeight: 700, fontSize: 22, color: theme.colors.primary }}>
              {column.title}
            </div>
            <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, fontSize: 18, lineHeight: 1.5, color: theme.colors.text }}>
              {column.points[0]}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ==================== HTML Renderers ==================== */

export function renderEduTriCompareLayoutHTML(model: EduTriCompareModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduTriCompareModel);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEduTriCompareVariantBHTML(data, theme);
  }

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");
  const headerColors = [theme.colors.accent, '#3b82f6', '#10b981'];

  const columnsHTML = data.columns.slice(0, 3).map((column, index) => {
    const pointsHTML = column.points.slice(0, 5).map(point => `
      <div style="border-radius:12px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.05);color:${theme.colors.text};font-size:18px;line-height:1.5;padding:16px;">
        ${point}
      </div>
    `).join('');

    return `
      <div style="background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);flex:1;border-radius:24px;padding:32px 24px;box-sizing:border-box;display:flex;flex-direction:column;position:relative;overflow:hidden;border-top:4px solid ${headerColors[index % 3]};">
        <div style="position:absolute;top:0;left:0;right:0;height:60px;background:linear-gradient(180deg, ${headerColors[index % 3]}22 0%, transparent 100%);pointer-events:none;"></div>
        <h3 style="margin:0 0 24px 0;color:${theme.colors.primary};font-size:26px;text-align:center;font-family:${theme.fonts.title};font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,0.3);">
          ${column.title}
        </h3>
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${pointsHTML}
        </div>
      </div>
    `;
  }).join('');

  return `<section style="width:1280px;height:720px;padding:${theme.spacing.padding};box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};color:${theme.colors.text};">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:24px;margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:6px;height:42px;border-radius:3px;background:linear-gradient(180deg, ${theme.colors.accent}, transparent);"></div>
        <h2 style="margin:0;color:${theme.colors.primary};font-size:42px;font-family:${theme.fonts.title};text-shadow:0 0 20px rgba(6,182,212,0.5);">
          ${data.title}
        </h2>
      </div>
      ${data.badge ? `<div style="border-radius:100px;border:1px solid ${theme.colors.accent}44;background:${theme.colors.accent}11;color:${theme.colors.accent};padding:8px 24px;font-size:18px;font-weight:600;box-shadow:0 0 15px ${theme.colors.accent}22;">${data.badge}</div>` : ''}
    </div>

    <div style="display:flex;gap:24px;height:calc(100% - 110px);">
      ${columnsHTML}
    </div>
  </section>`;
}

export function renderEduTriCompareVariantBHTML(data: EduTriCompareModel, theme: ThemeConfig): string {
  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");
  const columnBorderColors = ['#f43f5e', '#06b6d4', '#10b981'];

  const columnsHTML = data.columns.slice(0, 3).map((column, index) => `
    <div style="background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);border-radius:20px;padding:24px 32px;display:flex;align-items:center;gap:32px;border-left:4px solid ${columnBorderColors[index]};">
      <div style="min-width:140px;font-weight:700;font-size:22px;color:${theme.colors.primary};">
        ${column.title}
      </div>
      <div style="width:1px;height:40px;background:rgba(255,255,255,0.1);"></div>
      <div style="flex:1;font-size:18px;line-height:1.5;color:${theme.colors.text};">
        ${column.points[0]}
      </div>
    </div>
  `).join('');

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};padding:${theme.spacing.padding};box-sizing:border-box;display:flex;gap:60px;overflow:hidden;position:relative;font-family:${theme.fonts.body};color:${theme.colors.text};">
    <div style="width:35%;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;">
      <div style="width:8px;height:60px;border-radius:4px;margin-bottom:24px;background:linear-gradient(180deg, ${theme.colors.accent}, #3b82f6);box-shadow:0 0 20px ${theme.colors.accent}66;"></div>
      
      <h2 style="font-size:56px;color:${theme.colors.primary};margin:0 0 24px 0;font-weight:900;font-family:${theme.fonts.title};line-height:1.1;text-shadow:0 0 40px rgba(0,0,0,0.5);">
        ${data.title}
      </h2>
      
      ${data.badge ? `<div style="font-size:24px;color:${theme.colors.textLight};font-weight:300;border-left:2px solid ${theme.colors.accent}44;padding-left:20px;">${data.badge}</div>` : ''}
    </div>

    <div style="flex:1;display:flex;flex-direction:column;gap:20px;justify-content:center;z-index:2;">
      ${columnsHTML}
    </div>
  </section>`;
}
