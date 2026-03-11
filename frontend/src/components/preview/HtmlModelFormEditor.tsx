import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Textarea } from '@/components/shared';
import { debounce } from '@/utils';

interface HtmlModelFormEditorProps {
  model: Record<string, unknown>;
  onChange: (model: Record<string, unknown>) => void;
}

// 需要隐藏的技术性字段
const HIDDEN_FIELDS = new Set([
  'variant',
  'layout_variant',
  'layout_archetype',
  'archetype',
  'index', // 索引字段不显示
  'background_image', // 背景图片字段不显示
]);

// 字段标签映射（中文显示）
const FIELD_LABELS: Record<string, string> = {
  // 基础字段
  title: '标题',
  subtitle: '副标题',
  author: '作者',
  department: '部门',
  date: '日期',
  content: '内容',
  highlight: '高亮文本',
  quote: '引用',
  source: '来源',
  caption: '说明',
  image_src: '图片地址',
  image_alt: '图片描述',
  background_image: '背景图片',
  keyTakeaway: '核心要点',
  section_number: '章节编号',
  text: '文本',
  description: '描述',
  label: '标签',
  icon: '图标',
  number: '编号',
  index: '索引',
  header: '标题',
  type: '类型',
  value: '数值',
  unit: '单位',
  example: '示例',
  note: '备注',
  closing: '结束语',
  contact: '联系方式',
  qrcode: '二维码',
  
  // 列表字段
  items: '项目列表',
  bullets: '要点列表',
  steps: '步骤列表',
  points: '要点',
  theory: '理论段落',
  formulas: '公式',
  references: '引用文献',
  narrative: '正文段落',
  margin_notes: '旁注',
  summary_points: '核心知识点',
  homework: '课后作业',
  requirements: '要求',
  options: '选项',
  hints: '提示',
  warnings: '警告',
  events: '事件',
  explanations: '图解说明',
  columns: '列',
  nodes: '节点',
  
  // 对象字段
  left: '左栏',
  right: '右栏',
  reflection_blocks: '反思区块',
  pull_quote: '核心金句',
  scenario: '场景描述',
  challenge: '面临挑战',
  conclusion: '结论',
  summary: '总结',
  next_chapter: '下节预告',
  question: '问题',
  thinkTime: '思考时间',
  instruction: '说明',
  diagram_url: '图解地址',
  task_type: '任务类型',
  hint: '提示',
  orientation: '方向',
  layout: '布局方式',
  
  // 嵌套对象字段
  latex: 'LaTeX公式',
  explanation: '说明',
  name: '名称',
  features: '特性',
  level: '级别',
  emoji: '表情符号',
  year: '年份',
  tags: '标签',
  image: '图片',
};

// 获取字段的中文标签
const getFieldLabel = (key: string): string => {
  // 如果映射中存在，直接返回
  if (FIELD_LABELS[key]) {
    return FIELD_LABELS[key];
  }
  
  // 尝试将下划线命名转换为中文（如 theory_explanation -> 理论说明）
  // 这里只处理简单的下划线命名
  if (key.includes('_')) {
    const parts = key.split('_').map(part => FIELD_LABELS[part] || part);
    // 如果所有部分都有映射，组合起来；否则返回原键名
    if (parts.every(part => FIELD_LABELS[part] || part !== key)) {
      return parts.join('');
    }
  }
  
  // 如果都没有，尝试美化显示（首字母大写，下划线替换为空格）
  const beautified = key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
  
  return beautified;
};

// 判断值是否为对象
const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

// 判断值是否为数组
const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

// 判断值是否为字符串数组
const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
};

export const HtmlModelFormEditor: React.FC<HtmlModelFormEditorProps> = ({
  model,
  onChange,
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>(model);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const isEditingRef = useRef(false);
  const lastModelRef = useRef<Record<string, unknown>>(model);
  
  // 深度比较两个对象是否相等
  const deepEqual = useCallback((obj1: unknown, obj2: unknown): boolean => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) return false;
      return obj1.every((item, index) => deepEqual(item, obj2[index]));
    }
    
    if (Array.isArray(obj1) || Array.isArray(obj2)) return false;
    
    const keys1 = Object.keys(obj1 as Record<string, unknown>);
    const keys2 = Object.keys(obj2 as Record<string, unknown>);
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => 
      deepEqual(
        (obj1 as Record<string, unknown>)[key],
        (obj2 as Record<string, unknown>)[key]
      )
    );
  }, []);

  // 防抖的 onChange 回调
  const debouncedOnChangeRef = useRef<ReturnType<typeof debounce<typeof onChange>> | null>(null);
  
  if (!debouncedOnChangeRef.current) {
    debouncedOnChangeRef.current = debounce((newModel: Record<string, unknown>) => {
      onChange(newModel);
      // 更新后，标记为非编辑状态
      setTimeout(() => {
        isEditingRef.current = false;
        lastModelRef.current = newModel;
      }, 100);
    }, 300);
  }
  
  const debouncedOnChange = debouncedOnChangeRef.current;

  useEffect(() => {
    // 只有在非编辑状态下，且外部 model 真正变化时才同步
    if (!isEditingRef.current) {
      // 使用深度比较，避免不必要的更新
      if (!deepEqual(model, lastModelRef.current)) {
        setFormData(model);
        lastModelRef.current = model;
      }
    }
  }, [model, deepEqual]);
  
  // 组件卸载时清理防抖
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const updateField = (path: string[], value: unknown) => {
    // 深拷贝原始数据，保留所有字段（包括隐藏字段）
    const deepClone = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
      }
      const cloned: Record<string, unknown> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
        }
      }
      return cloned;
    };

    const newData = deepClone(formData) as Record<string, unknown>;
    
    // 导航到目标位置的辅助函数
    const navigateToPath = (
      data: Record<string, unknown> | unknown[],
      pathParts: string[],
      createIfMissing: boolean = false
    ): { target: Record<string, unknown> | unknown[]; lastKey: string } => {
      let current: Record<string, unknown> | unknown[] = data;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const key = pathParts[i];
        const isArrayIndex = /^\d+$/.test(key);
        
        if (isArrayIndex) {
          // 处理数组索引
          const index = parseInt(key, 10);
          if (!Array.isArray(current)) {
            throw new Error(`Expected array at path ${pathParts.slice(0, i).join('.')}`);
          }
          if (index >= current.length) {
            if (createIfMissing) {
              // 扩展数组
              while (current.length <= index) {
                current.push({});
              }
            } else {
              throw new Error(`Array index ${index} out of bounds`);
            }
          }
          const item = current[index];
          if (!isObject(item) && createIfMissing) {
            current[index] = {};
          }
          current = current[index] as Record<string, unknown> | unknown[];
        } else {
          // 处理对象键
          if (Array.isArray(current)) {
            throw new Error(`Cannot access object key "${key}" on array`);
          }
          if (current[key] === undefined && createIfMissing) {
            // 如果字段不存在，根据路径判断应该创建数组还是对象
            // 这里暂时创建空对象，后续会根据实际值类型更新
            current[key] = {};
          }
          current = current[key] as Record<string, unknown> | unknown[];
        }
      }
      
      return { target: current, lastKey: pathParts[pathParts.length - 1] };
    };

    try {
      const { target, lastKey } = navigateToPath(newData, path, true);
      
      // 设置值
      if (Array.isArray(target)) {
        // 如果 target 本身就是数组，说明路径指向的是数组字段本身（如 ['points']）
        // 这种情况下，我们需要在父对象上设置值
        if (path.length === 1) {
          // 顶级字段，直接在 newData 上设置
          newData[lastKey] = value;
        } else {
          // 嵌套字段，需要在父对象上设置
          const parentPath = path.slice(0, -1);
          const { target: parentTarget } = navigateToPath(newData, parentPath, true);
          if (Array.isArray(parentTarget)) {
            throw new Error('Cannot set array field on array parent');
          }
          parentTarget[lastKey] = value;
        }
      } else {
        // 正常情况：在对象上设置字段值
        if (value === '' || value === null) {
          delete target[lastKey];
        } else {
          target[lastKey] = value;
        }
      }

      setFormData(newData);
      // 立即更新 lastModelRef，防止外部更新覆盖
      lastModelRef.current = newData;
      // 使用防抖的 onChange，避免频繁触发父组件更新
      debouncedOnChange(newData);
    } catch (error) {
      console.error('Error updating field:', error, path, 'value:', value);
    }
  };

  const toggleCollapse = (key: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key);
    } else {
      newCollapsed.add(key);
    }
    setCollapsedSections(newCollapsed);
  };

  const renderField = (
    key: string,
    value: unknown,
    path: string[] = [],
    level: number = 0
  ): React.ReactNode => {
    // 过滤掉不需要的字段
    if (HIDDEN_FIELDS.has(key)) {
      return null;
    }

    const fullPath = [...path, key];
    const fieldKey = fullPath.join('.');
    const isCollapsed = collapsedSections.has(fieldKey);

    // 字符串字段
    if (typeof value === 'string') {
      const isLongText = value.length > 100 || value.includes('\n');
      return (
        <div key={fieldKey} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {getFieldLabel(key)}
          </label>
          {isLongText ? (
            <Textarea
              value={value}
              onFocus={() => {
                isEditingRef.current = true;
              }}
              onBlur={() => {
                // 延迟设置，确保 onChange 完成
                setTimeout(() => {
                  isEditingRef.current = false;
                }, 200);
              }}
              onChange={(e) => {
                isEditingRef.current = true;
                updateField(fullPath, e.target.value);
              }}
              rows={4}
              className="w-full"
            />
          ) : (
            <input
              type="text"
              value={value}
              onFocus={() => {
                isEditingRef.current = true;
              }}
              onBlur={() => {
                // 延迟设置，确保 onChange 完成
                setTimeout(() => {
                  isEditingRef.current = false;
                }, 200);
              }}
              onChange={(e) => {
                isEditingRef.current = true;
                updateField(fullPath, e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
            />
          )}
        </div>
      );
    }

    // 数字字段
    if (typeof value === 'number') {
      return (
        <div key={fieldKey} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {getFieldLabel(key)}
          </label>
          <input
            type="number"
            value={value}
            onFocus={() => {
              isEditingRef.current = true;
            }}
            onBlur={() => {
              setTimeout(() => {
                isEditingRef.current = false;
              }, 200);
            }}
            onChange={(e) => {
              isEditingRef.current = true;
              updateField(fullPath, parseFloat(e.target.value) || 0);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
          />
        </div>
      );
    }

    // 布尔字段
    if (typeof value === 'boolean') {
      return (
        <div key={fieldKey} className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateField(fullPath, e.target.checked)}
              className="w-4 h-4 text-banana-500 rounded focus:ring-banana-500"
            />
            <span className="text-sm font-medium text-gray-700">{getFieldLabel(key)}</span>
          </label>
        </div>
      );
    }

    // 字符串数组
    if (isStringArray(value)) {
      return (
        <div key={fieldKey} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {getFieldLabel(key)}
            </label>
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={14} />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                isEditingRef.current = true;
                const newArray = [...value, ''];
                updateField(fullPath, newArray);
                // 延迟重置编辑状态，确保更新完成
                setTimeout(() => {
                  isEditingRef.current = false;
                }, 500);
              }}
            >
              添加
            </Button>
          </div>
          <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
            {value.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <input
                  type="text"
                  value={item}
                  onFocus={() => {
                    isEditingRef.current = true;
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      isEditingRef.current = false;
                    }, 200);
                  }}
                  onChange={(e) => {
                    isEditingRef.current = true;
                    const newArray = [...value];
                    newArray[index] = e.target.value;
                    updateField(fullPath, newArray);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
                  placeholder={`${getFieldLabel(key)} ${index + 1}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const newArray = value.filter((_, i) => i !== index);
                    updateField(fullPath, newArray);
                  }}
                  className="text-red-600 hover:text-red-700"
                  title="删除此项"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 对象数组（如 bullets, steps, items 等）
    if (isArray(value) && value.length > 0 && isObject(value[0])) {
      return (
        <div key={fieldKey} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {getFieldLabel(key)}
            </label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                onClick={() => toggleCollapse(fieldKey)}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isEditingRef.current = true;
                  
                  // 创建新项，基于第一项的结构
                  let template: Record<string, unknown>;
                  if (value.length > 0) {
                    // 深拷贝第一项
                    template = JSON.parse(JSON.stringify(value[0])) as Record<string, unknown>;
                    // 清空非隐藏字段的值
                    Object.keys(template).forEach(k => {
                      if (HIDDEN_FIELDS.has(k)) {
                        // 保留隐藏字段的值
                        return;
                      }
                      if (typeof template[k] === 'string') template[k] = '';
                      else if (typeof template[k] === 'number') template[k] = 0;
                      else if (Array.isArray(template[k])) template[k] = [];
                      else if (isObject(template[k])) template[k] = {};
                    });
                  } else {
                    // 如果数组为空，创建一个默认对象
                    // 根据字段名推断可能的字段结构
                    template = {};
                    if (key === 'points' || key === 'bullets') {
                      template.text = '';
                      template.description = '';
                    } else if (key === 'steps') {
                      template.number = value.length + 1;
                      template.label = '';
                      template.description = '';
                    } else if (key === 'items') {
                      template.title = '';
                      template.text = '';
                    } else {
                      // 通用默认结构
                      template.text = '';
                    }
                  }
                  
                  const newArray = [...value, template];
                  updateField(fullPath, newArray);
                  // 延迟重置编辑状态，确保更新完成
                  setTimeout(() => {
                    isEditingRef.current = false;
                  }, 500);
                }}
              >
                添加
              </Button>
            </div>
          </div>
          {!isCollapsed && (
            <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
              {value.map((item, index) => (
                <div key={index} className="border-b border-gray-300 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">
                      {getFieldLabel(key)} {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // 阻止事件冒泡
                        if (window.confirm(`确定要删除第 ${index + 1} 项吗？这将删除该项的所有内容。`)) {
                          const newArray = value.filter((_, i) => i !== index);
                          updateField(fullPath, newArray);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                      title={`删除第 ${index + 1} 项（将删除该项的所有字段）`}
                    />
                  </div>
                  <div className="space-y-2 pl-4">
                    {Object.entries(item as Record<string, unknown>)
                      .filter(([subKey]) => !HIDDEN_FIELDS.has(subKey))
                      .map(([subKey, subValue]) =>
                        renderField(subKey, subValue, [...fullPath, index.toString()], level + 1)
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 对象字段
    if (isObject(value)) {
      return (
        <div key={fieldKey} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {getFieldLabel(key)}
            </label>
            <Button
              variant="ghost"
              size="sm"
              icon={isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              onClick={() => toggleCollapse(fieldKey)}
            />
          </div>
          {!isCollapsed && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
              {Object.entries(value)
                .filter(([subKey]) => !HIDDEN_FIELDS.has(subKey))
                .map(([subKey, subValue]) =>
                  renderField(subKey, subValue, fullPath, level + 1)
                )}
            </div>
          )}
        </div>
      );
    }

    // 其他类型（null, undefined 等）
    return null;
  };

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      {Object.entries(formData)
        .filter(([key]) => !HIDDEN_FIELDS.has(key))
        .map(([key, value]) => renderField(key, value))}
    </div>
  );
};
