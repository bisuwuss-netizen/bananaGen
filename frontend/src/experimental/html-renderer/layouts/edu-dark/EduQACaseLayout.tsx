import React from 'react';
import { EduQACaseModel, ThemeConfig } from '../../types/schema';

interface EduQACaseLayoutProps {
  model: EduQACaseModel;
  theme: ThemeConfig;
}

type EduQACaseItem = NonNullable<EduQACaseModel['items']>[number];
type NormalizedEduQACaseModel = Omit<EduQACaseModel, 'items' | 'variant'> & {
  items: EduQACaseItem[];
  variant: 'a' | 'b';
};

const ITEM_COLOR_SCALE = ['#06b6d3', '#10b981', '#3b82f6', '#f59e0b'] as const;

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeVariant = (rawVariant: unknown, itemCount: number): 'a' | 'b' => {
  const value = hasText(rawVariant) ? rawVariant.trim().toLowerCase() : '';
  if (value === 'b' || value === 'c') return 'b';
  if (value === 'a') return 'a';
  if (value === 'd') return itemCount > 3 ? 'b' : 'a';
  return itemCount > 3 ? 'b' : 'a';
};

const sanitizeItems = (items: EduQACaseModel['items']): EduQACaseItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const content = hasText(item?.content) ? item.content.trim() : '';
      if (!content) return null;
      const label = hasText(item?.label) ? item.label.trim() : `要点${index + 1}`;
      const normalized: EduQACaseItem = {
        label,
        content,
        color: hasText(item?.color) ? item.color.trim() : ITEM_COLOR_SCALE[index % ITEM_COLOR_SCALE.length],
      };
      if (hasText(item?.label_en)) normalized.label_en = item.label_en.trim();
      if (hasText(item?.icon)) normalized.icon = item.icon.trim();
      return normalized;
    })
    .filter((item): item is EduQACaseItem => item !== null);
};

const buildItemsFromStructuredFields = (input: Partial<EduQACaseModel>): EduQACaseItem[] => {
  const items: EduQACaseItem[] = [];

  if (hasText(input.question)) {
    items.push({
      label: 'Q',
      label_en: 'Question',
      content: input.question.trim(),
      color: ITEM_COLOR_SCALE[0],
    });
  }

  if (hasText(input.answer)) {
    items.push({
      label: 'A',
      label_en: 'Answer',
      content: input.answer.trim(),
      color: ITEM_COLOR_SCALE[1],
    });
  }

  if (Array.isArray(input.analysis)) {
    input.analysis.forEach((entry, index) => {
      const title = hasText(entry?.title) ? entry.title.trim() : `分析${index + 1}`;
      const content = hasText(entry?.content) ? entry.content.trim() : '';
      if (!content) return;
      items.push({
        label: title,
        content,
        color: ITEM_COLOR_SCALE[items.length % ITEM_COLOR_SCALE.length],
      });
    });
  }

  if (hasText(input.conclusion)) {
    items.push({
      label: '结论',
      label_en: 'Conclusion',
      content: input.conclusion.trim(),
      color: ITEM_COLOR_SCALE[3],
    });
  }

  if (items.length <= 4) return items;

  const firstThree = items.slice(0, 3);
  const overflowText = items
    .slice(3)
    .map((item) => `${item.label}：${item.content}`)
    .join('；');
  firstThree.push({
    label: '延伸',
    label_en: 'More',
    content: overflowText,
    color: ITEM_COLOR_SCALE[3],
  });
  return firstThree;
};

function normalizeModel(input: Partial<EduQACaseModel>): NormalizedEduQACaseModel {
  const explicitItems = sanitizeItems(input.items);
  const derivedItems = explicitItems.length > 0 ? explicitItems : buildItemsFromStructuredFields(input);
  const items = derivedItems.length > 0
    ? derivedItems
    : [
      { label: 'Q', label_en: 'Question', content: '这是一个示例问题？', color: '#06b6d3' },
      { label: 'A', label_en: 'Answer', content: '这是一个示例回答，用于展示布局效果。', color: '#10b981' },
    ];

  return {
    title: input.title || '问答与案例分析',
    subtitle: input.subtitle,
    variant: normalizeVariant(input.variant || input.layout_variant, items.length),
    layout_variant: hasText(input.layout_variant) ? input.layout_variant : undefined,
    items,
    question: hasText(input.question) ? input.question : undefined,
    answer: hasText(input.answer) ? input.answer : undefined,
    analysis: Array.isArray(input.analysis) ? input.analysis : undefined,
    conclusion: hasText(input.conclusion) ? input.conclusion : undefined,
    background_image: input.background_image,
  };
}

// 关键词高亮辅助函数
const highlightText = (text: string, color: string = '#06b6d3') => {
  const keywords = ['非对称', '空间感', '灵动', '数字化', '极致', '核心', '行动', '背景'];
  let result: (string | JSX.Element)[] = [text];
  keywords.forEach(word => {
    const newResult: (string | JSX.Element)[] = [];
    result.forEach(part => {
      if (typeof part === 'string') {
        const subParts = part.split(word);
        subParts.forEach((subPart, i) => {
          newResult.push(subPart);
          if (i < subParts.length - 1) {
            newResult.push(<strong key={word + i} style={{ color, fontWeight: 700 }}>{word}</strong>);
          }
        });
      } else {
        newResult.push(part);
      }
    });
    result = newResult;
  });
  return result;
};

const SHADOW_SOFT = '0 16px 40px rgba(0, 0, 0, 0.45)';
const getItemLabelEn = (item: EduQACaseItem): string | undefined =>
  (item as unknown as { label_en?: string }).label_en;

export const EduQACaseLayout: React.FC<EduQACaseLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const isVariantB = data.variant === 'b';

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    padding: '44px 72px', // 压缩外边距
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: data.background_image
      ? `radial-gradient(circle at 10% 10%, rgba(6,182,212,0.1) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(59,130,246,0.1) 0%, transparent 60%), linear-gradient(rgba(8,14,32,0.85), rgba(8,14,32,0.88)), url(${data.background_image}) center/cover no-repeat`
      : 'radial-gradient(circle at 15% 15%, rgba(6,182,212,0.12) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(59,130,246,0.15) 0%, transparent 50%), linear-gradient(135deg, #0b1120 0%, #051937 100%)',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <section style={slideStyle}>
      {/* 星尘 */}
      <div style={{ position: 'absolute', top: '25%', left: '40%', width: 3, height: 3, borderRadius: '50%', background: '#06b6d3', filter: 'blur(1.5px)', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: '75%', left: '85%', width: 2, height: 2, borderRadius: '50%', background: '#3b82f6', filter: 'blur(1px)', opacity: 0.4 }} />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: '1px solid rgba(6,182,212,0.2)',
        paddingBottom: 20,
        marginBottom: 32, // 压缩标题下方间距
        flexShrink: 0,
        zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: 10, 
            height: 10, 
            borderRadius: '50%', 
            marginRight: 18, 
            background: '#06b6d3',
            boxShadow: '0 0 15px #06b6d3'
          }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 44, fontWeight: 700, fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.subtitle && (
          <div style={{ color: '#93c5fd', fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.7 }}>
            {data.subtitle}
          </div>
        )}
      </div>

      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2, minHeight: 0 }}>
        {isVariantB ? (
          <EduCaseBoard items={data.items} theme={theme} />
        ) : (
          <EduQACards items={data.items} theme={theme} />
        )}
      </div>
    </section>
  );
};

// 变体 A: 极致灵动问答 (压缩版)
const EduQACards: React.FC<{ items: EduQACaseItem[]; theme: ThemeConfig }> = ({ items, theme }) => {
  return (
    <div style={{ position: 'relative', maxWidth: 1040, margin: '0 auto', width: '100%' }}>
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', strokeDasharray: '4 6', stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}>
        <path d="M 250 120 Q 520 250 790 380" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}> {/* 压缩间距 */}
        {items.slice(0, 3).map((item, idx) => {
          const isQuestion = item.label.toUpperCase() === 'Q' || item.label.includes('问');
          return (
            <div key={idx} style={{
              alignSelf: isQuestion ? 'flex-start' : 'flex-end',
              marginLeft: isQuestion ? -40 : 0,
              marginRight: isQuestion ? 0 : -40,
              maxWidth: isQuestion ? '70%' : '80%',
              position: 'relative',
              zIndex: 5,
            }}>
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1.2, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', zIndex: 11 }} />
              <div style={{
                position: 'absolute',
                top: -20,
                [isQuestion ? 'left' : 'right']: -20,
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${item.color || (isQuestion ? '#06b6d3' : '#10b981')}, #051937)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 20,
                fontWeight: 900,
                zIndex: 12,
                boxShadow: `0 4px 12px rgba(0,0,0,0.5), 0 0 10px ${item.color || (isQuestion ? '#06b6d3' : '#10b981')}66`,
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                {item.label[0]}
              </div>
              <div style={{
                background: isQuestion ? 'rgba(30, 41, 59, 0.5)' : 'rgba(6, 182, 211, 0.12)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${isQuestion ? 'rgba(255,255,255,0.1)' : 'rgba(6,182,211,0.25)'}`,
                boxShadow: SHADOW_SOFT,
                borderRadius: 24,
                padding: '24px 32px',
                color: isQuestion ? '#cbd5e1' : '#ffffff',
                fontSize: 24, // 压缩字号
                lineHeight: 1.5,
              }}>
                {highlightText(item.content, item.color || (isQuestion ? '#06b6d3' : '#10b981'))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 变体 B: 非对称极致看板 (比例优化版)
const EduCaseBoard: React.FC<{ items: EduQACaseItem[]; theme: ThemeConfig }> = ({ items, theme }) => {
  const layoutItems = items.slice(0, 4);
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1.25fr 1fr', // 微调比例
      gridTemplateRows: 'auto auto',
      gap: 24, // 压缩间距
      height: '100%',
      maxHeight: 520, // 限制最大高度
    }}>
      {layoutItems.map((item, idx) => {
        const isFeatured = idx === 0;
        return (
          <div key={idx} style={{
            gridRow: isFeatured ? 'span 2' : 'auto',
            background: isFeatured ? 'rgba(15, 23, 42, 0.45)' : 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid rgba(255,255,255,0.06)`,
            borderRadius: 24,
            padding: isFeatured ? '40px 36px' : '24px 32px', // 大幅压缩内边距
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: SHADOW_SOFT,
            justifyContent: isFeatured ? 'center' : 'flex-start',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1.2, background: `linear-gradient(90deg, transparent, ${item.color || '#3b82f6'}66, transparent)`, zIndex: 5 }} />
            <div style={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              fontSize: 120,
              opacity: 0.06,
              color: item.color || '#3b82f6',
              pointerEvents: 'none',
              transform: 'rotate(-20deg)',
              zIndex: 1,
            }}>
              {idx === 0 ? '◈' : (idx === 1 ? '✦' : (idx === 2 ? '⦿' : '▣'))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, zIndex: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 4, opacity: 0.7 }}>
                {getItemLabelEn(item) || item.label.toUpperCase()}
              </div>
              <div style={{
                fontSize: isFeatured ? 30 : 24, // 压缩标题字号
                fontWeight: 800,
                color: item.color || '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textShadow: `0 0 15px ${(item.color || '#3b82f6')}33`,
              }}>
                {idx === 0 && <div style={{ width: 5, height: 26, background: item.color || '#3b82f6', borderRadius: 2 }} />}
                {item.label}
              </div>
            </div>

            <div style={{
              fontSize: isFeatured ? 24 : 20, // 压缩正文字号
              color: '#d1d5db',
              lineHeight: 1.5,
              fontWeight: 400,
              zIndex: 2,
            }}>
              {highlightText(item.content, item.color || '#3b82f6')}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// HTML Renderer 同步修复
export function renderEduQACaseLayoutHTML(model: EduQACaseModel, theme: ThemeConfig): string {
  const data = normalizeModel(model);
  const isVariantB = data.variant === 'b';
  
  const background = `radial-gradient(circle at 15% 15%, rgba(6,182,212,0.12) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(59,130,246,0.15) 0%, transparent 50%), linear-gradient(135deg, #0b1120 0%, #051937 100%)`;

  let contentHTML = '';
  if (isVariantB) {
    contentHTML = `<div style="display:grid;grid-template-columns:1.25fr 1fr;grid-template-rows:auto auto;gap:24px;height:100%;max-height:520px;">
      ${data.items.slice(0, 4).map((item, idx) => {
        const isFeatured = idx === 0;
        const color = item.color || '#3b82f6';
        return `
        <div style="grid-row:${isFeatured ? 'span 2' : 'auto'};background:${isFeatured ? 'rgba(15, 23, 42, 0.45)' : 'rgba(15, 23, 42, 0.65)'};border:1px solid rgba(255,255,255,0.06);border-radius:24px;padding:${isFeatured ? '40px 36px' : '24px 32px'};display:flex;flex-direction:column;gap:14px;position:relative;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.45);">
          <div style="position:absolute;top:0;left:15%;right:15%;height:1.2px;background:linear-gradient(90deg,transparent,${color}66,transparent);z-index:5;"></div>
          <div style="position:absolute;bottom:-30px;right:-30px;font-size:120px;opacity:0.06;color:${color};transform:rotate(-20deg);z-index:1;">${idx === 0 ? '◈' : (idx === 1 ? '✦' : '⦿')}</div>
          <div style="z-index:2;display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:4px;opacity:0.7;">${item.label.toUpperCase()}</div>
            <div style="font-size:${isFeatured ? '30px' : '24px'};font-weight:800;color:${color};display:flex;align-items:center;gap:12px;">
              ${isFeatured ? `<div style="width:5px;height:26px;background:${color};border-radius:2px;"></div>` : ''}
              ${item.label}
            </div>
          </div>
          <div style="font-size:${isFeatured ? '24px' : '20px'};color:#d1d5db;line-height:1.5;z-index:2;">${item.content}</div>
        </div>`;
      }).join('')}
    </div>`;
  } else {
    contentHTML = `<div style="position:relative;max-width:1040px;margin:0 auto;width:100%;">
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;">
        <svg width="1040" height="400" viewBox="0 0 1040 400" fill="none"><path d="M 250 120 Q 520 250 790 380" stroke="white" stroke-opacity="0.08" stroke-width="1" stroke-dasharray="4 6" /></svg>
      </div>
      <div style="display:flex;flex-direction:column;gap:40px;z-index:5;position:relative;">
      ${data.items.slice(0, 3).map((item, idx) => {
        const isQuestion = item.label.toUpperCase() === 'Q' || item.label.includes('问');
        const color = item.color || (isQuestion ? '#06b6d3' : '#10b981');
        return `
          <div style="align-self:${isQuestion ? 'flex-start' : 'flex-end'};margin-left:${isQuestion ? '-40px' : '0'};margin-right:${isQuestion ? '0' : '-40px'};max-width:${isQuestion ? '70%' : '80%'};position:relative;">
            <div style="position:absolute;top:0;left:10%;right:10%;height:1.2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);z-index:11;"></div>
            <div style="position:absolute;top:-20px;${isQuestion ? 'left' : 'right'}:-20px;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg, ${color}, #051937);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:900;z-index:12;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.3);">${item.label[0]}</div>
            <div style="background:${isQuestion ? 'rgba(30, 41, 59, 0.5)' : 'rgba(6, 182, 211, 0.12)'};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid ${isQuestion ? 'rgba(255,255,255,0.1)' : 'rgba(6, 182, 211, 0.25)'};box-shadow:0 16px 40px rgba(0,0,0,0.45);border-radius:24px;padding:24px 32px;color:${isQuestion ? '#cbd5e1' : '#ffffff'};font-size:24px;line-height:1.5;">${item.content}</div>
          </div>`;
      }).join('')}
      </div>
    </div>`;
  }

  return `
<section style="width:1280px;height:720px;padding:44px 72px;box-sizing:border-box;position:relative;overflow:hidden;font-family:sans-serif;background:${background};display:flex;flex-direction:column;">
  <div style="position:absolute;top:25%;left:40%;width:3px;height:3px;border-radius:50%;background:#06b6d3;filter:blur(1.5px);opacity:0.5;"></div>
  
  <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid rgba(6,182,212,0.2);padding-bottom:20px;margin-bottom:32px;flex-shrink:0;">
    <div style="display:flex;align-items:center;">
      <div style="width:10px;height:10px;border-radius:50%;margin-right:18px;background:#06b6d3;box-shadow:0 0 15px #06b6d3;"></div>
      <h2 style="margin:0;color:#ffffff;font-size:44px;font-weight:700;">${data.title}</h2>
    </div>
    ${data.subtitle ? `<div style="color:#93c5fd;font-size:18px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;">${data.subtitle}</div>` : ''}
  </div>
  <div style="flex-grow:1;display:flex;flex-direction:column;justify-content:center;min-height:0;">
    ${contentHTML}
  </div>
</section>`;
}

export default EduQACaseLayout;
