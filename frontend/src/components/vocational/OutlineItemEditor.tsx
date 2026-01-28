import React, { useState, useRef, useCallback } from 'react';
import { 
  GripVertical, ChevronDown, ChevronUp, Plus, Trash2, 
  Image, ImageOff, Layout 
} from 'lucide-react';
import type { VocationalPage } from '@/store/useVocationalStore';

interface OutlineItemEditorProps {
  page: VocationalPage;
  index: number;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateBullets: (bullets: string[]) => void;
  onUpdateImageLayout: (layout: 'none' | 'right' | 'background') => void;
  onDelete: () => void;
  onAddAfter: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export const OutlineItemEditor: React.FC<OutlineItemEditorProps> = ({
  page,
  index,
  isActive,
  isExpanded,
  onSelect,
  onToggleExpand,
  onUpdateTitle,
  onUpdateBullets,
  onUpdateImageLayout,
  onDelete,
  onAddAfter,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  const [localTitle, setLocalTitle] = useState(page.title);
  const [localBullets, setLocalBullets] = useState(page.bullets.join('\n'));
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // 防抖处理标题更新
  const handleTitleChange = useCallback((value: string) => {
    setLocalTitle(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateTitle(value);
    }, 500);
  }, [onUpdateTitle]);
  
  // 防抖处理要点更新
  const handleBulletsChange = useCallback((value: string) => {
    setLocalBullets(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateBullets(value.split('\n').filter(Boolean));
    }, 500);
  }, [onUpdateBullets]);
  
  const imageLayoutOptions = [
    { value: 'none' as const, icon: <ImageOff size={14} />, label: '无图' },
    { value: 'right' as const, icon: <Image size={14} />, label: '右图' },
    { value: 'background' as const, icon: <Layout size={14} />, label: '背景图' },
  ];
  
  return (
    <div
      className={`border rounded-lg transition-all duration-200 ${
        isDragging 
          ? 'opacity-50 scale-95' 
          : isActive 
            ? 'border-green-400 bg-green-50/50 shadow-sm' 
            : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 头部：可拖拽 */}
      <div className="flex items-center gap-2 p-2 cursor-pointer">
        {/* 拖拽手柄 */}
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          onMouseDown={onDragStart}
          onMouseUp={onDragEnd}
          aria-label="拖拽排序"
        >
          <GripVertical size={16} />
        </button>
        
        {/* 序号 */}
        <span className="w-6 h-6 flex items-center justify-center text-xs font-medium text-gray-500 bg-gray-100 rounded">
          {index + 1}
        </span>
        
        {/* 标题 */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            isActive ? 'text-green-800' : 'text-gray-900'
          }`}>
            {page.title || '未命名页面'}
          </p>
          {!isExpanded && page.bullets.length > 0 && (
            <p className="text-xs text-gray-500 truncate">
              {page.bullets.slice(0, 2).join('、')}
              {page.bullets.length > 2 && '...'}
            </p>
          )}
        </div>
        
        {/* 页面类型标签 */}
        {page.pageType && (
          <span className={`px-1.5 py-0.5 text-xs rounded ${
            page.pageType === 'theory'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {page.pageType === 'theory' ? '理论' : '实训'}
          </span>
        )}
        
        {/* 展开/收起按钮 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
          aria-label={isExpanded ? '收起' : '展开'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      {/* 展开的编辑区域 */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
          {/* 标题编辑 */}
          <div className="pt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              页面标题
            </label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="输入页面标题"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-green-400"
            />
          </div>
          
          {/* 要点编辑 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              要点内容（每行一个）
            </label>
            <textarea
              value={localBullets}
              onChange={(e) => handleBulletsChange(e.target.value)}
              placeholder="• 输入要点&#10;• 每行一个&#10;• 支持多行"
              rows={4}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:border-green-400"
            />
          </div>
          
          {/* 图片布局选择 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              图片布局
            </label>
            <div className="flex gap-2">
              {imageLayoutOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUpdateImageLayout(option.value)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                    page.imageLayout === option.value
                      ? 'bg-green-100 border-green-400 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddAfter();
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
            >
              <Plus size={14} />
              在下方添加页面
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定删除此页面吗？')) {
                  onDelete();
                }
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
            >
              <Trash2 size={14} />
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
