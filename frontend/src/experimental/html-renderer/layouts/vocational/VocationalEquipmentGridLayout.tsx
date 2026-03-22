import React from 'react';
import type { TitleBulletsModel, ThemeConfig } from '../../types/schema';
import { Package, Cpu, Hexagon, Component } from 'lucide-react';

interface Props {
  model: TitleBulletsModel & { layoutId?: string };
  theme: ThemeConfig;
  onImageUpload?: () => void;
}

export const VocationalEquipmentGridLayout: React.FC<Props> = ({ model, theme, onImageUpload }) => {
  const { title, subtitle, bullets = [] } = model as any;
  const items = (bullets || []).slice(0, 6); // Max 6 for grid
  
  return (
    <div className="w-full h-full bg-[#111318] text-slate-200 flex flex-col p-16 font-sans">
      <div className="flex justify-between items-end mb-10 pb-4 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-3 text-cyan-500 mb-2 font-mono text-sm tracking-widest uppercase">
            <Package size={18} /> INVENTORY // EQUIPMENT GRID
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white">{title || '整备清单'}</h1>
        </div>
        {subtitle && (
          <div className="text-xl text-slate-400 font-medium max-w-lg text-right">{subtitle}</div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6">
        {items.map((bulletRaw: any, idx: number) => {
          const text = typeof bulletRaw === 'string' ? bulletRaw : bulletRaw.text || '';
          const isLarge = idx === 0 || idx === 3;
          const bgShade = idx % 2 === 0 ? 'bg-slate-800/80' : 'bg-slate-900/60';
          
          return (
            <div 
              key={idx}
              className={`relative flex flex-col p-8 border border-slate-700/50 overflow-hidden group
                ${isLarge ? 'col-span-2' : 'col-span-1'} ${bgShade}
              `}
              style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}
            >
              {/* Corner tech accents */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-600 m-4 transition-colors group-hover:border-cyan-500" />
              <div className="absolute top-4 right-12 text-slate-700 font-mono text-xs font-bold pointer-events-none group-hover:text-cyan-900">
                P-0{idx + 1}
              </div>

              <div className="bg-slate-950/50 p-4 rounded inline-flex self-start border border-slate-800 mb-6 group-hover:border-cyan-800 transition-colors">
                {idx % 3 === 0 ? <Cpu size={28} className="text-cyan-600" /> : 
                 idx % 3 === 1 ? <Hexagon size={28} className="text-yellow-600" /> : 
                 <Component size={28} className="text-purple-600" />}
              </div>
              
              <h3 className={`font-bold text-slate-100 ${isLarge ? 'text-3xl pr-24' : 'text-xl'} leading-snug mb-4`}>
                {text}
              </h3>
              
              <div className="mt-auto overflow-hidden">
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-600 w-1/3 group-hover:w-full transition-all duration-1000 ease-out" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderVocationalEquipmentGridLayoutHTML(model: any, theme: any): string {
  const { title = '整备清单', subtitle = '' } = model as any;
  const bullets: any[] = (model.bullets || []).slice(0, 6);

  const iconColors = ['#06B6D4', '#EAB308', '#A855F7', '#06B6D4', '#EAB308', '#A855F7'];
  const icons = ['⬡', '⬡', '⬡', '⬡', '⬡', '⬡'];

  const cellsHTML = bullets.map((bulletRaw: any, idx: number) => {
    const text = typeof bulletRaw === 'string' ? bulletRaw : bulletRaw.text || '';
    const isLarge = idx === 0 || idx === 3;
    const bgShade = idx % 2 === 0 ? 'rgba(30,41,59,0.8)' : 'rgba(15,23,42,0.6)';
    const color = iconColors[idx % iconColors.length];
    const colSpan = isLarge ? 'grid-column: span 2;' : '';

    return `
    <div style="position:relative;display:flex;flex-direction:column;padding:32px;border:1px solid rgba(71,85,105,0.5);overflow:hidden;background:${bgShade};box-shadow:inset 0 0 40px rgba(0,0,0,0.5);${colSpan}">
      <!-- Corner tech accent -->
      <div style="position:absolute;top:16px;right:16px;width:32px;height:32px;border-top:2px solid rgba(71,85,105,0.6);border-right:2px solid rgba(71,85,105,0.6);"></div>
      <div style="position:absolute;top:16px;right:52px;font-family:monospace;font-size:11px;color:rgba(71,85,105,0.8);font-weight:700;">P-0${idx+1}</div>
      <!-- Icon badge -->
      <div style="display:inline-flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.5);border:1px solid rgba(30,41,59,1);padding:16px;margin-bottom:20px;align-self:flex-start;">
        <span style="font-size:28px;color:${color};">${icons[idx]}</span>
      </div>
      <h3 style="margin:0 0 16px 0;font-weight:700;color:#F1F5F9;font-size:${isLarge ? '28px' : '20px'};line-height:1.3;padding-right:${isLarge ? '96px' : '0'};">${text}</h3>
      <!-- Progress bar -->
      <div style="margin-top:auto;">
        <div style="width:100%;height:4px;background:#1E293B;border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:33%;background:${color};"></div>
        </div>
      </div>
    </div>`;
  }).join('\n');

  return `
<section style="width:1280px;height:720px;box-sizing:border-box;background:#111318;color:#E2E8F0;display:flex;flex-direction:column;padding:64px;font-family:'PingFang SC','Microsoft YaHei',sans-serif;overflow:hidden;">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid rgba(71,85,105,0.6);">
    <div>
      <div style="display:flex;align-items:center;gap:12px;color:#06B6D4;margin-bottom:8px;font-family:monospace;font-size:13px;letter-spacing:3px;">
        <span>⊞ INVENTORY // EQUIPMENT GRID</span>
      </div>
      <h1 style="margin:0;font-size:48px;font-weight:900;color:#FFFFFF;letter-spacing:-1px;">${title}</h1>
    </div>
    ${subtitle ? `<div style="font-size:18px;color:#94A3B8;font-weight:500;max-width:400px;text-align:right;">${subtitle}</div>` : ''}
  </div>

  <!-- Bento Grid -->
  <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;overflow:hidden;">
    ${cellsHTML}
  </div>
</section>`;
}
