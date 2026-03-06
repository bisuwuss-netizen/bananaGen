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

// ===================== Variant A (原版: 左侧垂直时间轴) =====================

export const EduTimelineStepsLayout: React.FC<EduTimelineStepsLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();
  const glass = glassStyle(theme);

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
    background: deepSpaceBg(theme, data.background_image),
    color: '#ffffff',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: `1px solid rgba(6,182,212,0.3)`,
        paddingBottom: 24,
        marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 6, height: 40, borderRadius: 3, marginRight: 20, background: 'linear-gradient(to bottom, #06b6d4, #3b82f6)' }} />
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 42, fontFamily: theme.fonts.title, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{data.title}</h2>
        </div>
        {data.subtitle && <div style={{ color: '#94a3b8', fontSize: 24, fontWeight: 300 }}>{data.subtitle}</div>}
      </div>

      <div style={{ position: 'relative', height: 'calc(100% - 110px)', paddingLeft: 26 }}>
        <div style={{ position: 'absolute', left: 44, top: 10, bottom: 18, width: 2, background: 'linear-gradient(to bottom, rgba(6,182,212,0.5), rgba(59,130,246,0.1))' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'center' }}>
          {data.steps.map((step, index) => {
            const highlighted = index === 0;
            const color = STEP_COLORS[index % STEP_COLORS.length];
            const titleColor = STEP_TITLE_COLORS[index % STEP_TITLE_COLORS.length];
            
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                <div style={{
                  width: highlighted ? 40 : 28,
                  height: highlighted ? 40 : 28,
                  borderRadius: '50%',
                  boxSizing: 'border-box',
                  marginRight: highlighted ? 34 : 40,
                  marginLeft: highlighted ? 0 : 6,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: highlighted ? 18 : 14,
                  background: highlighted ? color : '#0f172a',
                  border: highlighted ? '4px solid rgba(0,0,0,0.5)' : `2px solid ${color}`,
                  boxShadow: highlighted ? `0 0 20px ${color}` : `0 0 10px ${color}40`,
                }}>
                  {index + 1}
                </div>

                <div style={{
                  ...glass,
                  flex: 1,
                  borderRadius: 16,
                  padding: highlighted ? '24px 28px' : '20px 24px',
                  boxSizing: 'border-box',
                  borderLeft: `4px solid ${color}`,
                  transition: 'all 0.3s ease',
                  background: highlighted ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ margin: 0, color: titleColor, fontSize: highlighted ? 26 : 22, fontWeight: 700, fontFamily: theme.fonts.title }}>
                            {step.title}
                        </h3>
                        <p style={{ margin: '8px 0 0 0', color: '#cbd5e1', fontSize: 18, lineHeight: 1.5 }}>
                            {step.description}
                        </p>
                    </div>
                  </div>
                  
                  {Array.isArray(step.highlights) && step.highlights.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {step.highlights.slice(0, 3).map((text, idx) => (
                        <div key={idx} style={{ 
                            color: '#94a3b8', 
                            fontSize: 14, 
                            background: 'rgba(0,0,0,0.2)', 
                            padding: '4px 10px', 
                            borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
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
  const glass = glassStyle(theme);
  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    flexShrink: 0,
    background: deepSpaceBg(theme, data.background_image),
    padding: '60px 80px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    color: '#fff',
  };

  const steps = data.steps.slice(0, 4);

  return (
    <section style={slideStyle}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: `1px solid rgba(6, 182, 212, 0.3)`, paddingBottom: 20, marginBottom: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 6, height: 40, background: 'linear-gradient(to bottom, #06b6d4, #3b82f6)', marginRight: 20, borderRadius: 3 }} />
          <h2 style={{ fontSize: 42, color: '#f8fafc', margin: 0, fontWeight: 'bold', fontFamily: theme.fonts.title, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{data.title}</h2>
        </div>
        {data.subtitle && (
          <div style={{ fontSize: 24, color: '#94a3b8', fontWeight: 300 }}>{data.subtitle}</div>
        )}
      </div>

      {/* Content area with horizontal stepper */}
      <div style={{ position: 'relative', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Horizontal connecting axis */}
        <div style={{
          position: 'absolute', top: 40,
          left: `${100 / (steps.length * 2)}%`,
          right: `${100 / (steps.length * 2)}%`,
          height: 2,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2, height: '100%', gap: 20 }}>
          {steps.map((step, index) => {
            const color = STEP_COLORS[index % STEP_COLORS.length];
            const titleColor = STEP_TITLE_COLORS[index % STEP_TITLE_COLORS.length];
            const isFirst = index === 0;

            return (
              <div key={index} style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {/* Number circle */}
                <div style={{
                  width: 80, height: 80, backgroundColor: '#0f172a',
                  border: `2px solid ${color}`, borderRadius: '50%',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  fontSize: 32, color, fontWeight: 'bold', marginBottom: 30,
                  boxShadow: isFirst ? `0 0 25px ${color}80` : `0 0 15px ${color}20`,
                  boxSizing: 'border-box',
                  position: 'relative',
                }}>
                    <div style={{
                        position: 'absolute', inset: 4, borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                    }}>
                        {String(index + 1).padStart(2, '0')}
                    </div>
                </div>

                {/* Card */}
                <div style={{
                  ...glass,
                  width: '100%',
                  borderTop: `4px solid ${color}`,
                  borderRadius: 20, 
                  padding: 24, 
                  boxSizing: 'border-box', 
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  background: isFirst ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                }}>
                  <h3 style={{ fontSize: 22, color: titleColor, textAlign: 'center', margin: '0 0 16px 0', fontWeight: 'bold', fontFamily: theme.fonts.title }}>{step.title}</h3>
                  {step.description && (
                    <p style={{ fontSize: 16, color: isFirst ? '#e2e8f0' : '#cbd5e1', margin: 0, lineHeight: 1.6, textAlign: 'center', flexGrow: 1 }}>{step.description}</p>
                  )}
                  {Array.isArray(step.highlights) && step.highlights.length > 0 && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      {step.highlights.slice(0, 3).map((text, idx) => (
                        <p key={idx} style={{ fontSize: 14, color: '#94a3b8', margin: 0, lineHeight: 1.4, textAlign: 'center' }}>
                          {text}
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

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const stepsHTML = data.steps.map((step, index) => {
    const highlighted = index === 0;
    const color = STEP_COLORS[index % STEP_COLORS.length];
    const titleColor = STEP_TITLE_COLORS[index % STEP_TITLE_COLORS.length];

    const highlights = Array.isArray(step.highlights) && step.highlights.length > 0
      ? `<div style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;">${step.highlights.slice(0, 3).map((text) => `<div style="color:#94a3b8;font-size:14px;background:rgba(0,0,0,0.2);padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);">• ${text}</div>`).join('')}</div>`
      : '';

    return `<div style="display:flex;align-items:center;position:relative;z-index:2;">
      <div style="width:${highlighted ? 40 : 28}px;height:${highlighted ? 40 : 28}px;border-radius:50%;box-sizing:border-box;margin-right:${highlighted ? 34 : 40}px;margin-left:${highlighted ? 0 : 6}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:700;font-size:${highlighted ? 18 : 14}px;background:${highlighted ? color : '#0f172a'};border:${highlighted ? '4px solid rgba(0,0,0,0.5)' : `2px solid ${color}`};box-shadow:${highlighted ? `0 0 20px ${color}` : `0 0 10px ${color}40`};">${index + 1}</div>
      <div style="flex:1;border-radius:16px;padding:${highlighted ? '24px 28px' : '20px 24px'};box-sizing:border-box;border-left:4px solid ${color};background:${highlighted ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)'};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);border-left:4px solid ${color};box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
        <h3 style="margin:0;color:${titleColor};font-size:${highlighted ? 26 : 22}px;font-weight:700;font-family:${theme.fonts.title};">${step.title}</h3>
        <p style="margin:8px 0 0 0;color:#cbd5e1;font-size:18px;line-height:1.5;">${step.description}</p>
        ${highlights}
      </div>
    </div>`;
  }).join('');

  const subtitleHTML = data.subtitle ? `<div style="color:#94a3b8;font-size:24px;font-weight:300;">${data.subtitle}</div>` : '';

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};color:#ffffff;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(6,182,212,0.3);padding-bottom:24px;margin-bottom:32px;">
    <div style="display:flex;align-items:center;">
      <div style="width:6px;height:40px;border-radius:3px;margin-right:20px;background:linear-gradient(to bottom, #06b6d4, #3b82f6);"></div>
      <h2 style="margin:0;color:#f8fafc;font-size:42px;font-family:${theme.fonts.title};letter-spacing:-0.02em;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="position:relative;height:calc(100% - 110px);padding-left:26px;">
    <div style="position:absolute;left:44px;top:10px;bottom:18px;width:2px;background:linear-gradient(to bottom, rgba(6,182,212,0.5), rgba(59,130,246,0.1));"></div>
    <div style="display:flex;flex-direction:column;gap:24px;height:100%;justify-content:center;">${stepsHTML}</div>
  </div>
</section>`;
}

function renderEduTimelineStepsVariantBHTML(data: EduTimelineStepsModel, theme: ThemeConfig): string {
  const subtitleHTML = data.subtitle
    ? `<div style="font-size:24px;color:#94a3b8;font-weight:300;">${data.subtitle}</div>`
    : '';

  const steps = data.steps.slice(0, 4);
  const pct = 100 / steps.length;
  const segments = steps.map((_, i) => {
    const color = i === 0 ? STEP_COLORS[0] : `rgba(${i % 2 === 1 ? '59,130,246' : '16,185,129'},0.3)`;
    return `${color} ${i * pct}%, ${color} ${(i + 1) * pct}%`;
  }).join(', ');
  
  const stepsHTML = steps.map((step, index) => {
    const color = STEP_COLORS[index % STEP_COLORS.length];
    const titleColor = STEP_TITLE_COLORS[index % STEP_TITLE_COLORS.length];
    const isFirst = index === 0;
    const num = String(index + 1).padStart(2, '0');
    
    const highlightsHTML = Array.isArray(step.highlights) && step.highlights.length > 0
      ? `<div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;border-top:1px solid rgba(255,255,255,0.05);padding-top:12px;">${step.highlights.slice(0, 3).map((text) => `<p style="font-size:14px;color:#94a3b8;margin:0;line-height:1.4;text-align:center;">${text}</p>`).join('')}</div>`
      : '';
    const descHTML = step.description
      ? `<p style="font-size:16px;color:${isFirst ? '#e2e8f0' : '#cbd5e1'};margin:0;line-height:1.6;text-align:center;flex-grow:1;">${step.description}</p>`
      : '';

    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
      <div style="width:80px;height:80px;background-color:#0f172a;border:2px solid ${color};border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:32px;color:${color};font-weight:bold;margin-bottom:30px;box-shadow:${isFirst ? `0 0 25px ${color}80` : `0 0 15px ${color}20`};box-sizing:border-box;position:relative;">
        <div style="position:absolute;inset:4px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);display:flex;justify-content:center;align-items:center;">${num}</div>
      </div>
      <div style="width:100%;background:${isFirst ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)'};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);border-top:4px solid ${color};border-radius:20px;padding:24px;box-sizing:border-box;flex-grow:1;display:flex;flex-direction:column;box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
        <h3 style="font-size:22px;color:${titleColor};text-align:center;margin:0 0 16px 0;font-weight:bold;font-family:${theme.fonts.title};">${step.title}</h3>
        ${descHTML}
        ${highlightsHTML}
      </div>
    </div>`;
  }).join('');

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};padding:60px 80px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;font-family:${theme.fonts.body};color:#fff;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(6,182,212,0.3);padding-bottom:20px;margin-bottom:50px;">
    <div style="display:flex;align-items:center;">
      <div style="width:6px;height:40px;background:linear-gradient(to bottom, #06b6d4, #3b82f6);margin-right:20px;border-radius:3px;"></div>
      <h2 style="font-size:42px;color:#f8fafc;margin:0;font-weight:bold;font-family:${theme.fonts.title};letter-spacing:-0.02em;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="position:relative;flex-grow:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="position:absolute;top:40px;left:${100 / (steps.length * 2)}%;right:${100 / (steps.length * 2)}%;height:2px;background-image:linear-gradient(to right, ${segments});z-index:1;"></div>
    <div style="display:flex;justify-content:space-between;position:relative;z-index:2;height:100%;gap:20px;">${stepsHTML}</div>
  </div>
</section>`;
}

export default EduTimelineStepsLayout;
