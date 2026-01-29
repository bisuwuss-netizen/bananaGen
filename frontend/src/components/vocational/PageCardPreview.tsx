import React from 'react';
import { FileText, Image as ImageIcon, BookOpen, Wrench, CheckCircle } from 'lucide-react';
import { cn } from '@/utils';

interface PageData {
  id: string;
  title: string;
  bullets: string[];
  imageLayout?: 'left' | 'right' | 'full' | 'none';
  part?: 'theory' | 'practice';
  hasDescription?: boolean;
  description?: string;
}

interface PageCardPreviewProps {
  pages: PageData[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  className?: string;
}

const PageCardPreview: React.FC<PageCardPreviewProps> = ({
  pages,
  currentPageIndex,
  onSelectPage,
  className,
}) => {
  if (pages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full text-gray-400", className)}>
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>暂无大纲内容</p>
          <p className="text-sm mt-1">请先生成大纲</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h3 className="font-medium text-gray-700 flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-500" />
          页面卡片预览
        </h3>
        <span className="text-sm text-gray-500">
          共 {pages.length} 页
        </span>
      </div>
      
      {/* 卡片网格 */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pages.map((page, index) => (
            <div
              key={page.id}
              onClick={() => onSelectPage(index)}
              className={cn(
                "group relative bg-white rounded-lg border-2 shadow-sm cursor-pointer",
                "transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
                currentPageIndex === index
                  ? "border-indigo-500 ring-2 ring-indigo-100"
                  : "border-gray-200 hover:border-indigo-300"
              )}
            >
              {/* 页码和类型标签 */}
              <div className="absolute -top-2 -left-2 flex items-center gap-1 z-10">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow",
                  currentPageIndex === index
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-600"
                )}>
                  {index + 1}
                </span>
              </div>
              
              {/* 类型标签 */}
              {page.part && (
                <div className={cn(
                  "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium shadow",
                  page.part === 'theory'
                    ? "bg-blue-100 text-blue-700"
                    : "bg-orange-100 text-orange-700"
                )}>
                  {page.part === 'theory' ? (
                    <span className="flex items-center gap-1">
                      <BookOpen size={10} /> 理论
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Wrench size={10} /> 实训
                    </span>
                  )}
                </div>
              )}
              
              {/* 卡片内容 */}
              <div className="p-4 pt-5">
                {/* 标题 */}
                <h4 className={cn(
                  "font-medium text-sm line-clamp-2 mb-2",
                  currentPageIndex === index ? "text-indigo-700" : "text-gray-800"
                )}>
                  {page.title || '(无标题)'}
                </h4>
                
                {/* 要点列表 */}
                {page.bullets && page.bullets.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {page.bullets.slice(0, 3).map((bullet, bIndex) => (
                      <li 
                        key={bIndex}
                        className="text-xs text-gray-500 flex items-start gap-1.5"
                      >
                        <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                        <span className="line-clamp-1">{bullet}</span>
                      </li>
                    ))}
                    {page.bullets.length > 3 && (
                      <li className="text-xs text-gray-400 pl-2.5">
                        +{page.bullets.length - 3} 更多要点...
                      </li>
                    )}
                  </ul>
                )}
                
                {/* 描述预览 */}
                {page.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 italic border-t pt-2 mt-2">
                    {page.description}
                  </p>
                )}
                
                {/* 底部状态 */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                  {/* 图片布局指示 */}
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <ImageIcon size={12} />
                    <span>
                      {page.imageLayout === 'left' ? '左图' : 
                       page.imageLayout === 'right' ? '右图' :
                       page.imageLayout === 'full' ? '全图' : '无图'}
                    </span>
                  </div>
                  
                  {/* 描述状态 */}
                  {page.hasDescription && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle size={12} />
                      已生成描述
                    </span>
                  )}
                </div>
              </div>
              
              {/* 选中指示器 */}
              {currentPageIndex === index && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-b-lg" />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* 底部统计 */}
      <div className="px-4 py-2 border-t bg-white flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <BookOpen size={12} className="text-blue-500" />
            理论: {pages.filter(p => p.part === 'theory').length} 页
          </span>
          <span className="flex items-center gap-1">
            <Wrench size={12} className="text-orange-500" />
            实训: {pages.filter(p => p.part === 'practice').length} 页
          </span>
        </div>
        <span>
          已生成描述: {pages.filter(p => p.hasDescription).length} / {pages.length}
        </span>
      </div>
    </div>
  );
};

export default PageCardPreview;
