import React from 'react';
import { EduCoreHubModel, ThemeConfig } from '../types/schema';

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

  const nodes = (nodesFromModel.length > 0 ? nodesFromModel : (nodesFromBullets.length > 0 ? nodesFromBullets : nodesFromContent)).slice(0, 4);

  return {
    title: String(input.title || '').trim() || '教学实施过程-核心模型',
    subtitle: input.subtitle,
    center_label: String(input.center_label || '').trim() || '学生中心',
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

function getNodePosition(index: number): React.CSSProperties {
  switch (index) {
    case 0:
      return { top: 32, left: '50%', transform: 'translateX(-50%)' };
    case 1:
      return { bottom: 28, left: '50%', transform: 'translateX(-50%)' };
    case 2:
      return { top: '50%', left: 120, transform: 'translateY(-50%)' };
    default:
      return { top: '50%', right: 120, transform: 'translateY(-50%)' };
  }
}

export const EduCoreHubLayout: React.FC<EduCoreHubLayoutProps> = ({ model, theme }) => {
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
      ? `linear-gradient(rgba(8,14,32,0.85), rgba(8,14,32,0.88)), url(${data.background_image}) center/cover no-repeat`
      : 'linear-gradient(180deg, #0b1120 0%, #082f49 100%)',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '2px solid rgba(6,182,212,0.3)',
        paddingBottom: 16,
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 40, borderRadius: 4, marginRight: 18, background: '#06b6d4' }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 40, fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.subtitle && <div style={{ color: '#93c5fd', fontSize: 22 }}>{data.subtitle}</div>}
      </div>

      <div style={{ position: 'relative', height: 'calc(100% - 102px)' }}>
        <div style={{
          width: 250,
          height: 250,
          borderRadius: '50%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 56px rgba(6,182,212,0.5), inset 0 0 24px rgba(255,255,255,0.42)',
          zIndex: 4,
        }}>
          <span style={{ color: '#ffffff', fontSize: 40, fontWeight: 900, letterSpacing: 1, fontFamily: theme.fonts.title }}>{data.center_label}</span>
        </div>

        <div style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: '2px dashed rgba(6,182,212,0.36)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }} />

        {data.nodes.slice(0, 4).map((node, index) => (
          <div key={index} style={{
            position: 'absolute',
            ...getNodePosition(index),
            borderRadius: 12,
            border: '2px solid rgba(59,130,246,0.75)',
            background: 'rgba(15,23,42,0.85)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.45)',
            padding: '14px 26px',
            zIndex: 3,
          }}>
            <span style={{ color: '#93c5fd', fontSize: 26, fontWeight: 700 }}>{node.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export function renderEduCoreHubLayoutHTML(model: EduCoreHubModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduCoreHubModel);
  const background = data.background_image
    ? `linear-gradient(rgba(8,14,32,0.85), rgba(8,14,32,0.88)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(180deg, #0b1120 0%, #082f49 100%)';

  const nodesHTML = data.nodes.slice(0, 4).map((node, index) => {
    const pos = getNodePosition(index);
    const style = [
      'position:absolute',
      pos.top !== undefined ? `top:${typeof pos.top === 'number' ? `${pos.top}px` : pos.top}` : '',
      pos.bottom !== undefined ? `bottom:${typeof pos.bottom === 'number' ? `${pos.bottom}px` : pos.bottom}` : '',
      pos.left !== undefined ? `left:${typeof pos.left === 'number' ? `${pos.left}px` : pos.left}` : '',
      pos.right !== undefined ? `right:${typeof pos.right === 'number' ? `${pos.right}px` : pos.right}` : '',
      pos.transform ? `transform:${pos.transform}` : '',
      'border-radius:12px',
      'border:2px solid rgba(59,130,246,0.75)',
      'background:rgba(15,23,42,0.85)',
      'box-shadow:0 10px 20px rgba(0,0,0,0.45)',
      'padding:14px 26px',
      'z-index:3',
    ].filter(Boolean).join(';');

    return `<div style="${style}"><span style="color:#93c5fd;font-size:26px;font-weight:700;">${node.title}</span></div>`;
  }).join('');

  const subtitleHTML = data.subtitle ? `<div style="color:#93c5fd;font-size:22px;">${data.subtitle}</div>` : '';

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.3);padding-bottom:16px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:40px;border-radius:4px;margin-right:18px;background:#06b6d4;"></div>
      <h2 style="margin:0;color:#ffffff;font-size:40px;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="position:relative;height:calc(100% - 102px);">
    <div style="width:250px;height:250px;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);background:linear-gradient(135deg, #06b6d4, #3b82f6);display:flex;align-items:center;justify-content:center;box-shadow:0 0 56px rgba(6,182,212,0.5), inset 0 0 24px rgba(255,255,255,0.42);z-index:4;"><span style="color:#ffffff;font-size:40px;font-weight:900;letter-spacing:1px;font-family:${theme.fonts.title};">${data.center_label}</span></div>
    <div style="width:500px;height:500px;border-radius:50%;border:2px dashed rgba(6,182,212,0.36);position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:1;"></div>
    ${nodesHTML}
  </div>
</section>`;
}

export default EduCoreHubLayout;
