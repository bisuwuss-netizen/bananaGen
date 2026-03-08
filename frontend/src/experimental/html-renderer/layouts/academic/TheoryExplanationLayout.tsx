import React from 'react';
import { TheoryExplanationModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../../utils/styleHelper';
import { isLayoutVariantB } from '../shared/layoutVariant';

interface TheoryExplanationLayoutProps {
  model: TheoryExplanationModel;
  theme: ThemeConfig;
}

export const TheoryExplanationLayout: React.FC<TheoryExplanationLayoutProps> = ({ model, theme }) => {
  if (!model) {
    return (
      <section style={{
        ...getBaseSlideStyle(theme),
        display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee', color: '#c00',
      }}>
        错误: TheoryExplanationLayout model 为空
      </section>
    );
  }

  const { title, formulas, references, background_image } = model;
  const theory = Array.isArray(model.theory) ? model.theory : [];

  const isVariantB = isLayoutVariantB(model);

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
    fontFamily: '"Times New Roman", Times, serif',
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
    ...(isVariantB ? { borderLeft: '6px solid #e74c3c', paddingLeft: '16px' } : {})
  };

  const contentContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '40px',
    flex: 1,
    height: references && references.length > 0 ? 'calc(100% - 150px)' : 'calc(100% - 100px)',
  };

  const theoryColumnStyle: React.CSSProperties = {
    flex: isVariantB ? '1' : (formulas && formulas.length > 0 ? '1.2' : '1'),
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    paddingRight: isVariantB ? '0' : (formulas && formulas.length > 0 ? '40px' : '0'),
    paddingLeft: isVariantB && formulas && formulas.length > 0 ? '40px' : '0',
    borderRight: !isVariantB && formulas && formulas.length > 0 ? '1px solid #bdc3c7' : 'none',
  };

  const theoryParagraphStyle: React.CSSProperties = {
    fontSize: isVariantB ? '20px' : '22px',
    color: '#34495e',
    lineHeight: '1.8',
    margin: 0,
    textAlign: 'justify',
  };

  const formulaColumnStyle: React.CSSProperties = {
    flex: isVariantB ? '1.2' : '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    justifyContent: 'center',
    ...(isVariantB && formulas && formulas.length > 0 ? { borderRight: '1px solid #bdc3c7', paddingRight: '40px' } : {})
  };

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>{title || '理论推导'}</h2>
      </div>

      <div style={contentContainerStyle}>
        {!isVariantB ? (
            <>
                <div style={theoryColumnStyle}>
                  {theory.map((paragraph, index) => (
                    <p key={index} style={theoryParagraphStyle}>{paragraph}</p>
                  ))}
                </div>
                {formulas && formulas.length > 0 && (
                  <div style={formulaColumnStyle}>
                    {formulas.map((formula, index) => {
                      const formulaCardStyle: React.CSSProperties = { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#ffffff', border: '1px solid #ecf0f1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderRadius: '4px' };
                      const latexStyle: React.CSSProperties = { fontSize: '24px', fontFamily: 'MathJax_Math, "Times New Roman", serif', color: '#2c3e50', textAlign: 'center', padding: '20px', backgroundColor: '#fbfcfc', border: '1px solid #e0e0e0', overflowX: 'auto' };
                      const explanationStyle: React.CSSProperties = { fontSize: '16px', color: '#7f8c8d', lineHeight: '1.6', textAlign: 'center', fontFamily: 'sans-serif' };
                      return (
                        <div key={index} style={formulaCardStyle}>
                          <div style={latexStyle}>{formula.latex}</div>
                          {formula.explanation && <p style={explanationStyle}>{formula.explanation}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
            </>
        ) : (
            <>
                {formulas && formulas.length > 0 && (
                  <div style={formulaColumnStyle}>
                    {formulas.map((formula, index) => {
                      const formulaCardStyle: React.CSSProperties = { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(44, 62, 80, 0.03)', border: '1px dashed #bdc3c7', borderRadius: '8px' };
                      const latexStyle: React.CSSProperties = { fontSize: '28px', fontFamily: 'MathJax_Math, "Times New Roman", serif', color: '#c0392b', textAlign: 'center', padding: '20px', borderBottom: '2px solid rgba(192, 57, 43, 0.2)', overflowX: 'auto' };
                      const explanationStyle: React.CSSProperties = { fontSize: '16px', color: '#34495e', lineHeight: '1.6', textAlign: 'center', fontFamily: 'sans-serif', fontStyle: 'italic' };
                      return (
                        <div key={index} style={formulaCardStyle}>
                          <div style={latexStyle}>{formula.latex}</div>
                          {formula.explanation && <p style={explanationStyle}>{formula.explanation}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={theoryColumnStyle}>
                  {theory.map((paragraph, index) => (
                     <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }} key={index}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#e74c3c', borderRadius: '50%', marginTop: '12px', flexShrink: 0 }} />
                        <p style={theoryParagraphStyle}>{paragraph}</p>
                     </div>
                  ))}
                </div>
            </>
        )}
      </div>

      {references && references.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '80px', left: '60px', right: '60px',
          borderTop: '1px solid #e0e0e0', paddingTop: '16px',
        }}>
          <div style={{ fontSize: '14px', color: '#95a5a6', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
            <strong style={{ color: '#7f8c8d' }}>[References] </strong>
            {references.map((ref, index) => (
              <span key={index}>{index > 0 && ' ; '} [{index + 1}] {ref}</span>
            ))}
          </div>
        </div>
      )}

      {theme.decorations?.footerStyle?.show && (
        <div style={{
          position: 'absolute', bottom: '30px', left: '60px', right: '60px',
          display: 'flex', justifyContent: 'space-between',
          fontSize: '14px', color: '#bdc3c7', fontFamily: 'sans-serif'
        }}>
          <span>THEORY & EXPLANATION</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      )}
    </section>
  );
};

export function renderTheoryExplanationLayoutHTML(model: TheoryExplanationModel, theme: ThemeConfig): string {
  const { title, formulas, references, background_image } = model;
  const theory = Array.isArray(model.theory) ? model.theory : [];

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
    fontFamily: '"Times New Roman", Times, serif',
    boxSizing: 'border-box',
  });

  const headerStyle = toInlineStyle({
    borderBottom: '2px solid #2c3e50',
    paddingBottom: '16px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  });

  const titleStyle = toInlineStyle({
    fontSize: '44px', fontWeight: 'bold', color: '#2c3e50', margin: '0', letterSpacing: '1px', fontFamily: '"Times New Roman", Times, serif',
  });

  const contentContainerStyle = toInlineStyle({
    display: 'flex', gap: '40px',
    height: references && references.length > 0 ? 'calc(100% - 150px)' : 'calc(100% - 100px)',
  });

  const hasFormulas = formulas && formulas.length > 0;
  
  const isVariantB = isLayoutVariantB(model);
  
  const titleHtml = `<h2 style="${titleStyle}${isVariantB ? '; border-left: 6px solid #e74c3c; padding-left: 16px;' : ''}">${title || '理论推导'}</h2>`;

  const theoryColumnStyle = toInlineStyle({
    flex: isVariantB ? '1' : (hasFormulas ? '1.2' : '1'),
    display: 'flex', flexDirection: 'column', gap: '20px',
    paddingRight: isVariantB ? '0' : (hasFormulas ? '40px' : '0'),
    paddingLeft: isVariantB && hasFormulas ? '40px' : '0',
    borderRight: !isVariantB && hasFormulas ? '1px solid #bdc3c7' : 'none',
  });

  const theoryParagraphStyle = toInlineStyle({
    fontSize: isVariantB ? '20px' : '22px', color: '#34495e', lineHeight: '1.8', margin: '0', textAlign: 'justify',
  });

  const formulaColumnStyle = toInlineStyle({
    flex: isVariantB ? '1.2' : '1', display: 'flex', flexDirection: 'column', gap: '24px', justifyContent: 'center',
    ...(isVariantB && hasFormulas ? { borderRight: '1px solid #bdc3c7', paddingRight: '40px' } : {})
  });

  let referencesHtml = '';
  if (references && references.length > 0) {
    const refContainerStyle = toInlineStyle({
      position: 'absolute', bottom: '80px', left: '60px', right: '60px',
      borderTop: '1px solid #e0e0e0', paddingTop: '16px',
    });
    const refTextStyle = toInlineStyle({ fontSize: '14px', color: '#95a5a6', lineHeight: '1.6', fontFamily: 'sans-serif' });
    const refItems = references.map((ref, idx) => `<span>${idx > 0 ? ' ; ' : ''}[${idx + 1}] ${ref}</span>`).join('');
    referencesHtml = `
      <div style="${refContainerStyle}">
        <div style="${refTextStyle}">
          <strong style="color: #7f8c8d;">[References] </strong>
          ${refItems}
        </div>
      </div>
    `;
  }

  let footerHtml = '';
  if (theme.decorations?.footerStyle?.show) {
    const footerStyle = toInlineStyle({
      position: 'absolute', bottom: '30px', left: '60px', right: '60px',
      display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#bdc3c7', fontFamily: 'sans-serif'
    });
    footerHtml = `<div style="${footerStyle}"><span>THEORY & EXPLANATION</span><span>${new Date().getFullYear()}</span></div>`;
  }

  if (!isVariantB) {
      const theoryHtml = theory.map(p => `<p style="${theoryParagraphStyle}">${p}</p>`).join('');
      let formulasHtml = '';
      if (hasFormulas) {
        formulasHtml = `<div style="${formulaColumnStyle}">` + formulas.map(f => {
          const cardStyle = toInlineStyle({ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#ffffff', border: '1px solid #ecf0f1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderRadius: '4px' });
          const latexStyle = toInlineStyle({ fontSize: '24px', fontFamily: 'MathJax_Math, "Times New Roman", serif', color: '#2c3e50', textAlign: 'center', padding: '20px', backgroundColor: '#fbfcfc', border: '1px solid #e0e0e0' });
          const expStyle = toInlineStyle({ fontSize: '16px', color: '#7f8c8d', lineHeight: '1.6', textAlign: 'center', fontFamily: 'sans-serif' });
          return `
            <div style="${cardStyle}">
              <div style="${latexStyle}">${f.latex || ''}</div>
              ${f.explanation ? `<p style="${expStyle}">${f.explanation}</p>` : ''}
            </div>
          `;
        }).join('') + `</div>`;
      }

      return `
        <section style="${slideStyle}">
          <div style="${headerStyle}">
            ${titleHtml}
          </div>
          <div style="${contentContainerStyle}">
            <div style="${theoryColumnStyle}">${theoryHtml}</div>
            ${formulasHtml}
          </div>
          ${referencesHtml}
          ${footerHtml}
        </section>
      `;
  } else {
      let bFormulasHtml = '';
      if (hasFormulas) {
        bFormulasHtml = `<div style="${formulaColumnStyle}">` + formulas.map(f => {
          const cardStyle = toInlineStyle({ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(44, 62, 80, 0.03)', border: '1px dashed #bdc3c7', borderRadius: '8px' });
          const latexStyle = toInlineStyle({ fontSize: '28px', fontFamily: 'MathJax_Math, "Times New Roman", serif', color: '#c0392b', textAlign: 'center', padding: '20px', borderBottom: '2px solid rgba(192, 57, 43, 0.2)' });
          const expStyle = toInlineStyle({ fontSize: '16px', color: '#34495e', lineHeight: '1.6', textAlign: 'center', fontFamily: 'sans-serif', fontStyle: 'italic' });
          return `
            <div style="${cardStyle}">
              <div style="${latexStyle}">${f.latex || ''}</div>
              ${f.explanation ? `<p style="${expStyle}">${f.explanation}</p>` : ''}
            </div>
          `;
        }).join('') + `</div>`;
      }
      
      const bTheoryHtml = theory.map(p => `
          <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:16px;">
             <div style="width:8px; height:8px; background-color:#e74c3c; border-radius:50%; margin-top:12px; flex-shrink:0;"></div>
             <p style="${theoryParagraphStyle}">${p}</p>
          </div>
      `).join('');

      return `
        <section style="${slideStyle}">
          <div style="${headerStyle}">
            ${titleHtml}
          </div>
          <div style="${contentContainerStyle}">
            ${bFormulasHtml}
            <div style="${theoryColumnStyle}">${bTheoryHtml}</div>
          </div>
          ${referencesHtml}
          ${footerHtml}
        </section>
      `;
  }
}

export default TheoryExplanationLayout;
