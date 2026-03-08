/**
 * 学术/高职方案总结结尾页
 * 适用于：本节小结、作业布置、课后实训要求
 */

import React from 'react';
import { AcademicEndingModel, ThemeConfig } from '../types/schema';
import { toInlineStyle, getBaseSlideStyle } from '../utils/styleHelper';

interface AcademicEndingLayoutProps {
  model: AcademicEndingModel;
  theme: ThemeConfig;
}

export const AcademicEndingLayout: React.FC<AcademicEndingLayoutProps> = ({ model, theme }) => {
  if (!model) return null;

  const { title, summary_points, homework, next_chapter, background_image } = model;
  
  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#2c3e50', // 深蓝底色彰显权威感与总结感
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(44, 62, 80, 0.9), rgba(44, 62, 80, 0.9)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
    fontFamily: '"Times New Roman", Times, Georgia, serif',
    color: '#ffffff',
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: '2px solid rgba(255,255,255,0.2)',
    paddingBottom: '16px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  };

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <h2 style={{ fontSize: '44px', fontWeight: 'bold', margin: 0, fontFamily: '"Times New Roman", Times, serif' }}>{title || '本章小结'}</h2>
        <div style={{ fontSize: '20px', color: '#bdc3c7', fontFamily: 'sans-serif', letterSpacing: '2px' }}>SUMMARY & ASSIGNMENT</div>
      </div>

      <div style={{ display: 'flex', gap: '40px', height: 'calc(100% - 130px)', boxSizing: 'border-box' }}>
         {/* 左栏：核心知识点回顾 */}
         <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '40px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
            <h3 style={{ fontSize: '28px', color: '#ecf0f1', display: 'inline-block', borderBottom: '2px solid #3498db', paddingBottom: '8px', margin: '0 0 20px 0', fontFamily: 'sans-serif' }}>
                核心知识点回顾
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {summary_points?.map((pt, index) => (
                    <li key={index} style={{ fontSize: '22px', color: '#bdc3c7', display: 'flex', gap: '16px', lineHeight: '1.6' }}>
                        <span style={{ color: '#3498db', fontWeight: 'bold' }}>•</span>
                        {pt}
                    </li>
                ))}
            </ul>
         </div>

         {/* 右栏：课后作业与下节预告 */}
         <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* 课后作业 */}
            {homework && homework.length > 0 && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', flex: 1 }}>
                    <h3 style={{ fontSize: '24px', color: '#f1c40f', margin: '0 0 16px 0', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span> 课后作业 / 实训要求
                    </h3>
                    <ul style={{ margin: 0, padding: '0 0 0 24px', display: 'flex', flexDirection: 'column', gap: '12px', color: '#ecf0f1' }}>
                        {homework.map((hw, idx) => (
                            <li key={idx} style={{ fontSize: '20px', lineHeight: '1.5', fontFamily: 'sans-serif' }}>{hw}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 下节预告 */}
            {next_chapter && (
                <div style={{ padding: '24px', borderLeft: '6px solid #e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#fff' }}>
                    <div style={{ fontSize: '18px', color: '#e74c3c', fontWeight: 'bold', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        [ Next Session Preview ]
                    </div>
                    <div style={{ fontSize: '24px', fontFamily: '"Times New Roman", Times, serif', fontStyle: 'italic' }}>
                        {next_chapter}
                    </div>
                </div>
            )}
         </div>
      </div>
    </section>
  );
};

export function renderAcademicEndingLayoutHTML(model: AcademicEndingModel, theme: ThemeConfig): string {
    const { title, summary_points, homework, next_chapter, background_image } = model;
    
    // @ts-ignore
    const isVariantB = String((model as any).layout_variant || (model as any).variant || 'a').toLowerCase() === 'b';

    const slideStyle = toInlineStyle({
        width: `${theme.sizes.slideWidth}px`, height: `${theme.sizes.slideHeight}px`,
        position: 'relative', overflow: 'hidden', padding: '60px', backgroundColor: '#2c3e50', color: '#ffffff',
        ...(background_image
          ? {
            backgroundImage: `linear-gradient(rgba(44, 62, 80, 0.95), rgba(44, 62, 80, 0.95)), url(${background_image})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }
          : {}),
        fontFamily: '"Times New Roman", Times, Georgia, serif', boxSizing: 'border-box',
    });
    
    if (!isVariantB) {
        // Variant A: Split screen info
        let sumHtml = '';
        if (summary_points) {
            sumHtml = summary_points.map(pt => `
                <li style="font-size:22px; color:#bdc3c7; display:flex; gap:16px; line-height:1.6;">
                    <span style="color:#3498db; font-weight:bold;">•</span>
                    ${pt}
                </li>
            `).join('');
        }

        let homeworkHtml = '';
        if (homework) {
            homeworkHtml = homework.map(hw => `<li style="font-size:20px; line-height:1.5; font-family:sans-serif;">${hw}</li>`).join('');
        }

        const nextChapterHtml = next_chapter ? `
            <div style="padding:24px; border-left:6px solid #e74c3c; background-color:rgba(231, 76, 60, 0.1); color:#fff;">
                <div style="font-size:18px; color:#e74c3c; font-weight:bold; font-family:sans-serif; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
                    [ 预习：下节导览 ]
                </div>
                <div style="font-size:24px; font-style:italic;">
                    ${next_chapter}
                </div>
            </div>
        ` : '';

        return `
            <section style="${slideStyle}">
                <div style="border-bottom:2px solid rgba(255,255,255,0.2); padding-bottom:16px; margin-bottom:32px; display:flex; justify-content:space-between; align-items:flex-end;">
                    <h2 style="font-size:44px; font-weight:bold; margin:0;">${title || '本章小结'}</h2>
                    <div style="font-size:20px; color:#bdc3c7; font-family:sans-serif; letter-spacing:2px;">SUMMARY & ASSIGNMENT</div>
                </div>

                <div style="display:flex; gap:40px; height:calc(100% - 130px); box-sizing:border-box;">
                    <div style="flex:1.2; display:flex; flex-direction:column; gap:20px; padding-right:40px; border-right:1px solid rgba(255,255,255,0.2);">
                        <h3 style="font-size:28px; color:#ecf0f1; display:inline-block; border-bottom:2px solid #3498db; padding-bottom:8px; margin:0 0 20px 0; font-family:sans-serif;">
                            核心知识回顾
                        </h3>
                        <ul style="margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:24px;">
                            ${sumHtml}
                        </ul>
                    </div>

                    <div style="flex:1; display:flex; flex-direction:column; gap:40px;">
                        <div style="background-color:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:24px; flex:1;">
                            <h3 style="font-size:24px; color:#f1c40f; margin:0 0 16px 0; font-family:sans-serif; display:flex; align-items:center; gap:8px;">
                                <span>📋</span> ${homework && homework.length > 0 ? '课后实训/作业要求' : '课后说明'}
                            </h3>
                            <ul style="margin:0; padding:0 0 0 24px; display:flex; flex-direction:column; gap:16px; color:#ecf0f1;">
                                ${homeworkHtml}
                            </ul>
                        </div>
                        ${nextChapterHtml}
                    </div>
                </div>
            </section>
        `;
    } else {
        // Variant B: Centered Focus Conclusion
        let sumHtml = '';
        if (summary_points && summary_points.length > 0) {
            sumHtml = `
               <div style="background-color:rgba(255,255,255,0.1); padding:30px; border-radius:12px; margin-bottom:24px;">
                   <h3 style="color:#f1c40f; font-size:24px; font-family:sans-serif; text-transform:uppercase; margin:0 0 16px 0; border-bottom:1px solid rgba(241, 196, 15, 0.3); padding-bottom:8px;">💡 Key Takeaways</h3>
                   <div style="display:flex; gap:16px; flex-wrap:wrap; justify-content:center;">
                       ${summary_points.map(pt => `<div style="background-color:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); padding:16px; border-radius:8px; width:calc(50% - 10px); box-sizing:border-box; color:#ecf0f1; font-size:18px; line-height:1.5;">${pt}</div>`).join('')}
                   </div>
               </div>
            `;
        }
        
        // homework items as checkmarks in a list below it
        let homeworkHtml = '';
        if (homework && homework.length > 0) {
            homeworkHtml = homework.map(hw => `<div style="font-size:20px; line-height:1.6; color:#e0e0e0; display:flex; gap:8px;"><span>✅</span> ${hw}</div>`).join('');
            homeworkHtml = `<div style="display:flex; flex-direction:column; gap:12px; align-items:flex-start;">${homeworkHtml}</div>`;
        }

        const inlineCenteredStyle = toInlineStyle({
            width: `${theme.sizes.slideWidth}px`, height: `${theme.sizes.slideHeight}px`,
            position: 'relative', overflow: 'hidden', padding: '100px', backgroundColor: '#e74c3c', color: '#ffffff',
            ...(background_image
              ? {
                backgroundImage: `linear-gradient(rgba(231, 76, 60, 0.9), rgba(231, 76, 60, 0.9)), url(${background_image})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }
              : {}),
            fontFamily: '"Times New Roman", Times, Georgia, serif', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
        });
        
        return `
            <section style="${inlineCenteredStyle}">
                <div style="font-size:24px; color:#f1c40f; font-weight:bold; letter-spacing:4px; font-family:sans-serif; margin-bottom:16px;">LESSON END (VARIANT B)</div>
                <h2 style="font-size:64px; font-weight:bold; color:#fff; border-bottom:4px solid #f1c40f; padding-bottom:16px; margin:0 0 40px 0; display:inline-block;">${title || '课堂总结'}</h2>
                
                <div style="width:100%; max-width:900px; display:flex; flex-direction:column; gap:20px;">
                    ${sumHtml}
                    
                    ${homeworkHtml ? `
                    <div style="align-self:stretch; background-color:rgba(0,0,0,0.2); border-left:6px solid #f1c40f; padding:24px; text-align:left;">
                        <h4 style="margin:0 0 12px 0; color:#f1c40f; font-size:22px; font-family:sans-serif;">Task & Assignments</h4>
                        ${homeworkHtml}
                    </div>
                    ` : ''}
                    
                    ${next_chapter ? `
                    <div style="margin-top:20px; display:flex; align-items:center; justify-content:center; gap:20px; color:#ecf0f1;">
                        <span style="height:1px; width:50px; background-color:#ecf0f1;"></span>
                        <i style="font-size:22px;">Next: ${next_chapter}</i>
                        <span style="height:1px; width:50px; background-color:#ecf0f1;"></span>
                    </div>
                    ` : ''}
                </div>
            </section>
        `;
    }
}
