import React from 'react';
import { Loader2 } from 'lucide-react';

interface GenerationProgressProps {
  total: number;
  completed: number;
  currentPage?: string;
  stage?: string;
  label?: string;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  total,
  completed,
  currentPage,
  stage,
  label = '正在生成页面内容',
}) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed >= total && total > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Spinner */}
      <div style={{ marginBottom: 28, position: 'relative' }}>
        <Loader2 size={48} className="animate-spin" style={{ color: '#f5d040' }} />
      </div>

      {/* Title */}
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, letterSpacing: 1 }}>
        {label}
      </div>

      {/* Counter */}
      <div style={{ fontSize: 40, fontWeight: 900, color: '#f5d040', marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
        {completed}<span style={{ color: '#94a3b8', fontSize: 24 }}>/{total}</span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: 320, height: 8, borderRadius: 2, background: '#334155',
        overflow: 'hidden', marginBottom: 20,
        border: '2px solid #f5d040',
      }}>
        <div style={{
          height: '100%',
          background: isComplete ? '#4ade80' : '#f5d040',
          width: `${percent}%`,
          transition: 'width 0.5s ease-out',
        }} />
      </div>

      {/* Current page name */}
      {currentPage && !isComplete && (
        <div style={{
          fontSize: 14, color: '#94a3b8', maxWidth: 400, textAlign: 'center',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          正在处理：{currentPage}
        </div>
      )}

      {/* Stage info */}
      {stage && !isComplete && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
          {stage === 'generating' ? '内容生成中' : stage === 'rewriting' ? '质量优化中' : stage}
        </div>
      )}

      {isComplete && (
        <div style={{ fontSize: 14, color: '#4ade80', fontWeight: 700 }}>
          全部完成，正在加载预览...
        </div>
      )}
    </div>
  );
};
