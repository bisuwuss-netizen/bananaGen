import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Settings, HelpCircle, RefreshCw, Image, 
  Download, Book, Layout, FileText, Loader2, Plus, Eye,
  CheckCircle, Circle, ChevronRight, Sparkles, Play, LayoutGrid, Monitor
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
import PageCardPreview from '@/components/vocational/PageCardPreview';
import { useVocationalStore } from '@/store/useVocationalStore';
import { useProjectStore } from '@/store/useProjectStore';
import * as api from '@/api/endpoints';

// 工作流步骤定义（预览是自动的，不作为独立步骤）
type WorkflowStep = 'outline' | 'descriptions' | 'images' | 'export';

const WORKFLOW_STEPS: { id: WorkflowStep; label: string; description: string }[] = [
  { id: 'outline', label: '生成大纲', description: '根据主题生成课件大纲结构' },
  { id: 'descriptions', label: '生成描述', description: '为每页生成详细内容描述（可选）' },
  { id: 'images', label: '生成配图', description: '为各页面生成配套图片' },
  { id: 'export', label: '导出课件', description: '导出可编辑的 PPTX 文件' },
];

export const VocationalEditor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  
  // Vocational store
  const {
    scene, selectedPedagogy, selectedTemplate, practiceRatio,
    previewUrl, imageSlots, pages,
    imageProgress,
    setPedagogy, setTemplate, setPracticeRatio,
    setPreviewHtml, setImageSlots, setPages,
    updatePageTitle, updatePageBullets,
  } = useVocationalStore();
  
  // Project store
  const { currentProject, syncProject, isGlobalLoading } = useProjectStore();
  
  // 工作流状态
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('outline');
  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set());
  
  // 加载状态
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // 全局任务状态
  const [globalTaskMessage, setGlobalTaskMessage] = useState<string | null>(null);
  
  // UI 状态
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showPedagogyModal, setShowPedagogyModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [expandedPageIndex, setExpandedPageIndex] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [regeneratingSlotId, setRegeneratingSlotId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'cards' | 'html'>('cards'); // 预览模式
  
  // 是否有任务正在进行
  const isAnyTaskRunning = isGeneratingOutline || isGeneratingDescriptions || 
    isLoadingPreview || isGeneratingImages || isExporting || isGlobalLoading;
  
  // 自动生成预览（内部调用，不显示独立的加载状态）
  const autoGeneratePreview = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:autoGeneratePreview:entry',message:'autoGeneratePreview called',data:{projectId,selectedPedagogy,selectedTemplate},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (!projectId || !selectedPedagogy || !selectedTemplate) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:autoGeneratePreview:earlyReturn',message:'Early return due to missing params',data:{projectId,selectedPedagogy,selectedTemplate},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    try {
      const response = await api.renderHtmlPreview(projectId, selectedTemplate, selectedPedagogy);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:autoGeneratePreview:afterRender',message:'renderHtmlPreview returned',data:{hasData:!!response?.data,hasHtmlContent:!!response?.data?.html_content},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      if (response.data) {
        setPreviewHtml(response.data.html_content, response.data.html_url);
        
        if (response.data.image_slots) {
          setImageSlots(response.data.image_slots.map((slot: any) => ({
            ...slot,
            status: 'pending' as const,
          })));
        }
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:autoGeneratePreview:error',message:'autoGeneratePreview caught error',data:{error:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('自动生成预览失败:', error);
    }
  }, [projectId, selectedPedagogy, selectedTemplate, setPreviewHtml, setImageSlots]);
  
  // 初始化：加载项目数据
  useEffect(() => {
    if (projectId) {
      syncProject(projectId);
    }
  }, [projectId, syncProject]);
  
  // 从项目数据初始化页面和检测当前步骤
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:useEffect:currentProject',message:'useEffect triggered for currentProject',data:{hasCurrentProject:!!currentProject,hasPages:!!currentProject?.pages,pagesCount:currentProject?.pages?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    if (currentProject?.pages) {
      try {
        const vocationalPages = currentProject.pages.map((page) => ({
          id: page.id || page.page_id,
          title: page.outline_content?.title || '',
          bullets: page.outline_content?.points || [],
          imageLayout: 'right' as const,
          part: page.part,
          hasDescription: !!page.description_content,
        }));
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:useEffect:mappedPages',message:'Pages mapped successfully',data:{vocationalPagesCount:vocationalPages.length,hasDescriptions:currentProject.pages.some((p: any) => p.description_content)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        setPages(vocationalPages);
        
        // 检测已完成的步骤
        const newCompleted = new Set<WorkflowStep>();
        const hasOutline = vocationalPages.length > 0 && vocationalPages.some(p => p.title);
        const hasDescriptions = currentProject.pages.some((p: any) => p.description_content);
        const hasImages = currentProject.pages.some((p: any) => p.generated_image_url || p.generated_image_path);
        
        if (hasOutline) {
          newCompleted.add('outline');
        }
        
        if (hasDescriptions) {
          newCompleted.add('descriptions');
        }
        
        if (hasImages) {
          newCompleted.add('images');
        }
        
        setCompletedSteps(newCompleted);
        
        // 自动设置当前步骤 - 但不覆盖用户手动选择的步骤（如果已经在后续步骤）
        const stepOrder: WorkflowStep[] = ['outline', 'descriptions', 'images', 'export'];
        const getStepIndex = (step: WorkflowStep) => stepOrder.indexOf(step);
        
        let autoStep: WorkflowStep = 'outline';
        if (!hasOutline) {
          autoStep = 'outline';
        } else if (!hasDescriptions) {
          autoStep = 'descriptions';
        } else if (!hasImages) {
          autoStep = 'images';
        } else {
          autoStep = 'export';
        }
        
        // 只有当自动步骤比当前步骤更靠后时才更新
        if (getStepIndex(autoStep) > getStepIndex(currentStep)) {
          setCurrentStep(autoStep);
        }
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:useEffect:error',message:'Error in useEffect currentProject',data:{error:err?.message||String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        console.error('Error in useEffect:', err);
      }
    }
  }, [currentProject, setPages, imageSlots.length, imageProgress]);
  
  // 页面加载后，如果有大纲但没有预览，自动生成预览
  useEffect(() => {
    const hasOutline = pages.length > 0 && pages.some(p => p.title);
    if (hasOutline && !previewUrl && selectedPedagogy && selectedTemplate && !isAnyTaskRunning) {
      autoGeneratePreview();
    }
  }, [pages, previewUrl, selectedPedagogy, selectedTemplate, isAnyTaskRunning, autoGeneratePreview]);
  
  // ===================== 步骤处理函数 =====================
  
  // 步骤1：生成大纲
  const handleGenerateOutline = useCallback(async (isRegenerate = false) => {
    if (!projectId) return;
    
    if (isRegenerate) {
      const confirmed = confirm('重新生成大纲将覆盖当前内容，是否继续？');
      if (!confirmed) return;
    }
    
    setIsGeneratingOutline(true);
    setGlobalTaskMessage('正在生成大纲结构，请稍候...');
    
    try {
      // 传递实训比例和教学法参数
      const response = await api.generateOutline(projectId, undefined, practiceRatio, selectedPedagogy);
      
      if (response.data?.pages) {
        const vocationalPages = response.data.pages.map((page: any) => ({
          id: page.id || page.page_id,
          title: page.outline_content?.title || '',
          bullets: page.outline_content?.points || [],
          imageLayout: 'right' as const,
          part: page.part,
        }));
        setPages(vocationalPages);
        
        // 标记步骤完成
        setCompletedSteps(prev => new Set([...prev, 'outline']));
        
        await syncProject(projectId);
        
        // 自动生成预览
        setGlobalTaskMessage('正在生成预览...');
        await autoGeneratePreview();
        
        setCurrentStep('descriptions');
        show({ message: '大纲生成成功！可以继续生成页面描述', type: 'success' });
      }
    } catch (error: any) {
      console.error('生成大纲失败:', error);
      show({ message: error.message || '生成大纲失败', type: 'error' });
    } finally {
      setIsGeneratingOutline(false);
      setGlobalTaskMessage(null);
    }
  }, [projectId, setPages, syncProject, show, autoGeneratePreview, practiceRatio, selectedPedagogy]);
  
  // 步骤2：生成页面描述
  const handleGenerateDescriptions = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:handleGenerateDescriptions:entry',message:'handleGenerateDescriptions called',data:{projectId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!projectId) return;
    
    setIsGeneratingDescriptions(true);
    setGlobalTaskMessage('正在为每页生成详细描述，这可能需要几分钟...');
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:handleGenerateDescriptions:beforeApiCall',message:'About to call api.generateDescriptions',data:{projectId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await api.generateDescriptions(projectId);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:handleGenerateDescriptions:afterApiCall',message:'api.generateDescriptions returned',data:{response,hasTaskId:!!response?.data?.task_id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (response.data?.task_id) {
        // 轮询任务状态
        const pollTaskStatus = async () => {
          try {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:beforeGetStatus',message:'About to call getTaskStatus',data:{taskId:response.data.task_id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            const statusRes = await api.getTaskStatus(projectId, response.data.task_id);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:afterGetStatus',message:'getTaskStatus returned',data:{statusRes,status:statusRes?.data?.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            const status = statusRes.data?.status;
            
            if (status === 'COMPLETED' || status === 'PARTIAL') {
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:completed',message:'Task completed, updating state',data:{status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
              setCompletedSteps(prev => new Set([...prev, 'descriptions']));
              await syncProject(projectId);
              
              // 自动更新预览
              setGlobalTaskMessage('正在更新预览...');
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:beforeAutoPreview',message:'About to call autoGeneratePreview',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
              // #endregion
              await autoGeneratePreview();
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:afterAutoPreview',message:'autoGeneratePreview completed',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
              // #endregion
              
              try {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:beforeSetCurrentStep',message:'About to setCurrentStep to images',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
                setCurrentStep('images');
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:afterSetCurrentStep',message:'setCurrentStep completed',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
                show({ message: '页面描述生成完成！可以继续生成配图', type: 'success' });
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:afterShow',message:'show toast completed',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
                setIsGeneratingDescriptions(false);
                setGlobalTaskMessage(null);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:completed_success',message:'Task completion flow finished successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
              } catch (finalErr: any) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:finalError',message:'Error in completion flow',data:{error:finalErr?.message||String(finalErr)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
                console.error('Completion flow error:', finalErr);
                setIsGeneratingDescriptions(false);
                setGlobalTaskMessage(null);
              }
            } else if (status === 'FAILED') {
              show({ message: statusRes.data?.error || '生成失败', type: 'error' });
              setIsGeneratingDescriptions(false);
              setGlobalTaskMessage(null);
            } else {
              // 继续轮询
              const progress = statusRes.data?.progress;
              if (progress) {
                setGlobalTaskMessage(`正在生成页面描述 (${progress.completed}/${progress.total})...`);
              }
              setTimeout(pollTaskStatus, 2000);
            }
          } catch (e: any) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:pollTaskStatus:error',message:'pollTaskStatus caught error',data:{error:e?.message||String(e)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            console.error('轮询状态失败:', e);
            setTimeout(pollTaskStatus, 3000);
          }
        };
        
        pollTaskStatus();
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:handleGenerateDescriptions:noTaskId',message:'No task_id in response',data:{response},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:handleGenerateDescriptions:catchError',message:'generateDescriptions threw error',data:{error:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('生成描述失败:', error);
      show({ message: error.message || '生成描述失败', type: 'error' });
      setIsGeneratingDescriptions(false);
      setGlobalTaskMessage(null);
    }
  }, [projectId, syncProject, show, autoGeneratePreview]);
  
  // 步骤3：生成预览
  const handleGeneratePreview = useCallback(async () => {
    if (!projectId || !selectedPedagogy || !selectedTemplate) {
      show({ message: '请先选择教学法和模板', type: 'error' });
      return;
    }
    
    setIsLoadingPreview(true);
    setGlobalTaskMessage('正在生成预览，请稍候...');
    
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
        
        setCompletedSteps(prev => new Set([...prev, 'preview']));
        setCurrentStep('images');
        show({ message: '预览生成成功！可以继续生成配图', type: 'success' });
      }
    } catch (error: any) {
      console.error('生成预览失败:', error);
      show({ message: error.message || '生成预览失败', type: 'error' });
    } finally {
      setIsLoadingPreview(false);
      setGlobalTaskMessage(null);
    }
  }, [projectId, selectedPedagogy, selectedTemplate, setPreviewHtml, setImageSlots, show]);
  
  // 步骤4：生成配图
  const handleGenerateImages = useCallback(async () => {
    if (!projectId || imageSlots.length === 0) {
      show({ message: '请先生成预览', type: 'error' });
      return;
    }
    
    setIsGeneratingImages(true);
    setGlobalTaskMessage('正在生成配图，这可能需要几分钟...');
    
    try {
      const response = await api.generateSlotImages(projectId, imageSlots);
      
      if (response.data?.task_id) {
        // TODO: WebSocket 或轮询监听
        show({ message: '配图生成任务已启动', type: 'success' });
        
        // 简单轮询
        const pollImageStatus = async () => {
          try {
            const statusRes = await api.getImageGenerationStatus(projectId, response.data.task_id);
            const status = statusRes.data?.status;
            
            if (status === 'COMPLETED' || status === 'PARTIAL') {
              setCompletedSteps(prev => new Set([...prev, 'images']));
              setCurrentStep('export');
              show({ message: '配图生成完成！可以导出课件了', type: 'success' });
              setIsGeneratingImages(false);
              setGlobalTaskMessage(null);
            } else if (status === 'FAILED') {
              show({ message: statusRes.data?.error || '生成失败', type: 'error' });
              setIsGeneratingImages(false);
              setGlobalTaskMessage(null);
            } else {
              const progress = statusRes.data?.progress;
              if (progress) {
                setGlobalTaskMessage(`正在生成配图 (${progress.completed}/${progress.total})...`);
              }
              setTimeout(pollImageStatus, 3000);
            }
          } catch (e) {
            setTimeout(pollImageStatus, 5000);
          }
        };
        
        pollImageStatus();
      }
    } catch (error: any) {
      console.error('生成配图失败:', error);
      show({ message: error.message || '生成配图失败', type: 'error' });
      setIsGeneratingImages(false);
      setGlobalTaskMessage(null);
    }
  }, [projectId, imageSlots, show]);
  
  // 步骤5：导出
  const handleExportPptx = useCallback(async () => {
    if (!projectId) return;
    
    setIsExporting(true);
    setGlobalTaskMessage('正在导出 PPTX...');
    
    try {
      const response = await api.exportTemplatePptx(projectId, selectedTemplate);
      
      if (response.data?.download_url) {
        window.open(response.data.download_url, '_blank');
        setCompletedSteps(prev => new Set([...prev, 'export']));
        show({ message: '导出成功！', type: 'success' });
      }
    } catch (error: any) {
      console.error('导出失败:', error);
      show({ message: error.message || '导出失败', type: 'error' });
    } finally {
      setIsExporting(false);
      setGlobalTaskMessage(null);
    }
  }, [projectId, selectedTemplate, show]);
  
  // ===================== 其他处理函数 =====================
  
  const handleRatioChange = (value: number) => {
    setPracticeRatio(value);
  };
  
  const handleRegenerateSingleImage = useCallback(async (slotId: string) => {
    if (!projectId || isAnyTaskRunning) return;
    
    const slot = imageSlots.find(s => s.slot_id === slotId);
    if (!slot) return;
    
    const confirmed = confirm('单图重绘将独立计费，是否继续？');
    if (!confirmed) return;
    
    setRegeneratingSlotId(slotId);
    try {
      const response = await api.regenerateSingleSlot(projectId, slotId, slot);
      if (response.data?.task_id) {
        const { updateSlotStatus } = useVocationalStore.getState();
        updateSlotStatus(slotId, 'generating');
        show({ message: '单图重绘任务已启动', type: 'success' });
      }
    } catch (error: any) {
      show({ message: error.message || '重绘失败', type: 'error' });
    } finally {
      setRegeneratingSlotId(null);
    }
  }, [projectId, imageSlots, isAnyTaskRunning, show]);
  
  const handleUploadSlotImage = useCallback(async (slotId: string, file: File) => {
    if (!projectId || isAnyTaskRunning) return;
    
    try {
      const response = await api.uploadSlotImage(projectId, slotId, file);
      if (response.data?.image_url) {
        const { updateSlotStatus } = useVocationalStore.getState();
        updateSlotStatus(slotId, 'uploaded', response.data.image_url);
        show({ message: '图片已上传', type: 'success' });
      }
    } catch (error: any) {
      show({ message: error.message || '上传失败', type: 'error' });
    }
  }, [projectId, isAnyTaskRunning, show]);
  
  // ===================== 渲染 =====================
  
  // 获取当前步骤的主要操作按钮
  const renderMainAction = () => {
    const hasOutline = pages.length > 0 && pages.some(p => p.title);
    // 检查描述是否已生成
    const hasDescriptions = currentProject?.pages?.some((p: any) => p.description_content);
    
    switch (currentStep) {
      case 'outline':
        return (
          <Button
            size="lg"
            icon={isGeneratingOutline ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            onClick={() => handleGenerateOutline(!hasOutline)}
            disabled={isAnyTaskRunning}
            className="px-8"
          >
            {isGeneratingOutline ? '生成中...' : hasOutline ? '重新生成大纲' : '开始生成大纲'}
          </Button>
        );
      
      case 'descriptions':
        // 如果描述已生成，显示不同的按钮组合
        if (hasDescriptions) {
          return (
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant="secondary"
                icon={isGeneratingDescriptions ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                onClick={handleGenerateDescriptions}
                disabled={isAnyTaskRunning || !hasOutline}
              >
                {isGeneratingDescriptions ? '生成中...' : '重新生成描述'}
              </Button>
              <Button
                size="lg"
                icon={<ChevronRight size={20} />}
                onClick={() => setCurrentStep('images')}
                disabled={isAnyTaskRunning}
                className="px-8"
              >
                继续生成配图
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              icon={isGeneratingDescriptions ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
              onClick={handleGenerateDescriptions}
              disabled={isAnyTaskRunning || !hasOutline}
              className="px-8"
            >
              {isGeneratingDescriptions ? '生成中...' : '生成页面描述'}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              icon={<ChevronRight size={20} />}
              onClick={() => setCurrentStep('images')}
              disabled={isAnyTaskRunning}
            >
              跳过，直接生成配图
            </Button>
          </div>
        );
      
      case 'images':
        return (
          <Button
            size="lg"
            icon={isGeneratingImages ? <Loader2 size={20} className="animate-spin" /> : <Image size={20} />}
            onClick={handleGenerateImages}
            disabled={isAnyTaskRunning || imageSlots.length === 0}
            className="px-8"
          >
            {isGeneratingImages ? '生成中...' : '生成配图'}
          </Button>
        );
      
      case 'export':
        return (
          <Button
            size="lg"
            icon={isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            onClick={handleExportPptx}
            disabled={isAnyTaskRunning}
            className="px-8"
          >
            {isExporting ? '导出中...' : '导出 PPTX'}
          </Button>
        );
    }
  };
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:render',message:'Component rendering',data:{pagesCount:pages.length,currentStep,isAnyTaskRunning,previewMode,hasCurrentProject:!!currentProject},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 全局加载遮罩 */}
      {isAnyTaskRunning && globalTaskMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">正在处理中</h3>
            <p className="text-gray-600">{globalTaskMessage}</p>
            <p className="text-sm text-gray-400 mt-4">请勿关闭页面或进行其他操作</p>
          </div>
        </div>
      )}
      
      {/* 顶部栏 */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/')}
            disabled={isAnyTaskRunning}
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
          <Button variant="ghost" size="sm" icon={<Settings size={16} />} disabled={isAnyTaskRunning}>
            设置
          </Button>
          <Button variant="ghost" size="sm" icon={<HelpCircle size={16} />}>
            帮助
          </Button>
        </div>
      </header>
      
      {/* 步骤指示器 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = currentStep === step.id;
              // 允许点击：已完成的步骤 OR 第一个步骤 OR 前一个步骤已完成
              const isClickable = !isAnyTaskRunning && (isCompleted || 
                (index === 0) ||
                (index > 0 && completedSteps.has(WORKFLOW_STEPS[index - 1].id)));
              
              // #region agent log
              if (step.id === 'outline' || step.id === 'descriptions') {
                fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:nav:render',message:'Nav button render',data:{stepId:step.id,index,isCompleted,isCurrent,isClickable,isAnyTaskRunning,completedStepsArray:Array.from(completedSteps)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'NAV'})}).catch(()=>{});
              }
              // #endregion
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7243/ingest/01d1cac3-0eb2-4c61-bad6-08450f86d57b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VocationalEditor.tsx:nav:click',message:'Nav button clicked',data:{stepId:step.id,isClickable,willChange:isClickable},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'NAV'})}).catch(()=>{});
                      // #endregion
                      if (isClickable) setCurrentStep(step.id);
                    }}
                    disabled={!isClickable}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isCurrent 
                        ? 'bg-blue-100 text-blue-700' 
                        : isCompleted 
                          ? 'text-green-700 hover:bg-green-50' 
                          : 'text-gray-400'
                    } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      </div>
                    ) : (
                      <Circle size={20} />
                    )}
                    <span className="font-medium text-sm hidden sm:inline">{step.label}</span>
                  </button>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight size={16} className="text-gray-300 hidden sm:block" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧配置面板 */}
        <aside className={`w-80 bg-white border-r border-gray-200 overflow-y-auto shrink-0 ${isAnyTaskRunning ? 'pointer-events-none opacity-60' : ''}`}>
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
                  disabled={isAnyTaskRunning}
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
                  onClick={() => !isAnyTaskRunning && setShowPedagogyModal(true)}
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
                totalPages={pages.length > 0 ? pages.length : 10}
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
                  disabled={isAnyTaskRunning}
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
                  onClick={() => !isAnyTaskRunning && setShowTemplateModal(true)}
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
                    disabled={isAnyTaskRunning}
                  >
                    添加
                  </Button>
                </div>
              </div>
              
              {pages.length === 0 ? (
                <Card className="p-6 border-dashed text-center">
                  <Sparkles size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm mb-4">还没有大纲内容</p>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateOutline(false)}
                    disabled={isAnyTaskRunning}
                    icon={isGeneratingOutline ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  >
                    {isGeneratingOutline ? '生成中...' : '点击生成大纲'}
                  </Button>
                </Card>
              ) : (
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
              )}
            </section>
          </div>
        </aside>
        
        {/* 右侧预览区域 */}
        <main className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
          {/* 预览模式切换栏 */}
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode('cards')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  previewMode === 'cards'
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutGrid size={16} />
                卡片视图
              </button>
              <button
                onClick={() => setPreviewMode('html')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  previewMode === 'html'
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Monitor size={16} />
                模板预览
              </button>
            </div>
            
            {/* 页码信息 */}
            <div className="text-sm text-gray-500">
              第 {currentPageIndex + 1} / {pages.length || 0} 页
            </div>
          </div>
          
          {/* 当前步骤提示条 */}
          <div className={`px-4 py-2 border-b transition-all ${
            currentStep === 'outline' ? 'bg-blue-50 border-blue-200' :
            currentStep === 'descriptions' ? 'bg-purple-50 border-purple-200' :
            currentStep === 'images' ? 'bg-green-50 border-green-200' :
            'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  currentStep === 'outline' ? 'text-blue-700' :
                  currentStep === 'descriptions' ? 'text-purple-700' :
                  currentStep === 'images' ? 'text-green-700' :
                  'text-orange-700'
                }`}>
                  {WORKFLOW_STEPS.find(s => s.id === currentStep)?.label}
                </span>
                <span className="text-xs text-gray-500">
                  {WORKFLOW_STEPS.find(s => s.id === currentStep)?.description}
                </span>
              </div>
              {/* 步骤进度指示 */}
              <div className="flex items-center gap-1">
                {WORKFLOW_STEPS.map((step, idx) => (
                  <div 
                    key={step.id}
                    className={`w-2 h-2 rounded-full transition-all ${
                      completedSteps.has(step.id) ? 'bg-green-500' :
                      currentStep === step.id ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-300'
                    }`}
                    title={step.label}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* 预览内容 */}
          <div className="flex-1 overflow-hidden">
            {previewMode === 'cards' ? (
              <PageCardPreview
                pages={pages.map(page => {
                  const projectPage = currentProject?.pages?.find(p => p.id === page.id || p.page_id === page.id);
                  const descContent = projectPage?.description_content;
                  // description_content 是对象，需要提取 text 字段
                  const descText = descContent 
                    ? (typeof descContent === 'string' ? descContent : (descContent as any).text || '')
                    : '';
                  return {
                    ...page,
                    hasDescription: !!descContent,
                    description: descText.slice(0, 100),
                  };
                })}
                currentPageIndex={currentPageIndex}
                onSelectPage={setCurrentPageIndex}
              />
            ) : (
              <div className="h-full p-4">
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
            )}
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
      
      {/* 底部工具栏 - 显示当前步骤和主要操作 */}
      <footer className="h-20 bg-white border-t border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-500">当前步骤：</span>
            <span className="font-medium text-gray-900 ml-1">
              {WORKFLOW_STEPS.find(s => s.id === currentStep)?.label}
            </span>
          </div>
          <div className="text-xs text-gray-400 max-w-xs">
            {WORKFLOW_STEPS.find(s => s.id === currentStep)?.description}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 重新生成大纲（始终可见） */}
          {pages.length > 0 && currentStep !== 'outline' && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={() => handleGenerateOutline(true)}
              disabled={isAnyTaskRunning}
            >
              重新生成大纲
            </Button>
          )}
          
          {/* 刷新预览按钮 */}
          {previewUrl && (
            <Button
              variant="ghost"
              size="sm"
              icon={isLoadingPreview ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              onClick={handleGeneratePreview}
              disabled={isAnyTaskRunning || !selectedPedagogy || !selectedTemplate}
            >
              刷新预览
            </Button>
          )}
          
          {/* 主要操作按钮 */}
          {renderMainAction()}
        </div>
      </footer>
      
      {/* 教学法选择弹窗 */}
      {showPedagogyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[800px] max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">选择教学法</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowPedagogyModal(false)}>
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
              <Button variant="ghost" size="sm" onClick={() => setShowTemplateModal(false)}>
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
