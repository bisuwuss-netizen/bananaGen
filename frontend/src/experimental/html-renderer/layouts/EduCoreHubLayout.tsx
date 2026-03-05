import React from 'react';
import { EduCoreHubModel, ThemeConfig } from '../types/schema';

interface EduCoreHubLayoutProps {
  model: EduCoreHubModel;
  theme: ThemeConfig;
}

type LooseEduCoreHubModel = Partial<EduCoreHubModel> & {
  content?: string[] | string;
  bullets?: Array<{ text?: string } | string>;
};

function normalizeModel(input: LooseEduCoreHubModel): EduCoreHubModel {
  const nodesFromModel = Array.isArray(input.nodes)
    ? input.nodes.map((node) => ({ title: String(node.title || '').trim() })).filter((node) => node.title)
    : [];

  const nodesFromBullets = Array.isArray(input.bullets)
    ? input.bullets
      .map((item) => (typeof item === 'string' ? item.trim() : String(item?.text || '').trim()))
      .filter(Boolean)
      .map((title) => ({ title }))
    : [];

  const rawContent = Array.isArray(input.content)
    ? input.content
    : typeof input.content === 'string'
      ? [input.content]
      : [];
  const nodesFromContent = rawContent
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((title) => ({ title }));

  const nodes = nodesFromModel.length > 0 ? nodesFromModel : (nodesFromBullets.length > 0 ? nodesFromBullets : nodesFromContent);

  return {
    title: String(input.title || '').trim() || '教学实施过程-核心模型',
    subtitle: input.subtitle,
    variant: input.variant,
    center_label: String(input.center_label || '').trim() || '学生中心',
    nodes: nodes.length > 0
      ? nodes
      : [
        { title: '智能预习诊断' },
        { title: '多维综合评价' },
        { title: '五合一实训基地' },
        { title: '创新训练平台' },
      ],
    background_image: input.background_image,
  };
}

function deepSpaceBg(theme: ThemeConfig, backgroundImage?: string): string {
  const base = theme.colors.background || '#020617';
  // 叠加深空纹理和微光渐变
  const gradient = `radial-gradient(circle at 50% 0%, ${theme.colors.secondary} 0%, transparent 70%), linear-gradient(180deg, ${base} 0%, ${theme.colors.backgroundAlt} 100%)`;

  if (!backgroundImage) return gradient;
  // 如果有背景图，叠加一层深色蒙版以保证文字可读性
  return `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.9)), url(${backgroundImage}) center/cover no-repeat`;
}

function getCenterFontSize(label: string): number {
  const len = label.length;
  if (len <= 2) return 48;
  if (len <= 4) return 40;
  if (len <= 6) return 32;
  return 24;
}

function getDynamicNodePosition(index: number, total: number): React.CSSProperties {
  const angleOffset = -Math.PI / 2;
  const angle = angleOffset + (2 * Math.PI * index) / total;
  const radiusX = 38; // 稍微收缩半径以适应宽屏
  const radiusY = 36;
  const left = 50 + radiusX * Math.cos(angle);
  const top = 50 + radiusY * Math.sin(angle);
  return {
    position: 'absolute',
    left: `${left}%`,
    top: `${top}%`,
    transform: 'translate(-50%, -50%)',
  };
}

// 玻璃态卡片样式辅助函数
function glassStyle(theme: ThemeConfig): React.CSSProperties {
  return {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
  };
}

/* ==================== Variant A (Deep Space Core) ==================== */

export const EduCoreHubLayout: React.FC<EduCoreHubLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return <EduCoreHubVariantB data={data} theme={theme} />;
  }

  const nodes = data.nodes;
  const total = nodes.length;
  const centerFont = getCenterFontSize(data.center_label);

  // 动态调整卡片大小
  const cardWidth = total <= 4 ? 240 : total <= 6 ? 200 : 160;
  const cardPad = total <= 4 ? '16px 24px' : '12px 16px';
  const cardFont = total <= 4 ? 20 : 16;

  const sphereSize = total <= 4 ? 220 : 180;
  const orbitSize = total <= 4 ? 460 : 420;

  const slideStyle: React.CSSProperties = {
    width: 1280, height: 720,
    padding: theme.spacing.padding,
    boxSizing: 'border-box',
    position: 'relative', overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: deepSpaceBg(theme, data.background_image),
    color: theme.colors.text,
  };

  const glassCard = glassStyle(theme);

  return (
    <section style={slideStyle}>
      {/* 头部区域 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        paddingBottom: 24, marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 6, height: 42, borderRadius: 3,
            background: `linear-gradient(180deg, ${theme.colors.accent}, transparent)`
          }} />
          <h2 style={{
            margin: 0, color: theme.colors.primary,
            fontSize: 42, fontFamily: theme.fonts.title,
            textShadow: '0 0 20px rgba(6,182,212,0.5)' // 标题微光
          }}>
            {data.title}
          </h2>
        </div>
        {data.subtitle && (
          <div style={{
            color: theme.colors.textLight, fontSize: 20, fontWeight: 300,
            letterSpacing: '1px'
          }}>
            {data.subtitle}
          </div>
        )}
      </div>

      {/* 核心内容区 */}
      <div style={{ position: 'relative', height: 'calc(100% - 110px)' }}>

        {/* 核心球体 (Glowing Core) */}
        <div style={{
          width: sphereSize, height: sphereSize, borderRadius: '50%',
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle at 30% 30%, ${theme.colors.accent}, #1e40af)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 60px ${theme.colors.accent}40, inset 0 0 30px rgba(255,255,255,0.3)`,
          zIndex: 4, padding: 20, textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <span style={{
            color: '#ffffff', fontSize: centerFont, fontWeight: 800,
            fontFamily: theme.fonts.title, lineHeight: 1.2,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            {data.center_label}
          </span>
        </div>

        {/* 轨道圈 (Orbit Rings) */}
        <div style={{
          width: orbitSize, height: orbitSize, borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.15)',
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }} />
        <div style={{
          width: orbitSize * 1.4, height: orbitSize * 1.4, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)',
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 0,
        }} />

        {/* 周边节点 (Glass Cards) */}
        {nodes.map((node, index) => (
          <div key={index} style={{
            ...getDynamicNodePosition(index, total),
            ...glassCard,
            borderRadius: 16,
            padding: cardPad,
            zIndex: 3,
            width: cardWidth,
            textAlign: 'center',
            transition: 'all 0.3s ease',
          }}>
            <span style={{
              color: theme.colors.primary, fontSize: cardFont, fontWeight: 600,
              textShadow: '0 0 10px rgba(0,0,0,0.5)'
            }}>
              {node.title}
            </span>
            {/* 连接线示意 (装饰) */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 2,
              height: 0, // 实际连接线比较复杂，这里简化
              background: 'transparent'
            }} />
          </div>
        ))}
      </div>
    </section>
  );
};

/* ==================== Variant B (Glass Pyramid) ==================== */

const EduCoreHubVariantB: React.FC<{ data: EduCoreHubModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const allNodes = data.nodes;
  // 分层逻辑
  const tiers: { title: string; nodes: string[]; color: string }[] = [];
  const tierColors = [
    { label: 'TOP LAYER', color: '#f472b6' }, // Pink
    { label: 'MIDDLE LAYER', color: '#60a5fa' }, // Blue
    { label: 'BOTTOM LAYER', color: '#2dd4bf' }  // Teal
  ];

  // 改进的分层算法：强制保证 3 层金字塔结构
  // 如果节点非常少（例如 2 个），将 center_label 作为塔尖 (TOP LAYER)，将 nodes 分配给下两层
  if (allNodes.length === 0) {
    tiers.push({ title: tierColors[0].label, nodes: [data.center_label], color: tierColors[0].color });
    tiers.push({ title: tierColors[1].label, nodes: ['核心要点剖析'], color: tierColors[1].color });
    tiers.push({ title: tierColors[2].label, nodes: ['基础概念支撑', '理论模型框架'], color: tierColors[2].color });
  } else if (allNodes.length === 1) {
    tiers.push({ title: tierColors[0].label, nodes: [data.center_label], color: tierColors[0].color });
    tiers.push({ title: tierColors[1].label, nodes: [allNodes[0].title], color: tierColors[1].color });
    tiers.push({ title: tierColors[2].label, nodes: ['基础数据支撑'], color: tierColors[2].color });
  } else if (allNodes.length === 2) {
    tiers.push({ title: tierColors[0].label, nodes: [data.center_label], color: tierColors[0].color });
    tiers.push({ title: tierColors[1].label, nodes: [allNodes[0].title], color: tierColors[1].color });
    tiers.push({ title: tierColors[2].label, nodes: [allNodes[1].title], color: tierColors[2].color });
  } else {
    // 均分到 3 层
    const perTier = Math.ceil(allNodes.length / 3);
    let current = 0;
    for (let i = 0; i < 3; i++) {
      if (current >= allNodes.length) {
        // 如果上面被分空了，拿前一层的一个垫底
        if (tiers[i - 1] && tiers[i - 1].nodes.length > 1) {
          const popped = tiers[i - 1].nodes.pop();
          tiers.push({ title: tierColors[i].label, nodes: [popped!], color: tierColors[i].color });
        } else {
          tiers.push({ title: tierColors[i].label, nodes: ['拓展层'], color: tierColors[i].color });
        }
      } else {
        const chunk = allNodes.slice(current, current + perTier);
        tiers.push({
          title: tierColors[i].label,
          nodes: chunk.map(n => n.title),
          color: tierColors[i].color
        });
        current += perTier;
      }
    }
  }

  const glass = glassStyle(theme);

  return (
    <section style={{
      width: 1280, height: 720, flexShrink: 0,
      background: deepSpaceBg(theme, data.background_image),
      padding: theme.spacing.padding, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: theme.fonts.body,
      color: theme.colors.text
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        paddingBottom: 24, marginBottom: 32, flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 6, height: 42, borderRadius: 3, background: theme.colors.accent }} />
          <h2 style={{ fontSize: 42, color: theme.colors.primary, margin: 0, fontWeight: 'bold', fontFamily: theme.fonts.title }}>
            {data.title}
          </h2>
        </div>
        {data.subtitle && <div style={{ fontSize: 20, color: theme.colors.textLight }}>{data.subtitle}</div>}
      </div>

      <div style={{
        flexGrow: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', gap: 16
      }}>
        {tiers.map((tier, i) => {
          // 金字塔宽度逐渐增加
          const width = 60 + (i * 20) + '%';

          // 梯形切割逻辑
          // 顶层(0): 只有上圆角，下直角
          // 中层(1), 底层(2): 切割上角形成梯形拼接，只有下圆角
          let clipStyle = '';
          let borderRadiusStyle = '';
          let marginStyle = '';

          if (i === 0) {
            borderRadiusStyle = '20px 20px 0 0';
            clipStyle = 'polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)';
          } else if (i === 1) {
            borderRadiusStyle = '0';
            marginStyle = '-15px';
            clipStyle = 'polygon(5% 0%, 95% 0%, 98% 100%, 2% 100%)';
          } else {
            borderRadiusStyle = '0 0 20px 20px';
            marginStyle = '-15px';
            clipStyle = 'polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)';
          }

          return (
            <div key={i} style={{
              width: width,
              marginTop: marginStyle,
              background: `linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: borderRadiusStyle,
              clipPath: clipStyle,
              borderTop: `2px solid ${tier.color}AA`,
              boxShadow: i === 0 ? `0 -10px 40px -10px ${tier.color}40` : 'none',
              padding: i === 0 ? '40px 32px 32px' : '32px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              position: 'relative',
              zIndex: 3 - i,
            }}>

              <div style={{
                fontSize: 12, color: tier.color, letterSpacing: 3,
                fontWeight: 800, opacity: 0.9, textTransform: 'uppercase',
                marginBottom: 16,
                textShadow: `0 0 10px ${tier.color}80`
              }}>
                {tier.title}
              </div>

              <div style={{
                display: 'flex', gap: 24,
                justifyContent: 'center', width: '100%', flexWrap: 'wrap'
              }}>
                {tier.nodes.map((node, ni) => (
                  <div key={ni} style={{
                    fontSize: i === 0 ? 26 : 22,
                    fontWeight: i === 0 ? 700 : 600,
                    color: '#fff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                  }}>
                    {node}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/* ==================== HTML Rendering (Keep consistent with React) ==================== */

export function renderEduCoreHubLayoutHTML(model: EduCoreHubModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduCoreHubModel);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEduCoreHubVariantBHTML(data, theme);
  }

  const nodes = data.nodes;
  const total = nodes.length;
  const centerFont = getCenterFontSize(data.center_label);

  // 动态调整卡片大小
  const cardWidth = total <= 4 ? 240 : total <= 6 ? 200 : 160;
  const cardPad = total <= 4 ? '16px 24px' : '12px 16px';
  const cardFont = total <= 4 ? 20 : 16;

  const sphereSize = total <= 4 ? 220 : 180;
  const orbitSize = total <= 4 ? 460 : 420;

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const nodesHTML = nodes.map((node, index) => {
    const angleOffset = -Math.PI / 2;
    const angle = angleOffset + (2 * Math.PI * index) / total;
    const radiusX = 38;
    const radiusY = 36;
    const left = 50 + radiusX * Math.cos(angle);
    const top = 50 + radiusY * Math.sin(angle);

    return `<div style="position:absolute;left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;transform:translate(-50%, -50%);border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);padding:${cardPad};z-index:3;width:${cardWidth}px;text-align:center;"><span style="color:${theme.colors.primary};font-size:${cardFont}px;font-weight:600;text-shadow:0 0 10px rgba(0,0,0,0.5);">${node.title}</span></div>`;
  }).join('');

  const subtitleHTML = data.subtitle ? `<div style="color:${theme.colors.textLight};font-size:20px;font-weight:300;letter-spacing:1px;">${data.subtitle}</div>` : '';

  return `<section style="width:1280px;height:720px;padding:${theme.spacing.padding};box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};color:${theme.colors.text};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:24px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="width:6px;height:42px;border-radius:3px;background:linear-gradient(180deg, ${theme.colors.accent}, transparent);"></div>
      <h2 style="margin:0;color:${theme.colors.primary};font-size:42px;font-family:${theme.fonts.title};text-shadow:0 0 20px rgba(6,182,212,0.5);">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="position:relative;height:calc(100% - 110px);">
    <div style="width:${sphereSize}px;height:${sphereSize}px;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);background:radial-gradient(circle at 30% 30%, ${theme.colors.accent}, #1e40af);display:flex;align-items:center;justify-content:center;box-shadow:0 0 60px ${theme.colors.accent}40, inset 0 0 30px rgba(255,255,255,0.3);z-index:4;padding:20px;text-align:center;border:1px solid rgba(255,255,255,0.2);"><span style="color:#ffffff;font-size:${centerFont}px;font-weight:800;font-family:${theme.fonts.title};line-height:1.2;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${data.center_label}</span></div>
    <div style="width:${orbitSize}px;height:${orbitSize}px;border-radius:50%;border:1px dashed rgba(255,255,255,0.15);position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:1;"></div>
    <div style="width:${orbitSize * 1.4}px;height:${orbitSize * 1.4}px;border-radius:50%;border:1px solid rgba(255,255,255,0.05);position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:0;"></div>
    ${nodesHTML}
  </div>
</section>`;
}

function renderEduCoreHubVariantBHTML(data: EduCoreHubModel, theme: ThemeConfig): string {
  const allNodes = data.nodes;
  const tierColors = [
    { label: 'TOP LAYER', color: '#f472b6' },
    { label: 'MIDDLE LAYER', color: '#60a5fa' },
    { label: 'BOTTOM LAYER', color: '#2dd4bf' }
  ];

  const tiers: { title: string; nodes: string[]; color: string }[] = [];

  // Same logic as React component to forcefully create 3 tiers
  if (allNodes.length === 0) {
    tiers.push({ title: tierColors[0].label, nodes: [data.center_label], color: tierColors[0].color });
    tiers.push({ title: tierColors[1].label, nodes: ['核心要点剖析'], color: tierColors[1].color });
    tiers.push({ title: tierColors[2].label, nodes: ['基础概念支撑', '理论模型框架'], color: tierColors[2].color });
  } else if (allNodes.length === 1) {
    tiers.push({ title: tierColors[0].label, nodes: [data.center_label], color: tierColors[0].color });
    tiers.push({ title: tierColors[1].label, nodes: [allNodes[0].title], color: tierColors[1].color });
    tiers.push({ title: tierColors[2].label, nodes: ['基础数据支撑'], color: tierColors[2].color });
  } else if (allNodes.length === 2) {
    tiers.push({ title: tierColors[0].label, nodes: [data.center_label], color: tierColors[0].color });
    tiers.push({ title: tierColors[1].label, nodes: [allNodes[0].title], color: tierColors[1].color });
    tiers.push({ title: tierColors[2].label, nodes: [allNodes[1].title], color: tierColors[2].color });
  } else {
    const perTier = Math.ceil(allNodes.length / 3);
    let current = 0;
    for (let i = 0; i < 3; i++) {
      if (current >= allNodes.length) {
        if (tiers[i - 1] && tiers[i - 1].nodes.length > 1) {
          const popped = tiers[i - 1].nodes.pop();
          tiers.push({ title: tierColors[i].label, nodes: [popped!], color: tierColors[i].color });
        } else {
          tiers.push({ title: tierColors[i].label, nodes: ['拓展层'], color: tierColors[i].color });
        }
      } else {
        const chunk = allNodes.slice(current, current + perTier);
        tiers.push({ title: tierColors[i].label, nodes: chunk.map(n => n.title), color: tierColors[i].color });
        current += perTier;
      }
    }
  }

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const subtitleHTML = data.subtitle ? `<div style="font-size:20px;color:${theme.colors.textLight};font-weight:300;letter-spacing:1px;">${data.subtitle}</div>` : '';

  const tiersHTML = tiers.map((tier, i) => {
    const width = 60 + (i * 20) + '%';

    let clipStyle = '';
    let borderRadiusStyle = '';
    let marginStyle = '';

    if (i === 0) {
      borderRadiusStyle = '20px 20px 0 0';
      clipStyle = 'polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)';
    } else if (i === 1) {
      borderRadiusStyle = '0';
      marginStyle = '-15px';
      clipStyle = 'polygon(5% 0%, 95% 0%, 98% 100%, 2% 100%)';
    } else {
      borderRadiusStyle = '0 0 20px 20px';
      marginStyle = '-15px';
      clipStyle = 'polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)';
    }

    const paddingStyle = i === 0 ? '40px 32px 32px' : '32px';
    const shadowStyle = i === 0 ? `box-shadow: 0 -10px 40px -10px ${tier.color}40;` : '';
    const zIndex = 3 - i;

    const nodesHTML = tier.nodes.map(node =>
      `<div style="font-size:${i === 0 ? 26 : 22}px;font-weight:${i === 0 ? 700 : 600};color:#fff;text-shadow:0 2px 4px rgba(0,0,0,0.8);">${node}</div>`
    ).join('');

    return `<div style="width:${width};margin-top:${marginStyle};background:linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:${borderRadiusStyle};clip-path:${clipStyle};border-top:2px solid ${tier.color}AA;${shadowStyle}padding:${paddingStyle};display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;z-index:${zIndex};">
      <div style="font-size:12px;color:${tier.color};letter-spacing:3px;font-weight:800;opacity:0.9;text-transform:uppercase;margin-bottom:16px;text-shadow:0 0 10px ${tier.color}80;">${tier.title}</div>
      <div style="display:flex;gap:24px;justify-content:center;width:100%;flex-wrap:wrap;">${nodesHTML}</div>
    </div>`;
  }).join('');

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};padding:${theme.spacing.padding};box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;font-family:${theme.fonts.body};color:${theme.colors.text};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:24px;margin-bottom:32px;flex-shrink:0;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="width:6px;height:42px;border-radius:3px;background:${theme.colors.accent};"></div>
      <h2 style="font-size:42px;color:${theme.colors.primary};margin:0;font-weight:bold;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="margin-top:20px;display:flex;flex-direction:column;justify-content:center;align-items:center;">
    ${tiersHTML}
  </div>
</section>`;
}

export default EduCoreHubLayout;
