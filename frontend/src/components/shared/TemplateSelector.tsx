import React, { useState, useEffect } from 'react';
import { Button, useToast, MaterialSelector } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import { listUserTemplates, uploadUserTemplate, deleteUserTemplate, type UserTemplate } from '@/api/endpoints';
import { materialUrlToFile } from '@/components/shared/MaterialSelector';
import type { Material } from '@/api/endpoints';
import { ImagePlus, X, ChevronLeft, ChevronRight } from 'lucide-react';


interface TemplateSelectorProps {
  onSelect: (templateFile: File | null, templateId?: string) => void;
  selectedTemplateId?: string | null;
  showUpload?: boolean; // 是否显示上传到用户模板库的选项
  projectId?: string | null; // 项目ID，用于素材选择器
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  selectedTemplateId,
  showUpload = true,
  projectId,
}) => {
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isLoadingUserTemplates, setIsLoadingUserTemplates] = useState(false);
  // 用户模板分页状态
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(0);
  const [userHasNext, setUserHasNext] = useState(false);
  const [userHasPrev, setUserHasPrev] = useState(false);
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [saveToLibrary, setSaveToLibrary] = useState(true); // 上传模板时是否保存到模板库（默认勾选）
  const { show, ToastContainer } = useToast();

  // 加载用户模板列表
  useEffect(() => {
    loadUserTemplates();
  }, []);

  // 加载用户模板（支持分页）
  const loadUserTemplates = async (page: number = 1) => {
    setIsLoadingUserTemplates(true);
    try {
      const response = await listUserTemplates(page, 8); // 每页8个，即2行x4列，user_id从cookie获取
      if (response.data?.templates && response.data?.pagination) {
        const { templates, pagination } = response.data;
        setUserTemplates(templates);
        // 更新用户模板分页信息
        setUserCurrentPage(pagination.page);
        setUserTotalPages(pagination.total_pages);
        setUserHasNext(pagination.has_next);
        setUserHasPrev(pagination.has_prev);
      }
    } catch (error: any) {
      console.error('加载用户模板失败:', error);
      show({ message: '加载用户模板失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setIsLoadingUserTemplates(false);
    }
  };
  
  // 用户模板上一页
  const handleUserPrevPage = () => {
    if (userHasPrev && userCurrentPage > 1) {
      loadUserTemplates(userCurrentPage - 1);
    }
  };
  
  // 用户模板下一页
  const handleUserNextPage = () => {
    if (userHasNext) {
      loadUserTemplates(userCurrentPage + 1);
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (showUpload) {
          // 主页模式：直接上传到用户模板库
          const response = await uploadUserTemplate(file);
          if (response.data) {
            const template = response.data;
            // 重新加载第一页（新上传的模板会出现在第一页）
            loadUserTemplates(1);
            onSelect(null, template.template_id);
            show({ message: '模板上传成功', type: 'success' });
          }
        } else {
          // 预览页模式：根据 saveToLibrary 状态决定是否保存到模板库
          if (saveToLibrary) {
            // 保存到模板库并应用
            const response = await uploadUserTemplate(file);
            if (response.data) {
              const template = response.data;
              // 重新加载第一页（新上传的模板会出现在第一页）
              loadUserTemplates(1);
              onSelect(file, template.template_id);
              show({ message: '模板已保存到模板库', type: 'success' });
            }
          } else {
            // 仅应用到项目
            onSelect(file);
          }
        }
      } catch (error: any) {
        console.error('上传模板失败:', error);
        show({ message: '模板上传失败: ' + (error.message || '未知错误'), type: 'error' });
      }
    }
    // 清空 input，允许重复选择同一文件
    e.target.value = '';
  };

  const handleSelectUserTemplate = (template: UserTemplate) => {
    // 立即更新选择状态（不加载File，提升响应速度）
    onSelect(null, template.template_id);
  };

  const handleSelectMaterials = async (materials: Material[], saveAsTemplate?: boolean) => {
    if (materials.length === 0) return;
    
    try {
      // 将第一个素材转换为File对象
      const file = await materialUrlToFile(materials[0]);
      
      // 根据 saveAsTemplate 参数决定是否保存到模板库
      if (saveAsTemplate) {
        // 保存到用户模板库
        const response = await uploadUserTemplate(file);
        if (response.data) {
          const template = response.data;
          // 重新加载第一页（新上传的模板会出现在第一页）
          loadUserTemplates(1);
          // 传递文件和模板ID，适配不同的使用场景
          onSelect(file, template.template_id);
          show({ message: '素材已保存到模板库', type: 'success' });
        }
      } else {
        // 仅作为模板使用
        onSelect(file);
        show({ message: '已从素材库选择作为模板', type: 'success' });
      }
    } catch (error: any) {
      console.error('加载素材失败:', error);
      show({ message: '加载素材失败: ' + (error.message || '未知错误'), type: 'error' });
    }
  };

  const handleDeleteUserTemplate = async (template: UserTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTemplateId === template.template_id) {
      show({ message: '当前使用中的模板不能删除，请先取消选择或切换', type: 'info' });
      return;
    }
    setDeletingTemplateId(template.template_id);
    try {
      await deleteUserTemplate(template.template_id);
      // 删除后重新加载当前页
      loadUserTemplates(userCurrentPage);
      show({ message: '模板已删除', type: 'success' });
    } catch (error: any) {
      console.error('删除模板失败:', error);
      show({ message: '删除模板失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setDeletingTemplateId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* 用户已保存的模板 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">我的模板</h4>
          {isLoadingUserTemplates ? (
            <div className="text-sm text-gray-500 py-4">加载中...</div>
          ) : (
            <div>
              {/* 模板网格：2行4列 */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                {/* 用户已保存的模板 */}
                {userTemplates.map((template) => (
                  <div
                    key={template.template_id}
                    onClick={() => handleSelectUserTemplate(template)}
                    className={`h-32 rounded-lg border-2 border-gray-900 cursor-pointer transition-all relative group overflow-hidden ${
                      selectedTemplateId === template.template_id
                        ? 'shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]'
                        : 'hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    <img
                      src={getImageUrl(template.template_image_url)}
                      alt={template.name || 'Template'}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* 删除按钮：仅用户模板，且未被选中时显示（常显） */}
                    {selectedTemplateId !== template.template_id && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteUserTemplate(template, e)}
                        disabled={deletingTemplateId === template.template_id}
                        className={`absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity ${
                          deletingTemplateId === template.template_id ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        aria-label="删除模板"
                      >
                        <X size={12} />
                      </button>
                    )}
                    {selectedTemplateId === template.template_id && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-banana-600/70 to-banana-400/35 flex items-center justify-center pointer-events-none">
                        <span className="text-white font-semibold text-sm tracking-wide">已选择</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 上传新模板 */}
                <label className="h-32 rounded-lg border-2 border-dashed border-gray-900 hover:border-banana-500 bg-white cursor-pointer transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-2xl text-banana-600">+</span>
                  <span className="text-sm text-slate-600">上传模板</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTemplateUpload}
                    className="hidden"
                    disabled={isLoadingUserTemplates}
                  />
                </label>
              </div>
              
              {/* 用户模板分页按钮 */}
              {userTotalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleUserPrevPage}
                    disabled={!userHasPrev || isLoadingUserTemplates}
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg border transition-all ${
                      userHasPrev && !isLoadingUserTemplates
                        ? 'border-gray-300 hover:border-banana-500 hover:bg-banana-50 text-gray-700'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeft size={16} />
                    <span>上一页</span>
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    第 {userCurrentPage} / {userTotalPages} 页
                  </span>
                  
                  <button
                    onClick={handleUserNextPage}
                    disabled={!userHasNext || isLoadingUserTemplates}
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg border transition-all ${
                      userHasNext && !isLoadingUserTemplates
                        ? 'border-gray-300 hover:border-banana-500 hover:bg-banana-50 text-gray-700'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>下一页</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 在预览页显示：上传模板时是否保存到模板库的选项 */}
        {!showUpload && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="w-4 h-4 text-banana-500 border-slate-300 rounded focus:ring-banana-500"
              />
              <span className="text-sm text-slate-700">
                上传模板时同时保存到我的模板库
              </span>
            </label>
          </div>
        )}

        {/* 从素材库选择作为模板 */}
        {projectId && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">从素材库选择</h4>
            <Button
              variant="secondary"
              size="sm"
              icon={<ImagePlus size={16} />}
              onClick={() => setIsMaterialSelectorOpen(true)}
              className="w-full"
            >
              从素材库选择作为模板
            </Button>
          </div>
        )}
      </div>
      <ToastContainer />
      {/* 素材选择器 */}
      {projectId && (
        <MaterialSelector
          projectId={projectId}
          isOpen={isMaterialSelectorOpen}
          onClose={() => setIsMaterialSelectorOpen(false)}
          onSelect={handleSelectMaterials}
          multiple={false}
          showSaveAsTemplateOption={true}
        />
      )}
    </>
  );
};

/**
 * 根据模板ID获取模板File对象（按需加载）
 * @param templateId 模板ID
 * @param userTemplates 用户模板列表
 * @returns Promise<File | null>
 */
export const getTemplateFile = async (
  templateId: string,
  userTemplates: UserTemplate[]
): Promise<File | null> => {
  // 检查是否是用户模板
  const userTemplate = userTemplates.find(t => t.template_id === templateId);
  if (userTemplate) {
    try {
      const imageUrl = getImageUrl(userTemplate.template_image_url);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new File([blob], 'template.png', { type: blob.type });
    } catch (error) {
      console.error('加载用户模板失败:', error);
      return null;
    }
  }

  return null;
};
