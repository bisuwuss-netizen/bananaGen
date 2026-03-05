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

const TOP_COLORS = ['#f43f5e', '#06b6d4', '#10b981'];

// ===================== Variant A (原版: 垂直3列并排) =====================

export const EduTriCompareLayout: React.FC<EduTriCompareLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return <EduTriCompareVariantB data={data} theme={theme} />;
  }

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

// ===================== Variant B (左右4:6分割, 右侧横向3行堆叠) =====================

const EduTriCompareVariantB: React.FC<{ data: EduTriCompareModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    flexShrink: 0,
    backgroundImage: data.background_image
      ? `linear-gradient(rgba(6,12,28,0.88), rgba(6,12,28,0.88)), url(${data.background_image})`
      : 'linear-gradient(135deg, #0b1120 0%, #0f172a 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '60px 80px',
    boxSizing: 'border-box',
    display: 'flex',
    gap: 50,
    overflow: 'hidden',
    position: 'relative',
    fontFamily: theme.fonts.body,
  };

  const ICONS = ['▪', '🤖', '▪'];

  return (
    <section style={slideStyle}>
      {/* 左侧：标题与视觉区 */}
      <div style={{ width: '35%', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ width: 8, height: 60, backgroundColor: '#06b6d4', borderRadius: 4, boxShadow: '0 0 15px #06b6d4', marginBottom: 20 }} />
        <h2 style={{ fontSize: 48, color: '#ffffff', margin: '0 0 15px 0', fontWeight: 'bold', letterSpacing: 2, fontFamily: theme.fonts.title }}>{data.title}</h2>
        {data.badge && (
          <div style={{ fontSize: 24, color: '#93c5fd', marginBottom: 40, fontWeight: 300 }}>{data.badge}</div>
        )}
        {/* 视觉占位装饰 */}
        <div style={{
          width: '100%', height: 200,
          backgroundImage: 'radial-gradient(circle at top left, rgba(6, 182, 212, 0.2), rgba(0,0,0,0))',
          border: '1px dashed rgba(6, 182, 212, 0.3)', borderRadius: 20,
          display: 'flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: 80, opacity: 0.5 }}>📊</div>
        </div>
      </div>

      {/* 右侧：3行横向卡片堆叠 */}
      <div style={{ width: '65%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 2 }}>
        {data.columns.slice(0, 3).map((column, index) => {
          const color = TOP_COLORS[index % TOP_COLORS.length];
          const isHighlighted = index === 1;
          return (
            <div key={index} style={{
              backgroundColor: isHighlighted ? 'rgba(6, 182, 212, 0.05)' : 'rgba(255, 255, 255, 0.03)',
              border: isHighlighted ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: `6px solid ${color}`,
              borderRadius: 12,
              padding: '25px 30px',
              display: 'flex',
              alignItems: 'center',
              gap: 30,
              boxShadow: isHighlighted ? '0 0 20px rgba(6, 182, 212, 0.1)' : 'none',
            }}>
              <div style={{ width: 140, flexShrink: 0 }}>
                <h3 style={{ fontSize: 24, color, margin: 0, fontWeight: 'bold', fontFamily: theme.fonts.title }}>{column.title}</h3>
              </div>
              <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between' }}>
                {column.points.slice(0, 3).map((point, pIdx) => (
                  <span key={pIdx} style={{
                    fontSize: 18,
                    color: isHighlighted ? '#e2e8f0' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: isHighlighted ? 'bold' : 'normal',
                  }}>
                    <span style={{ color: isHighlighted ? undefined : color, marginRight: 8 }}>
                      {isHighlighted ? ICONS[pIdx % ICONS.length] : '▪'}
                    </span>
                    {point}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ===================== HTML 渲染 =====================

export function renderEduTriCompareLayoutHTML(model: EduTriCompareModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduTriCompareModel);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEduTriCompareVariantBHTML(data, theme);
  }

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

function renderEduTriCompareVariantBHTML(data: EduTriCompareModel, theme: ThemeConfig): string {
  const background = data.background_image
    ? `linear-gradient(rgba(6,12,28,0.88), rgba(6,12,28,0.88)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(135deg, #0b1120 0%, #0f172a 100%)';

  const badgeHTML = data.badge
    ? `<div style="font-size:24px;color:#93c5fd;margin-bottom:40px;font-weight:300;">${data.badge}</div>`
    : '';

  const ICONS = ['▪', '🤖', '▪'];
  const rowsHTML = data.columns.slice(0, 3).map((column, index) => {
    const color = TOP_COLORS[index % TOP_COLORS.length];
    const isHighlighted = index === 1;
    const bg = isHighlighted ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.03)';
    const borderColor = isHighlighted ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.08)';
    const shadow = isHighlighted ? 'box-shadow:0 0 20px rgba(6,182,212,0.1);' : '';

    const pointsHTML = column.points.slice(0, 3).map((point, pIdx) => {
      const marker = isHighlighted ? ICONS[pIdx % ICONS.length] : '▪';
      const markerColor = isHighlighted ? '' : `color:${color};`;
      const fw = isHighlighted ? 'font-weight:bold;' : '';
      const textColor = isHighlighted ? '#e2e8f0' : '#cbd5e1';
      return `<span style="font-size:18px;color:${textColor};display:flex;align-items:center;${fw}"><span style="${markerColor}margin-right:8px;">${marker}</span> ${point}</span>`;
    }).join('');

    return `<div style="background-color:${bg};border:1px solid ${borderColor};border-left:6px solid ${color};border-radius:12px;padding:25px 30px;display:flex;align-items:center;gap:30px;${shadow}">
      <div style="width:140px;flex-shrink:0;">
        <h3 style="font-size:24px;color:${color};margin:0;font-weight:bold;font-family:${theme.fonts.title};">${column.title}</h3>
      </div>
      <div style="flex-grow:1;display:flex;justify-content:space-between;">${pointsHTML}</div>
    </div>`;
  }).join('');

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};background-size:cover;background-position:center;padding:60px 80px;box-sizing:border-box;display:flex;gap:50px;overflow:hidden;position:relative;font-family:${theme.fonts.body};">
  <div style="width:35%;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;">
    <div style="width:8px;height:60px;background-color:#06b6d4;border-radius:4px;box-shadow:0 0 15px #06b6d4;margin-bottom:20px;"></div>
    <h2 style="font-size:48px;color:#ffffff;margin:0 0 15px 0;font-weight:bold;letter-spacing:2px;font-family:${theme.fonts.title};">${data.title}</h2>
    ${badgeHTML}
    <div style="width:100%;height:200px;background-image:radial-gradient(circle at top left, rgba(6,182,212,0.2), rgba(0,0,0,0));border:1px dashed rgba(6,182,212,0.3);border-radius:20px;display:flex;justify-content:center;align-items:center;box-sizing:border-box;">
      <div style="font-size:80px;opacity:0.5;">📊</div>
    </div>
  </div>
  <div style="width:65%;display:flex;flex-direction:column;justify-content:space-between;z-index:2;">${rowsHTML}</div>
</section>`;
}

export default EduTriCompareLayout;
