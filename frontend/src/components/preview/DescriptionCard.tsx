import React, { useState } from 'react';
import { Edit2, FileText, RefreshCw, Code, Layout } from 'lucide-react';
import { Card, ContextualStatusBadge, Button, Modal, Textarea, Skeleton, Markdown } from '@/components/shared';
import { useDescriptionGeneratingState } from '@/hooks/useGeneratingState';
import type { Page, DescriptionContent, LayoutId } from '@/types';
import { layoutNames, normalizeLayoutId } from '@/experimental/html-renderer/layouts';

const getLayoutDisplayName = (layoutId: LayoutId): string => {
  const normalized = normalizeLayoutId(layoutId);
  return layoutNames[normalized] || layoutId;
};

export interface DescriptionCardProps {
  page: Page;
  index: number;
  onUpdate: (data: Partial<Page>) => void;
  onRegenerate: () => void;
  isGenerating?: boolean;
  isAiRefining?: boolean;
  isHtmlMode?: boolean;
}

export const DescriptionCard: React.FC<DescriptionCardProps> = ({
  page,
  index,
  onUpdate,
  onRegenerate,
  isGenerating = false,
  isAiRefining = false,
  isHtmlMode = false,
}) => {
  // 从 description_content 提取文本内容
  const getDescriptionText = (descContent: DescriptionContent | undefined): string => {
    if (!descContent) return '';
    if ('text' in descContent) {
      return descContent.text;
    } else if ('text_content' in descContent && Array.isArray(descContent.text_content)) {
      return descContent.text_content.join('\n');
    }
    return '';
  };

  // 从 html_model 提取显示内容摘要
  const getHtmlModelSummary = (htmlModel: Record<string, unknown> | undefined): string => {
    if (!htmlModel) return '';
    
    // 提取主要文本字段作为摘要
    const parts: string[] = [];
    if (htmlModel.title) parts.push(`**${htmlModel.title}**`);
    if (htmlModel.subtitle) parts.push(htmlModel.subtitle as string);
    
    // 处理封面页的额外字段（author, department, date）
    const metaFields: string[] = [];
    if (htmlModel.author) metaFields.push(htmlModel.author as string);
    if (htmlModel.department) metaFields.push(htmlModel.department as string);
    if (htmlModel.date) metaFields.push(htmlModel.date as string);
    if (metaFields.length > 0) {
      parts.push(metaFields.join(' · '));
    }
    
    // 处理 description 字段（cinematic_overlay, dark_math, overlap 等）
    if (htmlModel.description && typeof htmlModel.description === 'string') {
      parts.push(htmlModel.description as string);
    }
    
    // 处理 key_point 字段（overlap 布局）
    if (htmlModel.key_point && typeof htmlModel.key_point === 'string') {
      parts.push(`💡 ${htmlModel.key_point}`);
    }
    
    // 处理 note 字段（dark_math 布局）
    if (htmlModel.note && typeof htmlModel.note === 'string') {
      parts.push(`📝 ${htmlModel.note}`);
    }
    
    // 处理 metric 字段（cinematic_overlay 布局）
    if (htmlModel.metric && typeof htmlModel.metric === 'object') {
      const metric = htmlModel.metric as { value?: string; label?: string };
      if (metric.value || metric.label) {
        parts.push(`📊 ${metric.value || ''} ${metric.label || ''}`.trim());
      }
    }
    
    // 处理 content 字段（可能是字符串或字符串数组）
    if (htmlModel.content) {
      if (Array.isArray(htmlModel.content)) {
        parts.push((htmlModel.content as string[]).join('\n'));
      } else {
        parts.push(htmlModel.content as string);
      }
    }
    
    // 处理 bullets 字段（对象数组，需要提取 text 属性）
    if (htmlModel.bullets && Array.isArray(htmlModel.bullets)) {
      const bulletTexts = (htmlModel.bullets as { text?: string; description?: string }[])
        .map((b) => {
          if (typeof b === 'string') return `• ${b}`;
          const text = b.text || '';
          const desc = b.description ? ` - ${b.description}` : '';
          return `• ${text}${desc}`;
        })
        .join('\n');
      parts.push(bulletTexts);
    }
    
    // 处理 items 字段（支持多种结构：toc, sidebar_card, grid_matrix 等）
    if (htmlModel.items && Array.isArray(htmlModel.items)) {
      const itemTexts = (htmlModel.items as Record<string, unknown>[])
        .map((item, idx) => {
          // sidebar_card / grid_matrix: {title, description/subtitle, ...}
          if (item.title) {
            const desc = (item.description || item.subtitle || item.text || '') as string;
            return `${item.index || idx + 1}. **${item.title}**${desc ? ` - ${desc}` : ''}`;
          }
          // toc: {index, text}
          return `${item.index || '•'}. ${item.text || ''}`;
        })
        .join('\n');
      parts.push(itemTexts);
    }
    
    // 处理 steps 字段（用于 process_steps / flow_process 布局）
    if (htmlModel.steps && Array.isArray(htmlModel.steps)) {
      const stepTexts = (htmlModel.steps as { number?: number; label?: string; description?: string }[])
        .map((step) => {
          const num = step.number || '•';
          const label = step.label || '';
          const desc = step.description ? `: ${step.description}` : '';
          return `${num}. ${label}${desc}`;
        })
        .join('\n');
      parts.push(stepTexts);
    }
    
    // 处理 events 字段（vertical_timeline / timeline 布局）
    if (htmlModel.events && Array.isArray(htmlModel.events)) {
      const eventTexts = (htmlModel.events as { year?: string; title?: string; description?: string }[])
        .map((event) => {
          const time = event.year ? `[${event.year}] ` : '';
          const title = event.title || '';
          const desc = event.description ? ` - ${event.description}` : '';
          return `${time}${title}${desc}`;
        })
        .join('\n');
      parts.push(eventTexts);
    }
    
    // 处理 columns 字段（tri_column 布局）
    if (htmlModel.columns && Array.isArray(htmlModel.columns)) {
      const colTexts = (htmlModel.columns as { number?: number; title?: string; description?: string }[])
        .map((col) => {
          const title = col.title || '';
          const desc = col.description ? `: ${col.description}` : '';
          return `${col.number || '•'}. ${title}${desc}`;
        })
        .join('\n');
      parts.push(colTexts);
    }
    
    // 处理 formulas 字段（dark_math / theory_explanation 布局）
    if (htmlModel.formulas && Array.isArray(htmlModel.formulas)) {
      const formulaTexts = (htmlModel.formulas as { label?: string; latex?: string; explanation?: string }[])
        .map((f) => {
          const label = f.label || '';
          const explanation = f.explanation ? `: ${f.explanation}` : '';
          return `📐 ${label}${explanation}`;
        })
        .join('\n');
      parts.push(formulaTexts);
    }
    
    // 处理 left/right 字段（two_column / diagonal_split 布局）
    const formatColumnContent = (column: Record<string, unknown>, label: string) => {
      const columnTitle = column.header || column.title;
      if (columnTitle) parts.push(`**${label}:** ${columnTitle}`);
      
      // 处理 subtitle
      if (column.subtitle) parts.push(`  ${column.subtitle}`);
      
      // 处理 content 字段（可能是字符串数组）
      if (column.content && Array.isArray(column.content)) {
        const contentItems = (column.content as string[])
          .map((item) => `  • ${item}`)
          .join('\n');
        parts.push(contentItems);
      }
      
      // 处理 points 字段（diagonal_split 布局使用 points 而非 bullets）
      if (column.points && Array.isArray(column.points)) {
        const pointItems = (column.points as string[])
          .map((item) => typeof item === 'string' ? `  • ${item}` : `  • ${(item as any).text || ''}`)
          .join('\n');
        parts.push(pointItems);
      }
      
      // 处理 bullets 字段（可能是对象数组）
      if (column.bullets && Array.isArray(column.bullets)) {
        const bulletItems = (column.bullets as { text?: string }[])
          .map((b) => typeof b === 'string' ? `  • ${b}` : `  • ${b.text || ''}`)
          .join('\n');
        parts.push(bulletItems);
      }
    };
    
    if (htmlModel.left && typeof htmlModel.left === 'object') {
      formatColumnContent(htmlModel.left as Record<string, unknown>, '左栏');
    }
    if (htmlModel.right && typeof htmlModel.right === 'object') {
      formatColumnContent(htmlModel.right as Record<string, unknown>, '右栏');
    }
    
    // 处理 question 字段（warmup_question, poll_interactive 布局）
    if (htmlModel.question && typeof htmlModel.question === 'string') {
      parts.push(`❓ ${htmlModel.question}`);
    }
    
    // 处理 quote 字段（用于 quote 布局）
    if (htmlModel.quote) {
      parts.push(`"${htmlModel.quote}"`);
      if (htmlModel.author) parts.push(`— ${htmlModel.author}`);
    }
    
    return parts.join('\n\n') || JSON.stringify(htmlModel, null, 2);
  };

  const text = getDescriptionText(page.description_content);
  const htmlModelSummary = getHtmlModelSummary(page.html_model as unknown as Record<string, unknown> | undefined);
  const hasHtmlModel = isHtmlMode && !!page.html_model && Object.keys(page.html_model as unknown as Record<string, unknown>).length > 0;


  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isViewingJson, setIsViewingJson] = useState(false);
  
  // 使用专门的描述生成状态 hook，不受图片生成状态影响
  const generating = useDescriptionGeneratingState(isGenerating, isAiRefining);

  const handleEdit = () => {
    // 在打开编辑对话框时，从当前的 page 获取最新值
    const currentText = getDescriptionText(page.description_content);
    setEditContent(currentText);
    setIsEditing(true);
  };

  const handleSave = () => {
    // 保存时使用 text 格式（后端期望的格式）
    onUpdate({
      description_content: {
        text: editContent,
      } as DescriptionContent,
    });
    setIsEditing(false);
  };

  return (
    <>
      <Card className="p-0 overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="bg-banana-50 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">第 {index + 1} 页</span>
              {page.part && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {page.part}
                </span>
              )}
            </div>
            <ContextualStatusBadge page={page} context="description" />
          </div>
        </div>

        {/* 内容 */}
        <div className="p-4 flex-1">
          {generating ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="text-center py-4 text-gray-500 text-sm">
                {isHtmlMode ? '正在生成结构化内容...' : '正在生成描述...'}
              </div>
            </div>
          ) : isHtmlMode ? (
            // HTML模式：显示布局类型和结构化内容摘要
            hasHtmlModel ? (
              <div className="text-sm text-gray-700">
                {page.layout_id && (
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <Layout size={14} className="text-banana-500" />
                    <span className="text-xs font-medium text-banana-600">
                      {getLayoutDisplayName(page.layout_id as LayoutId)}
                    </span>
                  </div>
                )}
                <Markdown>{htmlModelSummary}</Markdown>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="flex text-3xl mb-2 justify-center"><Code className="text-gray-400" size={48} /></div>
                <p className="text-sm">尚未生成结构化内容</p>
              </div>
            )
          ) : text ? (
            <div className="text-sm text-gray-700">
              <Markdown>{text}</Markdown>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="flex text-3xl mb-2 justify-center"><FileText className="text-gray-400" size={48} /></div>
              <p className="text-sm">尚未生成描述</p>
            </div>
          )}
        </div>

        {/* 操作栏 */}
        <div className="border-t border-gray-100 px-4 py-3 flex justify-end gap-2 mt-auto">
          {isHtmlMode && hasHtmlModel && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Code size={16} />}
              onClick={() => setIsViewingJson(true)}
              disabled={generating}
            >
              查看JSON
            </Button>
          )}
          {!isHtmlMode && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Edit2 size={16} />}
              onClick={handleEdit}
              disabled={generating}
            >
              编辑
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={16} className={generating ? 'animate-spin' : ''} />}
            onClick={onRegenerate}
            disabled={generating}
          >
            {generating ? '生成中...' : '重新生成'}
          </Button>
        </div>
      </Card>

      {/* 编辑对话框（传统模式） */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="编辑页面描述"
        size="lg"
      >
        <div className="space-y-4">
          <Textarea
            label="描述内容"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={12}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* JSON查看器对话框（HTML模式） */}
      <Modal
        isOpen={isViewingJson}
        onClose={() => setIsViewingJson(false)}
        title={`第 ${index + 1} 页 - 结构化内容 (${page.layout_id || 'unknown'})`}
        size="lg"
      >
        <div className="space-y-4">
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-96 text-xs font-mono">
            {JSON.stringify(page.html_model, null, 2)}
          </pre>
          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => setIsViewingJson(false)}>
              关闭
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
