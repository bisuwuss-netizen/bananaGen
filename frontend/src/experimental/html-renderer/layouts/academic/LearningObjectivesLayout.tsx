/**
 * 学习目标布局组件（学术方案专属）
 * 特征：SMART目标结构 + 复选框 + 学时标签 + 认知层级标记
 * 风格：学术严谨，石板蓝为主色调，强调留白和排版，排斥艳丽颜色
 */

import React from 'react';
import { LearningObjectivesModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../../utils/styleHelper';
import { isLayoutVariantB } from '../shared/layoutVariant';

interface LearningObjectivesLayoutProps {
  model: LearningObjectivesModel;
  theme: ThemeConfig;
}

export const LearningObjectivesLayout: React.FC<LearningObjectivesLayoutProps> = ({ model, theme }) => {
  if (!model) {
    return (
      <section style={{
        ...getBaseSlideStyle(theme),
        display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee', color: '#c00',
      }}>
        错误: LearningObjectivesLayout model 为空
      </section>
    );
  }

  const { title, course_code, background_image } = model;
  const objectives = Array.isArray(model.objectives) ? model.objectives : [];

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#f8f9fa', // 接近纸张的浅灰白
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(248, 249, 250, 0.95), rgba(248, 249, 250, 0.95)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
    fontFamily: '"Times New Roman", Times, serif', // 强制学术衬线体
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
    color: '#2c3e50', // 石板蓝
    margin: 0,
    letterSpacing: '1px',
    fontFamily: '"Times New Roman", Times, serif',
  };

  const codeStyle: React.CSSProperties = {
    fontSize: '20px',
    color: '#7f8c8d',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  };

  const objectivesContainerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
    alignItems: 'stretch',
  };

  // 学术风格下的认知层级，使用克制的灰蓝色调，放弃明大红大绿
  const getLevelColor = (level: string): string => {
    const levelMap: Record<string, string> = {
      '记忆': '#95a5a6',
      '理解': '#7f8c8d',
      '应用': '#34495e',
      '分析': '#2c3e50',
      '综合': '#1a252f',
      '评价': '#b8860b', // 金棕色强调最高层级
    };
    return levelMap[level] || '#7f8c8d';
  };

  const isVariantB = isLayoutVariantB(model);

  return (
    <section style={slideStyle}>
      {!isVariantB ? (
        <>
          <div style={headerStyle}>
            <h2 style={titleStyle}>{title || '学习目标'}</h2>
            {course_code && <div style={codeStyle}>{course_code}</div>}
          </div>

          <div style={objectivesContainerStyle}>
            {objectives.map((objective, index) => {
              const accentColor = getLevelColor(objective.level || '理解');
              const cardStyle: React.CSSProperties = {
                backgroundColor: '#ffffff',
                border: '1px solid #e0e0e0',
                borderLeft: `4px solid ${accentColor}`,
                padding: '24px',
                position: 'relative',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
              };

              const headerRowStyle: React.CSSProperties = {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              };

              const levelBadgeStyle: React.CSSProperties = {
                fontSize: '14px',
                color: accentColor,
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
              };

              const hoursStyle: React.CSSProperties = {
                fontSize: '14px',
                color: '#95a5a6',
                fontFamily: 'sans-serif',
                border: '1px solid #ecf0f1',
                padding: '2px 8px',
                borderRadius: '2px',
              };

              const textStyle: React.CSSProperties = {
                fontSize: '20px',
                color: '#34495e',
                lineHeight: '1.6',
                margin: 0,
                flexGrow: 1,
                fontFamily: '"Times New Roman", Times, serif',
              };

              return (
                <div key={index} style={cardStyle}>
                  <div style={headerRowStyle}>
                    <span style={levelBadgeStyle}>{objective.level || '认知点'}</span>
                    {objective.hours && <span style={hoursStyle}>{objective.hours} H</span>}
                  </div>
                  <p style={textStyle}>{objective.text}</p>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', gap: '60px', height: '100%', alignItems: 'center' }}>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                 <div style={{ ...headerStyle, borderBottom: 'none', marginBottom: '0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
                    <h2 style={{ ...titleStyle, fontSize: '56px', borderLeft: '8px solid #2c3e50', paddingLeft: '24px' }}>{title || '学习目标'}</h2>
                    {course_code && <div style={{ ...codeStyle, paddingLeft: '24px' }}>{course_code}</div>}
                 </div>
            </div>
            <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {objectives.map((objective, index) => {
                    const accentColor = getLevelColor(objective.level || '理解');
                    const textStyle: React.CSSProperties = {
                        fontSize: '20px',
                        color: '#34495e',
                        lineHeight: '1.6',
                        margin: 0,
                        flexGrow: 1,
                        fontFamily: '"Times New Roman", Times, serif',
                    };
                    return (
                        <div key={index} style={{ display: 'flex', flexDirection: 'column', borderLeft: `6px solid ${accentColor}`, paddingLeft: '24px', backgroundColor: 'transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '16px', color: accentColor, fontWeight: 'bold', fontFamily: 'sans-serif', letterSpacing: '1px' }}>{objective.level || '认知点'}</span>
                                {objective.hours && <span style={{ fontSize: '14px', color: '#95a5a6', border: '1px solid #ecf0f1', padding: '2px 8px', borderRadius: '4px' }}>{objective.hours} H</span>}
                            </div>
                            <p style={textStyle}>{objective.text}</p>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {theme.decorations?.footerStyle?.show && (
        <div style={{
          position: 'absolute', bottom: '30px', left: '60px', right: '60px',
          display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bdc3c7', paddingTop: '16px',
          fontSize: '14px', color: '#7f8c8d', fontFamily: 'sans-serif'
        }}>
          <span>LEARNING OBJECTIVES</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      )}
    </section>
  );
};

export function renderLearningObjectivesLayoutHTML(model: LearningObjectivesModel, theme: ThemeConfig): string {
  const { title, course_code, background_image } = model;
  const objectives = Array.isArray(model.objectives) ? model.objectives : [];

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
    fontSize: '44px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: '0',
    letterSpacing: '1px',
    fontFamily: '"Times New Roman", Times, serif',
  });

  const codeStyle = toInlineStyle({
    fontSize: '20px',
    color: '#7f8c8d',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  });

  const gridStyle = toInlineStyle({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  });

  const getLevelColor = (level: string) => {
    const map: Record<string, string> = { '记忆': '#95a5a6', '理解': '#7f8c8d', '应用': '#34495e', '分析': '#2c3e50', '综合': '#1a252f', '评价': '#b8860b' };
    return map[level] || '#7f8c8d';
  };

  const cardsHtml = objectives.map((obj) => {
    const accentColor = getLevelColor(obj.level || '理解');
    const cardStyle = toInlineStyle({
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderLeft: `4px solid ${accentColor}`,
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
    });
    const cardHeaderStyle = toInlineStyle({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    });
    const levelStyle = toInlineStyle({
      fontSize: '14px', color: accentColor, fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'sans-serif'
    });
    const timeStyle = toInlineStyle({
      fontSize: '14px', color: '#95a5a6', border: '1px solid #ecf0f1', padding: '2px 8px', borderRadius: '2px', fontFamily: 'sans-serif'
    });
    const textStyle = toInlineStyle({
      fontSize: '20px', color: '#34495e', lineHeight: '1.6', margin: '0', fontFamily: '"Times New Roman", Times, serif'
    });

    return `
      <div style="${cardStyle}">
        <div style="${cardHeaderStyle}">
          <span style="${levelStyle}">${obj.level || '认知点'}</span>
          ${obj.hours ? `<span style="${timeStyle}">${obj.hours} H</span>` : ''}
        </div>
        <p style="${textStyle}">${obj.text || ''}</p>
      </div>
    `;
  }).join('');

  let footerHtml = '';
  if (theme.decorations?.footerStyle?.show) {
    const footerStyle = toInlineStyle({
      position: 'absolute', bottom: '30px', left: '60px', right: '60px',
      display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bdc3c7', paddingTop: '16px',
      fontSize: '14px', color: '#7f8c8d', fontFamily: 'sans-serif'
    });
    footerHtml = `<div style="${footerStyle}"><span>LEARNING OBJECTIVES</span><span>${new Date().getFullYear()}</span></div>`;
  }

  const isVariantB = isLayoutVariantB(model);

  if (!isVariantB) {
      return `
        <section style="${slideStyle}">
          <div style="${headerStyle}">
            <h2 style="${titleStyle}">${title || '学习目标'}</h2>
            ${course_code ? `<div style="${codeStyle}">${course_code}</div>` : ''}
          </div>
          <div style="${gridStyle}">
            ${cardsHtml}
          </div>
          ${footerHtml}
        </section>
      `;
  } else {
      const bCardsHtml = objectives.map((obj) => {
        const accentColor = getLevelColor(obj.level || '理解');
        const textStyle = toInlineStyle({ fontSize: '20px', color: '#34495e', lineHeight: '1.6', margin: '0', flexGrow: '1', fontFamily: '"Times New Roman", Times, serif' });
        return `
            <div style="display:flex; flex-direction:column; border-left:6px solid ${accentColor}; padding-left:24px; background-color:transparent;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <span style="font-size:16px; color:${accentColor}; font-weight:bold; font-family:sans-serif; letter-spacing:1px;">${obj.level || '认知点'}</span>
                    ${obj.hours ? `<span style="font-size:14px; color:#95a5a6; border:1px solid #ecf0f1; padding:2px 8px; border-radius:4px;">${obj.hours} H</span>` : ''}
                </div>
                <p style="${textStyle}">${obj.text || ''}</p>
            </div>
        `;
      }).join('');
      
      return `
        <section style="${slideStyle}">
          <div style="display:flex; gap:60px; height:100%; align-items:center;">
             <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
                 <div style="display:flex; flex-direction:column; gap:16px; align-items:flex-start;">
                    <h2 style="font-size:56px; font-weight:bold; color:#2c3e50; margin:0; border-left:8px solid #2c3e50; padding-left:24px; font-family:'Times New Roman', Times, serif;">${title || '学习目标'}</h2>
                    ${course_code ? `<div style="font-size:20px; color:#7f8c8d; font-family:monospace; letter-spacing:2px; padding-left:24px;">${course_code}</div>` : ''}
                 </div>
             </div>
             <div style="flex:1.2; display:flex; flex-direction:column; gap:32px;">
                 ${bCardsHtml}
             </div>
          </div>
          ${footerHtml}
        </section>
      `;
  }
}

export default LearningObjectivesLayout;
