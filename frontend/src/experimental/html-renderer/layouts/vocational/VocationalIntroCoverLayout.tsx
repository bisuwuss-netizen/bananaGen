import React from 'react';
import type { CoverModel, ThemeConfig } from '../../types/schema';
import { clsx } from 'clsx';
import { Image, ShieldAlert, Crosshair, Factory } from 'lucide-react';

interface Props {
  model: CoverModel & { layoutId?: string };
  theme: ThemeConfig;
  onImageUpload?: () => void;
}

export const VocationalIntroCoverLayout: React.FC<Props> = ({ model, theme, onImageUpload }) => {
  const { title, subtitle, author, date, background_image } = model;
  
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0f16] font-sans tracking-tight">
      {/* Background with Image and Heavy Overlay */}
      {background_image && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-30 grayscale mix-blend-luminosity"
          style={{ backgroundImage: `url(${background_image})` }}
        />
      )}
      
      {/* High-Contrast Diagonal Warning Stripes (Watermark) */}
      <div 
        className="absolute -top-32 -right-32 w-2/3 h-[200%] opacity-[0.03] z-0 pointer-events-none transform rotate-12"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, #FF3333 40px, #FF3333 80px)'
        }}
      />

      {/* Industrial Scanlines */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 3px 100%'
        }}
      />
      
      {/* Main Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-16 pl-24">
        
        {/* Top Bar: Mission Designator */}
        <div className="flex items-center justify-between border-b-2 border-slate-700/50 pb-6 pr-8">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500 text-black px-4 py-1.5 text-sm font-black tracking-widest uppercase flex items-center gap-2">
              <ShieldAlert size={18} />
              RESTRICTED DIRECTIVE
            </div>
            <div className="text-slate-400 font-mono text-sm tracking-widest">
              OP-CODE // {Math.random().toString(36).substring(2, 8).toUpperCase()}
            </div>
          </div>
          <div className="text-slate-500 font-mono text-xs flex items-center gap-4">
            <Factory size={16} />
            AUTHORIZATION REQUIRED
          </div>
        </div>

        {/* Central Content Box */}
        <div className="flex-1 flex flex-col justify-center max-w-4xl relative">
          {/* Brutalist Hard Corner Decoration */}
          <div className="absolute -left-10 top-1/4 bottom-1/4 w-1.5 bg-yellow-500/80" />
          <div className="absolute top-1/4 -left-10 w-6 h-1.5 bg-yellow-500/80" />
          <div className="absolute bottom-1/4 -left-10 w-6 h-1.5 bg-yellow-500/80" />
          
          <div className="flex items-center gap-3 mb-6">
            <Crosshair size={32} className="text-red-500 animate-pulse" />
            <h3 className="text-2xl text-slate-300 font-medium tracking-wider flex-1 uppercase">
              {subtitle || 'MISSION OBJECTIVE / 任务纲要'}
            </h3>
          </div>
          
          <h1 className="text-7xl font-black text-white leading-[1.15] mb-10" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            {title}
          </h1>
          
          {/* Assignment Meta */}
          <div className="mt-8 flex gap-16 border-l-4 border-slate-600 pl-8 py-3">
            {author && (
              <div>
                <p className="text-slate-500 font-mono text-xs uppercase mb-1">COMMANDER / 指挥官</p>
                <p className="text-xl font-bold text-slate-200">{author}</p>
              </div>
            )}
            {date && (
              <div>
                <p className="text-slate-500 font-mono text-xs uppercase mb-1">EXECUTION DATE / 执行日</p>
                <p className="text-xl font-bold text-yellow-500 font-mono">{date}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-end justify-between pr-8">
          <div className="text-slate-600 font-mono text-xs max-w-md">
            WARNING: Ensure all safety protocols are active before engaging. Unauthorized access is strictly prohibited.
          </div>
          
          {onImageUpload && (
            <button 
              onClick={onImageUpload}
              className="px-6 py-2 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors font-mono text-sm uppercase flex items-center gap-2 cursor-pointer shadow-[4px_4px_0px_#000]"
            >
              <Image size={16} />
              Set Background Plate
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export function renderVocationalIntroCoverLayoutHTML(model: any, theme: any): string {
  const { title = '', subtitle = '', author = '', date = '', background_image } = model;

  const bgStyle = background_image
    ? `background-image: url(${background_image}); background-size: cover; background-position: center;`
    : 'background-color: #0a0f16;';

  return `
<section style="width:1280px;height:720px;position:relative;overflow:hidden;${bgStyle}font-family:'PingFang SC','Microsoft YaHei',sans-serif;box-sizing:border-box;">
  <!-- Heavy overlay -->
  ${background_image ? `<div style="position:absolute;inset:0;background:rgba(10,15,22,0.75);z-index:1;"></div>` : ''}
  <!-- Diagonal warning stripe watermark -->
  <div style="position:absolute;top:-128px;right:-128px;width:66%;height:200%;opacity:0.04;z-index:1;pointer-events:none;transform:rotate(12deg);background-image:repeating-linear-gradient(45deg,transparent,transparent 40px,#FF3333 40px,#FF3333 80px);"></div>
  <!-- Scanline overlay -->
  <div style="position:absolute;inset:0;z-index:1;opacity:0.12;pointer-events:none;background-image:linear-gradient(rgba(0,0,0,0) 50%,rgba(0,0,0,0.25) 50%);background-size:100% 4px;"></div>

  <!-- Main content -->
  <div style="position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:64px 80px;box-sizing:border-box;">

    <!-- Top Bar -->
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(100,116,139,0.35);padding-bottom:24px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="background:#EAB308;color:#000;padding:8px 20px;font-size:13px;font-weight:900;letter-spacing:3px;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
          ⚠ RESTRICTED DIRECTIVE
        </div>
        <div style="color:#64748B;font-family:monospace;font-size:13px;letter-spacing:3px;">OP-CODE // M-04</div>
      </div>
      <div style="color:#475569;font-family:monospace;font-size:12px;letter-spacing:2px;">🏭 AUTHORIZATION REQUIRED</div>
    </div>

    <!-- Central Content -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;padding-left:20px;">
      <!-- Left accent bar -->
      <div style="position:absolute;left:-20px;top:15%;bottom:15%;width:6px;background:rgba(234,179,8,0.8);"></div>
      <div style="position:absolute;left:-20px;top:15%;width:24px;height:6px;background:rgba(234,179,8,0.8);"></div>
      <div style="position:absolute;left:-20px;bottom:15%;width:24px;height:6px;background:rgba(234,179,8,0.8);"></div>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div style="width:28px;height:28px;border:2px solid #EF4444;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
          <div style="width:10px;height:10px;background:#EF4444;border-radius:50%;"></div>
        </div>
        <h3 style="margin:0;font-size:22px;color:#CBD5E1;font-weight:500;letter-spacing:3px;text-transform:uppercase;">${subtitle || 'MISSION OBJECTIVE / 任务纲要'}</h3>
      </div>

      <h1 style="margin:0 0 40px 0;font-size:72px;font-weight:900;color:#FFFFFF;line-height:1.15;text-shadow:0 4px 20px rgba(0,0,0,0.5);">${title}</h1>

      <div style="display:flex;gap:64px;border-left:4px solid #475569;padding:12px 0 12px 32px;">
        ${author ? `<div><p style="margin:0 0 4px 0;font-family:monospace;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:2px;">COMMANDER / 指挥官</p><p style="margin:0;font-size:20px;font-weight:700;color:#E2E8F0;">${author}</p></div>` : ''}
        ${date ? `<div><p style="margin:0 0 4px 0;font-family:monospace;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:2px;">EXECUTION DATE / 执行日</p><p style="margin:0;font-size:20px;font-weight:700;color:#EAB308;font-family:monospace;">${date}</p></div>` : ''}
      </div>
    </div>

    <!-- Bottom Bar -->
    <div style="display:flex;align-items:flex-end;justify-content:space-between;">
      <div style="font-family:monospace;font-size:11px;color:#334155;max-width:480px;line-height:1.6;">
        WARNING: Ensure all safety protocols are active before engaging. Unauthorized access is strictly prohibited.
      </div>
    </div>
  </div>
</section>`;
}
