/**
 * 职教专属：CAD蓝图微距透视
 * 适用于：精密部件拆解、金相显微分析、内部复杂走线图解
 */

import React from 'react';
import { DetailZoomModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../../utils/styleHelper';

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const VocationalBlueprintZoomLayout: React.FC<{
  model: DetailZoomModel;
  theme: ThemeConfig;
}> = ({ model, theme }) => {
  const { title, image_src, annotations, background_image } = model;
  
  const bgDark = theme.colors.background === '#ffffff' ? '#07090F' : theme.colors.background;
  const techCyan = '#00FFCC';
  const textWhite = '#F0F0F0';

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: bgDark,
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : {}),
    position: 'relative',
    display: 'flex',
    boxSizing: 'border-box',
    padding: '0',
    color: textWhite,
    fontFamily: theme.fonts.body,
    overflow: 'hidden',
  };

  return (
    <section style={slideStyle}>
      {/* 左侧：全出血巨幅微距图像区 */}
      <div style={{
        flex: '5 1 0',
        height: '100%',
        position: 'relative',
        backgroundImage: `url(${image_src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRight: `2px solid ${techCyan}`,
      }}>
        {/* HUD 扫描线遮罩 */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(rgba(0, 255, 204, 0.05) 50%, rgba(0, 0, 0, 0) 50%)',
          backgroundSize: '100% 4px',
          pointerEvents: 'none',
        }} />

        {/* 瞄准镜四角修饰（左上/右下） */}
        <div style={{ position: 'absolute', top: '40px', left: '40px', width: '60px', height: '60px', borderTop: `4px solid ${techCyan}`, borderLeft: `4px solid ${techCyan}` }} />
        <div style={{ position: 'absolute', bottom: '40px', right: '40px', width: '60px', height: '60px', borderBottom: `4px solid ${techCyan}`, borderRight: `4px solid ${techCyan}` }} />

        {/* 图片标注叠加层 */}
        {annotations && annotations.map((ann, idx) => (
          <div key={idx} style={{
            position: 'absolute',
            left: `${ann.x}%`,
            top: `${ann.y}%`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transform: 'translate(-12px, -12px)',
          }}>
            {/* 准星十字 */}
            <div style={{ position: 'relative', width: '24px', height: '24px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '-8px', right: '-8px', height: '2px', backgroundColor: techCyan, transform: 'translateY(-50%)' }} />
              <div style={{ position: 'absolute', left: '50%', top: '-8px', bottom: '-8px', width: '2px', backgroundColor: techCyan, transform: 'translateX(-50%)' }} />
              <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: `1px solid ${techCyan}`, backgroundColor: 'rgba(0,255,204,0.2)' }} />
            </div>
            
            {/* 引线标签 */}
            <div style={{
              backgroundColor: 'rgba(10,12,20,0.85)',
              border: `1px solid ${techCyan}`,
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 800,
              color: techCyan,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
            }}>
              TARGET // {ann.label}
            </div>
          </div>
        ))}
      </div>

      {/* 右侧：规格解剖面板 */}
      <div style={{
        flex: '3 1 0',
        padding: '60px 40px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#11131A',
        position: 'relative',
        zIndex: 10,
        boxShadow: '-20px 0 50px rgba(0,0,0,0.8)',
      }}>
        <div style={{ fontSize: '14px', color: '#6A6D75', letterSpacing: '4px', marginBottom: '16px', fontWeight: 900 }}>SPECIFICATION ANALYSIS</div>
        <h2 style={{ fontSize: '32px', fontWeight: 900, color: textWhite, margin: '0 0 48px 0', lineHeight: 1.3 }}>{title}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', overflowY: 'auto' }}>
          {annotations && annotations.map((ann, idx) => (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingLeft: '20px',
              borderLeft: `1px solid ${idx === 0 ? techCyan : '#333740'}`, // 第一个高亮，或全暗
            }}>
              <div style={{ display: 'flex', alignItems: 'baseLine', gap: '16px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: techCyan, opacity: 0.8 }}>MARK / {(idx + 1).toString().padStart(2, '0')}</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: textWhite }}>{ann.label}</span>
              </div>
              <p style={{ margin: 0, fontSize: '15px', color: '#A0A3AA', lineHeight: 1.6 }}>{ann.description}</p>
            </div>
          ))}
        </div>

        {/* 底部机械纹理假信息框 */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '32px',
          borderTop: '1px solid #2A2D35',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#555860',
          fontFamily: 'monospace',
        }}>
          <span>SYS.RENDER: OK</span>
          <span>SCALE: MICRO</span>
          <span>VER: 1.0.4</span>
        </div>
      </div>
    </section>
  );
};

export function renderVocationalBlueprintZoomLayoutHTML(model: any, theme: ThemeConfig): string {
  const { title, image_src, annotations, background_image } = model;
  
  const bgDark = theme.colors.background === '#ffffff' ? '#07090F' : theme.colors.background;
  const techCyan = '#00FFCC';
  const textWhite = '#F0F0F0';

  const slideStyle = toInlineStyle({
    ...getBaseSlideStyle(theme),
    backgroundColor: bgDark,
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    position: 'relative',
    display: 'flex',
    boxSizing: 'border-box',
    padding: '0',
    color: textWhite,
    fontFamily: theme.fonts.body,
    overflow: 'hidden',
  });

  const annHTML = (annotations || []).map((ann: any, idx: number) => `
    <div style="position: absolute; left: ${ann.x}%; top: ${ann.y}%; display: flex; align-items: center; gap: 16px; transform: translate(-12px, -12px);">
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; top: 50%; left: -8px; right: -8px; height: 2px; background-color: ${techCyan}; transform: translateY(-50%);"></div>
        <div style="position: absolute; left: 50%; top: -8px; bottom: -8px; width: 2px; background-color: ${techCyan}; transform: translateX(-50%);"></div>
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 1px solid ${techCyan}; background-color: rgba(0,255,204,0.2);"></div>
      </div>
      <div style="background-color: rgba(10,12,20,0.85); border: 1px solid ${techCyan}; padding: 8px 16px; font-size: 14px; font-weight: 800; color: ${techCyan}; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; backdrop-filter: blur(4px);">
        TARGET // ${ann.label}
      </div>
    </div>
  `).join('\n');

  const annListHTML = (annotations || []).map((ann: any, idx: number) => `
    <div style="display: flex; flex-direction: column; gap: 12px; padding-left: 20px; border-left: 1px solid ${idx === 0 ? techCyan : '#333740'};">
      <div style="display: flex; align-items: baseline; gap: 16px;">
        <span style="font-size: 18px; font-weight: 900; color: ${techCyan}; opacity: 0.8;">MARK / ${(idx + 1).toString().padStart(2, '0')}</span>
        <span style="font-size: 20px; font-weight: 800; color: ${textWhite};">${ann.label}</span>
      </div>
      <p style="margin: 0; font-size: 15px; color: #A0A3AA; line-height: 1.6;">${ann.description}</p>
    </div>
  `).join('\n');

  return `
<section style="${slideStyle}">
  <div style="flex: 5 1 0; height: 100%; position: relative; background-image: url(${image_src}); background-size: cover; background-position: center; border-right: 2px solid ${techCyan};">
    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(rgba(0, 255, 204, 0.05) 50%, rgba(0, 0, 0, 0) 50%); background-size: 100% 4px; pointer-events: none;"></div>
    <div style="position: absolute; top: 40px; left: 40px; width: 60px; height: 60px; border-top: 4px solid ${techCyan}; border-left: 4px solid ${techCyan};"></div>
    <div style="position: absolute; bottom: 40px; right: 40px; width: 60px; height: 60px; border-bottom: 4px solid ${techCyan}; border-right: 4px solid ${techCyan};"></div>
    ${annHTML}
  </div>
  <div style="flex: 3 1 0; padding: 60px 40px; display: flex; flex-direction: column; background-color: #11131A; position: relative; z-index: 10; box-shadow: -20px 0 50px rgba(0,0,0,0.8);">
    <div style="font-size: 14px; color: #6A6D75; letter-spacing: 4px; margin-bottom: 16px; font-weight: 900;">SPECIFICATION ANALYSIS</div>
    <h2 style="font-size: 32px; font-weight: 900; color: ${textWhite}; margin: 0 0 48px 0; line-height: 1.3;">${title}</h2>
    <div style="display: flex; flex-direction: column; gap: 32px; overflow-y: auto;">
      ${annListHTML}
    </div>
    <div style="margin-top: auto; padding-top: 32px; border-top: 1px solid #2A2D35; display: flex; justify-content: space-between; font-size: 12px; color: #555860; font-family: monospace;">
      <span>SYS.RENDER: OK</span>
      <span>SCALE: MICRO</span>
      <span>VER: 1.0.4</span>
    </div>
  </div>
</section>`;
}
