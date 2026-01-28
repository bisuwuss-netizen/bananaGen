import React, { useEffect, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageLightboxProps {
  imageSrc: string;
  alt?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageSrc,
  alt = '图片预览',
  onClose,
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  
  // ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === '+' || e.key === '=') {
      setZoom((z) => Math.min(z + 0.25, 3));
    } else if (e.key === '-') {
      setZoom((z) => Math.max(z - 0.25, 0.5));
    }
  }, [onClose]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);
  
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* 顶部工具栏 */}
      <div 
        className="flex items-center justify-between p-4 bg-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-white text-sm">
          {alt}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="缩小 (-)"
            disabled={zoom <= 0.5}
          >
            <ZoomOut size={20} />
          </button>
          
          <span className="text-white/80 text-sm min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="放大 (+)"
            disabled={zoom >= 3}
          >
            <ZoomIn size={20} />
          </button>
          
          <div className="w-px h-6 bg-white/20 mx-2" />
          
          <button
            type="button"
            onClick={handleRotate}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="旋转"
          >
            <RotateCw size={20} />
          </button>
          
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="下载"
          >
            <Download size={20} />
          </button>
          
          <div className="w-px h-6 bg-white/20 mx-2" />
          
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="关闭 (ESC)"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* 图片区域 */}
      <div 
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageSrc}
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>
      
      {/* 底部提示 */}
      <div className="p-2 text-center text-white/50 text-xs bg-black/50">
        使用 +/- 键缩放 · ESC 键关闭 · 点击空白处关闭
      </div>
    </div>
  );
};
