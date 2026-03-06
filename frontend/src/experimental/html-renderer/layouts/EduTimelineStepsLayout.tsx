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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let steps = rawSteps
    .map((item: any) => {
      const title = String(item.title || item.label || '').trim();
      const description = String(item.description || '').trim();
      const highlights = Array.isArray(item.details)
        ? item.details.map((row: string) => String(row || '').trim()).filter(Boolean).slice(0, 3)
        : (Array.isArray(item.highlights) ? item.highlights.map((row: string) => String(row || '').trim()).filter(Boolean).slice(0, 3) : []);
      return { title, description, highlights };
    })
    .filter((item: { title: string; description: string }) => item.title || item.description);

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
    variant: input.variant,
    steps: steps.slice(0, 4),
    background_image: input.background_image,
  };
}

const STEP_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b'];
const STEP_TITLE_COLORS = ['#67e8f9', '#93c5fd', '#6ee7b7', '#fcd34d'];

// ===================== Variant A (原版: 左侧垂直时间轴) =====================

export const EduTimelineStepsLayout: React.FC<EduTimelineStepsLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return <EduTimelineStepsVariantB data={data} theme={theme} />;
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

// ===================== Variant B (水平横向步骤条) =====================

const EduTimelineStepsVariantB: React.FC<{ data: EduTimelineStepsModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    flexShrink: 0,
    backgroundColor: '#0b1120',
    backgroundImage: data.background_image
      ? `linear-gradient(rgba(6,12,28,0.9), rgba(6,12,28,0.9)), url(${data.background_image})`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '60px 80px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
  };

  const steps = data.steps.slice(0, 4);

  return (
    <section style={slideStyle}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: '2px solid rgba(6, 182, 212, 0.3)', paddingBottom: 20, marginBottom: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 40, backgroundColor: '#06b6d4', marginRight: 20, borderRadius: 4 }} />
          <h2 style={{ fontSize: 42, color: '#ffffff', margin: 0, fontWeight: 'bold', fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.subtitle && (
          <div style={{ fontSize: 24, color: '#93c5fd', fontWeight: 300 }}>{data.subtitle}</div>
        )}
      </div>

      {/* Content area with horizontal stepper */}
      <div style={{ position: 'relative', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Horizontal connecting axis */}
        <div style={{
          position: 'absolute', top: 30,
          left: `${100 / (steps.length * 2)}%`,
          right: `${100 / (steps.length * 2)}%`,
          height: 4,
          backgroundImage: (() => {
            const pct = 100 / steps.length;
            const segments = steps.map((_, i) => {
              const color = i === 0 ? STEP_COLORS[0] : `rgba(${i % 2 === 1 ? '59,130,246' : '16,185,129'},0.3)`;
              return `${color} ${i * pct}%, ${color} ${(i + 1) * pct}%`;
            }).join(', ');
            return `linear-gradient(to right, ${segments})`;
          })(),
          zIndex: 1,
        }} />

        {/* Steps container */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2, height: '100%' }}>
          {steps.map((step, index) => {
            const color = STEP_COLORS[index % STEP_COLORS.length];
            const titleColor = STEP_TITLE_COLORS[index % STEP_TITLE_COLORS.length];
            const isFirst = index === 0;

            return (
              <div key={index} style={{
                width: `${Math.floor(90 / steps.length)}%`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {/* Number circle */}
                <div style={{
                  width: 64, height: 64, backgroundColor: '#0b1120',
                  border: `4px solid ${color}`, borderRadius: '50%',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  fontSize: 28, color, fontWeight: 'bold', marginBottom: 30,
                  boxShadow: isFirst ? `0 0 20px rgba(6, 182, 212, 0.5)` : 'none',
                  boxSizing: 'border-box',
                }}>
                  {String(index + 1).padStart(2, '0')}
                </div>

                {/* Card */}
                <div style={{
                  width: '100%',
                  backgroundImage: isFirst ? `linear-gradient(180deg, rgba(6, 182, 212, 0.15), rgba(0,0,0,0))` : undefined,
                  backgroundColor: isFirst ? undefined : 'rgba(255,255,255,0.02)',
                  border: isFirst ? `1px solid rgba(6, 182, 212, 0.4)` : '1px solid rgba(255,255,255,0.08)',
                  borderTop: `4px solid ${color}`,
                  borderRadius: 16, padding: 30, boxSizing: 'border-box', flexGrow: 1,
                }}>
                  <h3 style={{ fontSize: 24, color: titleColor, textAlign: 'center', margin: '0 0 20px 0', fontWeight: 'bold', fontFamily: theme.fonts.title }}>{step.title}</h3>
                  {step.description && (
                    <p style={{ fontSize: 16, color: isFirst ? '#cbd5e1' : '#94a3b8', margin: 0, lineHeight: 1.6 }}>{step.description}</p>
                  )}
                  {Array.isArray(step.highlights) && step.highlights.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {step.highlights.slice(0, 3).map((text, idx) => (
                        <p key={idx} style={{ fontSize: 16, color: '#cbd5e1', margin: '0 0 12px 0', lineHeight: 1.6 }}>
                          • {text}
                        </p>
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

// ===================== HTML 渲染 =====================

export function renderEduTimelineStepsLayoutHTML(model: EduTimelineStepsModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduTimelineStepsModel);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEduTimelineStepsVariantBHTML(data, theme);
  }

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

function renderEduTimelineStepsVariantBHTML(data: EduTimelineStepsModel, theme: ThemeConfig): string {
  const subtitleHTML = data.subtitle
    ? `<div style="font-size:24px;color:#93c5fd;font-weight:300;">${data.subtitle}</div>`
    : '';

  const steps = data.steps.slice(0, 4);
  const colWidth = Math.floor(90 / steps.length);

  const stepsHTML = steps.map((step, index) => {
    const color = STEP_COLORS[index % STEP_COLORS.length];
    const titleColor = STEP_TITLE_COLORS[index % STEP_TITLE_COLORS.length];
    const isFirst = index === 0;
    const num = String(index + 1).padStart(2, '0');
    const cardBg = isFirst ? 'background-image:linear-gradient(180deg, rgba(6,182,212,0.15), rgba(0,0,0,0));' : 'background-color:rgba(255,255,255,0.02);';
    const cardBorder = isFirst ? 'border:1px solid rgba(6,182,212,0.4);' : 'border:1px solid rgba(255,255,255,0.08);';
    const shadow = isFirst ? 'box-shadow:0 0 20px rgba(6,182,212,0.5);' : '';
    const textColor = isFirst ? '#cbd5e1' : '#94a3b8';

    const highlightsHTML = Array.isArray(step.highlights) && step.highlights.length > 0
      ? step.highlights.slice(0, 3).map((text) => `<p style="font-size:16px;color:#cbd5e1;margin:0 0 12px 0;line-height:1.6;">• ${text}</p>`).join('')
      : '';
    const descHTML = step.description
      ? `<p style="font-size:16px;color:${textColor};margin:0;line-height:1.6;">${step.description}</p>`
      : '';

    return `<div style="width:${colWidth}%;display:flex;flex-direction:column;align-items:center;">
      <div style="width:64px;height:64px;background-color:#0b1120;border:4px solid ${color};border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:28px;color:${color};font-weight:bold;margin-bottom:30px;${shadow}box-sizing:border-box;">${num}</div>
      <div style="width:100%;${cardBg}${cardBorder}border-top:4px solid ${color};border-radius:16px;padding:30px;box-sizing:border-box;flex-grow:1;">
        <h3 style="font-size:24px;color:${titleColor};text-align:center;margin:0 0 20px 0;font-weight:bold;font-family:${theme.fonts.title};">${step.title}</h3>
        ${descHTML}
        ${highlightsHTML ? `<div style="margin-top:12px;">${highlightsHTML}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  // Horizontal connecting axis gradient
  const pct = 100 / steps.length;
  const segments = steps.map((_, i) => {
    const c = i === 0 ? STEP_COLORS[0] : `rgba(${i % 2 === 1 ? '59,130,246' : '16,185,129'},0.3)`;
    return `${c} ${i * pct}%, ${c} ${(i + 1) * pct}%`;
  }).join(', ');
  const axisLeft = `${100 / (steps.length * 2)}%`;

  return `<section style="width:1280px;height:720px;flex-shrink:0;background-color:#0b1120;${data.background_image ? `background-image:linear-gradient(rgba(6,12,28,0.9),rgba(6,12,28,0.9)),url(${data.background_image});background-size:cover;background-position:center;` : ''}padding:60px 80px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;font-family:${theme.fonts.body};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.3);padding-bottom:20px;margin-bottom:60px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:40px;background-color:#06b6d4;margin-right:20px;border-radius:4px;"></div>
      <h2 style="font-size:42px;color:#ffffff;margin:0;font-weight:bold;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="position:relative;flex-grow:1;display:flex;flex-direction:column;">
    <div style="position:absolute;top:30px;left:${axisLeft};right:${axisLeft};height:4px;background-image:linear-gradient(to right, ${segments});z-index:1;"></div>
    <div style="display:flex;justify-content:space-between;position:relative;z-index:2;height:100%;">${stepsHTML}</div>
  </div>
</section>`;
}

export default EduTimelineStepsLayout;
