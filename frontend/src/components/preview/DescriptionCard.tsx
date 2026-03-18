import React, { useState } from 'react';
import { Edit2, FileText, RefreshCw, Code, Layout } from 'lucide-react';
import { Card, ContextualStatusBadge, Button, Modal, Textarea, Skeleton, Markdown } from '@/components/shared';
import { useDescriptionGeneratingState } from '@/hooks/useGeneratingState';
import type { Page, DescriptionContent, LayoutId } from '@/types';
import { getLayoutDisplayName } from '@/experimental/html-renderer/layouts';
import { HtmlModelFormEditor } from './HtmlModelFormEditor';

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

    const parts: string[] = [];
    const seen = new Set<string>();

    const normalizeText = (value: unknown): string => {
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number') return String(value);
      return '';
    };

    const isMeaningful = (text: string): boolean => {
      if (!text) return false;
      return !/^[•·\-–—.,;:，。；：、\s]+$/.test(text);
    };

    const addPart = (value: unknown, prefix = '') => {
      const text = normalizeText(value);
      if (!isMeaningful(text)) return;
      const line = `${prefix}${text}`.trim();
      if (!line || seen.has(line)) return;
      seen.add(line);
      parts.push(line);
    };

    const addTextList = (value: unknown, prefix = '• ') => {
      if (!Array.isArray(value)) return;
      value.forEach((item) => addPart(item, prefix));
    };

    const titleText = normalizeText(htmlModel.title);
    if (isMeaningful(titleText)) addPart(`**${titleText}**`);
    addPart(htmlModel.subtitle);

    const meta = [htmlModel.author, htmlModel.department, htmlModel.date]
      .map((value) => normalizeText(value))
      .filter((text) => isMeaningful(text));
    if (meta.length > 0) addPart(meta.join(' · '));

    addPart(htmlModel.description);
    addPart(htmlModel.key_point, '💡 ');
    addPart(htmlModel.note, '📝 ');
    addPart(htmlModel.scenario, '场景：');
    addPart(htmlModel.challenge, '挑战：');
    addPart(htmlModel.conclusion, '结论：');
    addPart(htmlModel.summary, '总结：');
    addPart(htmlModel.next_chapter, '下节：');
    addPart(htmlModel.pull_quote, '引述：');
    addPart(htmlModel.hint, '提示：');
    addPart(htmlModel.question, '❓ ');
    addPart(htmlModel.answer, '💬 ');
    addPart(htmlModel.badge);
    addPart(htmlModel.center_label);
    addPart(htmlModel.insight, '💡 ');

    if (htmlModel.metric && typeof htmlModel.metric === 'object') {
      const metric = htmlModel.metric as { value?: unknown; label?: unknown };
      addPart(`${normalizeText(metric.value)} ${normalizeText(metric.label)}`.trim(), '📊 ');
    }

    if (Array.isArray(htmlModel.content)) {
      addTextList(htmlModel.content);
    } else {
      addPart(htmlModel.content);
    }

    addTextList(htmlModel.theory);
    addTextList(htmlModel.references, '参考：');
    addTextList(htmlModel.narrative);
    addTextList(htmlModel.summary_points);
    addTextList(htmlModel.homework, '作业：');
    addTextList(htmlModel.requirements, '要求：');
    addTextList(htmlModel.options, '选项：');

    if (Array.isArray(htmlModel.objectives)) {
      (htmlModel.objectives as Record<string, unknown>[])
        .forEach((objective) => {
          const level = normalizeText(objective.level);
          const text = normalizeText(objective.text);
          const hours = objective.hours ? `${normalizeText(objective.hours)}H` : '';
          const combined = [level ? `[${level}]` : '', text, hours].filter(Boolean).join(' ');
          addPart(combined, '• ');
        });
    }

    if (Array.isArray(htmlModel.bullets)) {
      (htmlModel.bullets as unknown[]).forEach((bullet) => {
        if (typeof bullet === 'string') {
          addPart(bullet, '• ');
          return;
        }
        if (!bullet || typeof bullet !== 'object') return;
        const row = bullet as Record<string, unknown>;
        const text = normalizeText(row.text);
        const desc = normalizeText(row.description);
        addPart([text, desc].filter(Boolean).join(' - '), '• ');
      });
    }

    if (Array.isArray(htmlModel.items)) {
      (htmlModel.items as Record<string, unknown>[]).forEach((item, idx) => {
        const title = normalizeText(item.title ?? item.name ?? item.text);
        const desc = normalizeText(item.description ?? item.subtitle);
        const head = [title, desc].filter(Boolean).join(' - ');
        addPart(`${item.index ?? idx + 1}\\. ${head}`.trim());
        if (Array.isArray(item.features)) {
          item.features.forEach((feature) => addPart(feature, '  • '));
        }
      });
    }

    if (Array.isArray(htmlModel.steps)) {
      (htmlModel.steps as Record<string, unknown>[]).forEach((step, idx) => {
        const number = normalizeText(step.number || idx + 1);
        const label = normalizeText(step.label || step.title);
        const desc = normalizeText(step.description);
        addPart(`${number}\\. ${[label, desc].filter(Boolean).join(': ')}`.trim());
      });
    }

    if (Array.isArray(htmlModel.events)) {
      (htmlModel.events as Record<string, unknown>[]).forEach((event) => {
        const year = normalizeText(event.year);
        const title = normalizeText(event.title);
        const desc = normalizeText(event.description);
        addPart(`${year ? `[${year}] ` : ''}${title}${desc ? ` - ${desc}` : ''}`);
      });
    }

    if (Array.isArray(htmlModel.columns)) {
      (htmlModel.columns as Record<string, unknown>[]).forEach((col, idx) => {
        const title = normalizeText(col.title);
        const desc = normalizeText(col.description);
        addPart(`${col.number ?? idx + 1}\\. ${[title, desc].filter(Boolean).join(': ')}`.trim());
        if (Array.isArray(col.points)) {
          col.points.forEach((point) => addPart(point, '  • '));
        }
      });
    }

    if (Array.isArray(htmlModel.stages)) {
      (htmlModel.stages as Record<string, unknown>[]).forEach((stage, idx) => {
        const title = normalizeText(stage.title);
        const desc = normalizeText(stage.description);
        addPart(`${idx + 1}\\. ${[title, desc].filter(Boolean).join(': ')}`.trim());
      });
    }

    if (Array.isArray(htmlModel.nodes)) {
      (htmlModel.nodes as Record<string, unknown>[]).forEach((node) => {
        const title = normalizeText(node.title);
        const desc = normalizeText(node.description);
        addPart([title, desc].filter(Boolean).join(' - '), '• ');
      });
    }

    if (Array.isArray(htmlModel.metrics)) {
      (htmlModel.metrics as Record<string, unknown>[]).forEach((m) => {
        const value = normalizeText(m.value);
        const label = normalizeText(m.label);
        const note = normalizeText(m.note);
        addPart(`${value} ${label}${note ? ` (${note})` : ''}`.trim(), '📊 ');
      });
    }

    if (Array.isArray(htmlModel.bars)) {
      (htmlModel.bars as Record<string, unknown>[]).forEach((bar) => {
        const label = normalizeText(bar.label);
        const baseline = normalizeText(bar.baseline);
        const current = normalizeText(bar.current);
        addPart(`${label}: ${baseline} → ${current}`.trim(), '📈 ');
      });
    }

    if (Array.isArray(htmlModel.analysis)) {
      (htmlModel.analysis as Record<string, unknown>[]).forEach((item) => {
        const title = normalizeText(item.title);
        const content = normalizeText(item.content);
        addPart([title, content].filter(Boolean).join(': '), '• ');
      });
    }

    if (Array.isArray(htmlModel.formulas)) {
      (htmlModel.formulas as Record<string, unknown>[]).forEach((formula) => {
        const latex = normalizeText(formula.latex ?? formula.label);
        const explanation = normalizeText(formula.explanation);
        addPart(`${latex}${explanation ? `: ${explanation}` : ''}`, '📐 ');
      });
    }

    if (Array.isArray(htmlModel.explanations)) {
      (htmlModel.explanations as Record<string, unknown>[]).forEach((explanation) => {
        const label = normalizeText(explanation.label);
        const desc = normalizeText(explanation.description);
        addPart(`${label}${desc ? `: ${desc}` : ''}`, '• ');
      });
    }

    if (Array.isArray(htmlModel.margin_notes)) {
      (htmlModel.margin_notes as Record<string, unknown>[]).forEach((note) => {
        const title = normalizeText(note.title);
        const content = normalizeText(note.content);
        addPart(`${title}${content ? `: ${content}` : ''}`, '旁注：');
      });
    }

    const appendColumnSummary = (column: unknown, label: string) => {
      if (!column || typeof column !== 'object') return;
      const row = column as Record<string, unknown>;
      const header = normalizeText(row.header ?? row.title);
      if (header) addPart(`**${label}:** ${header}`);
      if (Array.isArray(row.content)) row.content.forEach((item) => addPart(item, '  • '));
      if (Array.isArray(row.points)) row.points.forEach((item) => addPart(item, '  • '));
      if (Array.isArray(row.bullets)) {
        (row.bullets as unknown[]).forEach((item) => {
          if (typeof item === 'string') {
            addPart(item, '  • ');
            return;
          }
          if (item && typeof item === 'object') {
            addPart((item as Record<string, unknown>).text, '  • ');
          }
        });
      }
    };

    appendColumnSummary(htmlModel.left, '左栏');
    appendColumnSummary(htmlModel.right, '右栏');

    if (isMeaningful(normalizeText(htmlModel.quote))) {
      addPart(`"${normalizeText(htmlModel.quote)}"`);
      addPart(htmlModel.author, '— ');
    }
    return parts.join('\n\n') || '暂无可展示内容';
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
    if (isHtmlMode && hasHtmlModel) {
      // HTML模式：打开表单编辑器
      setIsEditing(true);
    } else {
      // 图片模式：编辑描述文本
      const currentText = getDescriptionText(page.description_content);
      setEditContent(currentText);
      setIsEditing(true);
    }
  };

  const handleFormModelChange = (newModel: Record<string, unknown>) => {
    // 表单模式下的更新（实时保存）
    onUpdate({
      html_model: newModel,
    });
  };

  const handleSave = () => {
    // 图片模式：保存描述文本
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
            <>
              {import.meta.env.VITE_SHOW_DEBUG_BUTTONS === 'true' && (
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
              <Button
                variant="ghost"
                size="sm"
                icon={<Edit2 size={16} />}
                onClick={handleEdit}
                disabled={generating}
              >
                编辑
              </Button>
            </>
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

      {/* 编辑对话框 */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title={isHtmlMode && hasHtmlModel ? `编辑结构化内容 - 第 ${index + 1} 页` : "编辑页面描述"}
        size="xl"
      >
        <div className="space-y-4">
          {isHtmlMode && hasHtmlModel ? (
            // HTML模式：表单编辑器
            <HtmlModelFormEditor
              model={page.html_model as Record<string, unknown>}
              onChange={handleFormModelChange}
            />
          ) : (
            // 图片模式：文本编辑器
            <Textarea
              label="描述内容"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={12}
            />
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              {isHtmlMode && hasHtmlModel ? '完成' : '取消'}
            </Button>
            {!isHtmlMode && (
              <Button variant="primary" onClick={handleSave}>
                保存
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* JSON查看器对话框（HTML模式） */}
      <Modal
        isOpen={isViewingJson}
        onClose={() => setIsViewingJson(false)}
        title={`第 ${index + 1} 页 - 结构化内容 (${getLayoutDisplayName(page.layout_id as LayoutId | undefined)})`}
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
