/**
 * 职教专属：对照比较布局
 * 适用于：故障排除对照、修缮前后对比、设备结构认知
 */

import React from 'react';
import { TwoColumnModel, ColumnContent, ThemeConfig } from '../../types/schema';
import { ImageSlotFrame } from '../../components/ImageSlotFrame';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
} from '../../utils/styleHelper';

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

function resolveColumnType(content: ColumnContent): 'text' | 'image' | 'bullets' {
  if (content.type) return content.type;
  if (content.bullets && content.bullets.length > 0) return 'bullets';
  if (content.image_src) return 'image';
  return 'text';
}

function normalizeContentLines(content: ColumnContent['content']): string[] {
  const raw = Array.isArray(content) ? content : [content || ''];
  return raw
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

const ColumnRenderer: React.FC<{
  content: ColumnContent;
  theme: ThemeConfig;
  onImageUpload?: () => void;
}> = ({
  content,
  theme,
  onImageUpload,
}) => {
    const resolvedType = resolveColumnType(content);
    const contentArray = normalizeContentLines(content.content);

    const headerStyle = { fontSize: '24px', fontWeight: '600', color: theme.colors.secondary, margin: '0', marginBottom: '16px' };
    const textStyle = { fontSize: theme.sizes.bodySize, color: theme.colors.text, lineHeight: '1.8', margin: '0' };

    if (resolvedType === 'image') {
      return (
        <>
          {content.header && <h3 style={asStyle(headerStyle)}>{content.header}</h3>}
          <ImageSlotFrame
            src={content.image_src}
            alt=""
            theme={theme}
            slotLabel={content.header ? `${content.header} 对照插槽` : '对照图片插槽'}
            slotHint="建议放置前后对照图、故障对比图或左右案例图。"
            onClick={onImageUpload}
            frameStyle={{ width: '100%', height: '100%', minHeight: '320px' }}
            imageStyle={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </>
      );
    }

    if (resolvedType === 'bullets' && content.bullets) {
        return (
          <>
            {content.header && <h3 style={asStyle(headerStyle)}>{content.header}</h3>}
            {content.bullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '12px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: theme.colors.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginTop: '2px', flexShrink: 0 }}>
                        <i className={b.icon?.startsWith('fa') ? b.icon : `fa ${b.icon || 'fa-check'}`} />
                    </div>
                    <div>
                        <p style={asStyle(textStyle)}>{b.text}</p>
                        {b.description && <p style={{ fontSize: '14px', color: theme.colors.textLight, margin: 0 }}>{b.description}</p>}
                    </div>
                </div>
            ))}
          </>
        );
    }

    return (
      <>
        {content.header && <h3 style={asStyle(headerStyle)}>{content.header}</h3>}
        {contentArray.map((text, index) => <p key={index} style={{ ...asStyle(textStyle), marginTop: index > 0 ? '16px' : '0' }}>{text}</p>)}
      </>
    );
};

export const VocationalComparisonLayout: React.FC<{
    model: TwoColumnModel;
    theme: ThemeConfig;
    onImageUpload?: (slotPath: string) => void;
}> = ({ model, theme, onImageUpload }) => {
  const { title, left, right, background_image } = model;
  const layoutId = (model as any).layoutId || '';

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : {}),
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
  };

  const vocationalLabel = layoutId === 'comparison_matrix' ? '📊 标准/规范横向对比' :
                         layoutId === 'common_faults' ? '🔧 故障排除对照手册' :
                         layoutId === 'case_before_after' ? '📸 修缮/治理前后对比' :
                         layoutId === 'equipment_orientation' ? '⚙️ 设备结构与功能认知' : '⚖️ 行业对标分析';

  return (
    <section style={slideStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px solid ${theme.colors.primary}`, paddingBottom: '12px' }}>
        <div>
          <div style={{ color: theme.colors.primary, fontSize: '12px', fontWeight: 'bold' }}>Professional Comparison</div>
          <h2 style={{ ...asStyle(getTitleStyle(theme)), margin: 0, fontSize: '32px' }}>{title}</h2>
        </div>
        <div style={{ color: theme.colors.textLight, fontSize: '14px', fontWeight: 'bold' }}>{vocationalLabel}</div>
      </div>

      <div style={{ marginTop: '30px', flex: 1, display: 'flex', gap: '2px', backgroundColor: theme.colors.backgroundAlt, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${theme.colors.backgroundAlt}` }}>
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <ColumnRenderer content={left} theme={theme} onImageUpload={() => onImageUpload?.('left.image_src')} />
        </div>
        <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.backgroundAlt, color: theme.colors.primary, fontWeight: 'bold' }}>VS</div>
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <ColumnRenderer content={right} theme={theme} onImageUpload={() => onImageUpload?.('right.image_src')} />
        </div>
      </div>
    </section>
  );
};

export function renderVocationalComparisonLayoutHTML(model: any, theme: ThemeConfig): string {
  const { title, left, right, background_image } = model;
  const layoutId = model.layoutId || '';
  const vocationalLabel = layoutId === 'comparison_matrix' ? '📊 标准/规范横向对比' :
                         layoutId === 'common_faults' ? '🔧 故障排除对照手册' :
                         layoutId === 'case_before_after' ? '📸 修缮/治理前后对比' :
                         layoutId === 'equipment_orientation' ? '⚙️ 设备结构与功能认知' : '⚖️ 行业对标分析';

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`, height: `${theme.sizes.slideHeight}px`,
    position: 'relative', overflow: 'hidden', backgroundColor: theme.colors.background,
    boxSizing: 'border-box', padding: theme.spacing.padding, display: 'flex',
    flexDirection: 'column', fontFamily: theme.fonts.body,
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : {})
  });

  function renderColHTML(content: ColumnContent): string {
    const type = resolveColumnType(content);
    const textStyle = `font-size: ${theme.sizes.bodySize}; color: ${theme.colors.text}; line-height: 1.8; margin: 0;`;
    let html = content.header ? `<h3 style="font-size: 24px; font-weight: 600; color: ${theme.colors.secondary}; margin-bottom: 16px;">${content.header}</h3>` : '';
    if (type === 'image' && content.image_src) {
        html += `<div style="width:100%; height:320px; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center;"><img src="${content.image_src}" style="width:100%; height:100%; object-fit:contain;" /></div>`;
    } else if (type === 'bullets' && content.bullets) {
        content.bullets.forEach(b => {
            html += `<div style="display:flex; align-items:flex-start; gap:12px; margin-top:12px;">
                <div style="width:24px; height:24px; border-radius:50%; background:${theme.colors.accent}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; margin-top:2px; flex-shrink:0;"><i class="fa ${b.icon || 'fa-check'}"></i></div>
                <div><p style="${textStyle}">${b.text}</p>${b.description ? `<p style="font-size:14px; color:${theme.colors.textLight}; margin:0;">${b.description}</p>` : ''}</div>
            </div>`;
        });
    } else {
        normalizeContentLines(content.content).forEach((t, i) => { html += `<p style="${textStyle}${i > 0 ? '; margin-top:16px' : ''}">${t}</p>`; });
    }
    return html;
  }

  return `
<section style="${slideStyle}">
  <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid ${theme.colors.primary}; padding-bottom:12px;">
    <div><div style="color:${theme.colors.primary}; font-size:12px; font-weight:bold;">Professional Comparison</div><h2 style="margin:0; font-size:32px; font-weight:bold; color:${theme.colors.text};">${title}</h2></div>
    <div style="color:${theme.colors.textLight}; font-size:14px; font-weight:bold;">${vocationalLabel}</div>
  </div>
  <div style="margin-top:30px; flex:1; display:flex; gap:2px; background:${theme.colors.backgroundAlt}; border-radius:12px; overflow:hidden; border:1px solid ${theme.colors.backgroundAlt};">
    <div style="flex:1; background:#fff; padding:24px; display:flex; flex-direction:column;">${renderColHTML(left)}</div>
    <div style="width:40px; display:flex; align-items:center; justify-content:center; background:${theme.colors.backgroundAlt}; color:${theme.colors.primary}; font-weight:bold;">VS</div>
    <div style="flex:1; background:#fff; padding:24px; display:flex; flex-direction:column;">${renderColHTML(right)}</div>
  </div>
</section>`;
}
