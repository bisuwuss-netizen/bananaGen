import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, Sparkles, Home } from 'lucide-react';
import { Button, Loading, useToast, useConfirm, AiRefineSidebar, FilePreviewModal, ProjectResourcesList } from '@/components/shared';
import { DescriptionCard } from '@/components/preview/DescriptionCard';
import { useProjectStore } from '@/store/useProjectStore';
import { refineDescriptions } from '@/api/endpoints';

export const DetailEditor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const fromHistory = (location.state as any)?.from === 'history';
  const {
    currentProject,
    syncProject,
    updatePageLocal,
    flushPendingUpdates,
    generateDescriptions,
    generatePageDescription,
    pageDescriptionGeneratingTasks,
    aiRefineHistory,
    setAiRefineHistory,
  } = useProjectStore();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isAiRefining, setIsAiRefining] = React.useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);

  // 加载项目数据
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      // 直接使用 projectId 同步项目数据
      syncProject(projectId);
    } else if (projectId && currentProject && currentProject.id === projectId) {
      // 如果项目已存在，也同步一次以确保数据是最新的（特别是从描述生成后）
      // 但只在首次加载时同步，避免频繁请求
      const shouldSync = !currentProject.pages.some(p => p.description_content);
      if (shouldSync) {
        syncProject(projectId);
      }
    }
  }, [projectId, currentProject?.id]); // 只在 projectId 或项目ID变化时更新

  // 内容生成中时自动关闭 AI 修改侧边栏
  const isGeneratingAny = Object.keys(pageDescriptionGeneratingTasks).length > 0;
  useEffect(() => {
    if (isGeneratingAny && isAiSidebarOpen) {
      setIsAiSidebarOpen(false);
    }
  }, [isGeneratingAny]);

  const redirectHomepage = () => {
    window.redirect_homepage?.({
      request: '',
      persistent: false,
      onSuccess: function(response: any) {
        console.log('返回成功:', response);
      },
      onFailure: function(_error_code: any, error_message: any) {
        console.error("window.redirect_homepage 请求失败:", error_message);
        alert('返回失败: ' + error_message);
      }
    });
  };

  const handleGenerateAll = async () => {
    const hasDescriptions = currentProject?.pages.some(
      (p) => p.description_content
    );
    
    const executeGenerate = async () => {
      await generateDescriptions();
    };
    
    if (hasDescriptions) {
      confirm(
        '部分页面已有描述，重新生成将覆盖，确定继续吗？',
        executeGenerate,
        { title: '确认重新生成', variant: 'warning' }
      );
    } else {
      await executeGenerate();
    }
  };

  const handleRegeneratePage = async (pageId: string) => {
    if (!currentProject) return;
    
    const page = currentProject.pages.find((p) => p.id === pageId);
    if (!page) return;
    
    // 如果已有描述，询问是否覆盖
    if (page.description_content) {
      confirm(
        '该页面已有描述，重新生成将覆盖现有内容，确定继续吗？',
        async () => {
          try {
            await generatePageDescription(pageId);
            show({ message: '生成成功', type: 'success' });
          } catch (error: any) {
            show({ 
              message: `生成失败: ${error.message || '未知错误'}`, 
              type: 'error' 
            });
          }
        },
        { title: '确认重新生成', variant: 'warning' }
      );
      return;
    }
    
    try {
      await generatePageDescription(pageId);
      show({ message: '生成成功', type: 'success' });
    } catch (error: any) {
      show({ 
        message: `生成失败: ${error.message || '未知错误'}`, 
        type: 'error' 
      });
    }
  };

  const handleAiRefineDescriptions = useCallback(async (requirement: string, previousRequirements: string[]) => {
    if (!currentProject || !projectId) return '';
    
    try {
      const response = await refineDescriptions(projectId, requirement, previousRequirements);
      await syncProject(projectId);
      const summary = response.data?.summary || '页面描述修改成功';
      show({ 
        message: summary, 
        type: 'success' 
      });
      return summary;
    } catch (error: any) {
      console.error('修改页面描述失败:', error);
      const errorMessage = error?.response?.data?.error?.message 
        || error?.message 
        || '修改失败，请稍后重试';
      show({ message: errorMessage, type: 'error' });
      throw error; // 抛出错误让组件知道失败了
    }
  }, [currentProject, projectId, syncProject, show]);

  if (!currentProject) {
    return <Loading fullscreen message="加载项目中..." />;
  }

  const isHtmlMode = currentProject.render_mode === 'html';
  const hasPages = currentProject.pages.length > 0;

  // 检查是否所有页面都已生成内容（根据模式检查不同字段）
  const hasAllDescriptions = currentProject.pages.every(
    (p) => isHtmlMode ? (p.html_model && Object.keys(p.html_model).length > 0) : p.description_content
  );

  return (
    <div className="app-shell min-h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="app-navbar px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* 左侧：Logo 和标题 */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              icon={<Home size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={redirectHomepage}
              className="text-xs md:text-sm"
            >
              <span className="hidden sm:inline">主页</span>
              <span className="sm:hidden">主页</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={async () => {
                // 先保存所有待保存的更改，再导航
                await flushPendingUpdates();
                if (fromHistory) {
                  navigate('/history');
                } else {
                  navigate(`/project/${projectId}/outline`);
                }
              }}
              className="flex-shrink-0"
            >
              <span className="hidden sm:inline">返回</span>
            </Button>
            {/*<div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-xl md:text-2xl">🍌</span>
              <span className="text-base md:text-xl font-bold">蕉幻</span>
            </div>
            <span className="text-gray-400 hidden lg:inline">|</span>*/}
            <span className="text-sm md:text-lg font-semibold hidden lg:inline">
              {isHtmlMode ? '编辑结构化内容' : '编辑页面描述'}
            </span>
          </div>
          
          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={async () => {
                // 先保存所有待保存的更改，再导航
                await flushPendingUpdates();
                navigate(`/project/${projectId}/outline`);
              }}
              className="hidden md:inline-flex"
            >
              <span className="hidden lg:inline">上一步</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={async () => {
                // 先保存所有待保存的更改，再导航
                await flushPendingUpdates();
                navigate(`/project/${projectId}/preview`);
              }}
              disabled={!hasAllDescriptions}
              className="text-xs md:text-sm"
            >
              <span className="hidden sm:inline">生成PPT</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 操作栏 */}
      <div className="bg-white/75 border-b border-slate-200 px-3 md:px-6 py-3 md:py-4 flex-shrink-0 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <Button
              variant="primary"
              icon={<Sparkles size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={handleGenerateAll}
              className="flex-1 sm:flex-initial text-sm md:text-base"
            >
              {isHtmlMode ? '批量生成内容' : '批量生成描述'}
            </Button>
            <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
              {currentProject.pages.filter((p) => isHtmlMode
                ? (p.html_model && Object.keys(p.html_model).length > 0)
                : p.description_content
              ).length} /{' '}
              {currentProject.pages.length} 页已完成
            </span>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <main className="flex-1 p-3 md:p-6 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto">
          {/* 项目资源列表（文件和图片） */}
          <ProjectResourcesList
            projectId={projectId || null}
            onFileClick={setPreviewFileId}
            showFiles={true}
            showImages={true}
          />
          
          {currentProject.pages.length === 0 ? (
            <div className="text-center py-12 md:py-20">
              <div className="flex justify-center mb-4"><FileText size={48} className="text-gray-300" /></div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
                还没有页面
              </h3>
              <p className="text-sm md:text-base text-gray-500 mb-6">
                请先返回大纲编辑页添加页面
              </p>
              <Button
                variant="primary"
                onClick={async () => {
                  await flushPendingUpdates();
                  navigate(`/project/${projectId}/outline`);
                }}
                className="text-sm md:text-base"
              >
                返回大纲编辑
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {currentProject.pages.map((page, index) => {
                const pageId = page.id || page.page_id;
                return (
                  <DescriptionCard
                    key={pageId}
                    page={page}
                    index={index}
                    onUpdate={(data) => updatePageLocal(pageId, data)}
                    onRegenerate={() => handleRegeneratePage(pageId)}
                    isGenerating={pageId ? !!pageDescriptionGeneratingTasks[pageId] : false}
                    isAiRefining={isAiRefining}
                    isHtmlMode={currentProject.render_mode === 'html'}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
      <ToastContainer />
      {ConfirmDialog}
      <FilePreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />
      
      <AiRefineSidebar
        title={isHtmlMode ? 'AI 修改内容' : 'AI 修改描述'}
        placeholder="例如：让描述更详细、删除第2页的某个要点、强调XXX的重要性..."
        onSubmit={handleAiRefineDescriptions}
        disabled={!hasPages || isGeneratingAny}
        isOpen={isAiSidebarOpen}
        onToggle={setIsAiSidebarOpen}
        onStatusChange={setIsAiRefining}
        history={aiRefineHistory['detail'] || []}
        onHistoryChange={(h) => setAiRefineHistory('detail', h)}
      />
    </div>
  );
};
