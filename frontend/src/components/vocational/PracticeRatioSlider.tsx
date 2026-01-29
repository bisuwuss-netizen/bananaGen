import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Sliders, Info } from 'lucide-react';
import throttle from 'lodash/throttle';

interface PracticeRatioSliderProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  disabled?: boolean;
  totalPages?: number; // 实际页面总数，默认为10
}

// 本地预览估算：根据比例估算理论和实训页面数量
const estimatePageDistribution = (ratio: number, totalPages: number) => {
  const practicePages = Math.round(totalPages * (ratio / 100));
  const theoryPages = totalPages - practicePages;
  return { theoryPages, practicePages };
};

export const PracticeRatioSlider: React.FC<PracticeRatioSliderProps> = ({
  value,
  onChange,
  step = 5,
  disabled = false,
  totalPages = 10, // 默认10页，但应由父组件传入实际值
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // 同步外部 value 变化
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // 节流处理 onChange（避免频繁触发 API 或状态更新）
  const throttledOnChange = useRef(
    throttle((newValue: number) => {
      onChange(newValue);
    }, 300)
  ).current;
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setLocalValue(newValue);
    throttledOnChange(newValue);
  }, [throttledOnChange]);
  
  // 使用实际页面数计算预估分布
  const { theoryPages, practicePages } = estimatePageDistribution(localValue, totalPages);
  
  // 计算滑块位置百分比
  const thumbPosition = (localValue / 100) * 100;
  
  return (
    <div className="space-y-3">
      {/* 标题和帮助图标 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Sliders size={16} className="text-orange-600" />
          理实比例调节
        </h3>
        <button
          type="button"
          onClick={() => setShowTooltip(!showTooltip)}
          className="p-1 text-gray-400 hover:text-gray-600"
          aria-label="帮助信息"
        >
          <Info size={14} />
        </button>
      </div>
      
      {/* 帮助提示 */}
      {showTooltip && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
          理实比例决定大纲中理论页面与实训操作页面的分配。
          比例越高，生成的实操内容越多；比例越低，理论知识页面越多。
        </div>
      )}
      
      {/* 滑块区域 */}
      <div className="space-y-2">
        {/* 标签 */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>理论为主</span>
          <span>实训为主</span>
        </div>
        
        {/* 滑块容器 */}
        <div className="relative">
          {/* 背景渐变 */}
          <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-200 via-purple-200 to-green-200" />
          
          {/* 滑块 */}
          <input
            type="range"
            min="0"
            max="100"
            step={step}
            value={localValue}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer relative z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-orange-500
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              disabled:opacity-50
              disabled:cursor-not-allowed"
            aria-label="理实比例调节"
            aria-valuenow={localValue}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          
          {/* 当前值指示器 */}
          <div 
            className="absolute top-full mt-2 transform -translate-x-1/2 pointer-events-none"
            style={{ left: `${thumbPosition}%` }}
          >
            <div className="bg-orange-500 text-white text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
              {localValue}% 实操
            </div>
            <div className="w-2 h-2 bg-orange-500 rotate-45 absolute left-1/2 -translate-x-1/2 -top-1" />
          </div>
        </div>
      </div>
      
      {/* 预览信息 */}
      <div className="flex justify-between text-xs text-gray-500 mt-8 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>理论：约 {theoryPages} 页</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span>实训：约 {practicePages} 页</span>
        </div>
      </div>
      
      {/* 计费提示 */}
      {localValue !== value && (
        <p className="text-xs text-orange-600 animate-pulse">
          ⚠️ 调整将在下次生成预览时生效
        </p>
      )}
    </div>
  );
};
