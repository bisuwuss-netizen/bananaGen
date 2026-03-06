import React from 'react';
import { EduDataBoardModel, ThemeConfig } from '../types/schema';

interface EduDataBoardLayoutProps {
  model: EduDataBoardModel;
  theme: ThemeConfig;
}

type LooseEduDataBoardModel = Partial<EduDataBoardModel> & {
  bullets?: Array<{ text?: string; description?: string; dataPoint?: { value?: string; unit?: string; source?: string } } | string>;
};

function toNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  if (Number.isFinite(num)) return num;
  return fallback;
}

function normalizeModel(input: LooseEduDataBoardModel): EduDataBoardModel {
  let metrics = Array.isArray(input.metrics)
    ? input.metrics
      .map((item) => ({
        value: String(item.value || '').trim(),
        label: String(item.label || '').trim(),
        note: item.note,
      }))
      .filter((item) => item.value || item.label)
      .slice(0, 3)
    : [];

  if (metrics.length === 0 && Array.isArray(input.bullets)) {
    metrics = input.bullets
      .map((bullet, idx) => {
        if (typeof bullet === 'string') {
          return { value: `${85 + idx}%`, label: bullet.trim(), note: '自动生成指标' };
        }
        const value = String(bullet?.dataPoint?.value || '').trim();
        const label = String(bullet?.dataPoint?.unit || bullet?.text || '').trim();
        return { value: value || `${85 + idx}%`, label: label || `关键指标 ${idx + 1}`, note: bullet?.description || bullet?.dataPoint?.source };
      })
      .filter((item) => item.value || item.label)
      .slice(0, 3);
  }

  if (metrics.length === 0) {
    metrics = [
      { value: '+45%', label: '课堂互动参与度', note: '同比提升' },
      { value: '92分', label: '期末综合优秀率', note: '高于对照班' },
      { value: '98%', label: '学生满意度', note: '问卷反馈' },
    ];
  }

  let bars = Array.isArray(input.bars)
    ? input.bars
      .map((bar) => ({
        label: String(bar.label || '').trim(),
        baseline: toNumber(bar.baseline, 40),
        current: toNumber(bar.current, 70),
      }))
      .filter((bar) => bar.label)
      .slice(0, 3)
    : [];

  if (bars.length === 0) {
    bars = [
      { label: '理论理解', baseline: 50, current: 80 },
      { label: '实践操作', baseline: 62, current: 90 },
      { label: '综合创新', baseline: 45, current: 75 },
    ];
  }

  const bullets = Array.isArray(input.bullets)
    ? input.bullets
      .map((b) => {
        if (typeof b === 'string') return { text: b.trim(), description: '' };
        return { text: String(b?.text || '').trim(), description: String(b?.description || '').trim(), icon: b?.icon };
      })
      .filter((b) => b.text)
    : [];

  return {
    title: String(input.title || '').trim() || '学生学习效果显著提升',
    subtitle: input.subtitle || '各项关键指标均实现突破性增长',
    metrics,
    bars,
    bullets,
    insight: input.insight || '持续跟踪并优化教学策略，可进一步拉高中后段学生表现。',
    background_image: input.background_image,
  };
}

const BAR_COLORS = ['#06b6d4', '#3b82f6', '#10b981'];

function glassStyle(theme: ThemeConfig): React.CSSProperties {
  return {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
  };
}

function deepSpaceBg(theme: ThemeConfig, backgroundImage?: string): string {
  const base = theme.colors.background || '#020617';
  const gradient = `radial-gradient(circle at 50% 0%, ${theme.colors.secondary} 0%, transparent 70%), linear-gradient(180deg, ${base} 0%, ${theme.colors.backgroundAlt} 100%)`;

  if (!backgroundImage) return gradient;
  return `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.9)), url(${backgroundImage}) center/cover no-repeat`;
}

export const EduDataBoardLayout: React.FC<EduDataBoardLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String((model as LooseEduDataBoardModel).variant || 'a').toLowerCase();
  const glass = glassStyle(theme);

  if (variant === 'b') {
    return <EduDataBoardVariantB data={data} theme={theme} />;
  }

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    padding: '56px 76px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: deepSpaceBg(theme, data.background_image),
    color: '#ffffff',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '1px solid rgba(6,182,212,0.3)',
        paddingBottom: 20,
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 6, height: 40, borderRadius: 3, marginRight: 20, background: 'linear-gradient(to bottom, #06b6d4, #3b82f6)' }} />
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 40, fontFamily: theme.fonts.title, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{data.title}</h2>
        </div>
        {data.subtitle && (
          <div style={{
            borderRadius: 8,
            border: '1px solid rgba(16,185,129,0.5)',
            background: 'rgba(16,185,129,0.1)',
            color: '#34d399',
            padding: '8px 20px',
            fontSize: 20,
            fontWeight: 700,
            boxShadow: '0 0 15px rgba(16,185,129,0.2)'
          }}>
            {data.subtitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
        {data.metrics.slice(0, 3).map((metric, index) => (
          <div key={index} style={{
            ...glass,
            flex: 1,
            borderRadius: 16,
            border: `1px solid ${BAR_COLORS[index]}40`,
            background: `linear-gradient(135deg, ${BAR_COLORS[index]}15, rgba(255,255,255,0.02))`,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: 52, color: BAR_COLORS[index], fontWeight: 900, marginRight: 20, textShadow: `0 0 20px ${BAR_COLORS[index]}40` }}>{metric.value}</div>
            <div style={{ color: '#e2e8f0', fontSize: 20, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600 }}>{metric.label}</div>
              {metric.note && <div style={{ color: '#94a3b8', fontSize: 16, marginTop: 4 }}>{metric.note}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, height: 'calc(100% - 240px)' }}>
        <div style={{
          ...glass,
          flex: 1,
          borderRadius: 20,
          padding: 24,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ color: '#94a3b8', fontSize: 20, textAlign: 'center', marginBottom: 16, fontFamily: theme.fonts.title }}>
            {data.bars[0]?.label ? `${data.bars.map(b => b.label).join(' · ')} 对比` : '关键指标对比'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', flex: 1, padding: '0 30px' }}>
            {(() => {
              const maxVal = Math.max(...data.bars.slice(0, 3).map(b => Math.max(b.baseline, b.current)), 1);
              return data.bars.slice(0, 3).map((bar, index) => {
                const baselineHeight = Math.max(40, (bar.baseline / maxVal) * 210);
                const currentHeight = Math.max(40, (bar.current / maxVal) * 210);
                return (
                  <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{
                      width: 36,
                      height: baselineHeight,
                      borderRadius: '6px 6px 0 0',
                      background: 'linear-gradient(to top, #334155, #475569)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      position: 'relative',
                    }}>
                      <div style={{ position: 'absolute', top: -25, width: '100%', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>{bar.baseline}</div>
                    </div>
                    <div style={{
                      width: 36,
                      height: currentHeight,
                      borderRadius: '6px 6px 0 0',
                      background: `linear-gradient(to top, ${BAR_COLORS[index]}80, ${BAR_COLORS[index]})`,
                      boxShadow: `0 0 20px ${BAR_COLORS[index]}50`,
                      position: 'relative',
                    }}>
                      <div style={{ position: 'absolute', top: -25, width: '100%', textAlign: 'center', color: BAR_COLORS[index], fontWeight: 'bold', fontSize: 16 }}>{bar.current}</div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: 16,
            paddingTop: 16,
            color: '#cbd5e1',
            fontSize: 16,
          }}>
            {data.bars.slice(0, 3).map((bar, index) => (
              <span key={index}>{bar.label}</span>
            ))}
          </div>
        </div>

        <div style={{
          ...glass,
          width: '40%',
          borderRadius: 20,
          padding: '24px 28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {data.bullets && data.bullets.length > 0 ? (
            <>
              <div style={{ color: '#94a3b8', fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>核心要点</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'hidden' }}>
                {data.bullets.slice(0, 4).map((bullet, bi) => (
                  <div key={bi} style={{
                    borderRadius: 12,
                    border: '1px solid rgba(6,182,212,0.2)',
                    background: 'rgba(6,182,212,0.08)',
                    padding: '12px 16px',
                  }}>
                    <div style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 700, marginBottom: bullet.description ? 4 : 0 }}>{bullet.text}</div>
                    {bullet.description && <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.4 }}>{bullet.description}</div>}
                  </div>
                ))}
              </div>
              {data.insight && <div style={{ color: '#67e8f9', fontSize: 15, marginTop: 12, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>{data.insight}</div>}
            </>
          ) : (
            <>
              <div style={{ color: '#94a3b8', fontSize: 20, textAlign: 'center', marginBottom: 16 }}>运维成熟度</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#cbd5e1', fontSize: 18, padding: '0 20px', textAlign: 'center', lineHeight: 1.6 }}>{data.insight}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

const EduDataBoardVariantB: React.FC<{ data: EduDataBoardModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const slideStyle: React.CSSProperties = {
    width: 1280, height: 720, padding: '56px 76px', boxSizing: 'border-box',
    position: 'relative', overflow: 'hidden', fontFamily: theme.fonts.body,
    background: data.background_image
      ? `linear-gradient(rgba(6,12,28,0.9), rgba(6,12,28,0.9)), url(${data.background_image}) center/cover no-repeat`
      : '#0b1120',
  };
  return (
    <section style={slideStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid rgba(6,182,212,0.32)', paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 40, borderRadius: 4, marginRight: 18, background: '#06b6d4' }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 40, fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.subtitle && <div style={{ color: '#34d399', fontSize: 20, fontWeight: 700 }}>{data.subtitle}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, height: 'calc(100% - 110px)' }}>
        {data.metrics.slice(0, 3).map((metric, index) => (
          <div key={index} style={{
            borderRadius: 16, border: `1px solid ${BAR_COLORS[index]}55`,
            background: `linear-gradient(180deg, ${BAR_COLORS[index]}22, rgba(0,0,0,0))`,
            padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center', boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: 56, color: BAR_COLORS[index], fontWeight: 900, marginBottom: 12 }}>{metric.value}</div>
            <div style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{metric.label}</div>
            {metric.note && <div style={{ color: '#94a3b8', fontSize: 16 }}>{metric.note}</div>}
            <div style={{ width: '80%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginTop: 16 }}>
              <div style={{ width: `${data.bars[index]?.current || 70}%`, height: '100%', borderRadius: 3, background: BAR_COLORS[index] }} />
            </div>
          </div>
        ))}
      </div>
      {data.insight && (
        <div style={{ position: 'absolute', bottom: 20, left: 76, right: 76, color: '#94a3b8', fontSize: 16, textAlign: 'center' }}>{data.insight}</div>
      )}
    </section>
  );
};

export function renderEduDataBoardLayoutHTML(model: EduDataBoardModel, theme: ThemeConfig): string {
  const variant = String((model as any).variant || 'a').toLowerCase();
  const data = normalizeModel(model as LooseEduDataBoardModel);
  if (variant === 'b') {
    return renderEduDataBoardVariantBHTML(data, theme);
  }
  const background = data.background_image
    ? `linear-gradient(rgba(6,12,28,0.9), rgba(6,12,28,0.9)), url(${data.background_image}) center/cover no-repeat`
    : '#0b1120';

  const metricHTML = data.metrics.slice(0, 3).map((metric, index) => `
    <div style="flex:1;border-radius:16px;border:1px solid ${BAR_COLORS[index]}40;background:linear-gradient(135deg, ${BAR_COLORS[index]}15, rgba(255,255,255,0.02));padding:20px 24px;display:flex;align-items:center;box-sizing:border-box;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
      <div style="font-size:52px;color:${BAR_COLORS[index]};font-weight:900;margin-right:20px;text-shadow:0 0 20px ${BAR_COLORS[index]}40;">${metric.value}</div>
      <div style="color:#e2e8f0;font-size:20px;line-height:1.4;">
        <div style="font-weight:600;">${metric.label}</div>
        ${metric.note ? `<div style="color:#94a3b8;font-size:16px;margin-top:4px;">${metric.note}</div>` : ''}
      </div>
    </div>`).join('');

  const maxValA = Math.max(...data.bars.slice(0, 3).map(b => Math.max(b.baseline, b.current)), 1);
  const barsHTML = data.bars.slice(0, 3).map((bar, index) => {
    const baselineHeight = Math.max(40, (bar.baseline / maxValA) * 210);
    const currentHeight = Math.max(40, (bar.current / maxValA) * 210);
    return `<div style="display:flex;gap:12px;align-items:flex-end;">
      <div style="width:36px;height:${baselineHeight}px;border-radius:6px 6px 0 0;background:linear-gradient(to top, #334155, #475569);box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);position:relative;">
        <div style="position:absolute;top:-25px;width:100%;text-align:center;color:#94a3b8;font-size:14px;">${bar.baseline}</div>
      </div>
      <div style="width:36px;height:${currentHeight}px;border-radius:6px 6px 0 0;background:linear-gradient(to top, ${BAR_COLORS[index]}80, ${BAR_COLORS[index]});box-shadow:0 0 20px ${BAR_COLORS[index]}50;position:relative;">
        <div style="position:absolute;top:-25px;width:100%;text-align:center;color:${BAR_COLORS[index]};font-weight:bold;font-size:16px;">${bar.current}</div>
      </div>
    </div>`;
  }).join('');

  const labelsHTML = data.bars.slice(0, 3).map((bar) => `<span>${bar.label}</span>`).join('');
  const subtitleHTML = data.subtitle
    ? `<div style="border-radius:8px;border:1px solid rgba(16,185,129,0.5);background:rgba(16,185,129,0.1);color:#34d399;padding:8px 20px;font-size:20px;font-weight:700;box-shadow:0 0 15px rgba(16,185,129,0.2);">${data.subtitle}</div>`
    : '';

  const chartTitle = data.bars[0]?.label ? data.bars.map(b => b.label).join(' · ') + ' 对比' : '关键指标对比';

  const bulletsArr = data.bullets || [];
  const rightPanelHTML = bulletsArr.length > 0
    ? `<div style="width:40%;border-radius:20px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);padding:24px 28px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
        <div style="color:#94a3b8;font-size:16px;font-weight:700;letter-spacing:2px;margin-bottom:16px;">核心要点</div>
        <div style="display:flex;flex-direction:column;gap:12px;flex:1;overflow:hidden;">
          ${bulletsArr.slice(0, 4).map(b => `<div style="border-radius:12px;border:1px solid rgba(6,182,212,0.2);background:rgba(6,182,212,0.08);padding:12px 16px;">
            <div style="color:#e2e8f0;font-size:17px;font-weight:700;${b.description ? 'margin-bottom:4px;' : ''}">${b.text}</div>
            ${b.description ? `<div style="color:#94a3b8;font-size:14px;line-height:1.4;">${b.description}</div>` : ''}
          </div>`).join('')}
        </div>
        ${data.insight ? `<div style="color:#67e8f9;font-size:15px;margin-top:12px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">${data.insight}</div>` : ''}
      </div>`
    : `<div style="width:40%;border-radius:20px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);padding:24px 28px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
        <div style="color:#94a3b8;font-size:20px;text-align:center;margin-bottom:16px;">运维成熟度</div>
        <div style="color:#cbd5e1;font-size:18px;padding:0 20px;text-align:center;line-height:1.6;">${data.insight || ''}</div>
      </div>`;

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};color:#ffffff;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(6,182,212,0.3);padding-bottom:20px;margin-bottom:28px;">
    <div style="display:flex;align-items:center;">
      <div style="width:6px;height:40px;border-radius:3px;margin-right:20px;background:linear-gradient(to bottom, #06b6d4, #3b82f6);"></div>
      <h2 style="margin:0;color:#f8fafc;font-size:40px;font-family:${theme.fonts.title};letter-spacing:-0.02em;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="display:flex;gap:20px;margin-bottom:24px;">${metricHTML}</div>
  <div style="display:flex;gap:20px;height:calc(100% - 240px);">
    <div style="flex:1;border-radius:20px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);padding:24px;box-sizing:border-box;display:flex;flex-direction:column;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
      <div style="color:#94a3b8;font-size:20px;text-align:center;margin-bottom:16px;font-family:${theme.fonts.title};">${chartTitle}</div>
      <div style="display:flex;justify-content:space-around;align-items:flex-end;flex:1;padding:0 30px;">${barsHTML}</div>
      <div style="display:flex;justify-content:space-around;border-top:1px solid rgba(255,255,255,0.1);margin-top:16px;padding-top:16px;color:#cbd5e1;font-size:16px;">${labelsHTML}</div>
    </div>
    ${rightPanelHTML}
  </div>
</section>`;
}

function renderEduDataBoardVariantBHTML(data: EduDataBoardModel, theme: ThemeConfig): string {
  const heroMetric = data.metrics[0] || { value: '98%', label: '核心模式满意度', note: '极度认可' };
  const sideMetrics = data.metrics.slice(1, 3);
  const heroPercent = parseInt(heroMetric.value.replace(/[^0-9]/g, ''), 10) || 98;

  const sideCardsHTML = sideMetrics.map((metric, i) => {
    const accent = ['#3b82f6', '#10b981'][i] || BAR_COLORS[i + 1];
    const numW = Math.min(parseInt(metric.value.replace(/[^0-9]/g, ''), 10) || 50, 100);
    return `<div style="width:calc(50% - 10px);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);padding:30px;border-radius:20px;box-sizing:border-box;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);border-top:4px solid ${accent};">
      <div style="font-size:16px;color:#94a3b8;margin-bottom:10px;">${metric.label}</div>
      <div style="font-size:48px;color:${accent};font-weight:bold;text-shadow:0 0 20px ${accent}40;">${metric.value}</div>
      <div style="width:100%;height:6px;background-color:rgba(255,255,255,0.1);margin-top:20px;border-radius:3px;overflow:hidden;">
        <div style="width:${numW}%;height:100%;background-color:${accent};box-shadow:0 0 10px ${accent};"></div>
      </div>
    </div>`;
  }).join('');

  const maxValB = Math.max(...data.bars.slice(0, 3).map(b => Math.max(b.baseline, b.current)), 1);
  const miniBarsHTML = data.bars.slice(0, 3).map((bar, bi) => {
    const bH = Math.max(10, Math.round((bar.baseline / maxValB) * 60));
    const cH = Math.max(10, Math.round((bar.current / maxValB) * 60));
    const mr = bi < 2 ? 'margin-right:12px;' : '';
    return `<div style="width:14px;height:${bH}px;background-color:#475569;border-radius:2px;"></div>
      <div style="width:14px;height:${cH}px;background-color:${BAR_COLORS[bi]};border-radius:2px;box-shadow:0 0 10px ${BAR_COLORS[bi]};${mr}"></div>`;
  }).join('');

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};padding:60px 80px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;font-family:${theme.fonts.body};color:#fff;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(6,182,212,0.3);padding-bottom:20px;margin-bottom:40px;">
    <div style="display:flex;align-items:center;">
      <div style="width:6px;height:40px;background:linear-gradient(to bottom, #06b6d4, #3b82f6);margin-right:20px;border-radius:3px;"></div>
      <h2 style="font-size:42px;color:#f8fafc;margin:0;font-weight:bold;font-family:${theme.fonts.title};letter-spacing:-0.02em;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${data.title}</h2>
    </div>
    <div style="background-color:rgba(6,182,212,0.1);border:1px solid #06b6d4;padding:6px 16px;border-radius:6px;color:#67e8f9;font-weight:bold;box-shadow:0 0 10px rgba(6,182,212,0.2);">Dashboard View</div>
  </div>
  <div style="display:flex;justify-content:space-between;flex-grow:1;align-items:center;gap:40px;">
    <div style="width:45%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:24px;position:relative;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
      <div style="font-size:24px;color:#94a3b8;position:absolute;top:40px;font-family:${theme.fonts.title};">${heroMetric.label}</div>
      <div style="position:relative;width:320px;height:320px;border-radius:50%;background:conic-gradient(#06b6d4 0% ${heroPercent}%, rgba(30,41,59,0.5) ${heroPercent}% 100%);display:flex;justify-content:center;align-items:center;box-shadow:0 0 50px rgba(6,182,212,0.3);">
        <div style="width:260px;height:260px;background-color:#020617;border-radius:50%;display:flex;flex-direction:column;justify-content:center;align-items:center;box-shadow:inset 0 0 30px rgba(0,0,0,0.8);">
          <span style="font-size:80px;font-weight:900;color:#fff;text-shadow:0 0 30px #06b6d4;line-height:1;">${heroMetric.value}</span>
          ${heroMetric.note ? `<span style="font-size:20px;color:#67e8f9;margin-top:10px;">${heroMetric.note}</span>` : ''}
        </div>
      </div>
    </div>
    <div style="width:55%;height:100%;display:flex;flex-wrap:wrap;align-content:center;gap:20px;">
      ${sideCardsHTML}
      ${(data.bullets || []).length > 0
      ? `<div style="width:100%;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);padding:24px 30px;border-radius:20px;box-sizing:border-box;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);">
            ${(data.bullets || []).slice(0, 3).map(b => `<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:12px;">
              <div style="width:8px;height:8px;border-radius:50%;background:#06b6d4;flex-shrink:0;margin-top:6px;box-shadow:0 0 8px #06b6d4;"></div>
              <div><span style="color:#e2e8f0;font-size:18px;font-weight:700;">${b.text}</span>${b.description ? `<span style="color:#94a3b8;font-size:15px;margin-left:8px;">${b.description}</span>` : ''}</div>
            </div>`).join('')}
            ${data.insight ? `<div style="color:#67e8f9;font-size:15px;margin-top:16px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">${data.insight}</div>` : ''}
          </div>`
      : `<div style="width:100%;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);padding:30px;border-radius:20px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);">
            <div>
              <div style="font-size:20px;color:#e2e8f0;font-weight:bold;margin-bottom:8px;">${data.bars[0]?.label || '知识点掌握率对比预测'}</div>
              <div style="font-size:16px;color:#94a3b8;">${data.insight || '理论理解 vs 综合创新能力大幅度跃升'}</div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-end;height:60px;">${miniBarsHTML}</div>
          </div>`
    }
    </div>
  </div>
</section>`;
}

export default EduDataBoardLayout;
