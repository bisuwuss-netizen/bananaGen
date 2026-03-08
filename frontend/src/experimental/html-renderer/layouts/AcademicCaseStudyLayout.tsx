/**
 * 案例分析布局（学术/高职方案专属）
 * 适用于：典型案例分析、实训场景模拟
 */

import React from 'react';
import { AcademicCaseStudyModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../utils/styleHelper';

interface AcademicCaseStudyLayoutProps {
  model: AcademicCaseStudyModel;
  theme: ThemeConfig;
}

export const AcademicCaseStudyLayout: React.FC<AcademicCaseStudyLayoutProps> = ({ model, theme }) => {
  if (!model) return null;

  const { title, scenario, challenge, points, conclusion, image, background_image } = model;

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
    fontFamily: '"Times New Roman", Times, serif',
  };

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>{title || '案例分析'}</h2>
        <div style={{ fontSize: '20px', color: '#7f8c8d', fontFamily: 'sans-serif', letterSpacing: '2px' }}>CASE STUDY</div>
      </div>

      <div style={{ display: 'flex', gap: '40px', height: 'calc(100% - 130px)' }}>
        {/* 左侧场景描述与挑战 */}
        <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderLeft: '6px solid #e67a22', padding: '24px', flex: '1', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '24px', color: '#2c3e50', margin: '0 0 16px 0', fontFamily: 'sans-serif', fontWeight: 'bold' }}>场景背景</h3>
            <p style={{ fontSize: '20px', color: '#34495e', lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>{scenario}</p>
            {image && (
                <div style={{ marginTop: '20px', flex: '1', backgroundColor: '#ecf0f1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={image} alt="案例图" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
            )}
          </div>
          {challenge && (
            <div style={{ backgroundColor: '#fdf2e9', border: '1px solid #fadbd8', padding: '20px', borderLeft: '6px solid #c0392b' }}>
              <h3 style={{ fontSize: '20px', color: '#c0392b', margin: '0 0 10px 0', fontFamily: 'sans-serif', fontWeight: 'bold' }}>面临挑战</h3>
              <p style={{ fontSize: '18px', color: '#34495e', lineHeight: '1.6', margin: 0 }}>{challenge}</p>
            </div>
          )}
        </div>

        {/* 右侧分析点与结论 */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '24px', color: '#2c3e50', margin: '0', fontFamily: 'sans-serif', fontWeight: 'bold' }}>问题剖析</h3>
            {points?.map((point, index) => (
              <div key={index} style={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', padding: '16px 20px', display: 'flex', gap: '16px' }}>
                <div style={{ fontSize: '24px', color: '#3498db', fontWeight: 'bold', fontFamily: 'sans-serif' }}>0{index + 1}</div>
                <div>
                  <div style={{ fontSize: '20px', color: '#2c3e50', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'sans-serif' }}>{point.title}</div>
                  <div style={{ fontSize: '18px', color: '#7f8c8d', lineHeight: '1.5' }}>{point.description}</div>
                </div>
              </div>
            ))}
          </div>

          {conclusion && (
            <div style={{ backgroundColor: '#eaf2f8', border: '1px solid #d4e6f1', padding: '20px', borderLeft: '6px solid #2980b9' }}>
               <h3 style={{ fontSize: '20px', color: '#2980b9', margin: '0 0 10px 0', fontFamily: 'sans-serif', fontWeight: 'bold' }}>案例启示</h3>
               <p style={{ fontSize: '18px', color: '#34495e', lineHeight: '1.6', margin: 0 }}>{conclusion}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export function renderAcademicCaseStudyLayoutHTML(model: AcademicCaseStudyModel, theme: ThemeConfig): string {
    const { title, scenario, challenge, points, conclusion, image, background_image } = model;
    
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
        // Variant A: Original side-by-side with heavy backgrounds
        let challengeHtml = '';
        if (challenge) {
            challengeHtml = `
            <div style="background-color:#fdf2e9; border:1px solid #fadbd8; padding:20px; border-left:6px solid #c0392b;">
                <h3 style="font-size:20px; color:#c0392b; margin:0 0 10px 0; font-family:sans-serif; font-weight:bold;">面临挑战</h3>
                <p style="font-size:18px; color:#34495e; line-height:1.6; margin:0;">${challenge}</p>
            </div>`;
        }

        let conclusionHtml = '';
        if (conclusion) {
            conclusionHtml = `
            <div style="background-color:#eaf2f8; border:1px solid #d4e6f1; padding:20px; border-left:6px solid #2980b9;">
                <h3 style="font-size:20px; color:#2980b9; margin:0 0 10px 0; font-family:sans-serif; font-weight:bold;">案例启示</h3>
                <p style="font-size:18px; color:#34495e; line-height:1.6; margin:0;">${conclusion}</p>
            </div>`;
        }

        let pointsHtml = '';
        if (points) {
            pointsHtml = points.map((point, index) => `
                <div style="background-color:#ffffff; border:1px solid #e0e0e0; padding:16px 20px; display:flex; gap:16px;">
                    <div style="font-size:24px; color:#3498db; font-weight:bold; font-family:sans-serif;">0${index + 1}</div>
                    <div>
                        <div style="font-size:20px; color:#2c3e50; font-weight:bold; margin-bottom:8px; font-family:sans-serif;">${point.title}</div>
                        <div style="font-size:18px; color:#7f8c8d; line-height:1.5;">${point.description}</div>
                    </div>
                </div>
            `).join('');
        }

        const imageHtml = image ? `
            <div style="margin-top:20px; flex:1; background-color:#ecf0f1; border-radius:4px; display:flex; align-items:center; justify-content:center;">
                <img src="${image}" alt="案例图" style="max-width:100%; max-height:100%; object-fit:contain;" />
            </div>` : '';

        return `
            <section style="${slideStyle}">
                <div style="${headerStyle}">
                    <h2 style="font-size:44px; font-weight:bold; color:#2c3e50; margin:0; font-family:'Times New Roman', Times, serif;">${title || '案例分析'}</h2>
                    <div style="font-size:20px; color:#7f8c8d; font-family:sans-serif; letter-spacing:2px;">CASE STUDY</div>
                </div>
                <div style="display:flex; gap:40px; height:calc(100% - 130px);">
                    <div style="flex:1.2; display:flex; flex-direction:column; gap:20px;">
                        <div style="background-color:#ffffff; border:1px solid #e0e0e0; border-left:6px solid #e67a22; padding:24px; flex:1; display:flex; flex-direction:column;">
                            <h3 style="font-size:24px; color:#2c3e50; margin:0 0 16px 0; font-family:sans-serif; font-weight:bold;">场景背景</h3>
                            <p style="font-size:20px; color:#34495e; line-height:1.6; margin:0; text-align:justify;">${scenario}</p>
                            ${imageHtml}
                        </div>
                        ${challengeHtml}
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column; gap:24px;">
                        <div style="flex:1; display:flex; flex-direction:column; gap:16px;">
                            <h3 style="font-size:24px; color:#2c3e50; margin:0; font-family:sans-serif; font-weight:bold;">问题剖析</h3>
                            ${pointsHtml}
                        </div>
                        ${conclusionHtml}
                    </div>
                </div>
            </section>
        `;
    } else {
        // Variant B: Top-Down flow with prominent Scenario and floating conclusion
        let pointsHtml = '';
        if (points) {
            pointsHtml = points.slice(0, 3).map((point) => `
                <div style="flex:1; display:flex; flex-direction:column; background-color:#fff; padding:16px 20px; border:2px solid #ecf0f1; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.02);">
                   <h4 style="font-size:18px; color:#c0392b; font-family:sans-serif; margin:0 0 8px 0; font-weight:bold;">${point.title}</h4>
                   <p style="font-size:15px; color:#34495e; margin:0; line-height:1.5;">${point.description}</p>
                </div>
            `).join('');
        }

        return `
            <section style="${slideStyle}">
                <div style="${headerStyle}">
                    <h2 style="font-size:44px; font-weight:bold; color:#2c3e50; margin:0; border-left:8px solid #c0392b; padding-left:16px;">${title || '案例分析'}</h2>
                    <div style="font-size:20px; color:#7f8c8d; font-family:sans-serif; letter-spacing:2px;">CASE STUDY (VARIANT B)</div>
                </div>
                
                <div style="display:flex; flex-direction:column; height:calc(100% - 130px); gap:20px; box-sizing:border-box;">
                    <!-- 上方场景：智能拉伸背景 + 内容图 -->
                    <div style="display:flex; gap:30px; background-color:#2c3e50; color:#fff; padding:30px; border-radius:12px; position:relative; overflow:hidden; min-height:220px;">
                        ${image ? `
                            <div style="position:absolute; top:0; left:0; right:0; bottom:0; background:url(${image}) center/cover no-repeat; filter:blur(20px); opacity:0.2;"></div>
                            <div style="flex:0.7; position:relative; background-color:rgba(255,255,255,0.05); border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); z-index:1;">
                                <img src="${image}" style="width:100%; height:100%; object-fit:contain;" />
                            </div>` : ''}
                        <div style="flex:1; display:flex; flex-direction:column; justify-content:center; position:relative; z-index:1;">
                            <h3 style="font-size:22px; color:#f1c40f; font-family:sans-serif; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:1px;">Scenario Analysis</h3>
                            <p style="font-size:22px; line-height:1.5; margin:0;">${scenario}</p>
                            ${challenge ? `<div style="margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.2); font-size:18px; color:#ff7675; font-style:italic;"><strong>Issue:</strong> ${challenge}</div>` : ''}
                        </div>
                    </div>
                    
                    <!-- 下方要点拆解 -->
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div style="color:#7f8c8d; font-size:16px; font-family:sans-serif; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">Key Findings & Action Items</div>
                        <div style="display:flex; gap:20px; align-items:stretch;">
                           ${pointsHtml}
                        </div>
                    </div>

                    <!-- 底部结论：改为非绝对定位，增加边距 -->
                    ${conclusion ? `<div style="margin-top:auto; background-color:#27ae60; color:#fff; padding:12px 40px; font-size:18px; font-weight:bold; text-align:center; border-radius:8px; box-shadow:0 4px 12px rgba(39, 174, 96, 0.2);">CONCLUSION: ${conclusion}</div>` : ''}
                </div>
            </section>
        `;
    }
}
