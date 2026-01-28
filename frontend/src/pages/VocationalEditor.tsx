import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Settings, HelpCircle, RefreshCw, Image, 
  Download, Book, Layout, FileText, Loader2, Plus, Eye
} from 'lucide-react';
import { Button, Card, useToast } from '@/components/shared';
import { PedagogySelector } from '@/components/shared/PedagogySelector';
import { VocationalTemplateSelector } from '@/components/shared/VocationalTemplateSelector';
import { 
  OutlineItemEditor, 
  PracticeRatioSlider, 
  VocationalHTMLPreview,
  ImageLightbox 
} from '@/components/vocational';
import { useVocationalStore } from '@/store/useVocationalStore';
import { useProjectStore } from '@/store/useProjectStore';
import * as api from '@/api/endpoints';

export const VocationalEditor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  
  // Vocational store
  const {
    scene, selectedPedagogy, selectedTemplate, practiceRatio,
    previewUrl, imageSlots, pages, editingPageIndex,
    imageProgress, unsavedChanges,
    setScene, setPedagogy, setTemplate, setPracticeRatio,
    setPreviewHtml, setImageSlots, setPages, setEditingPage,
    updatePageTitle, updatePageBullets, updateImageProgress,
    reset,
  } = useVocationalStore();
  
  // Project store
  const { currentProject, syncProject, isGlobalLoading } = useProjectStore();
  
  // Local state
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showPedagogyModal, setShowPedagogyModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [expandedPageIndex, setExpandedPageIndex] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [regeneratingSlotId, setRegeneratingSlotId] = useState<string | null>(null);
  
  // 初始化：加载项目数据
  useEffect(() => {
    if (projectId) {
      syncProject(projectId);
    }
    return () => {
      // 离开页面时不重置状态，保留配置
    };
  }, [projectId, syncProject]);
  
  // 从项目数据初始化页面
  useEffect(() => {
    if (currentProject?.pages && pages.length === 0) {
      const vocationalPages = currentProject.pages.map((page) => ({
        id: page.id || page.page_id,
        title: page.outline_content?.title || '',
        bullets: page.outline_content?.points || [],
        imageLayout: 'right' as const,
        part: page.part,
      }));
      setPages(vocationalPages);
    }
  }, [currentProject, pages.length, setPages]);
  
  // 生成 HTML 预览
  const handleGeneratePreview = useCallback(async () => {
    if (!projectId || !selectedPedagogy || !selectedTemplate) {
      show({ message: '请先选择教学法和模板', type: 'error' });
      return;
    }
    
    setIsLoadingPreview(true);
    try {
      const response = await api.renderHtmlPreview(projectId, selectedTemplate, selectedPedagogy);
      
      if (response.data) {
        setPreviewHtml(response.data.html_content, response.data.html_url);
        
        if (response.data.image_slots) {
          setImageSlots(response.data.image_slots.map((slot: any) => ({
            ...slot,
            status: 'pending' as const,
          })));
        }
        
        show({ message: '预览生成成功', type: 'success' });
      }
    } catch (error: any) {
      console.error('生成预览失败:', error);
      show({ message: error.message || '生成预览失败', type: 'error' });
    } finally {
      setIsLoadingPreview(false);
    }
  }, [projectId, selectedPedagogy, selectedTemplate, setPreviewHtml, setImageSlots, show]);
  
  // 生成配图
  const handleGenerateImages = useCallback(async () => {
    if (!projectId || imageSlots.length === 0) {
      show({ message: '请先生成预览', type: 'error' });
      return;
    }
    
    setIsGeneratingImages(true);
    try {
      const response = await api.generateSlotImages(projectId, imageSlots);
      
      if (response.data?.task_id) {
        // 开始轮询或 WebSocket 监听
        show({ message: '配图生成任务已启动', type: 'success' });
        // TODO: 实现 WebSocket 监听
      }
    } catch (error: any) {
      console.error('生成配图失败:', error);
      show({ message: error.message || '生成配图失败', type: 'error' });
    } finally {
      setIsGeneratingImages(false);
    }
  }, [projectId, imageSlots, show]);
  
  // 导出 PPTX
  const handleExportPptx = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const response = await api.exportTemplatePptx(projectId, selectedTemplate);
      
      if (response.data?.download_url) {
        window.open(response.data.download_url, '_blank');
        show({ message: '导出成功', type: 'success' });
      }
    } catch (error: any) {
      console.error('导出失败:', error);
      show({ message: error.message || '导出失败', type: 'error' });
    }
  }, [projectId, selectedTemplate, show]);
  
  // 理实比例滑块处理
  const handleRatioChange = (value: number) => {
    setPracticeRatio(value);
  };
  
  // 单图重绘（独立计费）
  const handleRegenerateSingleImage = useCallback(async (slotId: string) => {
    if (!projectId) return;
    
    const slot = imageSlots.find(s => s.slot_id === slotId);
    if (!slot) return;
    
    // 确认计费提示
    const confirmed = confirm('单图重绘将独立计费，是否继续？');
    if (!confirmed) return;
    
    setRegeneratingSlotId(slotId);
    try {
      // 调用单图重绘 API
      const response = await api.regenerateSingleSlot(projectId, slotId, slot);
      if (response.data?.task_id) {
        // 更新插槽状态为生成中
        const { updateSlotStatus } = useVocationalStore.getState();
        updateSlotStatus(slotId, 'generating');
        show({ message: '单图重绘任务已启动（独立计费）', type: 'success' });
        // TODO: WebSocket 监听结果
      }
    } catch (error: any) {
      show({ message: error.message || '重绘失败', type: 'error' });
    } finally {
      setRegeneratingSlotId(null);
    }
  }, [projectId, imageSlots, show]);
  
  // 上传替换图片（临时缓存）
  const handleUploadSlotImage = useCallback(async (slotId: string, file: File) => {
    if (!projectId) return;
    
    try {
      // 调用上传 API（临时存储）
      const response = await api.uploadSlotImage(projectId, slotId, file);
      
      if (response.data?.image_url) {
        // 更新插槽状态为已上传
        const { updateSlotStatus } = useVocationalStore.getState();
        updateSlotStatus(slotId, 'uploaded', response.data.image_url);
        show({ message: '图片已上传（临时缓存，24小时有效）', type: 'success' });
      }
    } catch (error: any) {
      show({ message: error.message || '上传失败', type: 'error' });
    }
  }, [projectId, show]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部栏 */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/')}
          >
            返回
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Book size={20} className="text-blue-600" />
            {currentProject?.idea_prompt?.slice(0, 30) || '职教课件编辑器'}
            {currentProject?.idea_prompt && currentProject.idea_prompt.length > 30 && '...'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Settings size={16} />}>
            设置
          </Button>
          <Button variant="ghost" size="sm" icon={<HelpCircle size={16} />}>
            帮助
          </Button>
        </div>
      </header>
      
      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧配置面板 */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
          <div className="p-4 space-y-6">
            {/* 教学法选择 */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Book size={16} className="text-blue-600" />
                  教学法
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPedagogyModal(true)}
                  className="text-xs"
                >
                  更换
                </Button>
              </div>
              
              {selectedPedagogy ? (
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <p className="font-medium text-blue-900">{selectedPedagogy}</p>
                </Card>
              ) : (
                <Card 
                  className="p-3 border-dashed cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowPedagogyModal(true)}
                >
                  <p className="text-gray-500 text-sm">点击选择教学法</p>
                </Card>
              )}
            </section>
            
            {/* 理实比例调节 */}
            <section>
              <PracticeRatioSlider
                value={practiceRatio}
                onChange={handleRatioChange}
                step={5}
              />
            </section>
            
            {/* 模板选择 */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Layout size={16} className="text-purple-600" />
                  视觉模板
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateModal(true)}
                  className="text-xs"
                >
                  更换
                </Button>
              </div>
              
              {selectedTemplate ? (
                <Card className="p-3 bg-purple-50 border-purple-200">
                  <p className="font-medium text-purple-900">{selectedTemplate}</p>
                </Card>
              ) : (
                <Card 
                  className="p-3 border-dashed cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowTemplateModal(true)}
                >
                  <p className="text-gray-500 text-sm">点击选择模板</p>
                </Card>
              )}
            </section>
            
            {/* 大纲结构 */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText size={16} className="text-green-600" />
                  大纲结构
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    共 {pages.length} 页
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={() => {
                      const { addPage } = useVocationalStore.getState();
                      addPage(pages.length - 1);
                    }}
                    className="text-xs"
                  >
                    添加
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {pages.map((page, index) => (
                  <OutlineItemEditor
                    key={page.id}
                    page={page}
                    index={index}
                    isActive={currentPageIndex === index}
                    isExpanded={expandedPageIndex === index}
                    onSelect={() => setCurrentPageIndex(index)}
                    onToggleExpand={() => setExpandedPageIndex(expandedPageIndex === index ? null : index)}
                    onUpdateTitle={(title) => updatePageTitle(index, title)}
                    onUpdateBullets={(bullets) => updatePageBullets(index, bullets)}
                    onUpdateImageLayout={(layout) => {
                      const { updatePageImageLayout } = useVocationalStore.getState();
                      updatePageImageLayout(index, layout);
                    }}
                    onDelete={() => {
                      const { deletePage } = useVocationalStore.getState();
                      deletePage(index);
                    }}
                    onAddAfter={() => {
                      const { addPage } = useVocationalStore.getState();
                      addPage(index);
                    }}
                  />
                ))}
              </div>
            </section>
          </div>
        </aside>
        
        {/* 右侧预览区域 */}
        <main className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
          {/* 预览内容 */}
          <div className="flex-1 p-4 overflow-hidden">
            <VocationalHTMLPreview
              previewUrl={previewUrl}
              imageSlots={imageSlots}
              totalPages={pages.length}
              currentPage={currentPageIndex}
              onPageChange={setCurrentPageIndex}
              onRegenerateSlot={handleRegenerateSingleImage}
              onUploadSlot={handleUploadSlotImage}
              onPreviewImage={setLightboxImage}
              isLoading={isLoadingPreview}
              regeneratingSlotId={regeneratingSlotId}
            />
          </div>
          
          {/* 状态信息栏 */}
          {imageSlots.length > 0 && (
            <div className="px-4 pb-2">
              <Card className="p-3 bg-white">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    配图插槽：{imageSlots.length} 个
                  </span>
                  <span className="text-gray-600">
                    生成状态：{imageProgress.completed}/{imageProgress.total}
                    {imageProgress.failed > 0 && (
                      <span className="text-red-500 ml-2">
                        ({imageProgress.failed} 失败)
                      </span>
                    )}
                  </span>
                </div>
                {imageProgress.total > 0 && (
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${(imageProgress.completed / imageProgress.total) * 100}%` }}
                    />
                  </div>
                )}
              </Card>
            </div>
          )}
        </main>
      </div>
      
      {/* 底部工具栏 */}
      <footer className="h-16 bg-white border-t border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            icon={<RefreshCw size={16} />}
            onClick={() => {
              // 重新生成大纲
            }}
            disabled={isGlobalLoading}
          >
            重新生成大纲
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={isLoadingPreview ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            onClick={handleGeneratePreview}
            disabled={isLoadingPreview || !selectedPedagogy || !selectedTemplate}
          >
            {isLoadingPreview ? '生成中...' : '生成预览'}
          </Button>
          
          <Button
            variant="secondary"
            icon={isGeneratingImages ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
            onClick={handleGenerateImages}
            disabled={isGeneratingImages || imageSlots.length === 0}
          >
            {isGeneratingImages ? '生成中...' : '生成配图'}
          </Button>
          
          <Button
            icon={<Download size={16} />}
            onClick={handleExportPptx}
            disabled={!previewUrl}
          >
            导出 PPTX
          </Button>
        </div>
      </footer>
      
      {/* 教学法选择弹窗 */}
      {showPedagogyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[800px] max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">选择教学法</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPedagogyModal(false)}
              >
                关闭
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <PedagogySelector
                onSelect={(id) => {
                  setPedagogy(id);
                  setShowPedagogyModal(false);
                }}
                selectedPedagogyId={selectedPedagogy}
                scene={scene}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* 模板选择弹窗 */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[900px] max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">选择视觉模板</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateModal(false)}
              >
                关闭
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <VocationalTemplateSelector
                onSelect={(id) => {
                  setTemplate(id);
                  setShowTemplateModal(false);
                }}
                selectedTemplateId={selectedTemplate}
                scene={scene === 'mixed' ? undefined : scene}
              />
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer />
      
      {/* 图片大图预览 */}
      {lightboxImage && (
        <ImageLightbox
          imageSrc={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};
