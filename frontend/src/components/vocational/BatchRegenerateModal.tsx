import React, { useMemo } from 'react';
import { X, RefreshCw, AlertTriangle, Image } from 'lucide-react';
import type { ImageSlot } from '@/store/useVocationalStore';

interface BatchRegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (slotIds: string[]) => void;
  imageSlots: ImageSlot[];
  mode: 'all' | 'failed';
}

export const BatchRegenerateModal: React.FC<BatchRegenerateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  imageSlots,
  mode,
}) => {
  // 计算要重绘的插槽
  const slotsToRegenerate = useMemo(() => {
    if (mode === 'all') {
      return imageSlots;
    }
    return imageSlots.filter(slot => slot.status === 'failed');
  }, [imageSlots, mode]);
  
  // 估算费用（假设每张图 0.1 元）
  const estimatedCost = slotsToRegenerate.length * 0.1;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[480px] max-h-[80vh] overflow-hidden shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <RefreshCw size={20} className="text-orange-600" />
            {mode === 'all' ? '批量重绘所有图片' : '批量重绘失败图片'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* 警告信息 */}
          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle size={20} className="text-orange-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-orange-800">
                确认批量重绘？
              </p>
              <p className="text-orange-700 mt-1">
                此操作将重新生成选中的图片，每张图片独立计费。
              </p>
            </div>
          </div>
          
          {/* 统计信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Image size={16} />
                图片数量
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {slotsToRegenerate.length}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                预估费用
              </div>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                ¥ {estimatedCost.toFixed(2)}
              </p>
            </div>
          </div>
          
          {/* 图片列表预览 */}
          {slotsToRegenerate.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                将重绘以下图片：
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {slotsToRegenerate.map((slot, index) => (
                  <div
                    key={slot.slot_id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="w-6 h-6 bg-gray-200 rounded text-xs flex items-center justify-center text-gray-600">
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate text-gray-700">
                      {slot.description || `插槽 ${slot.slot_id}`}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      slot.status === 'failed' 
                        ? 'bg-red-100 text-red-700' 
                        : slot.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {slot.status === 'failed' ? '失败' : slot.status === 'completed' ? '已完成' : '待生成'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {slotsToRegenerate.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Image size={48} className="mx-auto mb-2 opacity-50" />
              <p>{mode === 'failed' ? '没有失败的图片需要重绘' : '没有图片需要重绘'}</p>
            </div>
          )}
        </div>
        
        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(slotsToRegenerate.map(s => s.slot_id))}
            disabled={slotsToRegenerate.length === 0}
            className="px-4 py-2 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw size={16} />
            确认重绘 ({slotsToRegenerate.length} 张)
          </button>
        </div>
      </div>
    </div>
  );
};
