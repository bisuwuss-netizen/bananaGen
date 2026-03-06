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
      .map((item) => ({
        title: String(item.title || '').trim(),
        description: String(item.description || '').trim(),
      }))
      .filter((item) => item.title || item.description)
    : [];

  const fromSteps = Array.isArray(input.steps)
    ? input.steps
      .map((item) => ({
        title: String(item.title || item.label || '').trim(),
        description: String(item.description || '').trim(),
      }))
      .filter((item) => item.title || item.description)
    : [];

  const fromBullets = Array.isArray(input.bullets)
    ? input.bullets
      .map((item) => {
        if (typeof item === 'string') {
          return { title: item.trim(), description: '围绕目标拆解动作和结果。' };
        }
        return {
          title: String(item?.text || '').trim(),
          description: String(item?.description || '').trim(),
        };
      })
      .filter((item) => item.title || item.description)
    : [];

  const stages = (fromStages.length > 0 ? fromStages : (fromSteps.length > 0 ? fromSteps : fromBullets)).slice(0, 3);

  return {
    title: String(input.title || '').trim() || '三位一体教学演进',
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

export const EduLogicFlowLayout: React.FC<EduLogicFlowLayoutProps> = ({ model, theme }) => {
  const variant = String((model as any).variant || 'a').toLowerCase();
  const data = normalizeModel(model);

  if (variant === 'b') {
    return <EduLogicFlowVariantB data={data} theme={theme} />;
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
      ? `linear-gradient(rgba(8,14,32,0.88), rgba(8,14,32,0.9)), url(${data.background_image}) center/cover no-repeat`
      : 'linear-gradient(135deg, #0f172a 0%, #0b1120 100%)',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        borderBottom: '2px solid rgba(6,182,212,0.32)',
        paddingBottom: 18,
        marginBottom: 44,
      }}>
        <div style={{ width: 8, height: 40, borderRadius: 4, marginRight: 18, background: '#06b6d4' }} />
        <h2 style={{ margin: 0, color: '#ffffff', fontSize: 42, fontFamily: theme.fonts.title }}>{data.title}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, height: 'calc(100% - 120px)' }}>
        {data.stages.slice(0, 3).map((stage, index) => {
          const highlight = index === 1;
          return (
            <React.Fragment key={index}>
              <div style={{
                width: '31%',
                height: 380,
                borderRadius: 20,
                boxSizing: 'border-box',
                padding: '34px 26px',
                border: highlight ? '1px solid rgba(6,182,212,0.45)' : '1px solid rgba(148,163,184,0.24)',
                background: highlight
                  ? 'linear-gradient(to bottom, rgba(6,182,212,0.24), rgba(30,41,59,0.64))'
                  : 'rgba(30,41,59,0.62)',
                boxShadow: highlight ? '0 0 28px rgba(6,182,212,0.12)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  border: highlight ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.15)',
                  background: highlight ? 'rgba(6,182,212,0.16)' : 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  marginBottom: 18,
                }}>
                  {ICONS[index]}
                </div>

                <h3 style={{ margin: '0 0 16px 0', color: highlight ? '#67e8f9' : '#ffffff', fontSize: 28, textAlign: 'center', fontFamily: theme.fonts.title }}>
                  {stage.title}
                </h3>

                <div style={{ width: 42, height: 3, marginBottom: 16, background: highlight ? '#06b6d4' : '#94a3b8' }} />

                <p style={{ margin: 0, color: highlight ? '#e2e8f0' : '#cbd5e1', fontSize: 20, lineHeight: 1.55, textAlign: 'center' }}>
                  {stage.description}
                </p>
              </div>

              {index < 2 && (
                <div style={{ color: index === 0 ? '#06b6d4' : '#3b82f6', fontSize: 58, textShadow: '0 0 18px rgba(6,182,212,0.6)' }}>
                  ➔
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

const FLOW_COLORS = ['#06b6d4', '#3b82f6', '#10b981'];

const EduLogicFlowVariantB: React.FC<{ data: EduLogicFlowModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const stages = data.stages.slice(0, 3);
  const slideStyle: React.CSSProperties = {
    width: 1280, height: 720, padding: '56px 76px', boxSizing: 'border-box',
    position: 'relative', overflow: 'hidden', fontFamily: theme.fonts.body,
    background: data.background_image
      ? `linear-gradient(rgba(8,14,32,0.88), rgba(8,14,32,0.9)), url(${data.background_image}) center/cover no-repeat`
      : 'linear-gradient(135deg, #0f172a 0%, #0b1120 100%)',
  };
  return (
    <section style={slideStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '2px solid rgba(6,182,212,0.32)', paddingBottom: 18, marginBottom: 44 }}>
        <div style={{ width: 8, height: 40, borderRadius: 4, marginRight: 18, background: '#06b6d4' }} />
        <h2 style={{ margin: 0, color: '#ffffff', fontSize: 42, fontFamily: theme.fonts.title }}>{data.title}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100% - 120px)', justifyContent: 'center' }}>
        {stages.map((stage, index) => (
          <div key={index} style={{
            display: 'flex', alignItems: 'center', gap: 20,
            padding: '20px 28px', borderRadius: 16,
            border: `1px solid ${FLOW_COLORS[index]}55`,
            background: `linear-gradient(90deg, ${FLOW_COLORS[index]}22, rgba(0,0,0,0))`,
            marginLeft: index * 60,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: `linear-gradient(135deg, ${FLOW_COLORS[index]}, ${FLOW_COLORS[index]}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, flexShrink: 0,
            }}>{ICONS[index]}</div>
            <div>
              <h3 style={{ margin: 0, color: FLOW_COLORS[index], fontSize: 26, fontFamily: theme.fonts.title }}>{stage.title}</h3>
              <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: 18, lineHeight: 1.5 }}>{stage.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export function renderEduLogicFlowLayoutHTML(model: EduLogicFlowModel, theme: ThemeConfig): string {
  const variant = String((model as any).variant || 'a').toLowerCase();
  const data = normalizeModel(model as LooseEduLogicFlowModel);
  if (variant === 'b') {
    return renderEduLogicFlowVariantBHTML(data, theme);
  }
  const background = data.background_image
    ? `linear-gradient(rgba(8,14,32,0.88), rgba(8,14,32,0.9)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(135deg, #0f172a 0%, #0b1120 100%)';

  const stagesHTML = data.stages.slice(0, 3).map((stage, index) => {
    const highlight = index === 1;
    const card = `<div style="width:31%;height:380px;border-radius:20px;box-sizing:border-box;padding:34px 26px;border:${highlight ? '1px solid rgba(6,182,212,0.45)' : '1px solid rgba(148,163,184,0.24)'};background:${highlight ? 'linear-gradient(to bottom, rgba(6,182,212,0.24), rgba(30,41,59,0.64))' : 'rgba(30,41,59,0.62)'};box-shadow:${highlight ? '0 0 28px rgba(6,182,212,0.12)' : 'none'};display:flex;flex-direction:column;align-items:center;">
      <div style="width:80px;height:80px;border-radius:50%;border:${highlight ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.15)'};background:${highlight ? 'rgba(6,182,212,0.16)' : 'rgba(255,255,255,0.05)'};display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:18px;">${ICONS[index]}</div>
      <h3 style="margin:0 0 16px 0;color:${highlight ? '#67e8f9' : '#ffffff'};font-size:28px;text-align:center;font-family:${theme.fonts.title};">${stage.title}</h3>
      <div style="width:42px;height:3px;margin-bottom:16px;background:${highlight ? '#06b6d4' : '#94a3b8'};"></div>
      <p style="margin:0;color:${highlight ? '#e2e8f0' : '#cbd5e1'};font-size:20px;line-height:1.55;text-align:center;">${stage.description}</p>
    </div>`;

    if (index < 2) {
      const arrow = `<div style="color:${index === 0 ? '#06b6d4' : '#3b82f6'};font-size:58px;text-shadow:0 0 18px rgba(6,182,212,0.6);">➔</div>`;
      return `${card}${arrow}`;
    }
    return card;
  }).join('');

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.32);padding-bottom:18px;margin-bottom:44px;">
    <div style="width:8px;height:40px;border-radius:4px;margin-right:18px;background:#06b6d4;"></div>
    <h2 style="margin:0;color:#ffffff;font-size:42px;font-family:${theme.fonts.title};">${data.title}</h2>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;height:calc(100% - 120px);">${stagesHTML}</div>
</section>`;
}

function renderEduLogicFlowVariantBHTML(data: EduLogicFlowModel, theme: ThemeConfig): string {
  const background = data.background_image
    ? `linear-gradient(rgba(8,14,32,0.88), rgba(8,14,32,0.9)), url(${data.background_image}) center/cover no-repeat`
    : 'linear-gradient(135deg, #0f172a 0%, #0b1120 100%)';
  const stagesHTML = data.stages.slice(0, 3).map((stage, i) => {
    const c = FLOW_COLORS[i];
    return `<div style="display:flex;align-items:center;gap:20px;padding:20px 28px;border-radius:16px;border:1px solid ${c}55;background:linear-gradient(90deg,${c}22,rgba(0,0,0,0));margin-left:${i * 60}px;">
      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${c},${c}88);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">${ICONS[i]}</div>
      <div>
        <h3 style="margin:0;color:${c};font-size:26px;font-family:${theme.fonts.title};">${stage.title}</h3>
        <p style="margin:6px 0 0;color:#cbd5e1;font-size:18px;line-height:1.5;">${stage.description}</p>
      </div>
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.32);padding-bottom:18px;margin-bottom:44px;">
    <div style="width:8px;height:40px;border-radius:4px;margin-right:18px;background:#06b6d4;"></div>
    <h2 style="margin:0;color:#ffffff;font-size:42px;font-family:${theme.fonts.title};">${data.title}</h2>
  </div>
  <div style="display:flex;flex-direction:column;gap:20px;height:calc(100% - 120px);justify-content:center;">${stagesHTML}</div>
</section>`;
}

export default EduLogicFlowLayout;
