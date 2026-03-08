/**
 * 概念对比布局（学术/高职方案专属）
 * 适用于：原理对比、技术方案优劣分析
 */

import React from 'react';
import { AcademicComparisonModel, ThemeConfig } from '../types/schema';
import { toInlineStyle, getBaseSlideStyle } from '../utils/styleHelper';

interface AcademicComparisonLayoutProps {
  model: AcademicComparisonModel;
  theme: ThemeConfig;
}

export const AcademicComparisonLayout: React.FC<AcademicComparisonLayoutProps> = ({ model, theme }) => {
  if (!model) return null;

  const { title, subtitle, items, conclusion, background_image } = model;
  
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

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <div>
           <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>{title || '对比分析'}</h2>
           {subtitle && <p style={{ fontSize: '20px', color: '#7f8c8d', margin: '8px 0 0 0', fontFamily: 'sans-serif' }}>{subtitle}</p>}
        </div>
        <div style={{ fontSize: '20px', color: '#7f8c8d', fontFamily: 'sans-serif', letterSpacing: '2px' }}>COMPARISON</div>
      </div>

      <div style={{ display: 'flex', gap: '20px', height: 'calc(100% - 150px)', justifyContent: 'center' }}>
        {items?.map((item, index) => (
          <div key={index} style={{
            flex: 1, backgroundColor: '#ffffff', border: '1px solid #bdc3c7', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ backgroundColor: '#2c3e50', padding: '20px', textAlign: 'center' }}>
               <h3 style={{ fontSize: '28px', color: '#ffffff', margin: 0, fontFamily: 'sans-serif', fontWeight: 'bold' }}>{item.name}</h3>
            </div>
            
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {item.description && (
                  <p style={{ fontSize: '18px', color: '#7f8c8d', fontStyle: 'italic', margin: '0 0 16px 0', borderBottom: '1px dashed #ecf0f1', paddingBottom: '10px' }}>
                     {item.description}
                  </p>
              )}
              
              <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {item.features?.map((feature, fIndex) => (
                  <li key={fIndex} style={{ fontSize: '20px', color: '#34495e', lineHeight: '1.5', fontFamily: 'sans-serif' }}>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      
      {conclusion && (
        <div style={{ position: 'absolute', bottom: '30px', left: '60px', right: '60px', backgroundColor: '#eaf2f8', padding: '16px 20px', borderLeft: '6px solid #2980b9' }}>
           <div style={{ fontSize: '18px', color: '#2c3e50', fontWeight: 'bold', fontFamily: 'sans-serif' }}>综合评价</div>
           <div style={{ fontSize: '20px', color: '#34495e', marginTop: '4px' }}>{conclusion}</div>
        </div>
      )}
    </section>
  );
};

export function renderAcademicComparisonLayoutHTML(model: AcademicComparisonModel, theme: ThemeConfig): string {
    const { title, subtitle, items, conclusion, background_image } = model;
    
    // @ts-ignore
    const isVariantB = String((model as any).layout_variant || (model as any).variant || 'a').toLowerCase() === 'b';

    const slideStyle = toInlineStyle({
        width: `${theme.sizes.slideWidth}px`, height: `${theme.sizes.slideHeight}px`,
        position: 'relative', overflow: 'hidden', padding: '60px', backgroundColor: '#f8f9fa',
        ...(background_image
          ? {
            backgroundImage: `linear-gradient(rgba(248, 249, 250, 0.95), rgba(248, 249, 250, 0.95)), url(${background_image})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }
          : {}),
        fontFamily: '"Times New Roman", Times, Georgia, serif', boxSizing: 'border-box',
    });
    
    const headerStyle = toInlineStyle({
        borderBottom: '2px solid #2c3e50', paddingBottom: '16px', marginBottom: '32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    });

    if (!isVariantB) {
        // Variant A: Side-by-side equal comparison boxes
        let itemsHtml = '';
        if (items) {
            itemsHtml = items.map((item) => {
                const featuresHtml = (item.features || []).map(f => `<li style="font-size:20px; color:#34495e; line-height:1.5; font-family:sans-serif;">${f}</li>`).join('');
                return `
                <div style="flex:1; background-color:#ffffff; border:1px solid #bdc3c7; display:flex; flex-direction:column;">
                    <div style="background-color:#2c3e50; padding:20px; text-align:center;">
                       <h3 style="font-size:28px; color:#ffffff; margin:0; font-family:sans-serif; font-weight:bold;">${item.name}</h3>
                    </div>
                    <div style="padding:24px; flex:1; display:flex; flex-direction:column; gap:16px;">
                        ${item.description ? `<p style="font-size:18px; color:#7f8c8d; font-style:italic; margin:0 0 16px 0; border-bottom:1px dashed #ecf0f1; padding-bottom:10px;">${item.description}</p>` : ''}
                        <ul style="margin:0; padding:0 0 0 20px; display:flex; flex-direction:column; gap:12px;">
                            ${featuresHtml}
                        </ul>
                    </div>
                </div>`;
            }).join('');
        }

        const conclusionHtml = conclusion ? `
            <div style="position:absolute; bottom:30px; left:60px; right:60px; background-color:#eaf2f8; padding:16px 20px; border-left:6px solid #2980b9;">
               <div style="font-size:18px; color:#2c3e50; font-weight:bold; font-family:sans-serif;">综合评价</div>
               <div style="font-size:20px; color:#34495e; margin-top:4px;">${conclusion}</div>
            </div>` : '';

        return `
            <section style="${slideStyle}">
                <div style="${headerStyle}">
                    <div>
                       <h2 style="font-size:44px; font-weight:bold; color:#2c3e50; margin:0;">${title || '对比分析'}</h2>
                       ${subtitle ? `<p style="font-size:20px; color:#7f8c8d; margin:8px 0 0 0; font-family:sans-serif;">${subtitle}</p>` : ''}
                    </div>
                    <div style="font-size:20px; color:#7f8c8d; font-family:sans-serif; letter-spacing:2px;">COMPARISON</div>
                </div>
                <div style="display:flex; gap:20px; height:calc(100% - 150px); justify-content:center;">
                    ${itemsHtml}
                </div>
                ${conclusionHtml}
            </section>
        `;
    } else {
        // Variant B: VS. Intertwined Matrix Comparison
        let itemsHtml = '';
        if (items && items.length >= 2) {
            const leftItem = items[0];
            const rightItem = items[1];
            
            const leftFeatures = (leftItem.features || []).map(f => `<div style="font-size:20px; color:#fff; background-color:#34495e; padding:12px 20px; border-radius:8px; text-align:right;">${f}</div>`).join('');
            const rightFeatures = (rightItem.features || []).map(f => `<div style="font-size:20px; color:#2c3e50; border:2px solid #bdc3c7; padding:12px 20px; border-radius:8px;">${f}</div>`).join('');
            
            itemsHtml = `
            <div style="display:flex; align-items:center; gap:40px; justify-content:center; flex:1;">
               <!-- Left Side -->
               <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
                  <div style="text-align:right; border-bottom:3px solid #e74c3c; padding-bottom:12px;">
                     <h3 style="font-size:32px; color:#2c3e50; margin:0; font-family:sans-serif;">${leftItem.name}</h3>
                     ${leftItem.description ? `<p style="margin:8px 0 0 0; font-size:18px; color:#7f8c8d;">${leftItem.description}</p>` : ''}
                  </div>
                  <div style="display:flex; flex-direction:column; gap:12px;">${leftFeatures}</div>
               </div>
               
               <!-- Center VS Indicator -->
               <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
                  <div style="width:2px; height:60px; background-color:#bdc3c7;"></div>
                  <div style="width:60px; height:60px; border-radius:50%; background-color:#e74c3c; color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; font-family:sans-serif;">VS</div>
                  <div style="width:2px; height:60px; background-color:#bdc3c7;"></div>
               </div>
               
               <!-- Right Side -->
               <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
                  <div style="text-align:left; border-bottom:3px solid #3498db; padding-bottom:12px;">
                     <h3 style="font-size:32px; color:#2c3e50; margin:0; font-family:sans-serif;">${rightItem.name}</h3>
                     ${rightItem.description ? `<p style="margin:8px 0 0 0; font-size:18px; color:#7f8c8d;">${rightItem.description}</p>` : ''}
                  </div>
                  <div style="display:flex; flex-direction:column; gap:12px;">${rightFeatures}</div>
               </div>
            </div>`;
        }
        
        const conclusionHtml = conclusion ? `<div style="text-align:center; padding:20px; background-color:#ecf0f1; border-radius:8px; font-size:20px; color:#2c3e50; font-family:sans-serif; margin-top:20px;"><strong>💡 综述: </strong>${conclusion}</div>` : '';

        return `
            <section style="${slideStyle}">
                <div style="${headerStyle}">
                    <div>
                       <h2 style="font-size:44px; font-weight:bold; color:#2c3e50; margin:0;">${title || '对立分析'}</h2>
                       ${subtitle ? `<p style="font-size:20px; color:#7f8c8d; margin:8px 0 0 0; font-family:sans-serif;">${subtitle}</p>` : ''}
                    </div>
                    <div style="font-size:20px; color:#7f8c8d; font-family:sans-serif; letter-spacing:2px;">MATRIX COMPARISON (VARIANT B)</div>
                </div>
                <div style="display:flex; flex-direction:column; height:calc(100% - 130px); justify-content:space-between;">
                    ${itemsHtml}
                    ${conclusionHtml}
                </div>
            </section>
        `;
    }
}
