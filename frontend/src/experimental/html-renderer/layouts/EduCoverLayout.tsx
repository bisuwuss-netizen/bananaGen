import React from 'react';
import { EduCoverModel, ThemeConfig } from '../types/schema';

interface EduCoverLayoutProps {
  model: EduCoverModel;
  theme: ThemeConfig;
  onImageUpload?: () => void;
}

type LooseEduCoverModel = Partial<EduCoverModel> & {
  label?: string;
  description?: string;
  metric?: { value?: string; label?: string };
};

function normalizeModel(input: LooseEduCoverModel): EduCoverModel {
  const title = String(input.title || '').trim() || '智教未来';
  const subtitle = String(input.subtitle || input.description || '').trim();

  return {
    title,
    subtitle,
    variant: input.variant,
    author: input.author,
    department: input.department,
    date: input.date,
    hero_image: input.hero_image || input.background_image,
    background_image: input.background_image,
  };
}

function deepSpaceBg(theme: ThemeConfig, backgroundImage?: string): string {
  const base = theme.colors.background || '#020617';

  // Create a base gradient + a subtle dot/noise pattern
  const texture = `radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`;
  const gradient = `radial-gradient(circle at 50% 0%, ${theme.colors.secondary} 0%, transparent 70%), linear-gradient(180deg, ${base} 0%, ${theme.colors.backgroundAlt} 100%)`;

  if (!backgroundImage) {
    return `${texture}, ${gradient}`;
    // A trick in CSS to use the radial gradient as a recurring pattern, handled in style by setting backgroundSize.
    // However, for inline background string, we just provide the image sequence. 
    // Setting background-size must be done in the style object.
  }
  return `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.9)), url(${backgroundImage}) center/cover no-repeat`;
}

const MetaTag: React.FC<{ color: string; border: string; text: string; icon?: React.ReactNode }> = ({ color, border, text, icon }) => (
  <div style={{
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: color,
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 600,
    padding: '8px 20px',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  }}>
    {icon}
    {text}
  </div>
);

/* ==================== Variant A (Deep Space Split) ==================== */

export const EduCoverLayout: React.FC<EduCoverLayoutProps> = ({ model, theme, onImageUpload }) => {
  const data = normalizeModel(model);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return <EduCoverVariantB data={data} theme={theme} />;
  }

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: deepSpaceBg(theme, data.background_image),
    backgroundSize: data.background_image ? 'auto' : '20px 20px, 100% 100%, 100% 100%',
    color: theme.colors.text,
  };

  return (
    <section style={slideStyle}>
      {/* 装饰光效 */}
      <div style={{
        position: 'absolute', top: -150, left: -100, width: 600, height: 600,
        borderRadius: '50%', background: `radial-gradient(circle, ${theme.colors.accent}33 0%, transparent 70%)`,
        filter: 'blur(60px)', zIndex: 0
      }} />

      <div style={{
        position: 'absolute', top: 0, left: 0, width: '60%', height: '100%',
        boxSizing: 'border-box', padding: '100px 72px',
        display: 'flex', flexDirection: 'column', zIndex: 2
      }}>
        <div style={{
          width: 64, height: 6, borderRadius: 3, marginBottom: 32,
          background: `linear-gradient(90deg, ${theme.colors.accent}, transparent)`,
          boxShadow: `0 0 20px ${theme.colors.accent}80`
        }} />

        <h1 style={{
          margin: 0, color: theme.colors.primary, fontSize: 72, lineHeight: 1.1,
          fontWeight: 900, letterSpacing: 2, fontFamily: theme.fonts.title,
          textShadow: '0 0 40px rgba(0,0,0,0.5)',
          background: `linear-gradient(90deg, #ffffff, ${theme.colors.accent})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          ...(!data.title.includes(' ') && { display: 'inline-block' }) // Fix text clip for single words
        }}>
          {data.title}
        </h1>

        {data.subtitle && (
          <p style={{
            margin: '24px 0 0 0', color: theme.colors.textLight, fontSize: 28,
            lineHeight: 1.4, maxWidth: 640, fontWeight: 300
          }}>
            {data.subtitle}
          </p>
        )}

        {/* Info tags moved up right below subtitle */}
        <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {data.author && <MetaTag color="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.15)" text={data.author} icon={<span>👤</span>} />}
          {data.department && <MetaTag color="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.15)" text={data.department} icon={<span>🏢</span>} />}
          {data.date && <MetaTag color="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.15)" text={data.date} icon={<span>📅</span>} />}
        </div>
      </div>

      {/* Image container: Frameless, larger, floating */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '45%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at right center, rgba(6,182,212,0.15) 0%, transparent 60%)',
        zIndex: 2
      }}>
        {data.hero_image ? (
          <img
            src={data.hero_image}
            alt={data.title}
            style={{
              width: '120%', height: '120%',
              objectFit: 'contain',
              objectPosition: 'center right',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
              transform: 'scale(1.1) translateX(-5%)'
            }}
          />
        ) : (
          <button
            type="button"
            onClick={onImageUpload}
            style={{
              width: '80%', height: '80%', border: 'none', borderRadius: 32,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
              color: theme.colors.accent, fontSize: 20, cursor: onImageUpload ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
              borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)'
            }}
          >
            <span style={{ fontSize: 40 }}>🖼️</span>
            <span>点击上传主体透明模型图</span>
          </button>
        )}
      </div>
    </section>
  );
};

/* ==================== Variant B (Deep Space Center) ==================== */

const EduCoverVariantB: React.FC<{ data: EduCoverModel; theme: ThemeConfig }> = ({ data, theme }) => {
  const infoParts: { icon: string; text: string }[] = [];
  if (data.author) infoParts.push({ icon: '👤', text: data.author });
  if (data.department) infoParts.push({ icon: '🏢', text: data.department });
  if (data.date) infoParts.push({ icon: '📅', text: data.date });

  return (
    <section style={{
      width: 1280, height: 720, flexShrink: 0,
      background: deepSpaceBg(theme, data.background_image),
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      boxSizing: 'border-box', position: 'relative', overflow: 'hidden', fontFamily: theme.fonts.body,
    }}>
      {/* 动态光环背景 */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 800, height: 800, borderRadius: '50%',
        background: `conic-gradient(from 0deg, transparent 0%, ${theme.colors.accent}22 20%, transparent 40%)`,
        animation: 'spin 20s linear infinite', zIndex: 0
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, borderRadius: '50%',
        border: `1px solid ${theme.colors.accent}33`, zIndex: 0
      }} />

      <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: -40 }}>
        <div style={{
          width: 80, height: 4, borderRadius: 2, marginBottom: 32,
          background: theme.colors.accent, boxShadow: `0 0 20px ${theme.colors.accent}`
        }} />

        <h1 style={{
          fontSize: 88, color: theme.colors.primary, margin: '0 0 24px 0',
          fontWeight: 900, letterSpacing: 4, fontFamily: theme.fonts.title,
          textShadow: '0 0 60px rgba(0,0,0,0.6)'
        }}>
          {data.title}
        </h1>

        {data.subtitle && (
          <p style={{
            fontSize: 32, color: theme.colors.textLight, margin: 0,
            fontWeight: 300, letterSpacing: 2
          }}>
            {data.subtitle}
          </p>
        )}
      </div>

      {/* 底部悬浮信息栏 */}
      {infoParts.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 80, display: 'flex', gap: 40,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 40px', borderRadius: 100, zIndex: 2,
          backdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          {infoParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.colors.text, fontSize: 18, fontWeight: 500 }}>
                <span style={{ opacity: 0.8 }}>{part.icon}</span> {part.text}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </section>
  );
};

/* ==================== HTML Rendering ==================== */

export function renderEduCoverLayoutHTML(model: EduCoverModel, theme: ThemeConfig): string {
  const data = normalizeModel(model as LooseEduCoverModel);
  const variant = String(data.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEduCoverVariantBHTML(data, theme);
  }

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");
  const bgSize = data.background_image ? 'auto' : '20px 20px, 100% 100%, 100% 100%';
  const heroImage = data.hero_image ? `<img src="${data.hero_image}" alt="${data.title}" style="width:120%;height:120%;object-fit:contain;object-position:center right;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.6));transform:scale(1.1) translateX(-5%);">` : `<div style="width:80%;height:80%;background:linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));color:${theme.colors.accent};font-size:20px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;border-radius:32px;border:2px dashed rgba(255,255,255,0.2);"><span style="font-size:40px;">🖼️</span><span>点击上传主体透明模型图</span></div>`;

  const metaTags = [
    data.author && { text: data.author, icon: '👤' },
    data.department && { text: data.department, icon: '🏢' },
    data.date && { text: data.date, icon: '📅' }
  ].filter(Boolean).map(tag =>
    `<div style="border-radius:999px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#e2e8f0;font-size:18px;font-weight:600;padding:8px 20px;backdrop-filter:blur(8px);display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);">
      ${tag ? tag.icon : ''} ${tag ? tag.text : ''}
    </div>`
  ).join('');

  return `<section style="width:1280px;height:720px;position:relative;overflow:hidden;font-family:${theme.fonts.body};background:${background};background-size:${bgSize};color:${theme.colors.text};">
    <div style="position:absolute;top:-150px;left:-100px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle, ${theme.colors.accent}33 0%, transparent 70%);filter:blur(60px);z-index:0;"></div>
    <div style="position:absolute;top:0;left:0;width:60%;height:100%;box-sizing:border-box;padding:100px 72px;display:flex;flex-direction:column;z-index:2;">
      <div style="width:64px;height:6px;border-radius:3px;margin-bottom:32px;background:linear-gradient(90deg, ${theme.colors.accent}, transparent);box-shadow:0 0 20px ${theme.colors.accent}80;"></div>
      <h1 style="margin:0;color:${theme.colors.primary};font-size:72px;line-height:1.1;font-weight:900;letter-spacing:2px;font-family:${theme.fonts.title};text-shadow:0 0 40px rgba(0,0,0,0.5);background:linear-gradient(90deg, #ffffff, ${theme.colors.accent});-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:inline-block;">${data.title}</h1>
      ${data.subtitle ? `<p style="margin:24px 0 0 0;color:${theme.colors.textLight};font-size:28px;line-height:1.4;max-width:640px;font-weight:300;">${data.subtitle}</p>` : ''}
      <div style="margin-top:40px;display:flex;flex-wrap:wrap;gap:12px;">${metaTags}</div>
    </div>
    <div style="position:absolute;top:0;right:0;bottom:0;width:45%;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at right center, rgba(6,182,212,0.15) 0%, transparent 60%);z-index:2;">
      ${heroImage}
    </div>
  </section>`;
}

function renderEduCoverVariantBHTML(data: EduCoverModel, theme: ThemeConfig): string {
  const infoParts: { icon: string; text: string }[] = [];
  if (data.author) infoParts.push({ icon: '👤', text: data.author });
  if (data.department) infoParts.push({ icon: '🏢', text: data.department });
  if (data.date) infoParts.push({ icon: '📅', text: data.date });

  const background = deepSpaceBg(theme, data.background_image).replace(/"/g, "'");

  const infoHTML = infoParts.length > 0 ? `
    <div style="position:absolute;bottom:80px;display:flex;gap:40px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);padding:16px 40px;border-radius:100px;z-index:2;backdrop-filter:blur(12px);box-shadow:0 10px 30px rgba(0,0,0,0.3);">
      ${infoParts.map((part, i) => `
        ${i > 0 ? `<div style="width:1px;height:24px;background-color:rgba(255,255,255,0.1);align-self:center;"></div>` : ''}
        <div style="display:flex;align-items:center;gap:10px;color:${theme.colors.text};font-size:18px;font-weight:500;">
          <span style="opacity:0.8;">${part.icon}</span> ${part.text}
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<section style="width:1280px;height:720px;flex-shrink:0;background:${background};display:flex;flex-direction:column;justify-content:center;align-items:center;box-sizing:border-box;position:relative;overflow:hidden;font-family:${theme.fonts.body};">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);width:800px;height:800px;border-radius:50%;background:conic-gradient(from 0deg, transparent 0%, ${theme.colors.accent}22 20%, transparent 40%);z-index:0;"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);width:600px;height:600px;border-radius:50%;border:1px solid ${theme.colors.accent}33;z-index:0;"></div>
    <div style="z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;margin-top:-40px;">
      <div style="width:80px;height:4px;border-radius:2px;margin-bottom:32px;background:${theme.colors.accent};box-shadow:0 0 20px ${theme.colors.accent};"></div>
      <h1 style="font-size:88px;color:${theme.colors.primary};margin:0 0 24px 0;font-weight:900;letter-spacing:4px;font-family:${theme.fonts.title};text-shadow:0 0 60px rgba(0,0,0,0.6);">${data.title}</h1>
      ${data.subtitle ? `<p style="font-size:32px;color:${theme.colors.textLight};margin:0;font-weight:300;letter-spacing:2px;">${data.subtitle}</p>` : ''}
    </div>
    ${infoHTML}
  </section>`;
}

export default EduCoverLayout;
