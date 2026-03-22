import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Send,
  History,
  ChevronRight,
  Trash2,
  MessageSquarePlus,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/* ─── 思考中步骤提示 ─── */
const THINKING_STEPS = [
  '正在理解你的修改需求…',
  'AI 正在分析当前内容…',
  '正在规划修改方案…',
  'AI 正在生成新内容…',
  '正在优化排版与结构…',
  '即将完成，请稍候…',
];

export interface HistoryItem {
  text: string;
  timestamp: Date;
  status: 'success' | 'error';
  summary?: string;
}

const ThinkingBubble: React.FC<{ text: string; userMessage?: string }> = ({
  text,
  userMessage,
}) => (
  <div className="animate-fade-up">
    {/* 用户消息（已发送） */}
    {userMessage && (
      <div className="flex justify-end mb-1.5">
        <div className="max-w-[85%] px-3.5 py-2.5 rounded-md text-[13px] leading-relaxed font-medium border-2 border-gray-900 bg-[#f5d040] text-gray-900">
          {userMessage}
        </div>
      </div>
    )}
    {/* AI 思考状态 */}
    <div className="flex items-start gap-1.5 ml-1">
      <div className="w-5 h-5 rounded-md border-2 border-gray-900 flex items-center justify-center bg-[#f5d040] animate-pulse">
        <Sparkles size={11} className="text-gray-900" />
      </div>
      <div className="flex-1">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md border-2 border-gray-900 bg-[#f5d040]">
          <Loader2 size={13} className="animate-spin text-gray-900" />
          <span className="text-[13px] text-gray-900 font-bold">{text}</span>
        </div>
        {/* 三个跳动的点 */}
        <div className="flex items-center gap-1 mt-1.5 ml-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-900 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export interface AiRefineSidebarProps {
  /** 侧边栏标题 */
  title?: string;
  /** 输入框占位文字 */
  placeholder: string;
  /** 提交回调函数，接收当前要求和历史要求，返回 Promise<摘要字符串> */
  onSubmit: (requirement: string, previousRequirements: string[]) => Promise<string>;
  /** 是否禁用 */
  disabled?: boolean;
  /** 侧边栏是否打开 */
  isOpen: boolean;
  /** 控制侧边栏打开/关闭 */
  onToggle: (open: boolean) => void;
  /** 状态变化回调 */
  onStatusChange?: (isSubmitting: boolean) => void;
  /** 外部传入的对话历史（持久化） */
  history?: HistoryItem[];
  /** 历史变化回调（持久化） */
  onHistoryChange?: (history: HistoryItem[]) => void;
}

const AiRefineSidebarComponent: React.FC<AiRefineSidebarProps> = ({
  title = 'AI 智能修改',
  placeholder,
  onSubmit,
  disabled = false,
  isOpen,
  onToggle,
  onStatusChange,
  history: externalHistory,
  onHistoryChange,
}) => {
  const [requirement, setRequirement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [internalHistory, setInternalHistory] = useState<HistoryItem[]>([]);
  const history = externalHistory ?? internalHistory;
  const setHistory = (updater: HistoryItem[] | ((prev: HistoryItem[]) => HistoryItem[])) => {
    const newHistory = typeof updater === 'function' ? updater(history) : updater;
    if (onHistoryChange) {
      onHistoryChange(newHistory);
    } else {
      setInternalHistory(newHistory);
    }
  };
  const historyEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 思考步骤自动推进
  useEffect(() => {
    if (!isSubmitting) {
      setThinkingStep(0);
      setPendingText(null);
      return;
    }
    const interval = setInterval(() => {
      setThinkingStep((prev) =>
        prev < THINKING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [isSubmitting]);

  // 自动滚动到历史底部
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, thinkingStep]);

  // 打开侧边栏时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!requirement.trim() || isSubmitting || disabled) return;

    const currentRequirement = requirement.trim();
    setPendingText(currentRequirement);
    setRequirement('');
    setThinkingStep(0);
    setIsSubmitting(true);
    onStatusChange?.(true);
    try {
      // onSubmit 现在返回摘要字符串
      const summary = await onSubmit(
        currentRequirement,
        history.map((h) => h.text)
      );
      setHistory((prev) => [
        ...prev,
        { 
          text: currentRequirement, 
          timestamp: new Date(), 
          status: 'success',
          summary: summary || '修改已完成'
        },
      ]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { 
          text: currentRequirement, 
          timestamp: new Date(), 
          status: 'error',
          summary: '修改失败，请重试'
        },
      ]);
    } finally {
      setIsSubmitting(false);
      setPendingText(null);
      onStatusChange?.(false);
    }
  }, [requirement, isSubmitting, disabled, onSubmit, history, onStatusChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return createPortal(
    <>
      {/* 遮罩层 - 仅移动端 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 md:hidden"
          onClick={() => onToggle(false)}
        />
      )}

      {/* 侧边栏面板 */}
      <div
        className={`fixed top-0 right-0 h-screen z-50 flex flex-col bg-white
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          w-[340px] md:w-[400px] overflow-hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderLeft: '2px solid #1a1a1a' }}
      >
        {/* 头部 */}
        <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between" style={{ background: '#ede4d0', borderBottom: '2px solid #1a1a1a' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md border-2 border-gray-900 bg-[#f5d040] flex items-center justify-center" style={{ boxShadow: '2px 2px 0 #1a1a1a' }}>
              <Sparkles size={18} className="text-gray-900" />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-gray-900">
                {title}
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                用自然语言描述你想要的修改
              </p>
            </div>
          </div>
          <button
            onClick={() => onToggle(false)}
            className="w-8 h-8 rounded-md border-2 border-gray-900 bg-white flex items-center justify-center transition-colors hover:bg-gray-50"
            style={{ boxShadow: '2px 2px 0 #1a1a1a' }}
          >
            <X size={16} className="text-gray-900" />
          </button>
        </div>

        {/* 历史记录区域 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {history.length === 0 && !isSubmitting ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
              <div className="w-16 h-16 rounded-md border-2 border-gray-900 bg-[#f5d040] flex items-center justify-center mb-4" style={{ boxShadow: '4px 4px 0 #1a1a1a' }}>
                <MessageSquarePlus
                  size={28}
                  className="text-gray-900"
                />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                开始智能修改
              </p>
              <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">
                在下方输入你的修改要求，AI 会帮你自动完成。支持多轮对话，每次修改都会记住上下文。
              </p>

              {/* 快捷建议 */}
              <div className="mt-6 w-full space-y-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
                  试试这些
                </p>
                {[
                  '让内容更加详细',
                  '增加一页关于总结的内容',
                  '把语气改成更正式的风格',
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setRequirement(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 font-medium bg-gray-50
                      hover:bg-[#f5d040] rounded-md transition-colors border-2 border-gray-900"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-4">
              {/* 历史头部 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <History size={12} />
                  <span>修改记录 ({history.length})</span>
                </div>
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={11} />
                  <span>清空</span>
                </button>
              </div>

              {/* 历史消息列表 */}
              {history.map((item, idx) => (
                <div key={idx} className="animate-fade-up space-y-2" style={{ animationDelay: `${idx * 40}ms` }}>
                  {/* 用户消息 */}
                  <div className="flex justify-end">
                    <div
                      className={`max-w-[90%] px-3.5 py-2.5 rounded-md text-[13px] leading-relaxed font-medium border-2 border-gray-900
                        ${
                          item.status === 'success'
                            ? 'bg-[#f5d040] text-gray-900'
                            : 'bg-red-50 text-red-700 border-red-600'
                        }`}
                    >
                      {item.text}
                    </div>
                  </div>

                  {/* AI 回复指示 + 摘要 */}
                  <div className="flex items-start gap-2 ml-1">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                        ${item.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}
                    >
                      {item.status === 'success' ? (
                        <CheckCircle2 size={11} className="text-green-500" />
                      ) : (
                        <XCircle size={11} className="text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* 状态标签 */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[11px] font-medium ${
                            item.status === 'success'
                              ? 'text-green-600'
                              : 'text-red-500'
                          }`}
                        >
                          {item.status === 'success' ? 'AI 已完成修改' : '修改失败'}
                        </span>
                        <span className="text-[10px] text-gray-300">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      {/* 摘要内容 */}
                      {item.summary && (
                        <div className="text-[12px] text-gray-700 bg-gray-50 rounded-md border-2 border-gray-900 px-3 py-2 leading-relaxed">
                          <span className="text-gray-900 font-bold">修改摘要：</span>
                          {item.summary}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* 思考中气泡 - AI 处理期间显示 */}
              {isSubmitting && pendingText && (
                <ThinkingBubble 
                  text={THINKING_STEPS[thinkingStep]} 
                  userMessage={pendingText}
                />
              )}
              <div ref={historyEndRef} />
            </div>
          )}
        </div>

        {/* 底部输入区域 */}
        <div className="flex-shrink-0 bg-white" style={{ borderTop: '2px solid #1a1a1a' }}>
          {/* 提交中动画条 */}
          {isSubmitting && (
            <div className="h-1 bg-gray-200 overflow-hidden">
              <div className="h-full bg-[#f5d040] animate-shimmer bg-[length:200%_100%]" />
            </div>
          )}

          <div className="px-4 py-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={isSubmitting || disabled}
                  className={`w-full px-3.5 py-2.5 text-[13px] border-2 border-gray-900 rounded-md
                    focus:outline-none transition-all placeholder:text-gray-400 font-medium
                    ${
                      isSubmitting
                        ? 'bg-gray-50 text-gray-400 cursor-wait'
                        : 'bg-white'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!requirement.trim() || isSubmitting || disabled}
                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-md border-2 border-gray-900 transition-all duration-200
                  ${
                    !requirement.trim() || isSubmitting || disabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#f5d040] text-gray-900 hover:bg-[#f0c830] active:scale-95'
                  }`}
                style={{ boxShadow: (!requirement.trim() || isSubmitting || disabled) ? 'none' : '2px 2px 0 #1a1a1a' }}
                title="提交 (Ctrl+Enter)"
              >
                <Send
                  size={16}
                  className={isSubmitting ? 'animate-pulse' : ''}
                />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-[11px] text-gray-400">
                Ctrl + Enter 提交
              </span>
              {history.length > 0 && (
                <span className="text-[11px] text-gray-400">
                  已记住 {history.length} 条上下文
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 侧边悬浮开启按钮 - 仅当侧边栏关闭时显示 */}
      {!isOpen && !disabled && (
        <button
          onClick={() => onToggle(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30
            flex items-center gap-1.5 pl-3 pr-2 py-3
            bg-[#f5d040] text-gray-900 text-xs font-black
            rounded-l-md border-t-2 border-b-2 border-l-2 border-gray-900
            hover:bg-[#f0c830] hover:pr-3
            transition-all duration-200 group"
          style={{ boxShadow: '-2px 2px 0 #1a1a1a' }}
          title="打开 AI 修改面板"
        >
          <Sparkles size={15} />
          <span className="hidden md:inline">AI 修改</span>
          <ChevronRight
            size={14}
            className="rotate-180 opacity-60 group-hover:opacity-100 transition-opacity"
          />
        </button>
      )}
    </>,
    document.body
  );
};

export const AiRefineSidebar = memo(AiRefineSidebarComponent);
