import React from 'react';
import { Check } from 'lucide-react';
import { layoutSchemes, type LayoutScheme } from '@/data/layoutSchemes';

interface SchemeSelectorProps {
  value: string;
  onChange: (schemeId: string) => void;
}

const SchemeCard: React.FC<{
  scheme: LayoutScheme;
  selected: boolean;
  onSelect: () => void;
}> = ({ scheme, selected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-left rounded-2xl border p-4 transition-all ${
        selected
          ? 'border-banana-400 bg-gradient-to-br from-banana-50 to-white shadow-yellow'
          : 'border-slate-200 bg-white/80 hover:border-banana-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: scheme.accent }}
            />
            <h4 className="text-sm font-semibold text-gray-900">{scheme.name}</h4>
          </div>
          <p className="text-xs text-gray-600 mt-1">{scheme.description}</p>
        </div>
        {selected && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-banana-500 text-white shadow-sm">
            <Check size={14} />
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {scheme.tags.map((tag) => (
          <span
            key={tag}
            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-slate-600"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-slate-500">
        10 种布局 · 页面自动分镜
      </div>
    </button>
  );
};

export const SchemeSelector: React.FC<SchemeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {layoutSchemes.map((scheme) => (
        <SchemeCard
          key={scheme.id}
          scheme={scheme}
          selected={scheme.id === value}
          onSelect={() => onChange(scheme.id)}
        />
      ))}
    </div>
  );
};

export default SchemeSelector;
