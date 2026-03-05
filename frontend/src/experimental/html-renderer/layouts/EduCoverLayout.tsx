import React from 'react';
import { EduCoverModel, ThemeConfig } from '../types/schema';

interface EduCoverLayoutProps {
  model: EduCoverModel;
  theme: ThemeConfig;
  onImageUpload?: () => void;
}

type LooseEduCoverModel = Partial<EduCoverModel> & {
  label?: string;
  description?: string;
  metric?: { value?: string; label?: string };
};

function normalizeModel(input: LooseEduCoverModel): EduCoverModel {
  const title = String(input.title || '').trim() || '智教未来';
  const subtitle = String(input.subtitle || input.description || '').trim();

  return {
    title,
    subtitle,
    author: input.author,
    department: input.department,
    date: input.date,
    hero_image: input.hero_image || input.background_image,
    background_image: input.background_image,
  };
}

export const EduCoverLayout: React.FC<EduCoverLayoutProps> = ({ model, theme, onImageUpload }) => {
  const data = normalizeModel(model);

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: data.background_image
      ? `linear-gradient(rgba(6,12,28,0.76), rgba(6,12,28,0.9)), url(${data.background_image}) center/cover no-repeat`
      : 'linear-gradient(135deg, #0b1120 0%, #172554 100%)',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        position: 'absolute',
        top: -120,
        left: -80,
        width: 420,
        height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0) 70%)',
      }} />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '62%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '110px 72px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ width: 64, height: 6, borderRadius: 3, marginBottom: 30, background: '#06b6d4', boxShadow: '0 0 18px rgba(6,182,212,0.7)' }} />
        <h1 style={{ margin: 0, color: '#ffffff', fontSize: 78, lineHeight: 1.08, fontWeight: 900, letterSpacing: 3, fontFamily: theme.fonts.title }}>
          {data.title}
        </h1>
        {data.subtitle && (
          <p style={{ margin: '20px 0 0 0', color: '#93c5fd', fontSize: 30, lineHeight: 1.35, maxWidth: 660 }}>
            {data.subtitle}
          </p>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {data.author && <MetaTag color="rgba(6,182,212,0.15)" border="rgba(6,182,212,0.45)" text={`汇报人：${data.author}`} />}
          {data.department && <MetaTag color="rgba(59,130,246,0.15)" border="rgba(59,130,246,0.45)" text={`单位：${data.department}`} />}
          {data.date && <MetaTag color="rgba(255,255,255,0.08)" border="rgba(255,255,255,0.25)" text={`日期：${data.date}`} />}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: 72,
        right: 56,
        width: 430,
        height: 576,
        borderRadius: 34,
        overflow: 'hidden',
        border: '2px solid rgba(6,182,212,0.45)',
        boxShadow: '0 0 40px rgba(6,182,212,0.22), inset 0 0 32px rgba(6,182,212,0.12)',
        background: 'rgba(15,23,42,0.45)',
      }}>
        {data.hero_image ? (
          <img
            src={data.hero_image}
            alt={data.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <button
            type="button"
            onClick={onImageUpload}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'linear-gradient(160deg, rgba(15,23,42,0.8), rgba(8,47,73,0.72))',
              color: '#7dd3fc',
              fontSize: 20,
              cursor: onImageUpload ? 'pointer' : 'default',
            }}
          >
            点击上传封面图
          </button>
        )}
      </div>
    </section>
  );
};

const MetaTag: React.FC<{ color: string; border: string; text: string }> = ({ color, border, text }) => (
  <div style={{
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: color,
    color: '#dbeafe',
    fontSize: 20,
    fontWeight: 700,
    padding: '10px 22px',
    backdropFilter: 'blur(3px)',
  }}>
    {text}
  </div>
);

export function renderEduCoverLayoutHTML(model: EduCoverModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduCoverModel);
  const hero = data.hero_image
    ? `<img src="${data.hero_image}" alt="${data.title}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg, rgba(15,23,42,0.8), rgba(8,47,73,0.72));color:#7dd3fc;font-size:20px;">点击上传封面图</div>`;

  const metaTags: string[] = [];
  if (data.author) {
    metaTags.push('<div style="border-radius:999px;border:1px solid rgba(6,182,212,0.45);background:rgba(6,182,212,0.15);color:#dbeafe;font-size:20px;font-weight:700;padding:10px 22px;">汇报人：' + data.author + '</div>');
  }
  if (data.department) {
    metaTags.push('<div style="border-radius:999px;border:1px solid rgba(59,130,246,0.45);background:rgba(59,130,246,0.15);color:#dbeafe;font-size:20px;font-weight:700;padding:10px 22px;">单位：' + data.department + '</div>');
  }
  if (data.date) {
    metaTags.push('<div style="border-radius:999px;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.08);color:#dbeafe;font-size:20px;font-weight:700;padding:10px 22px;">日期：' + data.date + '</div>');
  }

  const subtitleHTML = data.subtitle
    ? `<p style="margin:20px 0 0 0;color:#93c5fd;font-size:30px;line-height:1.35;max-width:660px;">${data.subtitle}</p>`
    : '';

  const background = data.background_image
    ? `linear-gradient(rgba(6,12,28,0.76), rgba(6,12,28,0.9)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(135deg, #0b1120 0%, #172554 100%)';

  return `<section style="width:1280px;height:720px;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="position:absolute;top:-120px;left:-80px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0) 70%);"></div>
  <div style="position:absolute;top:0;left:0;width:62%;height:100%;box-sizing:border-box;padding:110px 72px;display:flex;flex-direction:column;">
    <div style="width:64px;height:6px;border-radius:3px;margin-bottom:30px;background:#06b6d4;box-shadow:0 0 18px rgba(6,182,212,0.7);"></div>
    <h1 style="margin:0;color:#ffffff;font-size:78px;line-height:1.08;font-weight:900;letter-spacing:3px;font-family:${theme.fonts.title};">${data.title}</h1>
    ${subtitleHTML}
    <div style="margin-top:auto;display:flex;flex-wrap:wrap;gap:14px;">${metaTags.join('')}</div>
  </div>
  <div style="position:absolute;top:72px;right:56px;width:430px;height:576px;border-radius:34px;overflow:hidden;border:2px solid rgba(6,182,212,0.45);box-shadow:0 0 40px rgba(6,182,212,0.22), inset 0 0 32px rgba(6,182,212,0.12);background:rgba(15,23,42,0.45);">${hero}</div>
</section>`;
}

export default EduCoverLayout;
