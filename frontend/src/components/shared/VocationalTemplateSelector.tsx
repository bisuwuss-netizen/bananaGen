import React, { useState, useEffect } from 'react';
import { listVocationalTemplates, type VocationalTemplate } from '@/api/endpoints';
import { Layout, CheckCircle } from 'lucide-react';

interface VocationalTemplateSelectorProps {
  onSelect: (templateId: string) => void;
  selectedTemplateId?: string;
  scene?: 'theory' | 'practice' | 'review';
}

// 模板预览颜色（用于没有预览图的情况）
const templateColors: Record<string, { bg: string; border: string; text: string }> = {
  theory_professional: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  practice_workshop: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  tech_dark: { bg: '#18181b', border: '#525252', text: '#d4d4d8' },
  medical_clean: { bg: '#f0fdfa', border: '#14b8a6', text: '#0f766e' },
  agri_natural: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
  finance_simple: { bg: '#faf5ff', border: '#a855f7', text: '#7e22ce' },
  creative_art: { bg: '#fff1f2', border: '#f43f5e', text: '#be123c' },
};

export const VocationalTemplateSelector: React.FC<VocationalTemplateSelectorProps> = ({
  onSelect,
  selectedTemplateId,
  scene,
}) => {
  const [templates, setTemplates] = useState<VocationalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [scene]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listVocationalTemplates(scene);
      if (response.data?.templates) {
        setTemplates(response.data.templates);
      }
    } catch (err: any) {
      console.error('加载模板失败:', err);
      setError('加载模板失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-banana-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Layout size={16} />
        选择职教模板风格
      </h4>
      
      <div className="grid grid-cols-3 gap-4">
        {templates.map((template) => {
          const colors = templateColors[template.id] || { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' };
          const isSelected = selectedTemplateId === template.id;
          
          return (
            <div
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-banana-500 ring-offset-2'
                  : 'hover:shadow-md'
              }`}
              style={{ borderColor: isSelected ? '#f59e0b' : colors.border }}
            >
              {/* 模板预览区域 */}
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
                  <div className="text-center p-4">
                    <div
                      className="text-lg font-bold"
                      style={{ color: colors.text }}
                    >
                      {template.name}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: colors.text, opacity: 0.7 }}
                    >
                      {template.css_theme}
                    </div>
                  </div>
                )}
                
                {/* 选中标记 */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-banana-500 rounded-full p-1">
                    <CheckCircle size={16} className="text-white" />
                  </div>
                )}
              </div>
              
              {/* 模板信息 */}
              <div className="p-3 bg-white">
                <h5 className="font-medium text-gray-900 text-sm">{template.name}</h5>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                
                {/* 适用场景标签 */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.applicable_scenes.map((sceneItem) => (
                    <span
                      key={sceneItem}
                      className={`inline-block px-1.5 py-0.5 text-xs rounded ${
                        sceneItem === 'theory'
                          ? 'bg-blue-100 text-blue-700'
                          : sceneItem === 'practice'
                          ? 'bg-green-100 text-green-700'
                          : sceneItem === 'review'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sceneItem === 'theory' ? '理论' : sceneItem === 'practice' ? '实训' : sceneItem === 'review' ? '复习' : sceneItem}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
