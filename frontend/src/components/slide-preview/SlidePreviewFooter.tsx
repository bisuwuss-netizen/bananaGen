import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/shared';

type VariantOption = { id: string; label: string };

type Props = {
  selectedIndex: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  variants?: VariantOption[];
  currentVariant?: string;
  onVariantChange?: (variantId: string) => void;
  isVariantUpdating?: boolean;
  versionMenu?: React.ReactNode;
};

export function SlidePreviewFooter({
  selectedIndex,
  totalPages,
  onPrevious,
  onNext,
  variants,
  currentVariant,
  onVariantChange,
  isVariantUpdating = false,
  versionMenu,
}: Props) {
  return (
    <div className="px-3 md:px-6 py-3 md:py-4 flex-shrink-0" style={{ background: '#ede4d0', borderTop: '2px solid #1a1a1a' }}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onPrevious}
            disabled={selectedIndex === 0}
            className="text-xs md:text-sm"
          >
            <span>上一页</span>
          </Button>
          <span className="px-2 md:px-4 text-xs md:text-sm text-gray-600 whitespace-nowrap">
            {selectedIndex + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onNext}
            disabled={selectedIndex === totalPages - 1}
            className="text-xs md:text-sm"
          >
            <span>下一页</span>
          </Button>
        </div>

        {variants && variants.length > 1 && onVariantChange && (
          <div className="flex items-center gap-1 w-full sm:w-auto justify-center">
            <span className="text-xs text-gray-400 mr-1 hidden md:inline">变体</span>
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => onVariantChange(v.id)}
                disabled={isVariantUpdating}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border-2 border-gray-900 transition-colors ${
                  currentVariant === v.id
                    ? 'bg-[#f5d040] text-gray-900'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${isVariantUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto justify-center">
          {versionMenu}
        </div>
      </div>
    </div>
  );
}
