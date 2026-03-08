/**
 * 学术长文叙述布局（学术方案专属）
 * 特征：基于 Tufte 风格的边缘注解排版。左栏超大面积的沉浸式正文阅读（支持多段落和首字下沉），右侧预留 Margin Notes 供名词解释、旁注引论使用。
 * 风格：经典学术排版，纯衬线体，冷色调，强调字距与行高带来的呼吸感。
 */

import React from 'react';
import { AcademicNarrativeModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../../utils/styleHelper';
import { isLayoutVariantB } from '../shared/layoutVariant';

interface AcademicNarrativeLayoutProps {
  model: AcademicNarrativeModel;
  theme: ThemeConfig;
}

export const AcademicNarrativeLayout: React.FC<AcademicNarrativeLayoutProps> = ({ model, theme }) => {
  if (!model) {
    return (
      <section style={{ ...getBaseSlideStyle(theme), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        错误: AcademicNarrativeLayout model 为空
      </section>
    );
  }

  const { title, narrative, margin_notes, pull_quote, background_image } = model;
  const paragraphs = Array.isArray(narrative) ? narrative : [];

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#f8f9fa',
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(248, 249, 250, 0.95), rgba(248, 249, 250, 0.95)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
    fontFamily: '"Times New Roman", Times, Georgia, serif',
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: '2px solid #2c3e50',
    paddingBottom: '16px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '44px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: 0,
    letterSpacing: '1px',
    fontFamily: '"Times New Roman", Times, serif',
  };

  const contentContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '60px',
    flex: 1,
    height: 'calc(100% - 100px)',
  };

  // 左侧主叙述区（宽栏，类似 Tufte 主栏）
  const mainColumnStyle: React.CSSProperties = {
    flex: margin_notes && margin_notes.length > 0 ? '7' : '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  };

  const paragraphStyle = (_isFirst: boolean): React.CSSProperties => ({
    fontSize: '22px',
    color: '#34495e',
    lineHeight: '1.6',
    margin: 0,
    textAlign: 'justify',
  });

  // 右侧边注区（窄栏，类似 Tufte Margin Notes）
  const marginColumnStyle: React.CSSProperties = {
    flex: '3',
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    borderLeft: '1px solid #dcdde1',
    paddingLeft: '30px',
    paddingTop: '10px',
  };

  const isVariantB = isLayoutVariantB(model);

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <h2 style={{ ...titleStyle, ...(isVariantB ? { borderLeft: '6px solid #e74c3c', paddingLeft: '16px' } : {}) }}>{title || '学术叙述'}</h2>
      </div>

      <div style={contentContainerStyle}>
        {!isVariantB ? (
            <>
                {/* 左侧：正文叙述 */}
                <div style={mainColumnStyle}>
                  {paragraphs.map((para, index) => {
                    if (index === 1 && pull_quote) {
                      return (
                        <React.Fragment key={index}>
                          <div style={{ margin: '16px 0', padding: '16px 24px', borderLeft: '6px solid #2c3e50', backgroundColor: '#f1f2f6', fontSize: '24px', color: '#2c3e50', fontStyle: 'italic', lineHeight: '1.5' }}>
                            "{pull_quote}"
                          </div>
                          <p style={paragraphStyle(false)}>{para}</p>
                        </React.Fragment>
                      );
                    }
                    return (
                      <p key={index} style={paragraphStyle(index === 0)}>
                        {index === 0 && para.length > 0 ? (
                          <>
                            <span style={{ float: 'left', fontSize: '56px', lineHeight: '50px', paddingTop: '4px', paddingRight: '12px', color: '#2c3e50', fontWeight: 'bold' }}>{para.charAt(0)}</span>
                            {para.substring(1)}
                          </>
                        ) : para}
                      </p>
                    );
                  })}
                </div>

                {/* 右侧：Margin Notes 边缘注解 */}
                {margin_notes && margin_notes.length > 0 && (
                  <div style={marginColumnStyle}>
                    {margin_notes.map((note, index) => (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '14px', color: '#e67a22', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'sans-serif' }}>{note.title || 'Margin Note'}</div>
                        <div style={{ fontSize: '18px', color: '#7f8c8d', lineHeight: '1.6', textAlign: 'justify' }}>{note.content}</div>
                      </div>
                    ))}
                  </div>
                )}
            </>
        ) : (
            <>
                {/* Variant B: 左侧 Margin Notes，右侧主叙述 */}
                {margin_notes && margin_notes.length > 0 && (
                  <div style={{ ...marginColumnStyle, borderLeft: 'none', paddingLeft: 0, borderRight: '1px solid #dcdde1', paddingRight: '30px' }}>
                    {margin_notes.map((note, index) => (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '14px', color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'sans-serif' }}>{note.title || 'Margin Note'}</div>
                        <div style={{ fontSize: '18px', color: '#7f8c8d', lineHeight: '1.6', textAlign: 'justify' }}>{note.content}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ ...mainColumnStyle, paddingLeft: margin_notes && margin_notes.length > 0 ? '30px' : 0 }}>
                  {paragraphs.map((para, index) => {
                    if (index === 1 && pull_quote) {
                      return (
                        <React.Fragment key={index}>
                          <div style={{ margin: '16px 0', padding: '16px 24px', borderLeft: '6px solid #e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.05)', fontSize: '24px', color: '#c0392b', fontStyle: 'italic', lineHeight: '1.5' }}>
                            "{pull_quote}"
                          </div>
                          <p style={paragraphStyle(false)}>{para}</p>
                        </React.Fragment>
                      );
                    }
                    return (
                      <p key={index} style={paragraphStyle(index === 0)}>
                        {index === 0 && para.length > 0 ? (
                          <>
                            <span style={{ float: 'left', fontSize: '56px', lineHeight: '50px', paddingTop: '4px', paddingRight: '12px', color: '#e74c3c', fontWeight: 'bold' }}>{para.charAt(0)}</span>
                            {para.substring(1)}
                          </>
                        ) : para}
                      </p>
                    );
                  })}
                </div>
            </>
        )}
      </div>

      {theme.decorations?.footerStyle?.show && (
        <div style={{
          position: 'absolute', bottom: '30px', left: '60px', right: '60px',
          display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bdc3c7', paddingTop: '16px',
          fontSize: '14px', color: '#bdc3c7', fontFamily: 'sans-serif'
        }}>
          <span>KNOWLEDGE EXPLANATION</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      )}
    </section>
  );
};

export function renderAcademicNarrativeLayoutHTML(model: AcademicNarrativeModel, theme: ThemeConfig): string {
  const { title, narrative, margin_notes, pull_quote, background_image } = model;
  const paragraphs = Array.isArray(narrative) ? narrative : [];

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    padding: '60px',
    backgroundColor: '#f8f9fa',
    ...(background_image
      ? { backgroundImage: `linear-gradient(rgba(248, 249, 250, 0.95), rgba(248, 249, 250, 0.95)), url(${background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : {}),
    fontFamily: '"Times New Roman", Times, Georgia, serif',
    boxSizing: 'border-box',
  });

  const headerStyle = toInlineStyle({
    borderBottom: '2px solid #2c3e50', paddingBottom: '16px', marginBottom: '32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
  });

  const titleStyle = toInlineStyle({
    fontSize: '44px', fontWeight: 'bold', color: '#2c3e50', margin: '0', letterSpacing: '1px',
  });

  const contentContainerStyle = toInlineStyle({
    display: 'flex', gap: '60px', height: 'calc(100% - 100px)',
  });

  const hasMarginNotes = margin_notes && margin_notes.length > 0;
  const mainColumnStyle = toInlineStyle({
    flex: hasMarginNotes ? '7' : '1', display: 'flex', flexDirection: 'column', gap: '24px',
  });

  const paragraphStyle = toInlineStyle({
    fontSize: '22px', color: '#34495e', lineHeight: '1.6', margin: '0', textAlign: 'justify',
  });

  const marginColumnStyle = toInlineStyle({
    flex: '3', display: 'flex', flexDirection: 'column', gap: '30px',
    borderLeft: '1px solid #dcdde1', paddingLeft: '30px', paddingTop: '10px',
  });

  const isVariantB = isLayoutVariantB(model);
  
  const titleHtml = `<h2 style="${titleStyle}${isVariantB ? '; border-left: 6px solid #e74c3c; padding-left: 16px;' : ''}">${title || '学术叙述'}</h2>`;

  let footerHtml = '';
  if (theme.decorations?.footerStyle?.show) {
    const footerStyle = toInlineStyle({
      position: 'absolute', bottom: '30px', left: '60px', right: '60px',
      display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bdc3c7', paddingTop: '16px',
      fontSize: '14px', color: '#bdc3c7', fontFamily: 'sans-serif'
    });
    footerHtml = `<div style="${footerStyle}"><span>KNOWLEDGE EXPLANATION</span><span>${new Date().getFullYear()}</span></div>`;
  }

  if (!isVariantB) {
      let mainHtml = '';
      paragraphs.forEach((para, index) => {
        if (index === 1 && pull_quote) {
          const quoteStyle = toInlineStyle({ margin: '16px 0', padding: '16px 24px', borderLeft: '6px solid #2c3e50', backgroundColor: '#f1f2f6', fontSize: '24px', color: '#2c3e50', fontStyle: 'italic', lineHeight: '1.5' });
          mainHtml += `<div style="${quoteStyle}">"${pull_quote}"</div>`;
        }
        if (index === 0 && para.length > 0) {
          const dropCapStyle = toInlineStyle({ float: 'left', fontSize: '56px', lineHeight: '50px', paddingTop: '4px', paddingRight: '12px', color: '#2c3e50', fontWeight: 'bold' });
          mainHtml += `<p style="${paragraphStyle}"><span style="${dropCapStyle}">${para.charAt(0)}</span>${para.substring(1)}</p>`;
        } else {
          mainHtml += `<p style="${paragraphStyle}">${para}</p>`;
        }
      });

      let marginHtml = '';
      if (hasMarginNotes) {
        marginHtml = `<div style="${marginColumnStyle}">` + margin_notes.map((note) => {
          const noteTitleStyle = toInlineStyle({ fontSize: '14px', color: '#e67a22', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'sans-serif' });
          const noteContentStyle = toInlineStyle({ fontSize: '18px', color: '#7f8c8d', lineHeight: '1.6', textAlign: 'justify' });
          return `<div style="display:flex; flex-direction:column; gap:8px;"><div style="${noteTitleStyle}">${note.title || 'Note'}</div><div style="${noteContentStyle}">${note.content || ''}</div></div>`;
        }).join('') + `</div>`;
      }

      return `
        <section style="${slideStyle}">
          <div style="${headerStyle}">
            ${titleHtml}
          </div>
          <div style="${contentContainerStyle}">
            <div style="${mainColumnStyle}">
              ${mainHtml}
            </div>
            ${marginHtml}
          </div>
          ${footerHtml}
        </section>
      `;
  } else {
      let bMainHtml = '';
      paragraphs.forEach((para, index) => {
        if (index === 1 && pull_quote) {
          const quoteStyle = toInlineStyle({ margin: '16px 0', padding: '16px 24px', borderLeft: '6px solid #e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.05)', fontSize: '24px', color: '#c0392b', fontStyle: 'italic', lineHeight: '1.5' });
          bMainHtml += `<div style="${quoteStyle}">"${pull_quote}"</div>`;
        }
        if (index === 0 && para.length > 0) {
          const dropCapStyle = toInlineStyle({ float: 'left', fontSize: '56px', lineHeight: '50px', paddingTop: '4px', paddingRight: '12px', color: '#e74c3c', fontWeight: 'bold' });
          bMainHtml += `<p style="${paragraphStyle}"><span style="${dropCapStyle}">${para.charAt(0)}</span>${para.substring(1)}</p>`;
        } else {
          bMainHtml += `<p style="${paragraphStyle}">${para}</p>`;
        }
      });

      let bMarginHtml = '';
      if (hasMarginNotes) {
        const bMarginColumnStyle = toInlineStyle({ flex: '3', display: 'flex', flexDirection: 'column', gap: '30px', borderRight: '1px solid #dcdde1', paddingRight: '30px', paddingTop: '10px' });
        bMarginHtml = `<div style="${bMarginColumnStyle}">` + margin_notes.map((note) => {
          const noteTitleStyle = toInlineStyle({ fontSize: '14px', color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'sans-serif' });
          const noteContentStyle = toInlineStyle({ fontSize: '18px', color: '#7f8c8d', lineHeight: '1.6', textAlign: 'justify' });
          return `<div style="display:flex; flex-direction:column; gap:8px;"><div style="${noteTitleStyle}">${note.title || 'Note'}</div><div style="${noteContentStyle}">${note.content || ''}</div></div>`;
        }).join('') + `</div>`;
      }
      
      const bMainWrapperStyle = toInlineStyle({ flex: hasMarginNotes ? '7' : '1', display: 'flex', flexDirection: 'column', gap: '24px', paddingLeft: hasMarginNotes ? '30px' : '0' });

      return `
        <section style="${slideStyle}">
          <div style="${headerStyle}">
            ${titleHtml}
          </div>
          <div style="${contentContainerStyle}">
            ${bMarginHtml}
            <div style="${bMainWrapperStyle}">
              ${bMainHtml}
            </div>
          </div>
          ${footerHtml}
        </section>
      `;
  }
}

export default AcademicNarrativeLayout;
