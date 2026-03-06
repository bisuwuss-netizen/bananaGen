import { Image as ImageIcon, Loader2, Sparkles, Upload } from 'lucide-react';

import { Button } from '@/components/shared';

type Props = {
  batchActionLabel: string;
  isGeneratingHtmlImages: boolean;
  isGeneratingHtmlBackgrounds: boolean;
  htmlImageProgressLabel?: string;
  htmlBackgroundProgressLabel?: string;
  onBatchGenerate: () => void;
  onGenerateCurrentHtmlImages: () => void;
  onGenerateHtmlBackgrounds: () => void;
  onUploadBackground: () => void;
  isHtmlMode: boolean;
  children: React.ReactNode;
};

export function SlideThumbnailRail({
  batchActionLabel,
  isGeneratingHtmlImages,
  isGeneratingHtmlBackgrounds,
  htmlBackgroundProgressLabel,
  onBatchGenerate,
  onGenerateCurrentHtmlImages,
  onGenerateHtmlBackgrounds,
  onUploadBackground,
  isHtmlMode,
  children,
}: Props) {
  return (
    <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-3 md:p-4 border-b border-gray-200 flex-shrink-0 space-y-2 md:space-y-3">
        <Button
          variant="primary"
          icon={isGeneratingHtmlImages ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={onBatchGenerate}
          className="w-full text-sm md:text-base"
          disabled={isGeneratingHtmlImages}
        >
          {batchActionLabel}
        </Button>
        {isHtmlMode && (
          <Button
            variant="ghost"
            icon={<Sparkles size={14} />}
            onClick={onGenerateCurrentHtmlImages}
            className="w-full text-xs md:text-sm"
            disabled={isGeneratingHtmlImages}
          >
            生成当前页
          </Button>
        )}
        {isHtmlMode && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon={isGeneratingHtmlBackgrounds ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              onClick={onGenerateHtmlBackgrounds}
              className="flex-1 text-xs md:text-sm"
              disabled={isGeneratingHtmlBackgrounds}
            >
              {htmlBackgroundProgressLabel || '生成背景'}
            </Button>
            <Button
              variant="ghost"
              icon={<Upload size={14} />}
              onClick={onUploadBackground}
              className="flex-1 text-xs md:text-sm"
              disabled={isGeneratingHtmlBackgrounds}
            >
              上传背景
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-y-auto overflow-x-auto md:overflow-x-visible p-3 md:p-4 min-h-0">
        <div className="flex md:flex-col gap-2 md:gap-4 min-w-max md:min-w-0">
          {children}
        </div>
      </div>
    </aside>
  );
}
