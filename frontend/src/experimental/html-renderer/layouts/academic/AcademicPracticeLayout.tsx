/**
 * 随堂练习/实训任务布局（学术/高职方案专属）
 * 适用于：理论后的巩固测验、机房/车间的动手实操任务
 */

import React from 'react';
import { AcademicPracticeModel, ThemeConfig } from '../../types/schema';
import { toInlineStyle, getBaseSlideStyle } from '../../utils/styleHelper';
import { isLayoutVariantB } from '../shared/layoutVariant';

interface AcademicPracticeLayoutProps {
  model: AcademicPracticeModel;
  theme: ThemeConfig;
}

export const AcademicPracticeLayout: React.FC<AcademicPracticeLayoutProps> = ({ model, theme }) => {
  if (!model) return null;

  const { title, task_type, description, requirements, options, hint, background_image } = model;
  
  const isQuiz = task_type === 'quiz';
  const typeLabel = isQuiz ? 'QUIZ CHECK' : 'HANDS-ON TASK';

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

  const isVariantB = isLayoutVariantB(model);

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>{title || '课堂任务'}</h2>
        <div style={{ fontSize: '20px', color: '#7f8c8d', fontFamily: 'sans-serif', letterSpacing: '2px' }}>{typeLabel}{isVariantB ? ' (VARIANT B)' : ''}</div>
      </div>

      {!isVariantB ? (
          <div style={{ display: 'flex', gap: '40px', height: 'calc(100% - 130px)', boxSizing: 'border-box' }}>
             {/* 核心问题区 / 任务描述区 */}
             <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #bdc3c7', padding: '30px', flex: '1', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '24px', color: '#2c3e50', fontFamily: 'sans-serif', borderBottom: '3px solid #e67a22', display: 'inline-block', paddingBottom: '8px', margin: '0 0 20px 0', alignSelf: 'flex-start' }}>
                       提干描述 / 任务情境
                    </h3>
                    <p style={{ fontSize: '24px', color: '#34495e', lineHeight: '1.8', margin: 0, textAlign: 'justify' }}>{description}</p>
                </div>
                {hint && (
                    <div style={{ padding: '16px 20px', backgroundColor: '#fcf3cf', borderLeft: '6px solid #f1c40f', color: '#8e44ad', fontSize: '18px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                        💡 答题/实训提示： <span style={{ fontWeight: 'normal', color: '#2c3e50' }}>{hint}</span>
                    </div>
                )}
             </div>

             {/* 选项区 / 实操要求区 */}
             <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                {isQuiz && options ? (
                    // 选择题选项区
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {options.map((opt, index) => (
                            <div key={index} style={{
                                backgroundColor: '#fff', border: '2px solid #ecf0f1', borderRadius: '8px', padding: '20px',
                                display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer',
                            }}>
                               <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ecf0f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#7f8c8d', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                                   {String.fromCharCode(65 + index)}
                               </div>
                               <div style={{ fontSize: '22px', color: '#2c3e50', fontFamily: 'sans-serif' }}>{opt}</div>
                            </div>
                        ))}
                    </div>
                ) : requirements ? (
                    // 实训步骤区
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #bdc3c7', padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '24px', color: '#2c3e50', fontFamily: 'sans-serif', marginTop: 0, marginBottom: '20px' }}>考核维度/操作要求</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {requirements.map((req, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <div style={{ color: '#27ae60', fontSize: '24px', marginTop: '-2px' }}>✓</div>
                                    <div style={{ fontSize: '20px', color: '#34495e', lineHeight: '1.6', fontFamily: 'sans-serif' }}>{req}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
             </div>
          </div>
      ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 130px)', boxSizing: 'border-box' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '24px', color: '#3498db', fontFamily: 'sans-serif', margin: '0 0 20px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>Task Description</h3>
                  <p style={{ fontSize: '28px', color: '#2c3e50', lineHeight: '1.6', margin: 0, fontWeight: 'bold' }}>{description}</p>
                  {hint && (
                    <div style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#2c3e50', color: '#fff', borderRadius: '20px', fontSize: '18px', marginTop: '20px', fontFamily: 'sans-serif' }}>
                        💡 提示：<span style={{ fontWeight: 'normal', color: '#bdc3c7' }}>{hint}</span>
                    </div>
                  )}
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', width: '100%' }}>
                  {isQuiz && options ? (
                      <div style={{ display: 'flex', gap: '24px', width: '100%' }}>
                          {options.map((opt, index) => (
                              <div key={index} style={{ flex: 1, backgroundColor: '#fff', border: '3px solid #ecf0f1', borderTop: '6px solid #e74c3c', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', borderRadius: '8px' }}>
                                  <div style={{ width: '50px', height: '50px', backgroundColor: '#fef9e7', color: '#e67a22', fontSize: '28px', fontWeight: 'bold', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
                                      {String.fromCharCode(65 + index)}
                                  </div>
                                  <div style={{ fontSize: '22px', color: '#2c3e50', fontFamily: 'sans-serif' }}>{opt}</div>
                              </div>
                          ))}
                      </div>
                  ) : requirements ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', width: '100%' }}>
                          {requirements.map((req, index) => (
                              <div key={index} style={{ display: 'flex', gap: '16px', backgroundColor: '#f8f9fa', border: '1px solid #bdc3c7', padding: '20px', width: 'calc(50% - 12px)', boxSizing: 'border-box' }}>
                                  <div style={{ width: '36px', height: '36px', backgroundColor: '#34495e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px' }}>0{index + 1}</div>
                                  <div style={{ fontSize: '20px', color: '#34495e', lineHeight: '1.6', fontFamily: 'sans-serif' }}>{req}</div>
                              </div>
                          ))}
                      </div>
                  ) : null}
              </div>
          </div>
      )}
    </section>
  );
};

export function renderAcademicPracticeLayoutHTML(model: AcademicPracticeModel, theme: ThemeConfig): string {
  const { title, task_type, description, requirements, options, hint, background_image } = model;
  
  const isQuiz = task_type === 'quiz';
  const typeLabel = isQuiz ? 'QUIZ CHECK' : 'HANDS-ON TASK';

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    padding: '60px',
    backgroundColor: '#f8f9fa',
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(248, 249, 250, 0.95), rgba(248, 249, 250, 0.95)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
    fontFamily: '"Times New Roman", Times, Georgia, serif',
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

  let hintHtml = '';
  if (hint) {
    const hintStyle = toInlineStyle({
      padding: '16px 20px', backgroundColor: '#fcf3cf', borderLeft: '6px solid #f1c40f',
      color: '#8e44ad', fontSize: '18px', fontWeight: 'bold', fontFamily: 'sans-serif'
    });
    hintHtml = `<div style="${hintStyle}">💡 答题/实训提示： <span style="font-weight:normal; color:#2c3e50;">${hint}</span></div>`;
  }

  let leftHtml = '';
  let rightHtml = '';

  const isVariantB = isLayoutVariantB(model);

  if (!isVariantB) {
    if (hint) {
      const hintStyle = toInlineStyle({
        padding: '16px 20px', backgroundColor: '#fcf3cf', borderLeft: '6px solid #f1c40f',
        color: '#8e44ad', fontSize: '18px', fontWeight: 'bold', fontFamily: 'sans-serif'
      });
      hintHtml = `<div style="${hintStyle}">💡 答题/实训提示： <span style="font-weight:normal; color:#2c3e50;">${hint}</span></div>`;
    }
    
    leftHtml = `
      <div style="flex:1.2; display:flex; flex-direction:column; gap:24px;">
        <div style="background-color:#ffffff; border:1px solid #bdc3c7; padding:30px; flex:1; display:flex; flex-direction:column;">
          <h3 style="font-size:24px; color:#2c3e50; font-family:sans-serif; border-bottom:3px solid #e67a22; display:inline-block; padding-bottom:8px; margin:0 0 20px 0; align-self:flex-start;">
            提干描述 / 任务情境
          </h3>
          <p style="font-size:24px; color:#34495e; line-height:1.8; margin:0; text-align:justify;">${description || ''}</p>
        </div>
        ${hintHtml}
      </div>
    `;

    // A版 右侧
    if (isQuiz && options) {
      const optionsHtml = options.map((opt, index) => {
        const optContainer = toInlineStyle({
          backgroundColor: '#fff', border: '2px solid #ecf0f1', borderRadius: '8px', padding: '20px',
          display: 'flex', alignItems: 'center', gap: '20px'
        });
        const iconStyle = toInlineStyle({
          width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ecf0f1',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
          color: '#7f8c8d', fontWeight: 'bold', fontFamily: 'sans-serif'
        });
        return `
          <div style="${optContainer}">
            <div style="${iconStyle}">${String.fromCharCode(65 + index)}</div>
            <div style="font-size:22px; color:#2c3e50; font-family:sans-serif;">${opt}</div>
          </div>
        `;
      }).join('');
      rightHtml = `<div style="flex:1; display:flex; flex-direction:column; gap:16px; justify-content:center;">
                      <div style="display:flex; flex-direction:column; gap:20px;">${optionsHtml}</div>
                   </div>`;
    } else if (requirements) {
      const reqListHtml = requirements.map(req => {
        return `
          <div style="display:flex; align-items:flex-start; gap:12px;">
            <div style="color:#27ae60; font-size:24px; margin-top:-2px;">✓</div>
            <div style="font-size:20px; color:#34495e; line-height:1.6; font-family:sans-serif;">${req}</div>
          </div>
        `;
      }).join('');
      
      const reqContainerStyle = toInlineStyle({
        backgroundColor: '#ffffff', border: '1px solid #bdc3c7', padding: '24px',
        height: '100%', display: 'flex', flexDirection: 'column'
      });
      
      rightHtml = `
        <div style="flex:1; display:flex; flex-direction:column; gap:16px; justify-content:center;">
          <div style="${reqContainerStyle}">
            <h3 style="font-size:24px; color:#2c3e50; font-family:sans-serif; margin-top:0; margin-bottom:20px;">考核维度/操作要求</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${reqListHtml}
            </div>
          </div>
        </div>
      `;
    }
    
    return `
      <section style="${slideStyle}">
        <div style="${headerStyle}">
          <h2 style="font-size:44px; font-weight:bold; color:#2c3e50; margin:0;">${title || '课堂实训'}</h2>
          <div style="font-size:20px; color:#7f8c8d; font-family:sans-serif; letter-spacing:2px;">${typeLabel}</div>
        </div>

        <div style="display:flex; gap:40px; height:calc(100% - 130px); box-sizing:border-box;">
          ${leftHtml}
          ${rightHtml}
        </div>
      </section>
    `;
  } else {
    // 变体 B：横向铺开的上下结构，适合长题干和少量选项并排
    if (hint) {
      hintHtml = `
        <div style="display:inline-block; padding:12px 24px; background-color:#2c3e50; color:#fff; border-radius:20px; font-size:18px; margin-top:20px; font-family:sans-serif;">
            💡 提示：<span style="font-weight:normal; color:#bdc3c7;">${hint}</span>
        </div>
      `;
    }
    
    let bottomHtml = '';
    if (isQuiz && options) {
        const optionCards = options.map((opt, id) => `
            <div style="flex:1; background-color:#fff; border:3px solid #ecf0f1; border-top:6px solid #e74c3c; padding:24px 16px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:16px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.02);">
                <div style="width:48px; height:48px; background-color:#fef9e7; color:#e67a22; font-size:24px; font-weight:bold; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:sans-serif;">
                    ${String.fromCharCode(65 + id)}
                </div>
                <div style="font-size:20px; color:#2c3e50; font-family:sans-serif; line-height:1.4;">${opt}</div>
            </div>
        `).join('');
        bottomHtml = `<div style="display:flex; gap:20px; width:100%; margin-top:20px; align-items:stretch;">${optionCards}</div>`;
    } else if (requirements) {
        const reqCards = requirements.slice(0, 4).map((req, id) => `
            <div style="display:flex; gap:16px; background-color:#f8f9fa; border:1px solid #bdc3c7; padding:16px 20px; width:calc(50% - 10px); box-sizing:border-box; border-radius:8px;">
                <div style="width:32px; height:32px; background-color:#34495e; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:18px; border-radius:4px; flex-shrink:0;">0${id + 1}</div>
                <div style="font-size:18px; color:#34495e; line-height:1.5; font-family:sans-serif;">${req}</div>
            </div>
        `).join('');
        bottomHtml = `<div style="display:flex; flex-wrap:wrap; gap:20px; width:100%; margin-top:20px;">${reqCards}</div>`;
    }

    return `
      <section style="${slideStyle}">
        <div style="${headerStyle}">
          <h2 style="font-size:44px; font-weight:bold; color:#2c3e50; margin:0;">${title || '随堂任务'}</h2>
          <div style="font-size:20px; color:#7f8c8d; font-family:sans-serif; letter-spacing:2px; text-transform:uppercase;">${typeLabel} (VARIANT B)</div>
        </div>

        <div style="display:flex; flex-direction:column; height:calc(100% - 110px); box-sizing:border-box; gap:20px;">
          <!-- 题干区：减小Padding，增加弹性 -->
          <div style="flex:1; background-color:#ffffff; border:1px solid #e0e0e0; padding:30px 40px; box-shadow:0 8px 24px rgba(0,0,0,0.03); text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center; border-radius:12px;">
             <h3 style="font-size:22px; color:#3498db; font-family:sans-serif; margin:0 0 16px 0; letter-spacing:1px; text-transform:uppercase; font-weight:bold;">Task Context</h3>
             <p style="font-size:26px; color:#2c3e50; line-height:1.5; margin:0; max-width:850px;">${description || ''}</p>
             ${hintHtml.replace('💡 答题/实训提示：', '💡 TIP:')}
          </div>
          
          <!-- 选项区 -->
          <div style="flex:0.8; display:flex; align-items:center;">
             ${bottomHtml}
          </div>
        </div>
      </section>
    `;
  }
}
