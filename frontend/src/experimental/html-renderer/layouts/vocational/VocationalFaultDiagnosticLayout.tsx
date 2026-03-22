import React from 'react';
import type { TitleContentModel, ThemeConfig } from '../../types/schema';
import { Terminal, AlertCircle, DatabaseZap } from 'lucide-react';

interface Props {
  model: TitleContentModel & { layoutId?: string };
  theme: ThemeConfig;
}

export const VocationalFaultDiagnosticLayout: React.FC<Props> = ({ model, theme }) => {
  const { title } = model;
  const subtitle = (model as any).subtitle;
  const contentRef = model.content;
  const contentLines = Array.isArray(contentRef) ? contentRef : (contentRef || '').split('\n');
  
  return (
    <div className="w-full h-full bg-[#050505] p-12 overflow-hidden flex flex-col font-mono text-green-500">
      
      {/* Top Console Bar */}
      <div className="w-full bg-[#111] border-b-2 border-green-900 p-4 flex items-center justify-between shadow-[0_4px_20px_rgba(0,255,0,0.05)]">
        <div className="flex items-center gap-4">
          <Terminal size={24} className="text-green-500" />
          <span className="text-xl font-bold tracking-widest">DIAGNOSTIC_TERMINAL_V9.2.4</span>
        </div>
        <div className="flex gap-4 items-center">
          <DatabaseZap size={20} className="text-yellow-600 animate-pulse" />
          <span className="text-yellow-600 bg-yellow-900/20 px-3 py-1 text-sm font-bold border border-yellow-800">FAULT_DETECTED</span>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 flex flex-col mt-8 border border-slate-800 bg-[#0a0a0a] p-10 relative shadow-inner">
        {/* CRT Scanline effect */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.5) 50%)', backgroundSize: '100% 4px' }} />
        
        <div className="mb-12 relative z-20">
          <div className="flex text-lg text-slate-400 mb-2">
            <span className="text-green-600 mr-3">root@system:~$</span>
            <span>analyze -target current_module -depth all</span>
          </div>
          <h1 className="text-5xl font-black text-red-500 mt-6 leading-tight flex items-start gap-4 uppercase tracking-tighter">
            <AlertCircle size={40} className="shrink-0 mt-2" />
            <div>
              <div className="text-red-800 text-lg mb-1 tracking-widest font-bold">ERROR // CRITICAL_EXCEPTION</div>
              {title}
            </div>
          </h1>
        </div>

        {subtitle && (
          <div className="relative z-20 bg-red-950/30 border-l-4 border-red-700 py-4 px-6 text-red-300 text-2xl font-bold mb-10 w-3/4">
            {subtitle}
          </div>
        )}

        <div className="relative z-20 flex-1 overflow-hidden">
          <div className="text-green-400 text-xl leading-relaxed max-w-5xl">
            {contentLines.map((line: string, i: number) => (
              <p key={i} className="mb-4">
                <span className="text-green-800 mr-4">[{String(i + 1).padStart(2, '0')}]</span>
                {line}
              </p>
            ))}
          </div>
          
          <div className="mt-12 flex items-center animate-pulse text-green-500 text-xl">
            <span className="mr-2">&gt;</span>
            <span className="w-3 h-6 bg-green-500 inline-block" />
          </div>
        </div>
      </div>
    </div>
  );
};

export function renderVocationalFaultDiagnosticLayoutHTML(model: any, theme: any): string {
  const { title = 'DIAGNOSTIC ERROR' } = model;
  const subtitle = (model as any).subtitle || '';
  const contentRef = model.content;
  const contentLines: string[] = Array.isArray(contentRef)
    ? contentRef
    : (contentRef || '').split('\n');

  const linesHTML = contentLines.map((line: string, i: number) => `
    <p style="margin:0 0 16px 0;font-size:18px;color:#4ADE80;line-height:1.6;">
      <span style="color:#166534;margin-right:16px;">[${String(i + 1).padStart(2, '0')}]</span>${line}
    </p>`).join('');

  return `
<section style="width:1280px;height:720px;box-sizing:border-box;background:#050505;color:#4ADE80;font-family:monospace;display:flex;flex-direction:column;overflow:hidden;position:relative;">
  <!-- CRT scanline overlay -->
  <div style="position:absolute;inset:0;z-index:1;opacity:0.04;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,0) 50%,rgba(0,0,0,0.5) 50%);background-size:100% 4px;"></div>

  <!-- Top Console Bar -->
  <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;background:#111111;border-bottom:2px solid #14532D;padding:16px 32px;flex-shrink:0;">
    <div style="display:flex;align-items:center;gap:16px;">
      <span style="font-size:20px;">⬛</span>
      <span style="font-size:18px;font-weight:700;letter-spacing:4px;">DIAGNOSTIC_TERMINAL_V9.2.4</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px;">
      <span style="color:#CA8A04;font-size:16px;">⚡</span>
      <span style="color:#CA8A04;background:rgba(78,50,0,0.3);padding:4px 16px;font-size:13px;font-weight:700;border:1px solid #92400E;letter-spacing:2px;">FAULT_DETECTED</span>
    </div>
  </div>

  <!-- Terminal Viewport -->
  <div style="position:relative;z-index:2;flex:1;display:flex;flex-direction:column;margin:32px;border:1px solid #1E293B;background:#0A0A0A;padding:40px;overflow:hidden;">
    <!-- Command line -->
    <div style="margin-bottom:40px;">
      <div style="display:flex;font-size:16px;color:#64748B;margin-bottom:8px;">
        <span style="color:#16A34A;margin-right:12px;">root@system:~$</span>
        <span>analyze -target current_module -depth all</span>
      </div>
      <!-- Error title -->
      <div style="color:#991B1B;font-size:16px;font-weight:700;margin-bottom:4px;letter-spacing:3px;">ERROR // CRITICAL_EXCEPTION</div>
      <h1 style="margin:0;font-size:44px;font-weight:900;color:#EF4444;line-height:1.2;text-transform:uppercase;letter-spacing:-1px;">
        ⊘ ${title}
      </h1>
    </div>

    ${subtitle ? `<div style="background:rgba(69,10,10,0.3);border-left:4px solid #B91C1C;padding:16px 24px;color:#FCA5A5;font-size:22px;font-weight:700;margin-bottom:32px;max-width:75%;">${subtitle}</div>` : ''}

    <!-- Log output -->
    <div style="flex:1;overflow:hidden;">
      ${linesHTML}
      <!-- Blinking cursor placeholder -->
      <div style="display:flex;align-items:center;color:#4ADE80;font-size:18px;margin-top:16px;">
        <span style="margin-right:8px;">&gt;</span>
        <span style="width:12px;height:24px;background:#4ADE80;display:inline-block;"></span>
      </div>
    </div>
  </div>
</section>`;
}
