import React from 'react';
import type { EndingModel, ThemeConfig } from '../../types/schema';
import { BookmarkCheck, ClipboardCheck } from 'lucide-react';

interface Props {
  model: EndingModel & { layoutId?: string };
  theme: ThemeConfig;
}

export const VocationalMissionCompleteLayout: React.FC<Props> = ({ model, theme }) => {
  const { title = 'MISSION COMPLETE', subtitle = 'OPERATION CONCLUDED' } = model as any;
  const content = (model as any).content || 'ALL SAFETY PROTOCOLS VERIFIED AND EXECUTED.';

  return (
    <div className="w-full h-full bg-[#0a0f16] flex items-center justify-center p-16 font-sans relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-green-900/5 transform skew-x-[-25deg] translate-x-32 border-l-4 border-green-500/20" />
      
      {/* Giant watermark stamp */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-0">
        <div className="w-[1200px] h-[1200px] border-[40px] border-green-500 rounded-full flex flex-col items-center justify-center transform -rotate-12">
          <BookmarkCheck size={400} className="text-green-500 mb-12" />
          <span className="text-[120px] font-black text-green-500 tracking-tighter uppercase">AUTHORIZED</span>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col pt-12">
        <div className="flex items-end mb-12 border-b-2 border-slate-700/60 pb-8">
          <ClipboardCheck size={80} className="text-green-500 mr-8" />
          <div>
            <h2 className="text-2xl text-green-500 font-mono tracking-widest mb-2 flex items-center gap-3">
              <span className="w-3 h-3 bg-green-500 animate-pulse rounded-full" />
              {subtitle}
            </h2>
            <h1 className="text-8xl font-black text-white leading-none tracking-tighter uppercase" style={{ textShadow: '0 10px 30px rgba(0, 255, 0, 0.2)' }}>
              {title}
            </h1>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/80 p-8 backdrop-blur-sm border-l-8 border-l-green-500 shadow-2xl max-w-3xl">
          <p className="text-2xl text-slate-300 font-bold leading-relaxed">
            {content}
          </p>
        </div>

        {/* Footer Meta */}
        <div className="mt-20 flex justify-between items-end border-t border-slate-800 pt-8 mt-auto">
          <div className="flex gap-16">
            <div>
              <p className="text-slate-500 font-mono text-xs mb-2">VERIFIED BY // 验收人签名</p>
              <div className="w-48 h-12 border-b-2 border-slate-600 border-dashed" />
            </div>
            <div>
              <p className="text-slate-500 font-mono text-xs mb-2">TIMESTAMP // 时间戳</p>
              <p className="text-xl font-mono font-bold text-slate-300">
                {new Date().toISOString().split('T')[0]} / {new Date().toISOString().split('T')[1].substring(0,8)}
              </p>
            </div>
          </div>
          
          <div className="bg-green-500 text-black px-6 py-2 font-black tracking-widest uppercase text-xl transform -skew-x-12">
            APPROVED
          </div>
        </div>
      </div>
    </div>
  );
};

export function renderVocationalMissionCompleteLayoutHTML(model: any, theme: any): string {
  const { title = 'MISSION COMPLETE', subtitle = 'OPERATION CONCLUDED' } = model as any;
  const content = (model as any).content || 'ALL SAFETY PROTOCOLS VERIFIED AND EXECUTED.';
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].substring(0,8);

  return `
<section style="width:1280px;height:720px;box-sizing:border-box;background:#0a0f16;color:#FFFFFF;display:flex;align-items:center;justify-content:center;padding:64px;font-family:'PingFang SC','Microsoft YaHei',sans-serif;overflow:hidden;position:relative;">
  <!-- Skewed bg decorations -->
  <div style="position:absolute;top:0;right:0;width:50%;height:100%;background:rgba(6,78,59,0.05);transform:skewX(-25deg) translateX(128px);border-left:4px solid rgba(34,197,94,0.2);z-index:0;"></div>

  <!-- Giant stamp watermark -->
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0.04;z-index:0;">
    <div style="width:900px;height:900px;border:40px solid #22C55E;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-12deg);">
      <div style="font-size:280px;color:#22C55E;line-height:1;">✓</div>
      <span style="font-size:96px;font-weight:900;color:#22C55E;letter-spacing:-2px;text-transform:uppercase;">AUTHORIZED</span>
    </div>
  </div>

  <!-- Content -->
  <div style="position:relative;z-index:1;width:100%;max-width:960px;display:flex;flex-direction:column;">
    <!-- Title block -->
    <div style="display:flex;align-items:flex-end;margin-bottom:40px;border-bottom:2px solid rgba(71,85,105,0.6);padding-bottom:32px;">
      <div style="font-size:72px;color:#22C55E;margin-right:32px;line-height:1;">✔</div>
      <div>
        <div style="display:flex;align-items:center;gap:12px;font-size:20px;color:#22C55E;font-family:monospace;letter-spacing:3px;margin-bottom:8px;">
          <span style="width:12px;height:12px;background:#22C55E;border-radius:50%;display:inline-block;"></span>
          ${subtitle}
        </div>
        <h1 style="margin:0;font-size:80px;font-weight:900;color:#FFFFFF;line-height:1;letter-spacing:-2px;text-transform:uppercase;text-shadow:0 10px 30px rgba(0,255,0,0.2);">${title}</h1>
      </div>
    </div>

    <!-- Content box -->
    <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(71,85,105,0.8);border-left:8px solid #22C55E;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,0.5);max-width:720px;">
      <p style="margin:0;font-size:22px;color:#CBD5E1;font-weight:600;line-height:1.6;">${content}</p>
    </div>

    <!-- Footer meta -->
    <div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #1E293B;padding-top:24px;">
      <div style="display:flex;gap:64px;">
        <div>
          <p style="margin:0 0 8px 0;font-family:monospace;font-size:11px;color:#475569;">VERIFIED BY // 验收人签名</p>
          <div style="width:192px;height:48px;border-bottom:2px dashed #475569;"></div>
        </div>
        <div>
          <p style="margin:0 0 8px 0;font-family:monospace;font-size:11px;color:#475569;">TIMESTAMP // 时间戳</p>
          <p style="margin:0;font-size:18px;font-family:monospace;font-weight:700;color:#CBD5E1;">${dateStr} / ${timeStr}</p>
        </div>
      </div>
      <div style="background:#22C55E;color:#000;padding:8px 24px;font-weight:900;letter-spacing:3px;text-transform:uppercase;font-size:20px;transform:skewX(-12deg);">APPROVED</div>
    </div>
  </div>
</section>`;
}
