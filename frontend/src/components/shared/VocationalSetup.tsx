/**
 * 职教模板化 PPT 设置组件
 * 集成模板选择和教法选择，用于 Home 页面
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Book, ChevronDown, ChevronUp, CheckCircle, Sparkles } from 'lucide-react';
import { listVocationalTemplates, listPedagogies, type VocationalTemplate, type PedagogyModel } from '@/api/endpoints';

interface VocationalSetupProps {
  onConfigChange: (config: VocationalConfig) => void;
  initialConfig?: Partial<VocationalConfig>;
  className?: string;
}

export interface VocationalConfig {
  enabled: boolean;
  templateId: string;
  pedagogyMethod: string;
  teachingScene: 'theory' | 'practice' | 'review' | 'mixed';
}

// 模板颜色预览
const templateColors: Record<string, { bg: string; border: string; text: string }> = {
  theory_professional: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  theory_elegant: { bg: '#f9fafb', border: '#6b7280', text: '#374151' },
  practice_industrial: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  practice_medical: { bg: '#ecfeff', border: '#06b6d4', text: '#0891b2' },
  review_mindmap: { bg: '#faf5ff', border: '#a855f7', text: '#7c3aed' },
  review_quiz: { bg: '#fff7ed', border: '#f97316', text: '#ea580c' },
  general_tech: { bg: '#0f172a', border: '#06b6d4', text: '#e2e8f0' },
};

// 场景标签配置
const sceneLabels: Record<string, { label: string; color: string; bgColor: string }> = {
  theory: { label: '理论', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  practice: { label: '实训', color: 'text-green-700', bgColor: 'bg-green-100' },
  review: { label: '复习', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  mixed: { label: '综合', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export const VocationalSetup: React.FC<VocationalSetupProps> = ({
  onConfigChange,
  initialConfig,
  className = '',
}) => {
  // 状态
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false);
  const [selectedScene, setSelectedScene] = useState<'theory' | 'practice' | 'review' | 'mixed'>(
    initialConfig?.teachingScene ?? 'theory'
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialConfig?.templateId ?? '');
  const [selectedPedagogyId, setSelectedPedagogyId] = useState(initialConfig?.pedagogyMethod ?? 'five_step');

  // 数据
  const [templates, setTemplates] = useState<VocationalTemplate[]>([]);
  const [pedagogies, setPedagogies] = useState<PedagogyModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 展开状态
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllPedagogies, setShowAllPedagogies] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    try {
      const [templatesRes, pedagogiesRes] = await Promise.all([
        listVocationalTemplates(selectedScene === 'mixed' ? undefined : selectedScene),
        listPedagogies(selectedScene === 'mixed' ? undefined : selectedScene),
      ]);

      if (templatesRes.data?.templates) {
        setTemplates(templatesRes.data.templates);
        // 如果当前选中的模板不在列表中，选择第一个
        if (templatesRes.data.templates.length > 0 &&
            !templatesRes.data.templates.find(t => t.id === selectedTemplateId)) {
          setSelectedTemplateId(templatesRes.data.templates[0].id);
        }
      }

      if (pedagogiesRes.data?.pedagogies) {
        setPedagogies(pedagogiesRes.data.pedagogies);
        // 如果当前选中的教法不在列表中，选择第一个
        if (pedagogiesRes.data.pedagogies.length > 0 &&
            !pedagogiesRes.data.pedagogies.find(p => p.id === selectedPedagogyId)) {
          setSelectedPedagogyId(pedagogiesRes.data.pedagogies[0].id);
        }
      }
    } catch (error) {
      console.error('加载职教配置数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, selectedScene]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 配置变更回调
  useEffect(() => {
    onConfigChange({
      enabled,
      templateId: selectedTemplateId,
      pedagogyMethod: selectedPedagogyId,
      teachingScene: selectedScene,
    });
  }, [enabled, selectedTemplateId, selectedPedagogyId, selectedScene, onConfigChange]);

  // 获取当前选中的教法详情
  const selectedPedagogy = pedagogies.find(p => p.id === selectedPedagogyId);

  return (
    <div className={`rounded-xl border-2 transition-all duration-300 ${
      enabled
        ? 'border-banana-400 bg-gradient-to-br from-banana-50/50 to-orange-50/30'
        : 'border-gray-200 bg-white'
    } ${className}`}>
      {/* 头部：开关 */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => {
          if (!enabled) {
            setEnabled(true);
            setIsExpanded(true);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${enabled ? 'bg-banana-100' : 'bg-gray-100'}`}>
            <Sparkles size={20} className={enabled ? 'text-banana-600' : 'text-gray-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              职教模板化 PPT
              {enabled && (
                <span className="text-xs px-2 py-0.5 bg-banana-100 text-banana-700 rounded-full">
                  已启用
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500">
              {enabled
                ? '使用 HTML 渲染 + 可编辑 PPTX 导出'
                : '启用后可选择教法模式和职教模板风格'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 开关 */}
          <label
            className="relative inline-flex items-center cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (e.target.checked) {
                  setIsExpanded(true);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-banana-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-banana-500"></div>
          </label>

          {enabled && (
            <button className="p-1 hover:bg-gray-100 rounded">
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* 展开内容 */}
      {enabled && isExpanded && (
        <div className="px-4 pb-4 space-y-6 border-t border-gray-100 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-banana-500"></div>
            </div>
          ) : (
            <>
              {/* 教学场景选择 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Layout size={16} />
                  教学场景
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(['theory', 'practice', 'review', 'mixed'] as const).map((scene) => (
                    <button
                      key={scene}
                      onClick={() => setSelectedScene(scene)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedScene === scene
                          ? `${sceneLabels[scene].bgColor} ${sceneLabels[scene].color} ring-2 ring-offset-1 ring-current`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {sceneLabels[scene].label}课
                    </button>
                  ))}
                </div>
              </div>

              {/* 教法选择 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Book size={16} />
                  教法模式
                  <span className="text-xs text-gray-400 font-normal">
                    （影响大纲结构）
                  </span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  {(showAllPedagogies ? pedagogies : pedagogies.slice(0, 4)).map((pedagogy) => (
                    <div
                      key={pedagogy.id}
                      onClick={() => setSelectedPedagogyId(pedagogy.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedPedagogyId === pedagogy.id
                          ? 'border-banana-500 bg-banana-50'
                          : 'border-gray-200 hover:border-banana-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                            {pedagogy.name}
                            {selectedPedagogyId === pedagogy.id && (
                              <CheckCircle size={14} className="text-banana-500 flex-shrink-0" />
                            )}
                          </h5>
                          <p className="text-xs text-gray-400 mt-0.5">{pedagogy.name_en}</p>
                        </div>
                      </div>

                      {/* 教学环节预览 */}
                      {pedagogy.structure && pedagogy.structure.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pedagogy.structure.slice(0, 3).map((step, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded"
                            >
                              {step}
                            </span>
                          ))}
                          {pedagogy.structure.length > 3 && (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-400 rounded">
                              +{pedagogy.structure.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {pedagogies.length > 4 && (
                  <button
                    onClick={() => setShowAllPedagogies(!showAllPedagogies)}
                    className="text-sm text-banana-600 hover:text-banana-700 font-medium"
                  >
                    {showAllPedagogies ? '收起' : `显示全部 ${pedagogies.length} 种教法`}
                  </button>
                )}

                {/* 选中教法的详情 */}
                {selectedPedagogy && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedPedagogy.name}</strong>：{selectedPedagogy.description}
                    </p>
                  </div>
                )}
              </div>

              {/* 模板选择 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Layout size={16} />
                  风格模板
                  <span className="text-xs text-gray-400 font-normal">
                    （影响配色和布局）
                  </span>
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  {templates.map((template) => {
                    const colors = templateColors[template.id] || { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' };
                    const isSelected = selectedTemplateId === template.id;

                    return (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-banana-500 ring-offset-2'
                            : 'hover:shadow-md'
                        }`}
                        style={{ borderColor: isSelected ? '#f59e0b' : colors.border }}
                      >
                        {/* 预览区域 */}
                        <div
                          className="aspect-video flex items-center justify-center relative"
                          style={{ backgroundColor: colors.bg }}
                        >
                          {template.preview_image ? (
                            <img
                              src={template.preview_image}
                              alt={template.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2">
                              <div
                                className="text-sm font-bold"
                                style={{ color: colors.text }}
                              >
                                {template.name}
                              </div>
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-banana-500 rounded-full p-0.5">
                              <CheckCircle size={12} className="text-white" />
                            </div>
                          )}
                        </div>

                        {/* 信息 */}
                        <div className="p-2 bg-white">
                          <h5 className="font-medium text-gray-900 text-xs truncate">{template.name}</h5>
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {template.applicable_scenes.slice(0, 2).map((scene) => (
                              <span
                                key={scene}
                                className={`inline-block px-1 py-0.5 text-[10px] rounded ${
                                  sceneLabels[scene]?.bgColor || 'bg-gray-100'
                                } ${sceneLabels[scene]?.color || 'text-gray-600'}`}
                              >
                                {sceneLabels[scene]?.label || scene}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VocationalSetup;
