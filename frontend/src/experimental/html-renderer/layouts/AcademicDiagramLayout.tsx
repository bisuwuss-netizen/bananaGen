/**
 * 原理图解/流程架构布局（学术/高职方案专属）
 * 适用于：系统原理图、设备结构剖面图、操作流程拆解
 */

import React from 'react';
import { AcademicDiagramModel, ThemeConfig } from '../types/schema';
import { toInlineStyle, getBaseSlideStyle } from '../utils/styleHelper';

interface AcademicDiagramLayoutProps {
  model: AcademicDiagramModel;
  theme: ThemeConfig;
}

export const AcademicDiagramLayout: React.FC<AcademicDiagramLayoutProps> = ({ model, theme }) => {
  if (!model) return null;

  const { title, subtitle, diagram_url, explanations, summary, background_image } = model;
  
  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#ffffff',
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
    fontFamily: '"Times New Roman", Times, Georgia, serif',
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: '2px solid #2c3e50',
    paddingBottom: '16px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  };

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <div>
           <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>{title || '原理图解'}</h2>
           {subtitle && <p style={{ fontSize: '20px', color: '#7f8c8d', margin: '8px 0 0 0', fontFamily: 'sans-serif' }}>{subtitle}</p>}
        </div>
        <div style={{ fontSize: '20px', color: '#7f8c8d', fontFamily: 'sans-serif', letterSpacing: '2px' }}>DIAGRAM & ILLUSTRATION</div>
      </div>

      <div style={{ display: 'flex', gap: '40px', height: 'calc(100% - 130px)', boxSizing: 'border-box' }}>
         {/* 左侧大图 */}
         <div style={{ flex: '1.5', backgroundColor: '#fdfdfd', border: '1px solid #ecf0f1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
             {diagram_url ? (
                 <img src={diagram_url} alt="原理图" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
             ) : (
                 <div style={{ fontSize: '24px', color: '#bdc3c7', border: '2px dashed #bdc3c7', padding: '40px' }}>[在此放置 原理图 / 架构图]</div>
             )}
         </div>

         {/* 右侧解析部件 */}
         <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '20px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '24px', color: '#34495e', borderBottom: '1px dotted #ccc', paddingBottom: '10px', margin: 0 }}>核心部件与流程解构</h3>
            {explanations?.map((exp, index) => (
                <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{
                        backgroundColor: '#3498db', color: '#fff', width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                        fontWeight: 'bold', fontFamily: 'sans-serif', flexShrink: 0
                    }}>{index + 1}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <div style={{ fontSize: '20px', color: '#2c3e50', fontWeight: 'bold', fontFamily: 'sans-serif' }}>{exp.label}</div>
                       <div style={{ fontSize: '18px', color: '#7f8c8d', lineHeight: '1.5', marginTop: '4px', textAlign: 'justify' }}>{exp.description}</div>
                    </div>
                </div>
            ))}
         </div>
      </div>

      {summary && (
          <div style={{ position: 'absolute', bottom: '30px', left: '60px', right: '60px', borderTop: '1px solid #bdc3c7', paddingTop: '16px', fontSize: '18px', color: '#34495e', textAlign: 'center' }}>
              <strong>图解要点结论：</strong> {summary}
          </div>
      )}
    </section>
  );
};

export function renderAcademicDiagramLayoutHTML(model: AcademicDiagramModel, theme: ThemeConfig): string {
    const { title, subtitle, diagram_url, explanations, summary, background_image } = model;
    
    // @ts-ignore
    const isVariantB = String((model as any).layout_variant || (model as any).variant || 'a').toLowerCase() === 'b';

    const slideStyle = toInlineStyle({
        width: `${theme.sizes.slideWidth}px`, height: `${theme.sizes.slideHeight}px`,
        position: 'relative', overflow: 'hidden', padding: '60px', backgroundColor: '#ffffff',
        ...(background_image
          ? {
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), url(${background_image})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }
          : {}),
        fontFamily: '"Times New Roman", Times, Georgia, serif', boxSizing: 'border-box',
    });
    
    const headerStyle = toInlineStyle({
        borderBottom: '2px solid #2c3e50', paddingBottom: '16px', marginBottom: '20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    });

    if (!isVariantB) {
        // Variant A: Diagram left, text column right
        let expHtml = '';
        if (explanations) {
            expHtml = explanations.map((exp, index) => `
                <div style="display:flex; gap:16px; align-items:flex-start;">
                    <div style="background-color:#3498db; color:#fff; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-weight:bold; font-family:sans-serif; flex-shrink:0;">${index + 1}</div>
                    <div style="display:flex; flex-direction:column;">
                       <div style="font-size:20px; color:#2c3e50; font-weight:bold; font-family:sans-serif;">${exp.label}</div>
                       <div style="font-size:18px; color:#7f8c8d; line-height:1.5; margin-top:4px; text-align:justify;">${exp.description}</div>
                    </div>
                </div>
            `).join('');
        }
        
        const summaryHtml = summary ? `
            <div style="position:absolute; bottom:30px; left:60px; right:60px; border-top:1px solid #bdc3c7; padding-top:16px; font-size:18px; color:#34495e; text-align:center;">
                <strong>核心口诀：</strong> ${summary}
            </div>` : '';

        return `
            <section style="${slideStyle}">
                <div style="${headerStyle}">
                    <div>
                       <h2 style="font-size:44px; font-weight:bold; color:#2c3e50; margin:0;">${title || '原理图解'}</h2>
                       ${subtitle ? `<p style="font-size:20px; color:#7f8c8d; margin:8px 0 0 0; font-family:sans-serif;">${subtitle}</p>` : ''}
                    </div>
                    <div style="font-size:20px; color:#7f8c8d; font-family:sans-serif; letter-spacing:2px;">DIAGRAM & ILLUSTRATION</div>
                </div>

                <div style="display:flex; gap:40px; height:calc(100% - 130px); box-sizing:border-box;">
                    <div style="flex:1.5; background-color:#fdfdfd; border:1px solid #ecf0f1; display:flex; alignItems:center; justify-content:center; padding:20px; border-radius:12px;">
                        ${diagram_url 
                          ? `<img src="${diagram_url}" alt="原理图" style="max-width:100%; max-height:100%; object-fit:contain;" />`
                          : `<div style="font-size:24px; color:#bdc3c7; border:2px dashed #bdc3c7; padding:60px; display:flex; flex-direction:column; align-items:center; gap:10px;"><span>📷</span><span>[ 预留：图解位 ]</span></div>`
                        }
                    </div>

                    <div style="flex:1; display:flex; flex-direction:column; gap:20px; padding-right:20px; overflow-y:auto;">
                        <h3 style="font-size:24px; color:#34495e; border-bottom:1px dotted #ccc; padding-bottom:10px; margin:0; font-family:sans-serif;">核心部件与流体循环拆解</h3>
                        ${expHtml}
                    </div>
                </div>
                ${summaryHtml}
            </section>
        `;
    } else {
        // Variant B: Top/Bottom Split (Top image, Bottom cards)
        let expHtml = '';
        if (explanations) {
            expHtml = explanations.slice(0, 3).map((exp, index) => `
                <div style="flex:1; background-color:#f9fbfd; border:1px solid #e1e8ed; padding:12px 16px; border-top:4px solid #3498db; display:flex; flex-direction:column; gap:6px;">
                     <div style="display:flex; align-items:center; gap:8px;">
                        <div style="background-color:#3498db; color:#fff; width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:4px; font-weight:bold; font-size:14px; font-family:sans-serif; flex-shrink:0;">${index + 1}</div>
                        <div style="font-size:18px; color:#2c3e50; font-weight:bold; font-family:sans-serif;">${exp.label}</div>
                     </div>
                     <div style="font-size:14px; color:#7f8c8d; line-height:1.5; text-align:justify;">${exp.description}</div>
                </div>
            `).join('');
        }
        
        return `
            <section style="${slideStyle}">
                <div style="display:flex; flex-direction:column; height:100%;">
                    <!-- Header inside variant for better height control -->
                    <div style="${headerStyle}">
                        <div>
                           <h2 style="font-size:44px; font-weight:bold; color:#2c3e50; margin:0;">${title || '原理解析'}</h2>
                           ${subtitle ? `<p style="font-size:20px; color:#7f8c8d; margin:8px 0 0 0; font-family:sans-serif;">${subtitle}</p>` : ''}
                        </div>
                        <div style="font-size:20px; color:#7f8c8d; font-family:sans-serif; letter-spacing:2px;">DIAGRAM (VARIANT B)</div>
                    </div>
                
                    <!-- Diagram Banner: Smart Stretching -->
                    <div style="flex:1; width:100%; min-height:280px; background-color:#2c3e50; border-radius:12px; margin-bottom:16px; display:flex; justify-content:center; align-items:center; overflow:hidden; border:2px solid #ecf0f1; position:relative;">
                        ${diagram_url 
                          ? `
                             <div style="position:absolute; top:0; left:0; right:0; bottom:0; background:url(${diagram_url}) center/cover no-repeat; filter:blur(15px); opacity:0.15;"></div>
                             <img src="${diagram_url}" alt="原理图" style="position:relative; max-width:100%; max-height:100%; object-fit:contain; padding:20px; z-index:1;" />`
                          : `<div style="font-size:18px; color:#7f8c8d;">[ 请在此贴入全景大横图 ]</div>`
                        }
                    </div>
                    
                    <!-- Bottom Explanation Cards -->
                    <div style="display:flex; gap:12px;">
                        ${expHtml}
                    </div>
                    
                    ${summary ? `<div style="margin-top:auto; padding-top:12px; text-align:center; font-size:18px; color:#16a085; font-family:sans-serif; font-weight:bold; border-top:1px dashed #bdc3c7;">图解要点：${summary}</div>` : ''}
                </div>
            </section>
        `;
    }
}
