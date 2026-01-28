import React, { useState, useEffect, useRef } from 'react';
import { renderHTML, generateSlotImages, getImageGenerationStatus, exportTemplatePPTX, type HTMLRenderResult, type ImageSlotRequest } from '@/api/endpoints';
import { getBaseUrl } from '@/api/client';
import { Play, RefreshCw, Download, Image, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button, useToast } from '@/components/shared';

interface HTMLPreviewProps {
  projectId: string;
  templateId?: string;
  pedagogyMethod?: string;
  onExport?: (downloadUrl: string) => void;
}

interface ImageGenerationState {
  isGenerating: boolean;
  taskId: string | null;
  progress: { total: number; completed: number; failed: number };
  results: Record<string, { status: string; image_url?: string; error?: string }>;
}

export const HTMLPreview: React.FC<HTMLPreviewProps> = ({
  projectId,
  templateId = 'theory_professional',
  pedagogyMethod = 'five_step',
  onExport,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [renderResult, setRenderResult] = useState<HTMLRenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageState, setImageState] = useState<ImageGenerationState>({
    isGenerating: false,
    taskId: null,
    progress: { total: 0, completed: 0, failed: 0 },
    results: {},
  });
  const [isExporting, setIsExporting] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { show, ToastContainer } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // 渲染 HTML
  const handleRender = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await renderHTML(projectId, templateId, pedagogyMethod);
      
      if (response.success && response.data) {
        setRenderResult(response.data);
        show({ message: `渲染完成，共 ${response.data.total_pages} 页`, type: 'success' });
        
        if (response.data.warnings && response.data.warnings.length > 0) {
          response.data.warnings.forEach((warning) => {
            show({ message: warning, type: 'warning' });
          });
        }
      } else {
        throw new Error(response.error || '渲染失败');
      }
    } catch (err: any) {
      console.error('渲染失败:', err);
      setError(err.message || '渲染失败');
      show({ message: err.message || '渲染失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // 生成图片
  const handleGenerateImages = async () => {
    if (!renderResult || renderResult.image_slots.length === 0) {
      show({ message: '没有需要生成的图片插槽', type: 'info' });
      return;
    }

    setImageState((prev) => ({
      ...prev,
      isGenerating: true,
      progress: { total: renderResult.image_slots.length, completed: 0, failed: 0 },
      results: {},
    }));

    try {
      const response = await generateSlotImages(projectId, renderResult.image_slots, '职业教育');
      
      if (response.success && response.data) {
        setImageState((prev) => ({
          ...prev,
          taskId: response.data.task_id,
        }));
        
        // 开始轮询状态
        startPolling(response.data.task_id);
        show({ message: `开始生成 ${response.data.total_slots} 张配图`, type: 'success' });
      } else {
        throw new Error(response.error || '启动图片生成失败');
      }
    } catch (err: any) {
      console.error('图片生成失败:', err);
      setImageState((prev) => ({ ...prev, isGenerating: false }));
      show({ message: err.message || '图片生成失败', type: 'error' });
    }
  };

  // 轮询图片生成状态
  const startPolling = (taskId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await getImageGenerationStatus(projectId, taskId);
        
        if (response.success && response.data) {
          const { status, progress, result } = response.data;
          
          setImageState((prev) => ({
            ...prev,
            progress: progress || prev.progress,
            results: result || prev.results,
          }));

          // 任务完成
          if (status === 'COMPLETED' || status === 'PARTIAL' || status === 'FAILED') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            setImageState((prev) => ({ ...prev, isGenerating: false }));
            
            if (status === 'COMPLETED') {
              show({ message: '所有配图生成完成', type: 'success' });
              // 刷新 iframe 以显示新图片
              refreshIframe();
            } else if (status === 'PARTIAL') {
              show({ message: `配图生成部分完成，${progress.failed} 张失败`, type: 'warning' });
              refreshIframe();
            } else {
              show({ message: '配图生成失败', type: 'error' });
            }
          }
        }
      } catch (err) {
        console.error('轮询状态失败:', err);
      }
    }, 2000);
  };

  // 刷新 iframe
  const refreshIframe = () => {
    if (iframeRef.current && renderResult) {
      const baseUrl = getBaseUrl();
      iframeRef.current.src = `${baseUrl}${renderResult.html_path}?t=${Date.now()}`;
    }
  };

  // 导出 PPTX
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // 构建图片路径映射
      const imagePaths: Record<string, string> = {};
      Object.entries(imageState.results).forEach(([slotId, result]) => {
        if (result.status === 'done' && result.image_url) {
          imagePaths[slotId] = result.image_url;
        }
      });

      const response = await exportTemplatePPTX(projectId, templateId, imagePaths);
      
      if (response.success && response.data) {
        show({ message: 'PPTX 导出成功', type: 'success' });
        
        // 触发下载
        const baseUrl = getBaseUrl();
        const downloadUrl = `${baseUrl}${response.data.download_url}`;
        window.open(downloadUrl, '_blank');
        
        if (onExport) {
          onExport(downloadUrl);
        }
      } else {
        throw new Error(response.error || '导出失败');
      }
    } catch (err: any) {
      console.error('导出失败:', err);
      show({ message: err.message || '导出失败', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const baseUrl = getBaseUrl();

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRender}
            disabled={isLoading}
            icon={isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          >
            {isLoading ? '渲染中...' : '生成预览'}
          </Button>
          
          {renderResult && (
            <>
              <Button
                variant="secondary"
                onClick={handleGenerateImages}
                disabled={imageState.isGenerating || renderResult.image_slots.length === 0}
                icon={imageState.isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
              >
                {imageState.isGenerating
                  ? `生成配图 (${imageState.progress.completed}/${imageState.progress.total})`
                  : `生成配图 (${renderResult.image_slots.length})`}
              </Button>
              
              <Button
                variant="secondary"
                onClick={refreshIframe}
                icon={<RefreshCw size={16} />}
              >
                刷新
              </Button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {renderResult && (
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={isExporting}
              icon={isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            >
              {isExporting ? '导出中...' : '导出 PPTX'}
            </Button>
          )}
        </div>
      </div>

      {/* 状态信息 */}
      {renderResult && (
        <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              共 {renderResult.total_pages} 页
            </span>
            <span className="text-gray-600">
              配图插槽: {renderResult.image_slots.length}
            </span>
            {Object.keys(renderResult.layouts_used).length > 0 && (
              <span className="text-gray-500">
                布局: {Object.entries(renderResult.layouts_used).map(([k, v]) => `${k}(${v})`).join(', ')}
              </span>
            )}
          </div>
          
          {/* 图片生成进度 */}
          {imageState.progress.total > 0 && (
            <div className="flex items-center gap-2">
              {imageState.progress.completed === imageState.progress.total ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : imageState.progress.failed > 0 ? (
                <AlertCircle size={16} className="text-amber-500" />
              ) : null}
              <span className="text-gray-600">
                配图: {imageState.progress.completed}/{imageState.progress.total}
                {imageState.progress.failed > 0 && ` (${imageState.progress.failed} 失败)`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 预览区域 */}
      <div className="flex-1 bg-gray-100 relative">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
              <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-800">渲染失败</h3>
              <p className="text-red-600 mt-2">{error}</p>
              <Button
                className="mt-4"
                onClick={handleRender}
              >
                重试
              </Button>
            </div>
          </div>
        )}
        
        {!renderResult && !error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Play size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">点击"生成预览"开始</h3>
              <p className="text-gray-400 mt-2">基于模板和教法模式生成 HTML 幻灯片</p>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
            <div className="text-center">
              <Loader2 size={48} className="text-banana-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-600">正在渲染...</h3>
            </div>
          </div>
        )}
        
        {renderResult && (
          <iframe
            ref={iframeRef}
            src={`${baseUrl}${renderResult.html_path}`}
            className="w-full h-full border-0"
            title="HTML 幻灯片预览"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
      
      <ToastContainer />
    </div>
  );
};
