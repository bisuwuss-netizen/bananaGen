/**
 * 职教专属：要点卡片布局
 * 适用于：小组协作、实训核查点、精密规格清单等
 */

import React from 'react';
import { TitleBulletsModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getSubtitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

// 类型定义直接引用或局部定义
type BulletItem = {
  icon?: string;
  text: string;
  description?: string;
  example?: string;
  note?: string;
  dataPoint?: {
    value: string;
    unit: string;
    source?: string;
  };
};

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const VocationalBulletsLayout: React.FC<{
  model: TitleBulletsModel;
  theme: ThemeConfig;
}> = ({ model, theme }) => {
  const { title, subtitle, bullets, keyTakeaway, background_image } = model;
  const layoutId = (model as any).layoutId || '';

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : {}),
    border: `8px solid ${theme.colors.backgroundAlt}`,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
  };

  const vocationalLabel = layoutId === 'group_collab' ? '👥 小组协作任务' :
                         layoutId === 'quiz_interaction' ? '📝 随堂互动测验' :
                         layoutId === 'requirement_specs' ? '📋 规格需求说明' :
                         layoutId === 'protocol_analysis' ? '🔬 协议分析' :
                         layoutId === 'checklist_verification' ? '✅ 核查点点检' :
                         layoutId === 'org_structure_flow' ? '📂 组织架构' : '📋 职教要点';

  const ktStyle = {
    marginTop: 'auto',
    padding: '16px',
    backgroundColor: `${theme.colors.accent}15`,
    borderRadius: '12px',
    border: `1px dashed ${theme.colors.accent}`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  return (
    <section style={slideStyle}>
      <div style={{
        backgroundColor: theme.colors.primary,
        color: '#fff',
        display: 'inline-block',
        padding: '6px 16px',
        borderRadius: '0 0 12px 0',
        position: 'absolute',
        top: 0,
        left: 0,
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 10,
      }}>
        {vocationalLabel}
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2 style={asStyle(getTitleStyle(theme))}>{title}</h2>
        {subtitle && <p style={asStyle(getSubtitleStyle(theme))}>{subtitle}</p>}
      </div>

      <div style={{
        marginTop: '32px',
        display: 'grid',
        gridTemplateColumns: bullets.length > 4 ? 'repeat(2, 1fr)' : '1fr',
        gap: '20px',
        flex: 1,
      }}>
        {Array.isArray(bullets) && (bullets as BulletItem[]).map((bullet, index) => (
          <div key={index} style={{
            ...asStyle(getCardStyle(theme)),
            padding: '16px',
            borderLeft: `5px solid ${theme.colors.secondary}`,
            backgroundColor: theme.colors.backgroundAlt,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                backgroundColor: theme.colors.primary, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                flexShrink: 0
              }}>{index + 1}</div>
              <strong style={{ color: theme.colors.text, fontSize: '18px' }}>{bullet.text}</strong>
            </div>
            {bullet.description && <p style={{ margin: 0, fontSize: '15px', color: theme.colors.textLight, lineHeight: 1.4 }}>{bullet.description}</p>}
          </div>
        ))}
      </div>

      {keyTakeaway && (
        <div style={asStyle(ktStyle)}>
          <span style={{ fontSize: '24px' }}>📌</span>
          <div>
            <div style={{ fontWeight: 'bold', color: theme.colors.accent, fontSize: '14px' }}>理实一体化要点</div>
            <div style={{ color: theme.colors.text, fontSize: '16px' }}>{keyTakeaway}</div>
          </div>
        </div>
      )}
    </section>
  );
};

export function renderVocationalBulletsLayoutHTML(model: any, theme: ThemeConfig): string {
  const { title, subtitle, bullets, keyTakeaway, background_image } = model;
  const layoutId = model.layoutId || '';

  const vocationalLabel = layoutId === 'group_collab' ? '👥 小组协作任务' :
                         layoutId === 'quiz_interaction' ? '📝 随堂互动测验' :
                         layoutId === 'requirement_specs' ? '📋 规格需求说明' :
                         layoutId === 'protocol_analysis' ? '🔬 协议分析' :
                         layoutId === 'checklist_verification' ? '✅ 核查点点检' :
                         layoutId === 'org_structure_flow' ? '📂 组织架构' : '📋 职教要点';

  const slideStyle = toInlineStyle({
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    border: `8px solid ${theme.colors.backgroundAlt}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
  });

  const bulletsHTML = (bullets as BulletItem[]).map((bullet, index) => {
    return `
    <div style="background: ${theme.colors.backgroundAlt}; padding: 16px; border-left: 5px solid ${theme.colors.secondary}; border-radius: 8px; display: flex; flex-direction: column; justify-content: center;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${theme.colors.primary}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">${index + 1}</div>
        <strong style="color: ${theme.colors.text}; font-size: 18px;">${bullet.text}</strong>
      </div>
      ${bullet.description ? `<p style="margin: 0; font-size: 15px; color: ${theme.colors.textLight}; line-height: 1.4;">${bullet.description}</p>` : ''}
    </div>`;
  }).join('\n');

  const ktHTML = keyTakeaway ? `
    <div style="margin-top: auto; padding: 16px; background: ${theme.colors.accent}15; border-radius: 12px; border: 1px dashed ${theme.colors.accent}; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">📌</span>
      <div>
        <div style="font-weight: bold; color: ${theme.colors.accent}; font-size: 14px;">理实一体化要点</div>
        <div style="color: ${theme.colors.text}; font-size: 16px;">${keyTakeaway}</div>
      </div>
    </div>` : '';

  return `
<section style="${slideStyle}">
  <div style="background: ${theme.colors.primary}; color: #fff; display: inline-block; padding: 6px 16px; border-radius: 0 0 12px 0; position: absolute; top: 0; left: 0; font-size: 14px; font-weight: bold; z-index: 10;">${vocationalLabel}</div>
  <div style="margin-top: 40px;">
    <h2 style="${toInlineStyle(getTitleStyle(theme))}">${title}</h2>
    ${subtitle ? `<p style="${toInlineStyle(getSubtitleStyle(theme))}">${subtitle}</p>` : ''}
  </div>
  <div style="margin-top: 32px; display: grid; grid-template-columns: ${bullets.length > 4 ? 'repeat(2, 1fr)' : '1fr'}; gap: 20px; flex: 1;">
    ${bulletsHTML}
  </div>
  ${ktHTML}
</section>`;
}
