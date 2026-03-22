import React from 'react';
import type { TitleBulletsModel, ThemeConfig } from '../../types/schema';
import { AlertTriangle, AlertOctagon, CheckSquare } from 'lucide-react';

interface Props {
  model: TitleBulletsModel & { layoutId?: string };
  theme: ThemeConfig;
}

export const VocationalSafetyCheckLayout: React.FC<Props> = ({ model, theme }) => {
  const { title, subtitle, bullets = [] } = model;
  
  return (
    <div className="w-full h-full bg-[#1c1917] p-8 font-sans overflow-hidden">
      {/* Extreme Warning Border Container */}
      <div 
        className="w-full h-full bg-[#111318] relative flex flex-col"
        style={{
          border: '12px solid #FF3333',
          borderImage: 'repeating-linear-gradient(45deg, #FF3333, #FF3333 30px, #111318 30px, #111318 60px) 12',
          boxShadow: 'inset 0 0 40px rgba(255, 51, 51, 0.15)'
        }}
      >
        
        {/* Warning Header */}
        <div className="bg-red-950/50 border-b-2 border-red-500/30 w-full px-12 py-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <AlertTriangle size={56} className="text-red-500 animate-pulse" />
            <div>
              <h1 className="text-5xl font-black text-white tracking-tight uppercase mb-2">
                {title || 'SAFETY CHECKLIST / 安防核查'}
              </h1>
              {subtitle && (
                <h2 className="text-xl font-bold text-red-400">
                  {subtitle}
                </h2>
              )}
            </div>
          </div>
          <div className="bg-red-500 text-white font-black text-2xl px-6 py-2 rotate-3 shadow-lg">
            MANDATORY
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex px-16 py-10 gap-16">
          
          {/* Context box left */}
          <div className="w-1/4 flex flex-col border-r border-slate-800/60 pr-12 pt-4">
            <AlertOctagon size={48} className="text-slate-600 mb-6" />
            <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
              Failure to comply with these restrictions may result in severe equipment damage, operational failure, or fatal accidents.
            </p>
            <div className="mt-auto pt-6 border-t border-slate-800">
              <p className="font-mono text-slate-500 text-sm">TOTAL CHECKS: {bullets.length}</p>
              <p className="font-mono text-red-500 text-sm font-bold mt-1">STATUS: PENDING VALIDATION</p>
            </div>
          </div>

          {/* Checklist right */}
          <div className="w-3/4 flex flex-col justify-center gap-6">
            {bullets.map((bulletRaw, idx) => {
              const bulletText = typeof bulletRaw === 'string' ? bulletRaw : (bulletRaw as any).text || '';
              // Automatically infer if it's a "Forbidden" or "Required" check based on some mock logic or just display uniformly
              const isDanger = bulletText.includes('禁') || bulletText.includes('严禁') || bulletText.includes('不') || bulletText.includes('防止');
              
              return (
                <div 
                  key={idx}
                  className={`flex items-start gap-6 p-6 border-l-8 bg-slate-900/40 backdrop-blur-sm
                    ${isDanger ? 'border-red-500' : 'border-yellow-500'}
                  `}
                >
                  <div className={`mt-1 ${isDanger ? 'text-red-500' : 'text-yellow-500'}`}>
                    {isDanger ? <AlertOctagon size={32} /> : <CheckSquare size={32} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-2xl font-bold leading-snug tracking-wide ${isDanger ? 'text-red-100' : 'text-slate-200'}`}>
                      {bulletText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export function renderVocationalSafetyCheckLayoutHTML(model: any, theme: any): string {
  const { title = 'SAFETY CHECKLIST / 安防核查', subtitle = '', bullets = [] } = model;

  const rowsHTML = bullets.map((bulletRaw: any, idx: number) => {
    const text = typeof bulletRaw === 'string' ? bulletRaw : bulletRaw.text || '';
    const isDanger = /禁|严禁|不得|防止|切勿|禁止/.test(text);
    const accentColor = isDanger ? '#EF4444' : '#EAB308';
    const textColor = isDanger ? '#FEE2E2' : '#E2E8F0';
    const icon = isDanger ? '⊘' : '☑';
    return `
    <div style="display:flex;align-items:flex-start;gap:24px;padding:20px 24px;border-left:8px solid ${accentColor};background:rgba(15,23,42,0.4);">
      <div style="font-size:28px;color:${accentColor};flex-shrink:0;margin-top:2px;">${icon}</div>
      <p style="margin:0;font-size:22px;font-weight:700;line-height:1.4;color:${textColor};letter-spacing:0.3px;">${text}</p>
    </div>`;
  }).join('\n');

  return `
<section style="width:1280px;height:720px;box-sizing:border-box;background:#1c1917;padding:32px;font-family:'PingFang SC','Microsoft YaHei',sans-serif;overflow:hidden;">
  <div style="width:100%;height:100%;box-sizing:border-box;background:#111318;position:relative;display:flex;flex-direction:column;border:12px solid #FF3333;box-shadow:inset 0 0 40px rgba(255,51,51,0.15);">

    <!-- Warning Header -->
    <div style="background:rgba(69,10,10,0.5);border-bottom:2px solid rgba(239,68,68,0.4);padding:32px 48px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:24px;">
        <div style="font-size:52px;color:#EF4444;">⚠</div>
        <div>
          <h1 style="margin:0 0 8px 0;font-size:44px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;text-transform:uppercase;">${title}</h1>
          ${subtitle ? `<h2 style="margin:0;font-size:20px;font-weight:700;color:#FCA5A5;">${subtitle}</h2>` : ''}
        </div>
      </div>
      <div style="background:#EF4444;color:#FFFFFF;font-size:22px;font-weight:900;padding:8px 24px;transform:rotate(3deg);box-shadow:0 4px 12px rgba(0,0,0,0.5);">MANDATORY</div>
    </div>

    <!-- Content Body -->
    <div style="flex:1;display:flex;padding:40px 48px;gap:48px;overflow:hidden;">
      <!-- Left Sidebar -->
      <div style="width:220px;display:flex;flex-direction:column;border-right:1px solid rgba(51,65,85,0.6);padding-right:40px;">
        <div style="font-size:40px;color:#334155;margin-bottom:20px;">⛔</div>
        <p style="margin:0 0 28px 0;font-size:15px;color:#94A3B8;line-height:1.6;">
          Failure to comply may result in severe equipment damage or fatal accidents.
        </p>
        <div style="margin-top:auto;padding-top:20px;border-top:1px solid #1E293B;">
          <p style="margin:0 0 4px 0;font-family:monospace;font-size:12px;color:#475569;">TOTAL CHECKS: ${bullets.length}</p>
          <p style="margin:0;font-family:monospace;font-size:12px;color:#EF4444;font-weight:700;">STATUS: PENDING VALIDATION</p>
        </div>
      </div>

      <!-- Checklist -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px;overflow:hidden;">
        ${rowsHTML}
      </div>
    </div>
  </div>
</section>`;
}
