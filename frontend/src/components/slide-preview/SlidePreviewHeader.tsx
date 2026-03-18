import { ArrowLeft, Download, FileText, Home, Loader2 } from 'lucide-react';

import { Button, ExportTasksPanel } from '@/components/shared';
import type { Page } from '@/types';
import type { ExportTask } from '@/store/useExportTasksStore';

type Props = {
  projectId?: string;
  pages: Page[];
  exportTasks: ExportTask[];
  htmlGlobalBackground?: string;
  isHtmlMode: boolean;
  showExportMenu: boolean;
  showExportTasksPanel: boolean;
  exportMenuRef: React.RefObject<HTMLDivElement | null>;
  onGoHome: () => void;
  onGoBack: () => void;
  onGoPreviousStep: () => void;
  onToggleExportMenu: () => void;
  onToggleExportTasksPanel: () => void;
  onClearBackground: () => void;
  onExportPptx: () => void;
  onDownloadHtmlSlides: () => void;
};

export function SlidePreviewHeader({
  projectId,
  pages,
  exportTasks,
  htmlGlobalBackground,
  isHtmlMode,
  showExportMenu,
  showExportTasksPanel,
  exportMenuRef,
  onGoHome,
  onGoBack,
  onGoPreviousStep,
  onToggleExportMenu,
  onToggleExportTasksPanel,
  onClearBackground,
  onExportPptx,
  onDownloadHtmlSlides,
}: Props) {
  const projectTasks = exportTasks.filter((task) => task.projectId === projectId);
  const activeTaskCount = projectTasks.filter((task) =>
    task.status === 'PROCESSING' || task.status === 'RUNNING' || task.status === 'PENDING'
  ).length;

  return (
    <header className="app-navbar relative z-40 h-14 md:h-16 flex items-center justify-between px-3 md:px-6 flex-shrink-0 overflow-visible">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<Home size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={onGoHome}
          className="hidden sm:inline-flex flex-shrink-0"
        >
          <span className="hidden md:inline">主页</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={onGoBack}
          className="flex-shrink-0"
        >
          <span className="hidden sm:inline">返回</span>
        </Button>
        <span className="text-sm md:text-lg font-semibold truncate hidden sm:inline">预览</span>
      </div>

      <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
        {isHtmlMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearBackground}
            className="hidden sm:inline-flex"
            disabled={!htmlGlobalBackground}
          >
            清除背景图
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={onGoPreviousStep}
          className="hidden sm:inline-flex"
        >
          <span className="hidden md:inline">上一步</span>
        </Button>

        {projectTasks.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExportTasksPanel}
              className="relative"
            >
              {activeTaskCount > 0 ? (
                <Loader2 size={16} className="animate-spin text-banana-500" />
              ) : (
                <FileText size={16} />
              )}
              <span className="ml-1 text-xs">{projectTasks.length}</span>
            </Button>
            {showExportTasksPanel && (
              <div className="absolute right-0 mt-2 z-50">
                <ExportTasksPanel
                  projectId={projectId}
                  pages={pages}
                  className="w-96 max-h-[28rem] shadow-lg"
                />
              </div>
            )}
          </div>
        )}

        <div className="relative" ref={exportMenuRef as React.RefObject<HTMLDivElement>}>
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onToggleExportMenu}
            className="text-xs md:text-sm"
          >
            <span>导出</span>
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button
                onClick={onExportPptx}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
              >
                导出为 PPTX
              </button>
              {isHtmlMode && import.meta.env.VITE_SHOW_DEBUG_BUTTONS === 'true' && (
                <button
                  onClick={onDownloadHtmlSlides}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm text-banana-600 font-medium"
                >
                  下载 HTML 幻灯片
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
