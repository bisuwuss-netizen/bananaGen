import React from 'react';
import { EduLogicFlowModel, ThemeConfig } from '../types/schema';

interface EduLogicFlowLayoutProps {
  model: EduLogicFlowModel;
  theme: ThemeConfig;
}

type LooseEduLogicFlowModel = Partial<EduLogicFlowModel> & {
  steps?: Array<{ label?: string; title?: string; description?: string }>;
  bullets?: Array<{ text?: string; description?: string } | string>;
};

function normalizeModel(input: LooseEduLogicFlowModel): EduLogicFlowModel {
  const fromStages = Array.isArray(input.stages)
    ? input.stages
      .map((item) => ({ title: String(item.title || '').trim(), description: String(item.description || '').trim() }))
      .filter((item) => item.title || item.description)
    : [];

  const fromSteps = Array.isArray(input.steps)
    ? input.steps
      .map((item) => ({ title: String(item.title || item.label || '').trim(), description: String(item.description || '').trim() }))
      .filter((item) => item.title || item.description)
    : [];

  const fromBullets = Array.isArray(input.bullets)
    ? input.bullets
      .map((item) => {
        if (typeof item === 'string') return { title: item.trim(), description: '围绕目标拆解动作和结果。' };
        return { title: String(item?.text || '').trim(), description: String(item?.description || '').trim() };
      })
      .filter((item) => item.title || item.description)
    : [];

  const stages = (fromStages.length > 0 ? fromStages : (fromSteps.length > 0 ? fromSteps : fromBullets)).slice(0, 4);

  return {
    title: String(input.title || '').trim() || '三位一体教学演进',
    variant: input.variant,
    stages: stages.length > 0
      ? stages
      : [
        { title: '课前：智能导学', description: '生成个性化预习清单并提前暴露知识薄弱点。' },
        { title: '课中：深度探究', description: '教师结合反馈动态调整课堂重心，数字助教分担基础答疑。' },
        { title: '课后：精准测评', description: '多模态数据汇总形成能力画像并推送巩固任务。' },
      ],
    background_image: input.background_image,
  };
}

const ICONS = ['📚', '💡', '📈'];
const NODE_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b'];
const TITLE_COLORS = ['#67e8f9', '#93c5fd', '#6ee7b7', '#fcd34d'];

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

/* ==================== Variant A (原版：横向三卡片) ==================== */

export const EduLogicFlowLayout: React.FC<EduLogicFlowLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();
  const glass = glassStyle(theme);

  if (variant === 'b') {
    return <EduLogicFlowVariantB data={data} theme={theme} />;
  }

  const slideStyle: React.CSSProperties = {
    width: 1280, height: 720,
    padding: '56px 76px', boxSizing: 'border-box',
    position: 'relative', overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: deepSpaceBg(theme, data.background_image),
    color: '#ffffff',
  };

  return (
    <section style={slideStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid rgba(6,182,212,0.3)', paddingBottom: 24, marginBottom: 44 }}>
        <div style={{ width: 6, height: 40, borderRadius: 3, marginRight: 20, background: 'linear-gradient(to bottom, #06b6d4, #3b82f6)' }} />
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 42, fontFamily: theme.fonts.title, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{data.title}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, height: 'calc(100% - 130px)' }}>
        {data.stages.slice(0, 3).map((stage, index) => {
          const highlight = index === 1;
          const color = NODE_COLORS[index % NODE_COLORS.length];
          const titleColor = TITLE_COLORS[index % TITLE_COLORS.length];
          
          return (
            <React.Fragment key={index}>
              <div style={{
                ...glass,
                width: '30%', 
                height: 400, 
                borderRadius: 24, 
                boxSizing: 'border-box', 
                padding: '40px 30px',
                borderTop: `4px solid ${color}`,
                background: highlight ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transition: 'transform 0.3s ease',
              }}>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  border: `2px solid ${color}`,
                  background: 'rgba(15,23,42,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 24,
                  boxShadow: `0 0 20px ${color}40`,
                  position: 'relative',
                }}>
                    <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
                    {ICONS[index]}
                </div>
                
                <h3 style={{ margin: '0 0 20px 0', color: titleColor, fontSize: 28, textAlign: 'center', fontFamily: theme.fonts.title, fontWeight: 700 }}>
                    {stage.title}
                </h3>
                
                <div style={{ width: 40, height: 4, marginBottom: 24, background: `linear-gradient(to right, ${color}, transparent)`, borderRadius: 2 }} />
                
                <p style={{ margin: 0, color: highlight ? '#e2e8f0' : '#cbd5e1', fontSize: 18, lineHeight: 1.6, textAlign: 'center' }}>
                    {stage.description}
                </p>
              </div>
              
              {index < 2 && (
                <div style={{ 
                    color: 'rgba(6,182,212,0.5)', 
                    fontSize: 40, 
                    fontWeight: 100,
                    textShadow: '0 0 10px rgba(6,182,212,0.5)',
                    transform: 'scaleX(1.5)'
                }}>
                    →
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

/* ==================== Variant B (蛇形交错时间轴) ==================== */

const EduLogicFlowVariantB: React.FC<{ data: EduLogicFlowModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const stages = data.stages.slice(0, 4);
  const glass = glassStyle(theme);

  return (
    <section style={{
      width: 1280, height: 720, flexShrink: 0,
      background: deepSpaceBg(theme, data.background_image),
      padding: '60px 80px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: theme.fonts.body,
      color: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(6,182,212,0.3)', paddingBottom: 20, marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 6, height: 40, background: 'linear-gradient(to bottom, #06b6d4, #3b82f6)', marginRight: 20, borderRadius: 3 }} />
          <h2 style={{ fontSize: 42, color: '#f8fafc', margin: 0, fontWeight: 'bold', fontFamily: theme.fonts.title, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{data.title}</h2>
        </div>
      </div>

      <div style={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* 中心纵向穿透轴 */}
        <div style={{
          position: 'absolute', left: '50%', top: 20, bottom: 20, width: 2,
          backgroundImage: `linear-gradient(to bottom, ${NODE_COLORS.slice(0, stages.length).join(', ')})`,
          transform: 'translateX(-50%)', zIndex: 1,
          opacity: 0.5,
        }} />

        {stages.map((stage, i) => {
          const isLeft = i % 2 === 0;
          const color = NODE_COLORS[i % NODE_COLORS.length];
          const titleColor = TITLE_COLORS[i % TITLE_COLORS.length];

          return (
            <div key={i} style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 2, marginBottom: i < stages.length - 1 ? 0 : 0 }}>
              {isLeft ? (
                <>
                  <div style={{ width: '50%', paddingRight: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                    <div style={{
                        ...glass,
                        padding: '20px 24px',
                        borderRadius: 16,
                        borderRight: `4px solid ${color}`,
                        textAlign: 'right',
                        width: '80%',
                    }}>
                        <h3 style={{ fontSize: 24, color: titleColor, margin: '0 0 10px 0', fontWeight: 'bold', fontFamily: theme.fonts.title }}>{stage.title}</h3>
                        <p style={{ fontSize: 16, color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>{stage.description}</p>
                    </div>
                  </div>
                  <div style={{
                    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                    width: 24, height: 24, backgroundColor: '#0f172a',
                    border: `2px solid ${color}`, borderRadius: '50%', boxShadow: `0 0 15px ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  </div>
                  <div style={{ width: '50%' }} />
                </>
              ) : (
                <>
                  <div style={{ width: '50%' }} />
                  <div style={{
                    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                    width: 24, height: 24, backgroundColor: '#0f172a',
                    border: `2px solid ${color}`, borderRadius: '50%', boxShadow: `0 0 15px ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  </div>
                  <div style={{ width: '50%', paddingLeft: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
                    <div style={{
                        ...glass,
                        padding: '20px 24px',
                        borderRadius: 16,
                        borderLeft: `4px solid ${color}`,
                        textAlign: 'left',
                        width: '80%',
                    }}>
                      <h3 style={{ fontSize: 24, color: titleColor, margin: '0 0 10px 0', fontWeight: 'bold', fontFamily: theme.fonts.title }}>{stage.title}</h3>
                      <p style={{ fontSize: 16, color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>{stage.description}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/* ==================== HTML Rendering ==================== */

export function renderEduLogicFlowLayoutHTML(model: EduLogicFlowModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduLogicFlowModel);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEduLogicFlowVariantBHTML(data, theme);
  }

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const stagesHTML = data.stages.slice(0, 3).map((stage, index) => {
    const highlight = index === 1;
    const color = NODE_COLORS[index % NODE_COLORS.length];
    const titleColor = TITLE_COLORS[index % TITLE_COLORS.length];
    
    const card = `<div style="width:30%;height:400px;border-radius:24px;box-sizing:border-box;padding:40px 30px;border-top:4px solid ${color};background:${highlight ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)'};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);border-top:4px solid ${color};box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);display:flex;flex-direction:column;align-items:center;">
      <div style="width:90px;height:90px;border-radius:50%;border:2px solid ${color};background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;font-size:40px;margin-bottom:24px;box-shadow:0 0 20px ${color}40;position:relative;">
        <div style="position:absolute;inset:4px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);"></div>
        ${ICONS[index]}
      </div>
      <h3 style="margin:0 0 20px 0;color:${titleColor};font-size:28px;text-align:center;font-family:${theme.fonts.title};font-weight:700;">${stage.title}</h3>
      <div style="width:40px;height:4px;margin-bottom:24px;background:linear-gradient(to right, ${color}, transparent);border-radius:2px;"></div>
      <p style="margin:0;color:${highlight ? '#e2e8f0' : '#cbd5e1'};font-size:18px;line-height:1.6;text-align:center;">${stage.description}</p>
    </div>`;
    
    if (index < 2) {
      return `${card}<div style="color:rgba(6,182,212,0.5);font-size:40px;font-weight:100;text-shadow:0 0 10px rgba(6,182,212,0.5);transform:scaleX(1.5);">→</div>`;
    }
    return card;
  }).join('');

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};color:#ffffff;">
  <div style="display:flex;align-items:flex-end;border-bottom:1px solid rgba(6,182,212,0.3);padding-bottom:24px;margin-bottom:44px;">
    <div style="width:6px;height:40px;border-radius:3px;margin-right:20px;background:linear-gradient(to bottom, #06b6d4, #3b82f6);"></div>
    <h2 style="margin:0;color:#f8fafc;font-size:42px;font-family:${theme.fonts.title};letter-spacing:-0.02em;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${data.title}</h2>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;height:calc(100% - 130px);">${stagesHTML}</div>
</section>`;
}

function renderEduLogicFlowVariantBHTML(data: EduLogicFlowModel, theme: ThemeConfig): string {
  const stages = data.stages.slice(0, 4);
  const gradientColors = NODE_COLORS.slice(0, stages.length).join(', ');

  const nodesHTML = stages.map((stage, i) => {
    const isLeft = i % 2 === 0;
    const color = NODE_COLORS[i % NODE_COLORS.length];
    const titleColor = TITLE_COLORS[i % TITLE_COLORS.length];
    const dot = `<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:24px;height:24px;background-color:#0f172a;border:2px solid ${color};border-radius:50%;box-shadow:0 0 15px ${color};display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:${color};"></div></div>`;
    
    const cardStyle = `padding:20px 24px;border-radius:16px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);width:80%;`;

    if (isLeft) {
      return `<div style="display:flex;width:100%;position:relative;z-index:2;margin-bottom:0;">
        <div style="width:50%;padding-right:60px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;">
          <div style="${cardStyle}border-right:4px solid ${color};text-align:right;">
            <h3 style="font-size:24px;color:${titleColor};margin:0 0 10px 0;font-weight:bold;font-family:${theme.fonts.title};">${stage.title}</h3>
            <p style="font-size:16px;color:#cbd5e1;margin:0;line-height:1.6;">${stage.description}</p>
          </div>
        </div>
        ${dot}
        <div style="width:50%;"></div>
      </div>`;
    } else {
      return `<div style="display:flex;width:100%;position:relative;z-index:2;margin-bottom:0;">
        <div style="width:50%;"></div>
        ${dot}
        <div style="width:50%;padding-left:60px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;">
          <div style="${cardStyle}border-left:4px solid ${color};text-align:left;">
            <h3 style="font-size:24px;color:${titleColor};margin:0 0 10px 0;font-weight:bold;font-family:${theme.fonts.title};">${stage.title}</h3>
            <p style="font-size:16px;color:#cbd5e1;margin:0;line-height:1.6;">${stage.description}</p>
          </div>
        </div>
      </div>`;
    }
  }).join('');

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};padding:60px 80px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;font-family:${theme.fonts.body};color:#fff;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(6,182,212,0.3);padding-bottom:20px;margin-bottom:30px;">
    <div style="display:flex;align-items:center;">
      <div style="width:6px;height:40px;background:linear-gradient(to bottom, #06b6d4, #3b82f6);margin-right:20px;border-radius:3px;"></div>
      <h2 style="font-size:42px;color:#f8fafc;margin:0;font-weight:bold;font-family:${theme.fonts.title};letter-spacing:-0.02em;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${data.title}</h2>
    </div>
  </div>
  <div style="flex-grow:1;position:relative;display:flex;flex-direction:column;justify-content:center;">
    <div style="position:absolute;left:50%;top:20px;bottom:20px;width:2px;background-image:linear-gradient(to bottom, ${gradientColors});transform:translateX(-50%);z-index:1;opacity:0.5;"></div>
    ${nodesHTML}
  </div>
</section>`;
}

export default EduLogicFlowLayout;
