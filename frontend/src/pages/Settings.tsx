import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Key, Image, Zap, Save, RotateCcw, Globe, FileText } from 'lucide-react';
import { Button, Input, Card, Loading, useToast, useConfirm } from '@/components/shared';
import * as api from '@/api/endpoints';
import type { OutputLanguage } from '@/api/endpoints';
import { OUTPUT_LANGUAGE_OPTIONS } from '@/api/endpoints';
import type { Settings as SettingsType } from '@/types';

// 配置项类型定义
type FieldType = 'text' | 'password' | 'number' | 'select' | 'buttons';

interface FieldConfig {
  key: keyof typeof initialFormData;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  sensitiveField?: boolean;  // 是否为敏感字段（如 API Key）
  lengthKey?: keyof SettingsType;  // 用于显示已有长度的 key（如 api_key_length）
  options?: { value: string; label: string }[];  // select 类型的选项
  min?: number;
  max?: number;
}

interface SectionConfig {
  title: string;
  icon: React.ReactNode;
  fields: FieldConfig[];
}

// 初始表单数据
const initialFormData = {
  api_base_url: '',
  api_key: '',
  text_model: '',
  image_model: '',
  image_caption_model: '',
  image_resolution: '2K',
  image_aspect_ratio: '16:9',
  max_description_workers: 5,
  max_image_workers: 8,
  output_language: 'zh' as OutputLanguage,
};

// 配置驱动的表单区块定义
const settingsSections: SectionConfig[] = [
  {
    title: '大模型 API 配置',
    icon: <Key size={20} />,
    fields: [
      {
        key: 'api_base_url',
        label: 'API Base URL',
        type: 'text',
        placeholder: 'https://api.example.com',
        description: '设置大模型提供商 API 的基础 URL',
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: '输入新的 API Key',
        sensitiveField: true,
        lengthKey: 'api_key_length',
        description: '留空则保持当前设置不变，输入新值则更新',
      },
    ],
  },
  {
    title: '模型配置',
    icon: <FileText size={20} />,
    fields: [
      {
        key: 'text_model',
        label: '文本大模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: gpt-4.1-mini)',
        description: '用于生成大纲、描述等文本内容的模型名称',
      },
      {
        key: 'image_model',
        label: '图像生成模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: imagen-3.0-generate-001)',
        description: '用于生成页面图片的模型名称',
      },
      {
        key: 'image_caption_model',
        label: '图片识别模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: gpt-4.1-mini)',
        description: '用于识别参考文件中的图片并生成描述',
      },
    ],
  },
  {
    title: '图像生成配置',
    icon: <Image size={20} />,
    fields: [
      {
        key: 'image_resolution',
        label: '图像清晰度（某些OpenAI格式中转调整该值无效）',
        type: 'select',
        description: '更高的清晰度会生成更详细的图像，但需要更长时间',
        options: [
          { value: '1K', label: '1K (1024px)' },
          { value: '2K', label: '2K (2048px)' },
          { value: '4K', label: '4K (4096px)' },
        ],
      },
    ],
  },
  {
    title: '性能配置',
    icon: <Zap size={20} />,
    fields: [
      {
        key: 'max_description_workers',
        label: '描述生成最大并发数',
        type: 'number',
        min: 1,
        max: 20,
        description: '同时生成描述的最大工作线程数 (1-20)，越大速度越快',
      },
      {
        key: 'max_image_workers',
        label: '图像生成最大并发数',
        type: 'number',
        min: 1,
        max: 20,
        description: '同时生成图像的最大工作线程数 (1-20)，越大速度越快',
      },
    ],
  },
  {
    title: '输出语言设置',
    icon: <Globe size={20} />,
    fields: [
      {
        key: 'output_language',
        label: '默认输出语言',
        type: 'buttons',
        description: 'AI 生成内容时使用的默认语言',
        options: OUTPUT_LANGUAGE_OPTIONS,
      },
    ],
  },
];

// Settings 组件 - 纯嵌入模式（可复用）
export const Settings: React.FC = () => {
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.getSettings();
      if (response.data) {
        setSettings(response.data);
        setFormData({
          api_base_url: response.data.api_base_url || '',
          api_key: '',
          image_resolution: response.data.image_resolution || '2K',
          image_aspect_ratio: response.data.image_aspect_ratio || '16:9',
          max_description_workers: response.data.max_description_workers || 5,
          max_image_workers: response.data.max_image_workers || 8,
          text_model: response.data.text_model || '',
          image_model: response.data.image_model || '',
          image_caption_model: response.data.image_caption_model || '',
          output_language: response.data.output_language || 'zh',
        });
      }
    } catch (error: any) {
      console.error('加载设置失败:', error);
      show({
        message: '加载设置失败: ' + (error?.message || '未知错误'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { api_key, ...otherData } = formData;
      const payload: Parameters<typeof api.updateSettings>[0] = {
        ...otherData,
      };

      if (api_key) {
        payload.api_key = api_key;
      }

      const response = await api.updateSettings(payload);
      if (response.data) {
        setSettings(response.data);
        show({ message: '设置保存成功', type: 'success' });
        setFormData(prev => ({ ...prev, api_key: '' }));
      }
    } catch (error: any) {
      console.error('保存设置失败:', error);
      show({
        message: '保存设置失败: ' + (error?.response?.data?.error?.message || error?.message || '未知错误'),
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    confirm(
      '将把大模型、图像生成和并发等所有配置恢复为环境默认值，已保存的自定义设置将丢失，确定继续吗？',
      async () => {
        setIsSaving(true);
        try {
          const response = await api.resetSettings();
          if (response.data) {
            setSettings(response.data);
            setFormData({
              api_base_url: response.data.api_base_url || '',
              api_key: '',
              image_resolution: response.data.image_resolution || '2K',
              image_aspect_ratio: response.data.image_aspect_ratio || '16:9',
              max_description_workers: response.data.max_description_workers || 5,
              max_image_workers: response.data.max_image_workers || 8,
              text_model: response.data.text_model || '',
              image_model: response.data.image_model || '',
              image_caption_model: response.data.image_caption_model || '',
              output_language: response.data.output_language || 'zh',
            });
            show({ message: '设置已重置', type: 'success' });
          }
        } catch (error: any) {
          console.error('重置设置失败:', error);
          show({
            message: '重置设置失败: ' + (error?.message || '未知错误'),
            type: 'error'
          });
        } finally {
          setIsSaving(false);
        }
      },
      {
        title: '确认重置为默认配置',
        confirmText: '确定重置',
        cancelText: '取消',
        variant: 'warning',
      }
    );
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (field: FieldConfig) => {
    const value = formData[field.key];

    if (field.type === 'buttons' && field.options) {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
          </label>
          <div className="flex flex-wrap gap-2">
            {field.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFieldChange(field.key, option.value)}
                className={`px-4 py-2 rounded-md text-sm font-bold border-2 border-gray-900 transition-all ${
                  value === option.value
                    ? 'bg-[#f5d040] text-gray-900'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                style={{ boxShadow: value === option.value ? '2px 2px 0 #1a1a1a' : 'none' }}
              >
                {option.label}
              </button>
            ))}
          </div>
          {field.description && (
            <p className="mt-1 text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      );
    }

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
          </label>
          <select
            value={value as string}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full h-10 px-4 rounded-md border-2 border-gray-900 bg-white font-medium focus:outline-none"
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.description && (
            <p className="mt-1 text-sm text-gray-500">{field.description}</p>
          )}
        </div>
      );
    }

    // text, password, number 类型
    const placeholder = field.sensitiveField && settings && field.lengthKey
      ? `已设置（长度: ${settings[field.lengthKey]}）`
      : field.placeholder || '';

    return (
      <div key={field.key}>
        <Input
          label={field.label}
          type={field.type === 'number' ? 'number' : field.type}
          placeholder={placeholder}
          value={value as string | number}
          onChange={(e) => {
            const newValue = field.type === 'number' 
              ? parseInt(e.target.value) || (field.min ?? 0)
              : e.target.value;
            handleFieldChange(field.key, newValue);
          }}
          min={field.min}
          max={field.max}
        />
        {field.description && (
          <p className="mt-1 text-sm text-gray-500">{field.description}</p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading message="加载设置中..." />
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      {ConfirmDialog}
      <div className="space-y-8">
        {/* 配置区块（配置驱动） */}
        <div className="space-y-8">
          {settingsSections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                {section.icon}
                <span className="ml-2">{section.title}</span>
              </h2>
              <div className="space-y-4">
                {section.fields.map((field) => renderField(field))}
                {section.title === '大模型 API 配置' && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                      API 密匙获取可前往{' '}
                      <a
                        href="https://aihubmix.com/?aff=17EC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        AIHubmix
                      </a>
                      , 减小迁移成本
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t-2 border-gray-900">
          <Button
            variant="secondary"
            icon={<RotateCcw size={18} />}
            onClick={handleReset}
            disabled={isSaving}
          >
            重置为默认配置
          </Button>
          <Button
            variant="primary"
            icon={<Save size={18} />}
            onClick={handleSave}
            loading={isSaving}
          >
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </>
  );
};

// SettingsPage 组件 - 完整页面包装
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#ede4d0' }}>
      {/* 导航栏 */}
      <nav className="h-12 relative flex items-center px-4 md:px-6" style={{ background: '#ede4d0', borderBottom: '2px solid #1a1a1a' }}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-md border-2 border-gray-900"
            style={{ background: '#f5d040', boxShadow: '2px 2px 0 #1a1a1a' }}
          >
            <Home size={14} /><span>主页</span>
          </button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-base font-black text-gray-900">系统设置</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg p-6 md:p-8" style={{ border: '2px solid #1a1a1a', boxShadow: '4px 4px 0 #1a1a1a' }}>
          <Settings />
        </div>
      </div>
    </div>
  );
};
