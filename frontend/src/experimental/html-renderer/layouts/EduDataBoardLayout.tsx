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

  return {
    title: String(input.title || '').trim() || '学生学习效果显著提升',
    subtitle: input.subtitle || '各项关键指标均实现突破性增长',
    metrics,
    bars,
    insight: input.insight || '持续跟踪并优化教学策略，可进一步拉高中后段学生表现。',
    background_image: input.background_image,
  };
}

const BAR_COLORS = ['#06b6d4', '#3b82f6', '#10b981'];

export const EduDataBoardLayout: React.FC<EduDataBoardLayoutProps> = ({ model, theme }) => {
  const variant = String((model as any).variant || 'a').toLowerCase();
  const data = normalizeModel(model);

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
    background: data.background_image
      ? `linear-gradient(rgba(6,12,28,0.9), rgba(6,12,28,0.9)), url(${data.background_image}) center/cover no-repeat`
      : '#0b1120',
  };

  return (
    <section style={slideStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '2px solid rgba(6,182,212,0.32)',
        paddingBottom: 16,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 40, borderRadius: 4, marginRight: 18, background: '#06b6d4' }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 40, fontFamily: theme.fonts.title }}>{data.title}</h2>
        </div>
        {data.subtitle && (
          <div style={{ borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.16)', color: '#34d399', padding: '8px 20px', fontSize: 20, fontWeight: 700 }}>
            {data.subtitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {data.metrics.slice(0, 3).map((metric, index) => (
          <div key={index} style={{
            flex: 1,
            borderRadius: 12,
            border: `1px solid ${BAR_COLORS[index]}55`,
            background: `linear-gradient(135deg, ${BAR_COLORS[index]}33, rgba(0,0,0,0))`,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: 46, color: BAR_COLORS[index], fontWeight: 900, marginRight: 14 }}>{metric.value}</div>
            <div style={{ color: '#e2e8f0', fontSize: 20, lineHeight: 1.4 }}>
              {metric.label}
              {metric.note && <div style={{ color: '#94a3b8', fontSize: 14 }}>{metric.note}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100% - 226px)' }}>
        <div style={{
          flex: 1,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          padding: 16,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ color: '#94a3b8', fontSize: 20, textAlign: 'center', marginBottom: 10 }}>
            知识点掌握率对比（传统 vs AI模式）
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', flex: 1, padding: '0 30px' }}>
            {data.bars.slice(0, 3).map((bar, index) => {
              const baselineHeight = Math.max(40, Math.min(170, bar.baseline * 1.7));
              const currentHeight = Math.max(60, Math.min(210, bar.current * 1.8));
              return (
                <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ width: 30, height: baselineHeight, borderRadius: '4px 4px 0 0', background: '#475569' }} />
                  <div style={{ width: 30, height: currentHeight, borderRadius: '4px 4px 0 0', background: BAR_COLORS[index], boxShadow: `0 0 12px ${BAR_COLORS[index]}aa` }} />
                </div>
              );
            })}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            marginTop: 8,
            paddingTop: 8,
            color: '#cbd5e1',
            fontSize: 16,
          }}>
            {data.bars.slice(0, 3).map((bar, index) => (
              <span key={index}>{bar.label}</span>
            ))}
          </div>
        </div>

        <div style={{
          width: '46%',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <div style={{ position: 'absolute', top: 16, color: '#94a3b8', fontSize: 20 }}>
            核心素养多维雷达分析
          </div>
          <div style={{
            width: 210,
            height: 210,
            borderRadius: '50%',
            border: '2px solid #06b6d4',
            background: 'radial-gradient(circle, rgba(6,182,212,0.24), rgba(6,182,212,0))',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ width: 126, height: 126, borderRadius: '50%', border: '2px solid #3b82f6' }} />
            <div style={{ position: 'absolute', top: -4, left: 98, width: 10, height: 10, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 10px #ffffff' }} />
            <div style={{ position: 'absolute', right: 24, bottom: 48, width: 10, height: 10, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 10px #ffffff' }} />
            <div style={{ position: 'absolute', left: 24, bottom: 40, width: 10, height: 10, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 10px #ffffff' }} />
          </div>
          <div style={{ marginTop: 24, color: '#cbd5e1', fontSize: 17, padding: '0 38px', textAlign: 'center', lineHeight: 1.5 }}>
            {data.insight}
          </div>
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
    <div style="flex:1;border-radius:12px;border:1px solid ${BAR_COLORS[index]}55;background:linear-gradient(135deg, ${BAR_COLORS[index]}33, rgba(0,0,0,0));padding:16px;display:flex;align-items:center;box-sizing:border-box;">
      <div style="font-size:46px;color:${BAR_COLORS[index]};font-weight:900;margin-right:14px;">${metric.value}</div>
      <div style="color:#e2e8f0;font-size:20px;line-height:1.4;">
        ${metric.label}
        ${metric.note ? `<div style="color:#94a3b8;font-size:14px;">${metric.note}</div>` : ''}
      </div>
    </div>`).join('');

  const barsHTML = data.bars.slice(0, 3).map((bar, index) => {
    const baselineHeight = Math.max(40, Math.min(170, bar.baseline * 1.7));
    const currentHeight = Math.max(60, Math.min(210, bar.current * 1.8));
    return `<div style="display:flex;gap:10px;align-items:flex-end;">
      <div style="width:30px;height:${baselineHeight}px;border-radius:4px 4px 0 0;background:#475569;"></div>
      <div style="width:30px;height:${currentHeight}px;border-radius:4px 4px 0 0;background:${BAR_COLORS[index]};box-shadow:0 0 12px ${BAR_COLORS[index]}aa;"></div>
    </div>`;
  }).join('');

  const labelsHTML = data.bars.slice(0, 3).map((bar) => `<span>${bar.label}</span>`).join('');
  const subtitleHTML = data.subtitle
    ? `<div style="border-radius:8px;border:1px solid #10b981;background:rgba(16,185,129,0.16);color:#34d399;padding:8px 20px;font-size:20px;font-weight:700;">${data.subtitle}</div>`
    : '';

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.32);padding-bottom:16px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:40px;border-radius:4px;margin-right:18px;background:#06b6d4;"></div>
      <h2 style="margin:0;color:#ffffff;font-size:40px;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="display:flex;gap:14px;margin-bottom:20px;">${metricHTML}</div>
  <div style="display:flex;gap:16px;height:calc(100% - 226px);">
    <div style="flex:1;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);padding:16px;box-sizing:border-box;display:flex;flex-direction:column;">
      <div style="color:#94a3b8;font-size:20px;text-align:center;margin-bottom:10px;">知识点掌握率对比（传统 vs AI模式）</div>
      <div style="display:flex;justify-content:space-around;align-items:flex-end;flex:1;padding:0 30px;">${barsHTML}</div>
      <div style="display:flex;justify-content:space-around;border-top:1px solid rgba(255,255,255,0.12);margin-top:8px;padding-top:8px;color:#cbd5e1;font-size:16px;">${labelsHTML}</div>
    </div>
    <div style="width:46%;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);position:relative;display:flex;align-items:center;justify-content:center;flex-direction:column;">
      <div style="position:absolute;top:16px;color:#94a3b8;font-size:20px;">核心素养多维雷达分析</div>
      <div style="width:210px;height:210px;border-radius:50%;border:2px solid #06b6d4;background:radial-gradient(circle, rgba(6,182,212,0.24), rgba(6,182,212,0));position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="width:126px;height:126px;border-radius:50%;border:2px solid #3b82f6;"></div>
        <div style="position:absolute;top:-4px;left:98px;width:10px;height:10px;border-radius:50%;background:#ffffff;box-shadow:0 0 10px #ffffff;"></div>
        <div style="position:absolute;right:24px;bottom:48px;width:10px;height:10px;border-radius:50%;background:#ffffff;box-shadow:0 0 10px #ffffff;"></div>
        <div style="position:absolute;left:24px;bottom:40px;width:10px;height:10px;border-radius:50%;background:#ffffff;box-shadow:0 0 10px #ffffff;"></div>
      </div>
      <div style="margin-top:24px;color:#cbd5e1;font-size:17px;padding:0 38px;text-align:center;line-height:1.5;">${data.insight || ''}</div>
    </div>
  </div>
</section>`;
}

function renderEduDataBoardVariantBHTML(data: EduDataBoardModel, theme: ThemeConfig): string {
  const background = data.background_image
    ? `linear-gradient(rgba(6,12,28,0.9), rgba(6,12,28,0.9)), url(${data.background_image}) center/cover no-repeat`
    : '#0b1120';
  const subtitleHTML = data.subtitle ? `<div style="color:#34d399;font-size:20px;font-weight:700;">${data.subtitle}</div>` : '';
  const cardsHTML = data.metrics.slice(0, 3).map((metric, i) => {
    const barW = data.bars[i]?.current || 70;
    return `<div style="border-radius:16px;border:1px solid ${BAR_COLORS[i]}55;background:linear-gradient(180deg,${BAR_COLORS[i]}22,rgba(0,0,0,0));padding:28px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-sizing:border-box;">
      <div style="font-size:56px;color:${BAR_COLORS[i]};font-weight:900;margin-bottom:12px;">${metric.value}</div>
      <div style="color:#e2e8f0;font-size:22px;font-weight:700;margin-bottom:8px;">${metric.label}</div>
      ${metric.note ? `<div style="color:#94a3b8;font-size:16px;">${metric.note}</div>` : ''}
      <div style="width:80%;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);margin-top:16px;"><div style="width:${barW}%;height:100%;border-radius:3px;background:${BAR_COLORS[i]};"></div></div>
    </div>`;
  }).join('');
  const insightHTML = data.insight ? `<div style="position:absolute;bottom:20px;left:76px;right:76px;color:#94a3b8;font-size:16px;text-align:center;">${data.insight}</div>` : '';
  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.32);padding-bottom:16px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:40px;border-radius:4px;margin-right:18px;background:#06b6d4;"></div>
      <h2 style="margin:0;color:#ffffff;font-size:40px;font-family:${theme.fonts.title};">${data.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;height:calc(100% - 110px);">${cardsHTML}</div>
  ${insightHTML}
</section>`;
}

export default EduDataBoardLayout;
