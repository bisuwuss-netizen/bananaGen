import React from 'react';
import { EduTimelineStepsModel, ThemeConfig } from '../types/schema';

interface EduTimelineStepsLayoutProps {
  model: EduTimelineStepsModel;
  theme: ThemeConfig;
}

type LooseEduTimelineStepsModel = Partial<EduTimelineStepsModel> & {
  steps?: Array<{
    number?: number;
    label?: string;
    title?: string;
    description?: string;
    details?: string[];
  }>;
  content?: string[] | string;
};

function normalizeModel(input: LooseEduTimelineStepsModel): EduTimelineStepsModel {
  const rawSteps = Array.isArray(input.steps) ? input.steps : [];
  let steps = rawSteps
    .map((item) => {
      const title = String(item.title || item.label || '').trim();
      const description = String(item.description || '').trim();
      const highlights = Array.isArray(item.details)
        ? item.details.map((row) => String(row || '').trim()).filter(Boolean).slice(0, 3)
        : [];
      return { title, description, highlights };
    })
    .filter((item) => item.title || item.description);

  if (steps.length === 0) {
    const rawContent = Array.isArray(input.content)
      ? input.content
      : typeof input.content === 'string'
        ? [input.content]
        : [];
    steps = rawContent
      .map((text) => String(text || '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((text) => ({ title: text, description: '围绕目标拆解执行动作与产出。', highlights: [] }));
  }

  if (steps.length === 0) {
    steps = [
      {
        title: '顶层设计与资源开发阶段',
        description: '梳理核心知识图谱并搭建基础数据采集环境。',
        highlights: ['构建结构化课程体系', '完成语料库录入', '搭建云端数据接口'],
      },
      {
        title: '全范围应用与模式试运行',
        description: '在班级中试点双师课堂，收集第一手交互数据。',
        highlights: ['监控课堂互动数据', '动态调整教学策略'],
      },
      {
        title: '数据评估与持续优化迭代',
        description: '对学习轨迹进行归因分析并迭代评价指标。',
        highlights: ['建立反馈闭环', '沉淀可复用教案'],
      },
    ];
  }

  return {
    title: String(input.title || '').trim() || '实施方案与推进步骤',
    subtitle: input.subtitle,
    steps: steps.slice(0, 4),
    background_image: input.background_image,
  };
}

export const EduTimelineStepsLayout: React.FC<EduTimelineStepsLayoutProps> = ({ model, theme }) => {
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
      ? `linear-gradient(rgba(6,12,28,0.9), rgba(6,12,28,0.9)), url(${data.background_image}) center/cover no-repeat`
      : '#0b1120',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '2px solid rgba(6,182,212,0.32)',
        paddingBottom: 16,
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 40, borderRadius: 4, marginRight: 18, background: '#06b6d4' }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 40, fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.subtitle && <div style={{ color: '#93c5fd', fontSize: 22 }}>{data.subtitle}</div>}
      </div>

      <div style={{ position: 'relative', height: 'calc(100% - 106px)', paddingLeft: 26 }}>
        <div style={{ position: 'absolute', left: 44, top: 10, bottom: 18, width: 2, background: 'rgba(6,182,212,0.35)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {data.steps.map((step, index) => {
            const highlighted = index === 0;
            return (
              <div key={index} style={{ display: 'flex', alignItems: highlighted ? 'flex-start' : 'center', position: 'relative', zIndex: 2 }}>
                <div style={{
                  width: highlighted ? 40 : 24,
                  height: highlighted ? 40 : 24,
                  borderRadius: '50%',
                  boxSizing: 'border-box',
                  marginRight: highlighted ? 34 : 42,
                  marginLeft: highlighted ? 0 : 8,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: highlighted ? 18 : 12,
                  background: highlighted ? '#06b6d4' : '#0b1120',
                  border: highlighted ? '4px solid #0b1120' : `4px solid ${index % 2 === 1 ? '#3b82f6' : '#10b981'}`,
                  boxShadow: highlighted ? '0 0 15px rgba(6,182,212,0.8)' : 'none',
                }}>
                  {index + 1}
                </div>

                <div style={{
                  flex: 1,
                  borderRadius: 14,
                  border: highlighted ? '1px solid rgba(6,182,212,0.42)' : '1px solid rgba(255,255,255,0.12)',
                  background: highlighted
                    ? 'linear-gradient(to right, rgba(6,182,212,0.16), rgba(15,23,42,0.82))'
                    : 'rgba(255,255,255,0.04)',
                  padding: highlighted ? '22px 24px' : '16px 22px',
                  boxSizing: 'border-box',
                }}>
                  <h3 style={{ margin: 0, color: highlighted ? '#67e8f9' : (index % 2 === 1 ? '#93c5fd' : '#6ee7b7'), fontSize: highlighted ? 28 : 24, fontWeight: 700 }}>
                    {step.title}
                  </h3>
                  <p style={{ margin: '10px 0 0 0', color: '#cbd5e1', fontSize: 18, lineHeight: 1.5 }}>
                    {step.description}
                  </p>
                  {Array.isArray(step.highlights) && step.highlights.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {step.highlights.slice(0, 3).map((text, idx) => (
                        <div key={idx} style={{ color: '#cbd5e1', fontSize: 16 }}>
                          • {text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export function renderEduTimelineStepsLayoutHTML(model: EduTimelineStepsModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduTimelineStepsModel);
  const background = data.background_image
    ? `linear-gradient(rgba(6,12,28,0.9), rgba(6,12,28,0.9)), url(${data.background_image}) center/cover no-repeat`
    : '#0b1120';

  const stepsHTML = data.steps.map((step, index) => {
    const highlighted = index === 0;
    const highlights = Array.isArray(step.highlights) && step.highlights.length > 0
      ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">${step.highlights.slice(0, 3).map((text) => `<div style="color:#cbd5e1;font-size:16px;">• ${text}</div>`).join('')}</div>`
      : '';

    return `<div style="display:flex;align-items:${highlighted ? 'flex-start' : 'center'};position:relative;z-index:2;">
      <div style="width:${highlighted ? 40 : 24}px;height:${highlighted ? 40 : 24}px;border-radius:50%;box-sizing:border-box;margin-right:${highlighted ? 34 : 42}px;margin-left:${highlighted ? 0 : 8}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:700;font-size:${highlighted ? 18 : 12}px;background:${highlighted ? '#06b6d4' : '#0b1120'};border:${highlighted ? '4px solid #0b1120' : `4px solid ${index % 2 === 1 ? '#3b82f6' : '#10b981'}`};box-shadow:${highlighted ? '0 0 15px rgba(6,182,212,0.8)' : 'none'};">${index + 1}</div>
      <div style="flex:1;border-radius:14px;border:${highlighted ? '1px solid rgba(6,182,212,0.42)' : '1px solid rgba(255,255,255,0.12)'};background:${highlighted ? 'linear-gradient(to right, rgba(6,182,212,0.16), rgba(15,23,42,0.82))' : 'rgba(255,255,255,0.04)'};padding:${highlighted ? '22px 24px' : '16px 22px'};box-sizing:border-box;">
        <h3 style="margin:0;color:${highlighted ? '#67e8f9' : (index % 2 === 1 ? '#93c5fd' : '#6ee7b7')};font-size:${highlighted ? 28 : 24}px;font-weight:700;">${step.title}</h3>
        <p style="margin:10px 0 0 0;color:#cbd5e1;font-size:18px;line-height:1.5;">${step.description}</p>
        ${highlights}
      </div>
    </div>`;
  }).join('');

  const subtitleHTML = data.subtitle ? `<div style="color:#93c5fd;font-size:22px;">${data.subtitle}</div>` : '';

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.32);padding-bottom:16px;margin-bottom:28px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:40px;border-radius:4px;margin-right:18px;background:#06b6d4;"></div>
      <h2 style="margin:0;color:#ffffff;font-size:40px;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="position:relative;height:calc(100% - 106px);padding-left:26px;">
    <div style="position:absolute;left:44px;top:10px;bottom:18px;width:2px;background:rgba(6,182,212,0.35);"></div>
    <div style="display:flex;flex-direction:column;gap:26px;">${stepsHTML}</div>
  </div>
</section>`;
}

export default EduTimelineStepsLayout;
