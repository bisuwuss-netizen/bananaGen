import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Maximize2, Minimize2, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, RefreshCw, ExternalLink, Loader2 
} from 'lucide-react';
import { ImageSlotOverlay } from './ImageSlotOverlay';
import type { ImageSlot } from '@/store/useVocationalStore';

interface VocationalHTMLPreviewProps {
  previewUrl: string | null;
  previewHtml?: string | null;
  imageSlots: ImageSlot[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRegenerateSlot: (slotId: string) => void;
  onUploadSlot: (slotId: string, file: File) => void;
  onPreviewImage: (imagePath: string) => void;
  isLoading?: boolean;
  regeneratingSlotId?: string | null;
}

export const VocationalHTMLPreview: React.FC<VocationalHTMLPreviewProps> = ({
  previewUrl,
  previewHtml,
  imageSlots,
  totalPages,
  currentPage,
  onPageChange,
  onRegenerateSlot,
  onUploadSlot,
  onPreviewImage,
  isLoading,
  regeneratingSlotId,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  
  // 当前页面的图片插槽
  const currentPageSlots = imageSlots.filter(slot => slot.page_index === currentPage);
  
  // 处理 iframe 加载完成
  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
    // 尝试跳转到对应页面（如果 reveal.js 支持）
    if (iframeRef.current?.contentWindow && currentPage > 0) {
      try {
        // 发送消息给 reveal.js 跳转页面
        iframeRef.current.contentWindow.postMessage(
          { type: 'slide:goto', index: currentPage },
          '*'
        );
      } catch (e) {
        console.warn('无法控制 iframe 内的幻灯片');
      }
    }
  }, [currentPage]);
  
  // 监听来自 iframe 的消息（页面切换）
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'slide:changed') {
        onPageChange(event.data.index);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPageChange]);
  
  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen) {
        if (e.key === 'Escape') {
          setIsFullscreen(false);
        } else if (e.key === 'ArrowLeft') {
          onPageChange(Math.max(0, currentPage - 1));
        } else if (e.key === 'ArrowRight') {
          onPageChange(Math.min(totalPages - 1, currentPage + 1));
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentPage, totalPages, onPageChange]);
  
  // 在新窗口打开
  const openInNewWindow = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };
  
  // 刷新预览
  const refreshPreview = () => {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl;
      setIframeLoaded(false);
    }
  };
  
  if (!previewUrl && !previewHtml) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          {isLoading ? (
            <Loader2 size={32} className="animate-spin text-blue-500" />
          ) : (
            <RefreshCw size={32} />
          )}
        </div>
        <p className="text-lg font-medium">
          {isLoading ? '正在生成预览...' : '点击"生成预览"查看效果'}
        </p>
        <p className="text-sm mt-2">
          选择教学法和模板后生成 HTML 预览
        </p>
      </div>
    );
  }
  
  return (
    <div className={`
      relative flex flex-col bg-white rounded-lg shadow-sm overflow-hidden
      ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full'}
    `}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* 页面导航 */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="上一页 (←)"
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="text-sm text-gray-600 min-w-[80px] text-center">
            {currentPage + 1} / {totalPages || '?'}
          </span>
          
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="下一页 (→)"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          {/* 缩放控制 */}
          <button
            type="button"
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            disabled={zoom <= 50}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50"
            title="缩小"
          >
            <ZoomOut size={16} />
          </button>
          
          <span className="text-xs text-gray-500 min-w-[40px] text-center">
            {zoom}%
          </span>
          
          <button
            type="button"
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            disabled={zoom >= 200}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50"
            title="放大"
          >
            <ZoomIn size={16} />
          </button>
          
          <div className="w-px h-5 bg-gray-300 mx-1" />
          
          {/* 刷新 */}
          <button
            type="button"
            onClick={refreshPreview}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="刷新预览"
          >
            <RefreshCw size={16} />
          </button>
          
          {/* 新窗口打开 */}
          <button
            type="button"
            onClick={openInNewWindow}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="在新窗口打开"
          >
            <ExternalLink size={16} />
          </button>
          
          {/* 全屏切换 */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title={isFullscreen ? '退出全屏 (ESC)' : '全屏预览'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      
      {/* 预览内容 */}
      <div className="flex-1 relative overflow-auto bg-gray-100">
        <div 
          className="min-h-full flex items-center justify-center p-4"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center top' }}
        >
          <div className="relative bg-white shadow-lg">
            {/* iframe */}
            <iframe
              ref={iframeRef}
              src={previewUrl || undefined}
              srcDoc={!previewUrl && previewHtml ? previewHtml : undefined}
              className="w-[960px] h-[540px] border-0"
              title="HTML 预览"
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-same-origin"
            />
            
            {/* 加载指示器 */}
            {!iframeLoaded && (
              <div className="absolute inset-0 bg-white flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 当前页面的图片插槽面板 */}
      {currentPageSlots.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-600">
              当前页面图片插槽 ({currentPageSlots.length})
            </h4>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {currentPageSlots.map((slot) => (
              <ImageSlotOverlay
                key={slot.slot_id}
                slot={slot}
                onRegenerate={onRegenerateSlot}
                onUpload={onUploadSlot}
                onPreview={onPreviewImage}
                isRegenerating={regeneratingSlotId === slot.slot_id}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 全屏模式下的关闭提示 */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white text-sm rounded-full">
          按 ESC 退出全屏 · 使用 ←→ 键切换页面
        </div>
      )}
    </div>
  );
};
