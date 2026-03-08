import React from 'react';
import { EduCoreHubModel, ThemeConfig } from '../../types/schema';

interface EduCoreHubLayoutProps {
  model: EduCoreHubModel;
  theme: ThemeConfig;
}

type LooseEduCoreHubModel = Partial<EduCoreHubModel> & {
  content?: string[] | string;
  bullets?: Array<{ text?: string } | string>;
};

function normalizeModel(input: LooseEduCoreHubModel): EduCoreHubModel {
  const nodesFromModel = Array.isArray(input.nodes)
    ? input.nodes.map((node) => ({ title: String(node.title || '').trim() })).filter((node) => node.title)
    : [];

  const nodesFromBullets = Array.isArray(input.bullets)
    ? input.bullets
      .map((item) => (typeof item === 'string' ? item.trim() : String(item?.text || '').trim()))
      .filter(Boolean)
      .map((title) => ({ title }))
    : [];

  const rawContent = Array.isArray(input.content)
    ? input.content
    : typeof input.content === 'string'
      ? [input.content]
      : [];
  const nodesFromContent = rawContent
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((title) => ({ title }));

  const nodes = nodesFromModel.length > 0 ? nodesFromModel : (nodesFromBullets.length > 0 ? nodesFromBullets : nodesFromContent);

  return {
    title: String(input.title || '').trim() || '教学实施过程-核心模型',
    subtitle: input.subtitle,
    center_label: input.center_label ? String(input.center_label).trim() : '',
    nodes: nodes.length > 0
      ? nodes
      : [
        { title: '智能预习诊断' },
        { title: '多维综合评价' },
        { title: '五合一实训基地' },
        { title: '创新训练平台' },
      ],
    background_image: input.background_image,
  };
}

function getNodePosition(index: number, total: number): React.CSSProperties {
  if (total === 2) {
    if (index === 0) return { top: '50%', left: 20, transform: 'translateY(-50%)', maxWidth: 340 };
    if (index === 1) return { top: '50%', right: 20, transform: 'translateY(-50%)', maxWidth: 340 };
  } else if (total === 3) {
    if (index === 0) return { top: 30, left: '50%', transform: 'translateX(-50%)', maxWidth: 420 };
    if (index === 1) return { bottom: 30, left: 30, maxWidth: 340 };
    if (index === 2) return { bottom: 30, right: 30, maxWidth: 340 };
  }
  switch (index) {
    case 0: return { top: 16, left: '50%', transform: 'translateX(-50%)', maxWidth: 420 };
    case 1: return { bottom: 16, left: '50%', transform: 'translateX(-50%)', maxWidth: 420 };
    case 2: return { top: '50%', left: 20, transform: 'translateY(-50%)', maxWidth: 320 };
    default: return { top: '50%', right: 20, transform: 'translateY(-50%)', maxWidth: 320 };
  }
}

function getCenterFontSize(label: string): number {
  const len = label.length;
  if (len <= 2) return 48;
  if (len <= 4) return 40;
  if (len <= 6) return 32;
  return 24;
}

function getDynamicNodePosition(index: number, total: number): React.CSSProperties {
  const angleOffset = -Math.PI / 2;
  const angle = angleOffset + (2 * Math.PI * index) / total;
  const radiusX = 38; // 稍微收缩半径以适应宽屏
  const radiusY = 36;
  const left = 50 + radiusX * Math.cos(angle);
  const top = 50 + radiusY * Math.sin(angle);
  return {
    position: 'absolute',
    left: `${left}%`,
    top: `${top}%`,
    transform: 'translate(-50%, -50%)',
  };
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

function deepSpaceBg(theme: ThemeConfig, backgroundImage?: string): string {
  const base = theme.colors.background || '#020617';
  const gradient = `radial-gradient(circle at 50% 0%, ${theme.colors.secondary} 0%, transparent 70%), linear-gradient(180deg, ${base} 0%, ${theme.colors.backgroundAlt} 100%)`;

  if (!backgroundImage) return gradient;
  return `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.9)), url(${backgroundImage}) center/cover no-repeat`;
}

/* ==================== Variant A (Deep Space Core) ==================== */

export const EduCoreHubLayout: React.FC<EduCoreHubLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String((model as any).variant || 'a').toLowerCase();
  const orbitSize = 320;

  if (variant === 'b') {
    return <EduCoreHubVariantB data={data} theme={theme} />;
  }

  const slideStyle: React.CSSProperties = {
    width: 1280, height: 720,
    padding: theme.spacing.padding,
    boxSizing: 'border-box',
    position: 'relative', overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: deepSpaceBg(theme, data.background_image),
    color: theme.colors.text,
  };

  const glassCard = glassStyle(theme);

  return (
    <section style={slideStyle}>
      {/* 头部区域 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        paddingBottom: 24, marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 6, height: 42, borderRadius: 3,
            background: `linear-gradient(180deg, ${theme.colors.accent}, transparent)`
          }} />
          <h2 style={{
            margin: 0, color: theme.colors.primary,
            fontSize: 42, fontFamily: theme.fonts.title,
            textShadow: '0 0 20px rgba(6,182,212,0.5)' // 标题微光
          }}>
            {data.title}
          </h2>
        </div>
        {data.subtitle && (
          <div style={{
            color: theme.colors.textLight, fontSize: 20, fontWeight: 300,
            letterSpacing: '1px'
          }}>
            {data.subtitle}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', height: 'calc(100% - 102px)' }}>
        {/* Floating background decorative squares */}
        <div style={{ position: 'absolute', top: 20, right: 20, width: 220, height: 160, border: '1px solid rgba(147,197,253,0.1)', background: 'linear-gradient(135deg, rgba(8,47,73,0.3), transparent)', borderRadius: 16 }} />
        <div style={{ position: 'absolute', bottom: 20, left: 20, width: 220, height: 160, border: '1px solid rgba(147,197,253,0.1)', background: 'linear-gradient(-45deg, rgba(8,47,73,0.3), transparent)', borderRadius: 16 }} />
        
        {/* Outer Orbit Rings for decoration */}
        <div style={{
          width: 820, height: 820,
          borderRadius: '50%', border: '1px solid rgba(147,197,253,0.06)',
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0,
        }} />
        <div style={{
          width: 600, height: 600,
          borderRadius: '50%', border: '1px solid rgba(6,182,212,0.12)',
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0,
        }} />

        {/* Core Center Elements */}
        <div style={{
          width: 380,
          height: 380,
          borderRadius: '50%',
          border: '2px dashed rgba(6,182,212,0.36)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }} />
        <div style={{
          width: orbitSize * 1.4, height: orbitSize * 1.4, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)',
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 0,
        }} />

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 48px',
          background: 'rgba(15,23,42,0.95)',
          border: '2px solid rgba(6,182,212,0.8)',
          borderRadius: 40,
          boxShadow: '0 0 40px rgba(6,182,212,0.3)',
          zIndex: 4,
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{ color: '#ffffff', fontSize: 32, fontWeight: 900, textShadow: '0 0 16px rgba(6,182,212,0.6)', letterSpacing: 2, fontFamily: theme.fonts.title }}>
            {data.center_label || '核心机制'}
          </span>
        </div>

        {data.nodes.slice(0, 4).map((node, index, arr) => (
          <div key={index} style={{
            position: 'absolute',
            ...getNodePosition(index, arr.length),
            borderRadius: 12,
            border: '2px solid rgba(59,130,246,0.75)',
            background: 'rgba(15,23,42,0.85)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.45)',
            padding: '18px 24px',
            zIndex: 3,
            textAlign: node.title.length > 20 ? 'left' : 'center',
          }}>
            <div style={{ color: '#bae6fd', fontSize: node.title.length > 20 ? 20 : 26, fontWeight: node.title.length > 20 ? 500 : 700, lineHeight: 1.5 }}>
              {node.title}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const PYRAMID_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

const EduCoreHubVariantB: React.FC<{ data: EduCoreHubModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const nodes = data.nodes.slice(0, 4);
  const slideStyle: React.CSSProperties = {
    width: 1280, height: 720, padding: '56px 76px', boxSizing: 'border-box',
    position: 'relative', overflow: 'hidden', fontFamily: theme.fonts.body,
    background: data.background_image
      ? `linear-gradient(rgba(8,14,32,0.85), rgba(8,14,32,0.88)), url(${data.background_image}) center/cover no-repeat`
      : 'linear-gradient(180deg, #0b1120 0%, #082f49 100%)',
  };

  return (
    <section style={slideStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid rgba(6,182,212,0.3)', paddingBottom: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 40, borderRadius: 4, marginRight: 18, background: '#06b6d4' }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 40, fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.subtitle && <div style={{ color: '#93c5fd', fontSize: 22 }}>{data.subtitle}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: 'calc(100% - 102px)', gap: 0, paddingBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 900 }}>
          {data.center_label && (
            <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: '12px 12px 0 0', padding: '14px 48px', marginBottom: 0, zIndex: 5 }}>
              <span style={{ color: '#fff', fontSize: 28, fontWeight: 900, fontFamily: theme.fonts.title }}>{data.center_label}</span>
            </div>
          )}
          {nodes.map((node, i) => {
            const widthPct = 40 + i * 20;
            return (
              <div key={i} style={{
                width: `${widthPct}%`, padding: '18px 0', textAlign: 'center',
                background: `linear-gradient(135deg, ${PYRAMID_COLORS[i]}cc, ${PYRAMID_COLORS[i]}88)`,
                borderLeft: `2px solid ${PYRAMID_COLORS[i]}`, borderRight: `2px solid ${PYRAMID_COLORS[i]}`,
                borderBottom: i === nodes.length - 1 ? `2px solid ${PYRAMID_COLORS[i]}` : 'none',
                borderRadius: i === nodes.length - 1 ? '0 0 16px 16px' : 0,
              }}>
                <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{node.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export function renderEduCoreHubLayoutHTML(model: EduCoreHubModel, theme: ThemeConfig): string {
  const variant = String((model as any).variant || 'a').toLowerCase();
  if (variant === 'b') {
    return renderEduCoreHubVariantBHTML(model, theme);
  }
  const data = normalizeModel(model as LooseEduCoreHubModel);
  const background = deepSpaceBg(theme, data.background_image);

  const slicedNodes = data.nodes.slice(0, 4);
  const nodesHTML = slicedNodes.map((node, index) => {
    const pos = getNodePosition(index, slicedNodes.length);
    const isLong = node.title.length > 20;
    const style = [
      'position:absolute',
      pos.top !== undefined ? `top:${typeof pos.top === 'number' ? `${pos.top}px` : pos.top}` : '',
      pos.bottom !== undefined ? `bottom:${typeof pos.bottom === 'number' ? `${pos.bottom}px` : pos.bottom}` : '',
      pos.left !== undefined ? `left:${typeof pos.left === 'number' ? `${pos.left}px` : pos.left}` : '',
      pos.right !== undefined ? `right:${typeof pos.right === 'number' ? `${pos.right}px` : pos.right}` : '',
      pos.transform ? `transform:${pos.transform}` : '',
      pos.maxWidth !== undefined ? `max-width:${pos.maxWidth}px` : '',
      'border-radius:12px',
      'border:2px solid rgba(59,130,246,0.75)',
      'background:rgba(15,23,42,0.85)',
      'box-shadow:0 10px 20px rgba(0,0,0,0.45)',
      'padding:18px 24px',
      'z-index:3',
      `text-align:${isLong ? 'left' : 'center'}`,
    ].filter(Boolean).join(';');

    return `<div style="${style}"><div style="color:#bae6fd;font-size:${isLong ? '20px' : '26px'};font-weight:${isLong ? 500 : 700};line-height:1.5;">${node.title}</div></div>`;
  }).join('');

  const subtitleHTML = data.subtitle ? `<div style="color:${theme.colors.textLight};font-size:20px;font-weight:300;letter-spacing:1px;">${data.subtitle}</div>` : '';

  return `<section style="width:1280px;height:720px;padding:${theme.spacing.padding};box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};color:${theme.colors.text};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:24px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="width:6px;height:42px;border-radius:3px;background:linear-gradient(180deg, ${theme.colors.accent}, transparent);"></div>
      <h2 style="margin:0;color:${theme.colors.primary};font-size:42px;font-family:${theme.fonts.title};text-shadow:0 0 20px rgba(6,182,212,0.5);">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="position:relative;height:calc(100% - 102px);">
    <div style="position:absolute;top:20px;right:20px;width:220px;height:160px;border:1px solid rgba(147,197,253,0.1);background:linear-gradient(135deg, rgba(8,47,73,0.3), transparent);border-radius:16px;"></div>
    <div style="position:absolute;bottom:20px;left:20px;width:220px;height:160px;border:1px solid rgba(147,197,253,0.1);background:linear-gradient(-45deg, rgba(8,47,73,0.3), transparent);border-radius:16px;"></div>
    
    <div style="width:820px;height:820px;border-radius:50%;border:1px solid rgba(147,197,253,0.06);position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:0;"></div>
    <div style="width:600px;height:600px;border-radius:50%;border:1px solid rgba(6,182,212,0.12);position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:0;"></div>
    
    <div style="width:380px;height:380px;border-radius:50%;border:2px dashed rgba(6,182,212,0.36);position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:1;"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);display:flex;align-items:center;justify-content:center;padding:24px 48px;background:rgba(15,23,42,0.95);border:2px solid rgba(6,182,212,0.8);border-radius:40px;box-shadow:0 0 40px rgba(6,182,212,0.3);z-index:4;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);">
      <span style="color:#ffffff;font-size:32px;font-weight:900;text-shadow:0 0 16px rgba(6,182,212,0.6);letter-spacing:2px;font-family:${theme.fonts.title};">${data.center_label || '核心机制'}</span>
    </div>
    ${nodesHTML}
  </div>
</section>`;
}

function renderEduCoreHubVariantBHTML(model: EduCoreHubModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduCoreHubModel);
  const background = data.background_image
    ? `linear-gradient(rgba(8,14,32,0.85), rgba(8,14,32,0.88)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(180deg, #0b1120 0%, #082f49 100%)';
  const subtitleHTML = data.subtitle ? `<div style="color:#93c5fd;font-size:22px;">${data.subtitle}</div>` : '';
  const nodes = data.nodes.slice(0, 4);
  const centerHTML = data.center_label
    ? `<div style="background:linear-gradient(135deg,#06b6d4,#3b82f6);border-radius:12px 12px 0 0;padding:14px 48px;margin-bottom:0;z-index:5;"><span style="color:#fff;font-size:28px;font-weight:900;font-family:${theme.fonts.title};">${data.center_label}</span></div>`
    : '';
  const levelsHTML = nodes.map((node, i) => {
    const w = 40 + i * 20;
    const c = PYRAMID_COLORS[i];
    const br = i === nodes.length - 1 ? 'border-radius:0 0 16px 16px;' : '';
    const bb = i === nodes.length - 1 ? `border-bottom:2px solid ${c};` : '';
    return `<div style="width:${w}%;padding:18px 0;text-align:center;background:linear-gradient(135deg,${c}cc,${c}88);border-left:2px solid ${c};border-right:2px solid ${c};${bb}${br}"><span style="color:#fff;font-size:24px;font-weight:700;">${node.title}</span></div>`;
  }).join('');

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.3);padding-bottom:16px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:40px;border-radius:4px;margin-right:18px;background:#06b6d4;"></div>
      <h2 style="margin:0;color:#ffffff;font-size:40px;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="display:flex;align-items:flex-end;justify-content:center;height:calc(100% - 102px);gap:0;padding-bottom:20px;">
    <div style="display:flex;flex-direction:column;align-items:center;width:100%;max-width:900px;">
      ${centerHTML}
      ${levelsHTML}
    </div>
  </div>
</section>`;
}

export default EduCoreHubLayout;
