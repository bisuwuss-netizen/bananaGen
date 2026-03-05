import React from 'react';
import { EduSummaryModel, ThemeConfig } from '../types/schema';

interface EduSummaryLayoutProps {
  model: EduSummaryModel;
  theme: ThemeConfig;
}

type LooseEduSummaryModel = Partial<EduSummaryModel> & {
  subtitle?: string;
  contact?: string;
  bullets?: Array<{ text?: string; description?: string } | string>;
};

const TITLES = ['技术底座层面', '教学教法层面', '数据反馈闭环'];
const TITLE_COLORS = ['#67e8f9', '#93c5fd', '#6ee7b7'];
const BORDER_COLORS = ['rgba(6,182,212,0.35)', 'rgba(59,130,246,0.35)', 'rgba(16,185,129,0.35)'];

function normalizeModel(input: LooseEduSummaryModel): EduSummaryModel {
  let columns = Array.isArray(input.columns)
    ? input.columns
      .map((column, idx) => ({
        title: String(column.title || '').trim() || TITLES[idx % TITLES.length],
        points: Array.isArray(column.points)
          ? column.points.map((point) => String(point || '').trim()).filter(Boolean).slice(0, 4)
          : [],
      }))
      .filter((column) => column.title)
      .slice(0, 3)
    : [];

  if (columns.length === 0 && Array.isArray(input.bullets) && input.bullets.length > 0) {
    const lines = input.bullets
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        return [String(item?.text || '').trim(), String(item?.description || '').trim()].filter(Boolean).join('：');
      })
      .filter(Boolean)
      .slice(0, 9);

    columns = [0, 1, 2].map((idx) => ({
      title: TITLES[idx],
      points: lines.slice(idx * 3, idx * 3 + 3),
    }));
  }

  if (columns.length === 0) {
    columns = [
      {
        title: '技术底座层面',
        points: ['持续优化推理延迟与稳定性。', '扩展算力池保障高并发。', '强化终端设备兼容性验证。'],
      },
      {
        title: '教学教法层面',
        points: ['提升教师数字素养培训覆盖率。', '拓展跨学科项目式教学场景。', '建立优质课件共建共享机制。'],
      },
      {
        title: '数据反馈闭环',
        points: ['补齐过程性与情感性数据采样。', '缩短从预警到干预的响应时间。', '打通校企评价标准和数据接口。'],
      },
    ];
  }

  return {
    title: String(input.title || '').trim() || '反思与下一步改进措施',
    variant: input.variant,
    columns,
    closing: input.closing || input.subtitle || input.contact || '全面保障学生学习数据安全，构建可信赖的AI智慧教育新生态。',
    background_image: input.background_image,
  };
}

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

// ===================== Variant A (原版: 上方3列网格 + 底部通栏) =====================

export const EduSummaryLayout: React.FC<EduSummaryLayoutProps> = ({ model, theme }) => {
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();
  const glass = glassStyle(theme);

  if (variant === 'b') {
    return <EduSummaryVariantB data={data} theme={theme} />;
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
        alignItems: 'flex-end',
        borderBottom: '1px solid rgba(6,182,212,0.3)',
        paddingBottom: 20,
        marginBottom: 32,
      }}>
        <div style={{ width: 6, height: 40, borderRadius: 3, marginRight: 20, background: 'linear-gradient(to bottom, #06b6d4, #3b82f6)' }} />
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 40, fontFamily: theme.fonts.title, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{data.title}</h2>
      </div>

      <div style={{ display: 'flex', gap: 20, height: 'calc(100% - 190px)' }}>
        {data.columns.slice(0, 3).map((column, index) => (
          <div key={index} style={{
            ...glass,
            flex: 1,
            borderRadius: 20,
            padding: '28px 24px',
            boxSizing: 'border-box',
            borderTop: `4px solid ${BORDER_COLORS[index % BORDER_COLORS.length]}`,
            transition: 'transform 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              color: TITLE_COLORS[index % TITLE_COLORS.length],
              fontSize: 24,
              fontWeight: 700,
              paddingBottom: 12,
              marginBottom: 20,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontFamily: theme.fonts.title,
            }}>
              {column.title}
            </div>

            <ul style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 18, lineHeight: 1.75, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 10 }}>
              {column.points.slice(0, 4).map((point, rowIdx) => (
                <li key={rowIdx} style={{ listStyleType: 'disc', paddingLeft: 8 }}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {data.closing && (
        <div style={{
          marginTop: 24,
          borderRadius: 16,
          border: '1px solid rgba(6,182,212,0.3)',
          background: 'linear-gradient(to right, rgba(6,182,212,0.15), rgba(59,130,246,0.15))',
          boxShadow: '0 0 30px rgba(6,182,212,0.1)',
          color: '#ffffff',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 1,
          textAlign: 'center',
          lineHeight: 1.45,
          padding: '24px 32px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          {data.closing}
        </div>
      )}
    </section>
  );
};

// ===================== Variant B (左右3:7不对称分割) =====================

const EduSummaryVariantB: React.FC<{ data: EduSummaryModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const glass = glassStyle(theme);
  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    flexShrink: 0,
    background: deepSpaceBg(theme, data.background_image),
    padding: '60px 80px',
    boxSizing: 'border-box',
    display: 'flex',
    gap: 40,
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    color: '#fff',
  };

  return (
    <section style={slideStyle}>
      {/* 左侧：重点总结与标题 */}
      <div style={{
        width: '35%',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.25) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        borderRadius: 24,
        padding: '50px 40px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxShadow: '0 0 40px rgba(6, 182, 212, 0.15)',
        position: 'relative',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ position: 'absolute', top: 30, left: 30, fontSize: 60, opacity: 0.3, filter: 'grayscale(100%) brightness(200%)' }}>💡</div>
        <h2 style={{ fontSize: 46, color: '#ffffff', margin: '0 0 30px 0', fontWeight: 'bold', lineHeight: 1.2, fontFamily: theme.fonts.title, textShadow: '0 0 30px rgba(6,182,212,0.4)' }}>{data.title}</h2>
        <div style={{ width: 60, height: 4, background: 'linear-gradient(to right, #06b6d4, #3b82f6)', marginBottom: 40, borderRadius: 2 }} />
        {data.closing && (
          <p style={{ fontSize: 24, color: '#e2e8f0', lineHeight: 1.6, fontWeight: 'bold', margin: 0 }}>{data.closing}</p>
        )}
      </div>

      {/* 右侧：3个具体层面的反思卡片 */}
      <div style={{ width: '65%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20 }}>
        {data.columns.slice(0, 3).map((column, index) => (
          <div key={index} style={{
            ...glass,
            flex: 1,
            borderRadius: 20,
            padding: '0 30px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: 30,
            borderLeft: `4px solid ${BORDER_COLORS[index % BORDER_COLORS.length]}`,
          }}>
            <div style={{
              width: 180,
              borderRight: '1px solid rgba(255,255,255,0.1)',
              paddingRight: 20,
              flexShrink: 0,
              height: '60%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}>
              <div style={{
                fontSize: 24,
                color: TITLE_COLORS[index % TITLE_COLORS.length],
                fontWeight: 'bold',
                textAlign: 'right',
                fontFamily: theme.fonts.title,
              }}>{column.title}</div>
            </div>
            <div style={{ flexGrow: 1 }}>
              <ul style={{ color: '#cbd5e1', fontSize: 18, lineHeight: 1.6, paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {column.points.slice(0, 3).map((point, pIdx) => (
                  <li key={pIdx}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ===================== HTML 渲染 =====================

export function renderEduSummaryLayoutHTML(model: EduSummaryModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduSummaryModel);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEduSummaryVariantBHTML(data, theme);
  }

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const columnsHTML = data.columns.slice(0, 3).map((column, index) => {
    const points = column.points.slice(0, 4).map((point) => `<li style="padding-left:8px;list-style-type:disc;">${point}</li>`).join('');
    return `<div style="flex:1;border-radius:20px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);padding:28px 24px;box-sizing:border-box;border-top:4px solid ${BORDER_COLORS[index % BORDER_COLORS.length]};display:flex;flex-direction:column;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
      <div style="color:${TITLE_COLORS[index % TITLE_COLORS.length]};font-size:24px;font-weight:700;padding-bottom:12px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);font-family:${theme.fonts.title};">${column.title}</div>
      <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:18px;line-height:1.75;flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:10px;">${points}</ul>
    </div>`;
  }).join('');

  const closingHTML = data.closing
    ? `<div style="margin-top:24px;border-radius:16px;border:1px solid rgba(6,182,212,0.3);background:linear-gradient(to right, rgba(6,182,212,0.15), rgba(59,130,246,0.15));box-shadow:0 0 30px rgba(6,182,212,0.1);color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;text-align:center;line-height:1.45;padding:24px 32px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);">${data.closing}</div>`
    : '';

  return `<section style="width:1280px;height:720px;padding:56px 76px;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};color:#ffffff;">
  <div style="display:flex;align-items:flex-end;border-bottom:1px solid rgba(6,182,212,0.3);padding-bottom:20px;margin-bottom:32px;">
    <div style="width:6px;height:40px;border-radius:3px;margin-right:20px;background:linear-gradient(to bottom, #06b6d4, #3b82f6);"></div>
    <h2 style="margin:0;color:#f8fafc;font-size:40px;font-family:${theme.fonts.title};letter-spacing:-0.02em;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${data.title}</h2>
  </div>
  <div style="display:flex;gap:20px;height:calc(100% - 190px);">${columnsHTML}</div>
  ${closingHTML}
</section>`;
}

function renderEduSummaryVariantBHTML(data: EduSummaryModel, theme: ThemeConfig): string {
  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const closingHTML = data.closing
    ? `<p style="font-size:24px;color:#e2e8f0;line-height:1.6;font-weight:bold;margin:0;">${data.closing}</p>`
    : '';

  const rowsHTML = data.columns.slice(0, 3).map((column, index) => {
    const points = column.points.slice(0, 3).map((point) => `<li>${point}</li>`).join('');
    return `<div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:0 30px;box-sizing:border-box;display:flex;align-items:center;gap:30px;border-left:4px solid ${BORDER_COLORS[index % BORDER_COLORS.length]};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px 0 rgba(0,0,0,0.36);">
      <div style="width:180px;border-right:1px solid rgba(255,255,255,0.1);padding-right:20px;flex-shrink:0;height:60%;display:flex;align-items:center;justify-content:flex-end;">
        <div style="font-size:24px;color:${TITLE_COLORS[index % TITLE_COLORS.length]};font-weight:bold;text-align:right;font-family:${theme.fonts.title};">${column.title}</div>
      </div>
      <div style="flex-grow:1;">
        <ul style="color:#cbd5e1;font-size:18px;line-height:1.6;padding-left:20px;margin:0;display:flex;flex-direction:column;gap:6px;">${points}</ul>
      </div>
    </div>`;
  }).join('');

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};padding:60px 80px;box-sizing:border-box;display:flex;gap:40px;overflow:hidden;font-family:${theme.fonts.body};color:#fff;">
  <div style="width:35%;background:linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.25) 100%);border:1px solid rgba(6, 182, 212, 0.4);border-radius:24px;padding:50px 40px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;box-shadow:0 0 40px rgba(6, 182, 212, 0.15);position:relative;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);">
    <div style="position:absolute;top:30px;left:30px;font-size:60px;opacity:0.3;filter:grayscale(100%) brightness(200%);">💡</div>
    <h2 style="font-size:46px;color:#ffffff;margin:0 0 30px 0;font-weight:bold;line-height:1.2;font-family:${theme.fonts.title};text-shadow:0 0 30px rgba(6,182,212,0.4);">${data.title}</h2>
    <div style="width:60px;height:4px;background:linear-gradient(to right, #06b6d4, #3b82f6);margin-bottom:40px;border-radius:2px;"></div>
    ${closingHTML}
  </div>
  <div style="width:65%;display:flex;flex-direction:column;justify-content:space-between;gap:20px;">${rowsHTML}</div>
</section>`;
}

export default EduSummaryLayout;
