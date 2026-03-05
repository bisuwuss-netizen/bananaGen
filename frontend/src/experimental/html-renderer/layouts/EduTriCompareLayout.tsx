import React from 'react';
import { EduTriCompareModel, ThemeConfig } from '../types/schema';

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
    columns,
    background_image: input.background_image,
  };
}

const TOP_COLORS = ['#f43f5e', '#06b6d4', '#10b981'];

export const EduTriCompareLayout: React.FC<EduTriCompareLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    padding: '56px 76px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: data.background_image
      ? `linear-gradient(rgba(6,12,28,0.88), rgba(6,12,28,0.88)), url(${data.background_image}) center/cover no-repeat`
      : 'linear-gradient(135deg, #0b1120 0%, #0f172a 100%)',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '2px solid rgba(6,182,212,0.32)',
        paddingBottom: 18,
        marginBottom: 34,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 40, borderRadius: 4, marginRight: 18, background: '#06b6d4', boxShadow: '0 0 12px rgba(6,182,212,0.75)' }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 40, letterSpacing: 2, fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.badge && (
          <div style={{ borderRadius: 9, border: '1px solid rgba(6,182,212,0.6)', background: 'rgba(6,182,212,0.16)', color: '#67e8f9', padding: '8px 18px', fontSize: 20, fontWeight: 700 }}>
            {data.badge}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, height: 'calc(100% - 120px)' }}>
        {data.columns.slice(0, 3).map((column, index) => (
          <div key={index} style={{
            flex: 1,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: `6px solid ${TOP_COLORS[index % TOP_COLORS.length]}`,
            background: 'rgba(255,255,255,0.04)',
            padding: '24px 22px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#ffffff', fontSize: 28, textAlign: 'center', fontFamily: theme.fonts.title }}>{column.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {column.points.slice(0, 5).map((point, rowIndex) => (
                <div key={rowIndex} style={{
                  borderRadius: 11,
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(0,0,0,0.28)',
                  color: '#cbd5e1',
                  fontSize: 20,
                  lineHeight: 1.45,
                  padding: '12px 14px',
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

export function renderEduTriCompareLayoutHTML(model: EduTriCompareModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduTriCompareModel);
  const background = data.background_image
    ? `linear-gradient(rgba(6,12,28,0.88), rgba(6,12,28,0.88)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(135deg, #0b1120 0%, #0f172a 100%)';

  const columnsHTML = data.columns.slice(0, 3).map((column, index) => {
    const pointsHTML = column.points.slice(0, 5).map((point) => (
      `<div style="border-radius:11px;border:1px solid rgba(255,255,255,0.09);background:rgba(0,0,0,0.28);color:#cbd5e1;font-size:20px;line-height:1.45;padding:12px 14px;">${point}</div>`
    )).join('');

    return `<div style="flex:1;border-radius:16px;border:1px solid rgba(255,255,255,0.1);border-top:6px solid ${TOP_COLORS[index % TOP_COLORS.length]};background:rgba(255,255,255,0.04);padding:24px 22px;box-sizing:border-box;display:flex;flex-direction:column;">
      <h3 style="margin:0 0 20px 0;color:#ffffff;font-size:28px;text-align:center;font-family:${theme.fonts.title};">${column.title}</h3>
      <div style="display:flex;flex-direction:column;gap:14px;">${pointsHTML}</div>
    </div>`;
  }).join('');

  const badgeHTML = data.badge
    ? `<div style="border-radius:9px;border:1px solid rgba(6,182,212,0.6);background:rgba(6,182,212,0.16);color:#67e8f9;padding:8px 18px;font-size:20px;font-weight:700;">${data.badge}</div>`
    : '';

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.32);padding-bottom:18px;margin-bottom:34px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:40px;border-radius:4px;margin-right:18px;background:#06b6d4;box-shadow:0 0 12px rgba(6,182,212,0.75);"></div>
      <h2 style="margin:0;color:#ffffff;font-size:40px;letter-spacing:2px;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${badgeHTML}
  </div>
  <div style="display:flex;gap:20px;height:calc(100% - 120px);">${columnsHTML}</div>
</section>`;
}

export default EduTriCompareLayout;
