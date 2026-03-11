/**
 * 职教专属：正文详情布局
 * 适用于：法律法规引用、实训工单指令、技术原理拆解
 */

import React from 'react';
import { TitleContentModel, ThemeConfig } from '../../types/schema';
import { ImageSlotFrame } from '../../components/ImageSlotFrame';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getBodyStyle,
} from '../../utils/styleHelper';

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const VocationalContentLayout: React.FC<{
  model: TitleContentModel;
  theme: ThemeConfig;
  onImageUpload?: () => void;
}> = ({ model, theme, onImageUpload }) => {
  const { title, content, highlight, image, background_image } = model;
  const layoutId = (model as any).layoutId || '';

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : {}),
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
    position: 'relative'
  };

  const vocationalLabel = layoutId === 'legal_regulation' ? '📜 法律法规引用' :
                         layoutId === 'task_instruction' ? '📑 实训工单指令' :
                         layoutId === 'tech_principle' ? '⚙️ 技术原理深度解析' :
                         layoutId === 'case_discussion' ? '🔍 典型案例研讨' :
                         layoutId === 'feedback_poll' ? '💬 即时反馈讨论' :
                         layoutId === 'arch_blocks' ? '🏗️ 系统架构组成' :
                         layoutId === 'detail_specs' ? '📐 零件规格参数' : '📋 专业实务讲授';

  const contentArray = Array.isArray(content) ? content : [content];
  const hasImage = image && (image.src || image.src === '');

  return (
    <section style={slideStyle}>
      <div style={{
        position: 'absolute', top: 0, right: '40px',
        width: '120px', height: '140px',
        backgroundColor: theme.colors.primary,
        opacity: 0.1, borderRadius: '0 0 20px 20px', zIndex: 0
      }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: theme.colors.primary, fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '8px' }}>
          {vocationalLabel}
        </div>
        <h2 style={{ ...asStyle(getTitleStyle(theme)), color: theme.colors.text, fontSize: '36px', borderBottom: `2px solid ${theme.colors.secondary}`, display: 'inline-block', paddingBottom: '8px' }}>
          {title}
        </h2>
      </div>

      <div style={{
        marginTop: '30px', flex: 1, display: 'flex', gap: '30px',
        backgroundColor: '#fff', padding: '24px', borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: `1px solid ${theme.colors.backgroundAlt}`
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {contentArray.map((p, i) => (
            <p key={i} style={{ ...asStyle(getBodyStyle(theme)), fontSize: '18px', color: theme.colors.text, marginBottom: '20px', lineHeight: 1.6 }}>
              {p}
            </p>
          ))}
          {highlight && (
            <div style={{
              marginTop: '20px', padding: '15px', backgroundColor: theme.colors.backgroundAlt,
              borderLeft: `4px solid ${theme.colors.accent}`, color: theme.colors.text, fontStyle: 'italic'
            }}>
              “{highlight}”
            </div>
        )}
      </div>
      {hasImage && (
        <div style={{ width: '40%', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: `4px solid ${theme.colors.backgroundAlt}`, display: 'flex', alignItems: 'stretch' }}>
          <ImageSlotFrame
            src={image.src}
            alt=""
            theme={theme}
            slotLabel="实务配图插槽"
            slotHint="建议放置法规截图、设备结构图或操作现场图。"
            onClick={onImageUpload}
            frameStyle={{ width: '100%', minHeight: '320px' }}
            imageStyle={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: theme.colors.textLight, display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.colors.backgroundAlt}`, paddingTop: '10px' }}>
        <span>高等职业教育 - 专业技能实务系列</span>
        <span></span>
      </div>
    </section>
  );
};

export function renderVocationalContentLayoutHTML(model: any, theme: ThemeConfig): string {
  const { title, content, highlight, image, background_image } = model;
  const layoutId = model.layoutId || '';

  const vocationalLabel = layoutId === 'legal_regulation' ? '📜 法律法规引用' :
                         layoutId === 'task_instruction' ? '📑 实训工单指令' :
                         layoutId === 'tech_principle' ? '⚙️ 技术原理深度解析' :
                         layoutId === 'case_discussion' ? '🔍 典型案例研讨' :
                         layoutId === 'feedback_poll' ? '💬 即时反馈讨论' :
                         layoutId === 'arch_blocks' ? '🏗️ 系统架构组成' :
                         layoutId === 'detail_specs' ? '📐 零件规格参数' : '📋 专业实务讲授';

  const contentArray = Array.isArray(content) ? content : [content];
  const hasImage = image && image.src;

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: theme.fonts.body,
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : {})
  });

  const paragraphsHTML = contentArray.map(p => `<p style="font-size: 18px; color: ${theme.colors.text}; margin-bottom: 20px; line-height: 1.6;">${p}</p>`).join('');

  const imageHTML = hasImage ? `<div style="width: 40%; flex-shrink: 0; border-radius: 8px; overflow: hidden; border: 4px solid ${theme.colors.backgroundAlt};"><img src="${image.src}" style="width: 100%; height: 100%; object-fit: contain;" /></div>` : '';

  return `
<section style="${slideStyle}">
  <div style="position: absolute; top: 0; right: 40px; width: 120px; height: 140px; background-color: ${theme.colors.primary}; opacity: 0.1; border-radius: 0 0 20px 20px; z-index: 0;"></div>
  <div style="position: relative; z-index: 1;">
    <div style="color: ${theme.colors.primary}; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin-bottom: 8px;">${vocationalLabel}</div>
    <h2 style="font-size: 36px; font-weight: bold; color: ${theme.colors.text}; border-bottom: 2px solid ${theme.colors.secondary}; display: inline-block; padding-bottom: 8px; margin: 0;">${title}</h2>
  </div>
  <div style="margin-top: 30px; flex: 1; display: flex; gap: 30px; background: #fff; padding: 24px; border-radius: 12px; border: 1px solid ${theme.colors.backgroundAlt}; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    <div style="flex: 1;">
      ${paragraphsHTML}
      ${highlight ? `<div style="margin-top: 20px; padding: 15px; background: ${theme.colors.backgroundAlt}; border-left: 4px solid ${theme.colors.accent}; color: ${theme.colors.text}; font-style: italic;">“${highlight}”</div>` : ''}
    </div>
    ${imageHTML}
  </div>
  <div style="margin-top: 20px; font-size: 12px; color: ${theme.colors.textLight}; display: flex; justify-content: space-between; border-top: 1px solid ${theme.colors.backgroundAlt}; padding-top: 10px;">
    <span>高等职业教育 - 专业技能实务系列</span>
    <span></span>
  </div>
</section>`;
}
