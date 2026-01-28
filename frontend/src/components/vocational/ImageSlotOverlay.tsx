import React, { useState, useRef } from 'react';
import { RefreshCw, Upload, Maximize2, Loader2, AlertCircle, Check, X } from 'lucide-react';
import type { ImageSlot, ImageSlotStatus } from '@/store/useVocationalStore';

interface ImageSlotOverlayProps {
  slot: ImageSlot;
  onRegenerate: (slotId: string) => void;
  onUpload: (slotId: string, file: File) => void;
  onPreview: (imagePath: string) => void;
  isRegenerating?: boolean;
}

const statusConfig: Record<ImageSlotStatus, { 
  color: string; 
  bgColor: string; 
  icon: React.ReactNode; 
  label: string;
}> = {
  pending: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: null,
    label: '待生成',
  },
  generating: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: <Loader2 size={14} className="animate-spin" />,
    label: '生成中',
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: <Check size={14} />,
    label: '已完成',
  },
  failed: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: <AlertCircle size={14} />,
    label: '生成失败',
  },
  uploaded: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: <Upload size={14} />,
    label: '已上传',
  },
};

export const ImageSlotOverlay: React.FC<ImageSlotOverlayProps> = ({
  slot,
  onRegenerate,
  onUpload,
  onPreview,
  isRegenerating,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const config = statusConfig[slot.status];
  const hasImage = !!slot.image_path;
  const canInteract = slot.status !== 'generating' && !isRegenerating;
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('图片文件不能超过 10MB');
        return;
      }
      onUpload(slot.slot_id, file);
      setShowUploadModal(false);
    }
    e.target.value = '';
  };
  
  return (
    <>
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 状态指示器（始终显示） */}
        <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${config.bgColor} ${config.color}`}>
          {config.icon}
          {config.label}
        </div>
        
        {/* 图片显示区域 */}
        <div className={`
          aspect-video rounded-lg overflow-hidden transition-all duration-200
          ${hasImage ? 'bg-gray-100' : 'bg-gray-50 border-2 border-dashed border-gray-200'}
          ${isHovered && canInteract ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        `}>
          {hasImage ? (
            <img
              src={slot.image_path}
              alt={slot.description}
              className="w-full h-full object-cover"
              onClick={() => slot.image_path && onPreview(slot.image_path)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                {slot.status === 'generating' ? (
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                ) : (
                  <Upload size={24} />
                )}
              </div>
              <p className="text-sm">{slot.description || '图片插槽'}</p>
            </div>
          )}
        </div>
        
        {/* 悬停操作遮罩 */}
        {isHovered && canInteract && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center gap-3 transition-opacity duration-200">
            {/* 重绘按钮 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate(slot.slot_id);
              }}
              disabled={isRegenerating}
              className="flex flex-col items-center gap-1 px-4 py-2 bg-white rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50"
              title="重新生成图片"
            >
              {isRegenerating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <RefreshCw size={20} />
              )}
              <span className="text-xs">重绘</span>
            </button>
            
            {/* 上传按钮 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUploadModal(true);
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 bg-white rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
              title="上传替换图片"
            >
              <Upload size={20} />
              <span className="text-xs">上传</span>
            </button>
            
            {/* 查看大图按钮（仅有图片时显示） */}
            {hasImage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  slot.image_path && onPreview(slot.image_path);
                }}
                className="flex flex-col items-center gap-1 px-4 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                title="查看大图"
              >
                <Maximize2 size={20} />
                <span className="text-xs">大图</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* 上传确认弹窗 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[400px] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">上传图片</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">插槽描述：{slot.description}</p>
                <p className="text-xs text-orange-600">
                  提示：上传的图片为临时缓存，导出时会包含在 PPTX 中。
                </p>
              </div>
              
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">点击选择图片</p>
                <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、GIF，最大 10MB</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
