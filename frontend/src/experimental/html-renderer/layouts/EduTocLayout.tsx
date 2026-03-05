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
    items: normalizeItems(input),
    background_image: input.background_image,
  };
}

export const EduTocLayout: React.FC<EduTocLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: '58px 78px',
    fontFamily: theme.fonts.body,
    background: data.background_image
      ? `linear-gradient(rgba(8,14,32,0.88), rgba(8,14,32,0.9)), url(${data.background_image}) center/cover no-repeat`
      : 'linear-gradient(180deg, #0b1120 0%, #111827 100%)',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '2px solid rgba(6,182,212,0.35)',
        paddingBottom: 18,
        marginBottom: 38,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 42, borderRadius: 4, marginRight: 18, background: '#06b6d4', boxShadow: '0 0 14px rgba(6,182,212,0.72)' }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 42, letterSpacing: 2, fontFamily: theme.fonts.title }}>
            {data.title}
          </h2>
        </div>
        {data.subtitle && <div style={{ color: '#93c5fd', fontSize: 22 }}>{data.subtitle}</div>}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        justifyContent: 'center',
        padding: '0 96px',
        height: 'calc(100% - 128px)',
        boxSizing: 'border-box',
      }}>
        {data.items.slice(0, 6).map((item) => (
          <div key={item.index} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '18px 34px',
            borderRadius: 15,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
          }}>
            <span className="directory-list-index" style={{
              minWidth: 86,
              marginRight: 30,
              color: '#06b6d4',
              fontSize: 46,
              fontWeight: 900,
              textShadow: '0 0 12px rgba(6,182,212,0.4)',
              fontStyle: 'italic',
            }}>
              {String(item.index).padStart(2, '0')}
            </span>
            <span className="slide-content-list-con" style={{ color: '#e2e8f0', fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export function renderEduTocLayoutHTML(model: EduTocModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduTocModel);
  const background = data.background_image
    ? `linear-gradient(rgba(8,14,32,0.88), rgba(8,14,32,0.9)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(180deg, #0b1120 0%, #111827 100%)';

  const rows = data.items.slice(0, 6).map((item) => `
    <div style="display:flex;align-items:center;padding:18px 34px;border-radius:15px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);">
      <span class="directory-list-index" style="min-width:86px;margin-right:30px;color:#06b6d4;font-size:46px;font-weight:900;text-shadow:0 0 12px rgba(6,182,212,0.4);font-style:italic;">${String(item.index).padStart(2, '0')}</span>
      <span class="slide-content-list-con" style="color:#e2e8f0;font-size:30px;font-weight:700;letter-spacing:1px;">${item.text}</span>
    </div>`).join('');

  const subtitleHTML = data.subtitle ? `<div style="color:#93c5fd;font-size:22px;">${data.subtitle}</div>` : '';

  return `<section style="width:1280px;height:720px;position:relative;overflow:hidden;box-sizing:border-box;padding:58px 78px;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.35);padding-bottom:18px;margin-bottom:38px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:42px;border-radius:4px;margin-right:18px;background:#06b6d4;box-shadow:0 0 14px rgba(6,182,212,0.72);"></div>
      <h2 style="margin:0;color:#ffffff;font-size:42px;letter-spacing:2px;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="display:flex;flex-direction:column;gap:24px;justify-content:center;padding:0 96px;height:calc(100% - 128px);box-sizing:border-box;">${rows}</div>
</section>`;
}

export default EduTocLayout;
