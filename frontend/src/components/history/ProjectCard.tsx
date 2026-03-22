import React, { useState, useEffect } from 'react';
import { Clock, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { Card } from '@/components/shared';
import { SlideRenderer } from '@/experimental/html-renderer/components/SlideRenderer';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';
import type { PagePayload } from '@/experimental/html-renderer/types/schema';
import { normalizeLayoutId } from '@/experimental/html-renderer/layouts';
import {
  getProjectTitle,
  getFirstPageImage,
  getPreviewPage,
  formatDate,
  getStatusText,
  getStatusColor,
  getProjectSchemeName,
  getProjectSchemeDescription,
  getProjectFailureReason,
} from '@/utils/projectUtils';
import type { Project } from '@/types';

export interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: (project: Project) => void;
  onToggleSelect: (projectId: string) => void;
  onDelete: (e: React.MouseEvent, project: Project) => void;
  onStartEdit: (e: React.MouseEvent, project: Project) => void;
  onTitleChange: (title: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent, projectId: string) => void;
  onSaveEdit: (projectId: string) => void;
  isBatchMode: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  isEditing,
  editingTitle,
  onSelect,
  onToggleSelect,
  onDelete,
  onStartEdit,
  onTitleChange,
  onTitleKeyDown,
  onSaveEdit,
  isBatchMode,
}) => {
  // 检测屏幕尺寸，只在非手机端加载图片（必须在早期返回之前声明hooks）
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      // sm breakpoint is 640px
      setShouldLoadImage(window.innerWidth >= 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const projectId = project.id || project.project_id;
  if (!projectId) return null;

  const title = getProjectTitle(project);
  const pageCount = project.pages?.length || 0;
  const statusText = getStatusText(project);
  const statusColor = getStatusColor(project);
  const schemeName = getProjectSchemeName(project);
  const schemeDescription = getProjectSchemeDescription(project);
  const failureReason = getProjectFailureReason(project);
  const previewPage = getPreviewPage(project);
  const firstPageImage = shouldLoadImage ? getFirstPageImage(project) : null;
  const htmlTheme = getThemeByScheme(project.scheme_id);
  const canRenderHtmlPreview = Boolean(
    shouldLoadImage &&
    project.render_mode === 'html' &&
    previewPage?.layout_id &&
    previewPage.html_model
  );
  const isDesktopPreview = typeof window !== 'undefined' && window.innerWidth >= 768;
  const previewScale = isDesktopPreview ? 0.2 : 0.125;
  const previewFrameWidth = htmlTheme.sizes.slideWidth * previewScale;
  const previewFrameHeight = htmlTheme.sizes.slideHeight * previewScale;
  const previewPayload: PagePayload | null = canRenderHtmlPreview && previewPage?.layout_id && previewPage.html_model
    ? {
        page_id: previewPage.id || previewPage.page_id,
        order_index: previewPage.order_index,
        layout_id: normalizeLayoutId(previewPage.layout_id) as PagePayload['layout_id'],
        model: previewPage.html_model,
      }
    : null;

  return (
    <Card
      className={`p-3 md:p-6 transition-all ${
        isSelected ? 'bg-[#f5d040]' : 'hover:bg-gray-50'
      } ${isBatchMode ? 'cursor-default' : 'cursor-pointer'}`}
      style={{ boxShadow: '4px 4px 0 #1a1a1a' }}
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start gap-3 md:gap-4">
        {/* 复选框 */}
        <div className="pt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(projectId)}
            className="w-4 h-4 text-banana-600 border-gray-300 rounded focus:ring-banana-500 cursor-pointer"
          />
        </div>
        
        {/* 中间：项目信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={(e) => onTitleKeyDown(e, projectId)}
                onBlur={() => onSaveEdit(projectId)}
                autoFocus
                className="text-base md:text-lg font-semibold text-gray-900 px-2 py-1 border border-banana-500 rounded focus:outline-none focus:ring-2 focus:ring-banana-500 flex-1 min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 
                className={`text-base md:text-lg font-semibold text-gray-900 truncate flex-1 min-w-0 ${
                  isBatchMode 
                    ? 'cursor-default' 
                    : 'cursor-pointer hover:text-banana-500 transition-colors'
                }`}
                onClick={(e) => onStartEdit(e, project)}
                title={isBatchMode ? undefined : "点击编辑名称"}
              >
                {title}
              </h3>
            )}
            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap flex-shrink-0 ${statusColor}`}>
              {statusText}
            </span>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <FileText size={14} />
              {pageCount} 页
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatDate(project.updated_at || project.created_at)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border-2 border-gray-900 bg-[#f5d040] px-2 py-0.5 text-xs font-bold text-gray-900">
              {schemeName}
            </span>
            <span className="inline-flex items-center rounded-md border border-gray-400 px-2 py-0.5 text-xs font-medium text-gray-600">
              {project.render_mode === 'html' ? 'HTML 渲染' : '图片渲染'}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-xs md:text-sm text-gray-500">
            {schemeDescription}
          </p>
          {failureReason ? (
            <p className="mt-2 max-w-2xl text-xs md:text-sm text-red-600">
              失败原因: {failureReason}
            </p>
          ) : null}
        </div>
        
        {/* 右侧：图片预览 */}
        <div className="hidden sm:block w-40 h-24 md:w-64 md:h-36 rounded-md overflow-hidden bg-gray-100 border-2 border-gray-900 flex-shrink-0">
          {canRenderHtmlPreview && previewPayload ? (
            <div
              className="w-full h-full flex items-center justify-center bg-white overflow-hidden"
              data-testid="project-html-preview"
            >
              <div
                data-testid="project-html-preview-frame"
                style={{
                  width: previewFrameWidth,
                  height: previewFrameHeight,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <SlideRenderer page={previewPayload} theme={htmlTheme} scale={previewScale} />
              </div>
            </div>
          ) : firstPageImage ? (
            <img
              src={firstPageImage}
              alt="第一页预览"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400" data-testid="project-preview-placeholder">
              <FileText size={20} className="md:w-6 md:h-6" />
            </div>
          )}
        </div>
        
        {/* 右侧：操作按钮 */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={(e) => onDelete(e, project)}
            className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-md border-2 border-gray-900 transition-colors"
            title="删除项目"
          >
            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
          <ChevronRight size={18} className="text-gray-400 md:w-5 md:h-5" />
        </div>
      </div>
    </Card>
  );
};
