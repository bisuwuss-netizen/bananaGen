import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  Sparkles,
  FileText,
  FileEdit,
  ImagePlus,
  Paperclip,
  Palette,
  Lightbulb,
  Eye,
  BookOpen,
} from 'lucide-react';
import { Button, Textarea, Card, useToast, MaterialGeneratorModal, ReferenceFileList, ReferenceFileSelector, FilePreviewModal, ImagePreviewList } from '@/components/shared';
import { TemplateSelector, getTemplateFile } from '@/components/shared/TemplateSelector';
import { SchemeSelector } from '@/components/shared';
import { listUserTemplates, type UserTemplate, uploadReferenceFile, type ReferenceFile, associateFileToProject, triggerFileParse, uploadMaterial, associateMaterialsToProject } from '@/api/endpoints';
import { useProjectStore } from '@/store/useProjectStore';
import { getPresetStyles, type PresetStyle } from '@/config/presetStyles';
import { HomeCharactersPromptStage } from '@/features/home-characters';

type CreationType = 'idea' | 'outline';

// ── 模块级代码：仅在整页加载（刷新/外部导航）时执行 ──
// SPA 内导航（如从大纲页回退）不会重新执行模块级代码，sessionStorage 保持不变
sessionStorage.removeItem('home_content');
sessionStorage.removeItem('home_activeTab');
sessionStorage.removeItem('home_selectedSchemeId');
sessionStorage.removeItem('home_lastSubmission');
// 标记本次是否为整页刷新，供组件 mount 时决定是否清除项目状态
let _homeFreshPageLoad = true;

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { initializeProject, isGlobalLoading, setCurrentProject, currentProject } = useProjectStore();
  const { show, ToastContainer } = useToast();

  // 从 sessionStorage 恢复首页表单状态（SPA 回退时有值，刷新时为空）
  const [activeTab, setActiveTab] = useState<CreationType>(() => {
    const saved = sessionStorage.getItem('home_activeTab');
    return (saved as CreationType) || 'idea';
  });
  const [content, setContent] = useState(() => {
    return sessionStorage.getItem('home_content') || '';
  });

  const [selectedTemplate, setSelectedTemplate] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(() => {
    return sessionStorage.getItem('home_selectedSchemeId') || 'edu_dark';
  });
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [useTemplateStyle, setUseTemplateStyle] = useState(false);
  const [templateStyle, setTemplateStyle] = useState('');
  const [presetStyles, setPresetStyles] = useState<PresetStyle[]>([]);
  const [isLoadingPresetStyles, setIsLoadingPresetStyles] = useState(false);
  const [renderMode, setRenderMode] = useState<'image' | 'html'>(() => {
    const saved = sessionStorage.getItem('home_renderMode');
    return saved === 'image' ? 'image' : 'html';
  });
  const [activePresetPreview, setActivePresetPreview] = useState<PresetStyle | null>(null);
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const presetPreviewTriggerRef = useRef<HTMLButtonElement | null>(null);

  // 将关键表单状态持久化到 sessionStorage，SPA 回退时可恢复
  useEffect(() => {
    sessionStorage.setItem('home_content', content);
  }, [content]);

  useEffect(() => {
    sessionStorage.setItem('home_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('home_selectedSchemeId', selectedSchemeId);
  }, [selectedSchemeId]);

  // 整页刷新时重置项目状态（SPA 回退时跳过）
  useEffect(() => {
    if (_homeFreshPageLoad) {
      _homeFreshPageLoad = false;
      localStorage.removeItem('currentProjectId');
      setCurrentProject(null);
    }
  }, [setCurrentProject]);

  useEffect(() => {
    sessionStorage.setItem('home_renderMode', renderMode);
  }, [renderMode]);

  // 如果调试按钮被隐藏，但当前是 image 模式，自动切换回 html 模式
  useEffect(() => {
    if (import.meta.env.VITE_SHOW_DEBUG_BUTTONS !== 'true' && renderMode === 'image') {
      setRenderMode('html');
    }
    // 注意：此 effect 只在组件挂载时运行一次，避免循环更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 检查是否有当前项目 & 加载用户模板 & 加载预设风格
  useEffect(() => {
    const projectId = localStorage.getItem('currentProjectId');
    setCurrentProjectId(projectId);
    
    // 加载用户模板列表（用于按需获取File）
    const loadTemplates = async () => {
      try {
        const response = await listUserTemplates();
        if (response.data?.templates) {
          setUserTemplates(response.data.templates);
        }
      } catch (error) {
        console.error('加载用户模板失败:', error);
      }
    };
    loadTemplates();

    // 加载预设风格列表
    const loadPresetStyles = async () => {
      setIsLoadingPresetStyles(true);
      try {
        const styles = await getPresetStyles();
        setPresetStyles(styles);
      } catch (error) {
        console.error('加载预设风格失败:', error);
        setPresetStyles([]);
      } finally {
        setIsLoadingPresetStyles(false);
      }
    };
    loadPresetStyles();
  }, []);

  useEffect(() => {
    if (!activePresetPreview || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activePresetPreview]);

  useEffect(() => {
    if (!activePresetPreview) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePresetPreview(null);
        window.setTimeout(() => {
          presetPreviewTriggerRef.current?.focus();
        }, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePresetPreview]);

  const activePresetStyleId = useMemo(
    () => presetStyles.find((preset) => preset.description === templateStyle)?.id ?? null,
    [presetStyles, templateStyle]
  );

  const applyPresetStyle = (preset: PresetStyle) => {
    setTemplateStyle(preset.description);
  };

  const closePresetPreview = () => {
    setActivePresetPreview(null);
    window.setTimeout(() => {
      presetPreviewTriggerRef.current?.focus();
    }, 0);
  };

  const openPresetPreview = (preset: PresetStyle, button: HTMLButtonElement) => {
    presetPreviewTriggerRef.current = button;
    setActivePresetPreview(preset);
  };

  const handleOpenMaterialModal = () => {
    // 在主页始终生成全局素材，不关联任何项目
    setIsMaterialModalOpen(true);
  };

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

  // 检测粘贴事件，自动上传文件和图片
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    console.log('Paste event triggered');
    const items = e.clipboardData?.items;
    if (!items) {
      console.log('No clipboard items');
      return;
    }

    console.log('Clipboard items:', items.length);
    
    // 检查是否有文件或图片
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`Item ${i}:`, { kind: item.kind, type: item.type });
      
      if (item.kind === 'file') {
        const file = item.getAsFile();
        console.log('Got file:', file);
        
        if (file) {
          console.log('File details:', { name: file.name, type: file.type, size: file.size });
          
          // 检查是否是图片
          if (file.type.startsWith('image/')) {
            console.log('Image detected, uploading...');
            e.preventDefault(); // 阻止默认粘贴行为
            await handleImageUpload(file);
            return;
          }
          
          // 检查文件类型（参考文件）
          const allowedExtensions = ['pdf', 'docx', 'pptx', 'doc', 'ppt', 'xlsx', 'xls', 'csv', 'txt', 'md'];
          const fileExt = file.name.split('.').pop()?.toLowerCase();
          
          console.log('File extension:', fileExt);
          
          if (fileExt && allowedExtensions.includes(fileExt)) {
            console.log('File type allowed, uploading...');
            e.preventDefault(); // 阻止默认粘贴行为
            await handleFileUpload(file);
          } else {
            console.log('File type not allowed');
            show({ message: `不支持的文件类型: ${fileExt}`, type: 'info' });
          }
        }
      }
    }
  };

  // 上传图片
  // 在 Home 页面，图片始终上传为全局素材（不关联项目），因为此时还没有项目
  const handleImageUpload = async (file: File) => {
    if (isUploadingFile) return;

    setIsUploadingFile(true);
    try {
      // 显示上传中提示
      show({ message: '正在上传图片...', type: 'info' });
      
      // 保存当前光标位置
      const cursorPosition = textareaRef.current?.selectionStart || content.length;
      
      // 上传图片到素材库（全局素材）
      const response = await uploadMaterial(file, null);
      
      if (response?.data?.url) {
        const imageUrl = response.data.url;
        
        // 生成markdown图片链接
        const markdownImage = `![image](${imageUrl})`;
        
        // 在光标位置插入图片链接
        setContent(prev => {
          const before = prev.slice(0, cursorPosition);
          const after = prev.slice(cursorPosition);
          
          // 如果光标前有内容且不以换行结尾，添加换行
          const prefix = before && !before.endsWith('\n') ? '\n' : '';
          // 如果光标后有内容且不以换行开头，添加换行
          const suffix = after && !after.startsWith('\n') ? '\n' : '';
          
          return before + prefix + markdownImage + suffix + after;
        });
        
        // 恢复光标位置（移动到插入内容之后）
        setTimeout(() => {
          if (textareaRef.current) {
            const newPosition = cursorPosition + (content.slice(0, cursorPosition) && !content.slice(0, cursorPosition).endsWith('\n') ? 1 : 0) + markdownImage.length;
            textareaRef.current.selectionStart = newPosition;
            textareaRef.current.selectionEnd = newPosition;
            textareaRef.current.focus();
          }
        }, 0);
        
        show({ message: '图片上传成功！已插入到光标位置', type: 'success' });
      } else {
        show({ message: '图片上传失败：未返回图片信息', type: 'error' });
      }
    } catch (error: any) {
      console.error('图片上传失败:', error);
      show({ 
        message: `图片上传失败: ${error?.response?.data?.error?.message || error.message || '未知错误'}`, 
        type: 'error' 
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  // 上传文件
  // 在 Home 页面，文件始终上传为全局文件（不关联项目），因为此时还没有项目
  const handleFileUpload = async (file: File) => {
    if (isUploadingFile) return;

    // 检查文件大小（前端预检查）
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      show({ 
        message: `文件过大：${(file.size / 1024 / 1024).toFixed(1)}MB，最大支持 200MB`, 
        type: 'error' 
      });
      return;
    }

    // 检查是否是PPT文件，提示建议使用PDF
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt === 'ppt' || fileExt === 'pptx') 
      show({  message: '💡 提示：建议将PPT转换为PDF格式上传，可获得更好的解析效果',    type: 'info' });
    
    setIsUploadingFile(true);
    try {
      // 在 Home 页面，始终上传为全局文件
      const response = await uploadReferenceFile(file, null);
      if (response?.data?.file) {
        const uploadedFile = response.data.file;
        setReferenceFiles(prev => [...prev, uploadedFile]);
        show({ message: '文件上传成功', type: 'success' });
        
        // 如果文件状态为 pending，自动触发解析
        if (uploadedFile.parse_status === 'pending') {
          try {
            const parseResponse = await triggerFileParse(uploadedFile.id);
            // 使用解析接口返回的文件对象更新状态
            if (parseResponse?.data?.file) {
              const parsedFile = parseResponse.data.file;
              setReferenceFiles(prev => 
                prev.map(f => f.id === uploadedFile.id ? parsedFile : f)
              );
            } else {
              // 如果没有返回文件对象，手动更新状态为 parsing（异步线程会稍后更新）
              setReferenceFiles(prev => 
                prev.map(f => f.id === uploadedFile.id ? { ...f, parse_status: 'parsing' as const } : f)
              );
            }
          } catch (parseError: any) {
            console.error('触发文件解析失败:', parseError);
            // 解析触发失败不影响上传成功提示
          }
        }
      } else {
        show({ message: '文件上传失败：未返回文件信息', type: 'error' });
      }
    } catch (error: any) {
      console.error('文件上传失败:', error);
      
      // 特殊处理413错误
      if (error?.response?.status === 413) {
        show({ 
          message: `文件过大：${(file.size / 1024 / 1024).toFixed(1)}MB，最大支持 200MB`, 
          type: 'error' 
        });
      } else {
        show({ 
          message: `文件上传失败: ${error?.response?.data?.error?.message || error.message || '未知错误'}`, 
          type: 'error' 
        });
      }
    } finally {
      setIsUploadingFile(false);
    }
  };

  // 从当前项目移除文件引用（不删除文件本身）
  const handleFileRemove = (fileId: string) => {
    setReferenceFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // 文件状态变化回调
  const handleFileStatusChange = (updatedFile: ReferenceFile) => {
    setReferenceFiles(prev => 
      prev.map(f => f.id === updatedFile.id ? updatedFile : f)
    );
  };

  // 点击回形针按钮 - 打开文件选择器
  const handlePaperclipClick = () => {
    setIsFileSelectorOpen(true);
  };

  // 从选择器选择文件后的回调
  const handleFilesSelected = (selectedFiles: ReferenceFile[]) => {
    // 合并新选择的文件到列表（去重）
    setReferenceFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const newFiles = selectedFiles.filter(f => !existingIds.has(f.id));
      // 合并时，如果文件已存在，更新其状态（可能解析状态已改变）
      const updated = prev.map(f => {
        const updatedFile = selectedFiles.find(sf => sf.id === f.id);
        return updatedFile || f;
      });
      return [...updated, ...newFiles];
    });
    show({ message: `已添加 ${selectedFiles.length} 个参考文件`, type: 'success' });
  };

  // 获取当前已选择的文件ID列表，传递给选择器（使用 useMemo 避免每次渲染都重新计算）
  const selectedFileIds = useMemo(() => {
    return referenceFiles.map(f => f.id);
  }, [referenceFiles]);

  // 从编辑框内容中移除指定的图片markdown链接
  const handleRemoveImage = (imageUrl: string) => {
    setContent(prev => {
      // 移除所有匹配该URL的markdown图片链接
      const imageRegex = new RegExp(`!\\[[^\\]]*\\]\\(${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
      let newContent = prev.replace(imageRegex, '');
      
      // 清理多余的空行（最多保留一个空行）
      newContent = newContent.replace(/\n{3,}/g, '\n\n');
      
      return newContent.trim();
    });
    
    show({ message: '已移除图片', type: 'success' });
  };

  // 文件选择变化
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await handleFileUpload(files[i]);
    }

    // 清空 input，允许重复选择同一文件
    e.target.value = '';
  };

  const tabConfig: Record<CreationType, { icon: React.ReactNode; label: string; placeholder: string; description: string }> = {
    idea: {
      icon: <Sparkles size={20} />,
      label: '一句话生成',
      placeholder: '例如：生成一份机电一体化概论的教学课件，适合高职学生...',
      description: '输入课程主题或教学目标，AI 将为你生成完整的教学课件',
    },
    outline: {
      icon: <FileText size={20} />,
      label: '从大纲生成',
      placeholder: '粘贴你的课程大纲...\n\n例如：\n第一章：电气基础知识\n- 电路基本概念\n- 欧姆定律与基尔霍夫定律\n\n第二章：常用电工元件\n- 电阻、电容、电感\n- 低压电器认识与应用\n...',
      description: '已有课程大纲？粘贴后 AI 将自动切分为结构化课件',
    },
  };

  const handleTemplateSelect = async (templateFile: File | null, templateId?: string) => {
    // 总是设置文件（如果提供）
    if (templateFile) {
      setSelectedTemplate(templateFile);
    }
    
    // 处理模板 ID（仅用户模板）
    if (templateId) {
      setSelectedTemplateId(templateId);
    } else {
      // 如果没有 templateId，可能是直接上传的文件
      // 清空所有选择状态
      setSelectedTemplateId(null);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      show({ message: '请输入内容', type: 'error' });
      return;
    }

    // 检查是否有正在解析的文件
    const parsingFiles = referenceFiles.filter(f => 
      f.parse_status === 'pending' || f.parse_status === 'parsing'
    );
    if (parsingFiles.length > 0) {
      show({ 
        message: `还有 ${parsingFiles.length} 个参考文件正在解析中，请等待解析完成`, 
        type: 'info' 
      });
      return;
    }

    try {
      // 如果有模板ID但没有File，按需加载
      let templateFile = selectedTemplate;
      if (!templateFile && selectedTemplateId) {
        templateFile = await getTemplateFile(selectedTemplateId, userTemplates);
      }
      
      // 传递风格描述（HTML 模式不使用模板图片/风格描述）
      const styleDesc =
        renderMode === 'html'
          ? undefined
          : templateStyle.trim()
            ? templateStyle.trim()
            : undefined;

      const schemeId = renderMode === 'html' ? selectedSchemeId : undefined;
      await initializeProject(activeTab, content, templateFile || undefined, styleDesc, renderMode, schemeId);
      
      // 根据类型跳转到不同页面
      // 从 store 中获取项目ID，确保使用最新创建的项目
      const latestProject = useProjectStore.getState().currentProject;
      const projectId = latestProject?.id || localStorage.getItem('currentProjectId');
      if (!projectId) {
        show({ message: '项目创建失败', type: 'error' });
        return;
      }
      
      // 调试日志：记录跳转信息
      console.log('[Home] 准备跳转:', {
        projectId,
        activeTab,
        renderMode,
        creation_type: latestProject?.creation_type,
        has_description_text: !!latestProject?.description_text,
        has_outline_text: !!latestProject?.outline_text,
        has_idea_prompt: !!latestProject?.idea_prompt,
        description_text_preview: latestProject?.description_text?.substring(0, 100) || '无',
      });
      
      // 关联参考文件到项目
      if (referenceFiles.length > 0) {
        console.log(`Associating ${referenceFiles.length} reference files to project ${projectId}:`, referenceFiles);
        try {
          // 批量更新文件的 project_id
          const results = await Promise.all(
            referenceFiles.map(async file => {
              const response = await associateFileToProject(file.id, projectId);
              console.log(`Associated file ${file.id}:`, response);
              return response;
            })
          );
          console.log('Reference files associated successfully:', results);
        } catch (error) {
          console.error('Failed to associate reference files:', error);
          // 不影响主流程，继续执行
        }
      } else {
        console.log('No reference files to associate');
      }
      
      // 关联图片素材到项目（解析content中的markdown图片链接）
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const materialUrls: string[] = [];
      let match;
      while ((match = imageRegex.exec(content)) !== null) {
        materialUrls.push(match[2]); // match[2] 是 URL
      }
      
      if (materialUrls.length > 0) {
        console.log(`Associating ${materialUrls.length} materials to project ${projectId}:`, materialUrls);
        try {
          const response = await associateMaterialsToProject(projectId, materialUrls);
          console.log('Materials associated successfully:', response);
        } catch (error) {
          console.error('Failed to associate materials:', error);
          // 不影响主流程，继续执行
        }
      } else {
        console.log('No materials to associate');
      }


      // 图片模式下，所有类型都跳转到大纲生成页面
      // HTML模式下，从描述生成也跳转到大纲生成页面（因为会生成结构化大纲）
      if (renderMode === 'image') {
        // 图片模式：统一跳转到大纲生成页面
        navigate(`/project/${projectId}/outline`);
      } else {
        // HTML模式（结构化生成）：也统一跳转到大纲生成页面
        navigate(`/project/${projectId}/outline`);
      }
    } catch (error: any) {
      console.error('创建项目失败:', error);
      // 错误已经在 store 中处理并显示
    }
  };

  return (
    <div className="app-shell min-h-screen relative overflow-hidden">
      {/* 背景装饰元素 */}
      {/*<div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-banana-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-yellow-400/5 rounded-full blur-3xl"></div>
      </div>*/}

      {/* 导航栏 */}
      <nav className="app-navbar relative h-16 md:h-18">

        <div className="relative mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Button
                variant="ghost"
                size="sm"
                icon={<HomeIcon size={16} className="md:w-[18px] md:h-[18px]" />}
                onClick={redirectHomepage}
                className="flex-shrink-0"
            >
              <span className="hidden sm:inline">主页</span>
            </Button>
          </div>
          {/* 绝对居中的品牌 Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none select-none">
            <img
              src="/yuean.svg"
              alt="跃案 Logo"
              className="h-8 md:h-9 w-auto rounded-lg object-contain"
            />
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-banana-600 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              跃案
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
             {/*桌面端：带文字的素材生成按钮*/}
            <Button
              variant="ghost"
              size="sm"
              icon={<ImagePlus size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={handleOpenMaterialModal}
              className="hidden sm:inline-flex font-medium duration-200 hover:scale-105 hover:bg-banana-100/60 hover:shadow-sm transition-[transform,background-color,box-shadow]"
            >
              <span className="hidden md:inline">素材生成</span>
            </Button>
             {/*手机端：仅图标的素材生成按钮*/}
            <Button
              variant="ghost"
              size="sm"
              icon={<ImagePlus size={16} />}
              onClick={handleOpenMaterialModal}
              className="sm:hidden duration-200 hover:scale-105 hover:bg-banana-100/60 hover:shadow-sm transition-[transform,background-color,box-shadow]"
              title="素材生成"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/history')}
              className="text-xs font-medium duration-200 hover:scale-105 hover:bg-banana-100/60 hover:shadow-sm md:text-sm transition-[transform,background-color,box-shadow]"
            >
              <span className="hidden sm:inline">历史项目</span>
              <span className="sm:hidden">历史</span>
            </Button>
            {/*<Button variant="ghost" size="sm" className="hidden md:inline-flex hover:bg-banana-50/50">帮助</Button>*/}
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative w-full px-3 md:px-4 py-8 md:py-12 stagger-enter">
        <div className="max-w-[1440px] mx-auto xl:grid xl:grid-cols-[200px_minmax(0,1fr)_200px] xl:gap-6 2xl:grid-cols-[240px_minmax(0,1fr)_240px] items-start">

        {/* 左侧理念卡片：跃 */}
        <div className="hidden xl:block sticky top-20">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-banana-100 shadow-sm">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-banana-400 to-banana-600 text-white font-bold text-xl mb-4 shadow-yellow">
              跃
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-2">跨越式提效</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              不是微调，是量级跃升。AI 注入教学动能，将一节课的备课时间压缩到分钟级。
            </p>
            <div className="mt-4 pt-4 border-t border-banana-100">
              <p className="text-xs text-banana-500 font-medium">备课效率</p>
              <p className="text-2xl font-bold text-banana-600 mt-0.5">×10</p>
              <p className="text-xs text-gray-400">较传统备课方式</p>
            </div>
          </div>
        </div>

        {/* 中间主内容 */}
        <div className="min-w-0 max-w-5xl mx-auto xl:mx-0 w-full">
        {/* Hero 标题区 */}
        <div className="text-center mb-10 md:mb-16 space-y-4 md:space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-banana-200/50 shadow-sm mb-4">
            <Sparkles size={16} className="text-banana-500" />
            <span className="text-sm font-medium text-gray-700">面向高职教育的智能课件生成平台</span>
          </div>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-light">
            一句话描述课程主题，AI 自动生成专业教学课件
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 pt-4">
            {[
              { icon: <Sparkles size={14} className="text-banana-500" />, label: '一句话生成课件' },
              { icon: <FileText size={14} className="text-blue-500" />, label: 'AI 智能排版' },
              { icon: <FileEdit size={14} className="text-orange-500" />, label: '自然语言修改' },
              { icon: <Paperclip size={14} className="text-green-600" />, label: '一键导出 PPTX' },
            ].map((feature, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full text-xs md:text-sm text-gray-700 border border-gray-200/50 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-default"
              >
                {feature.icon}
                {feature.label}
              </span>
            ))}
          </div>
        </div>

        {/* 创建卡片 */}
        <Card className="app-panel overflow-visible border-white/70 bg-white/95 p-4 shadow-[0_40px_120px_-56px_rgba(15,23,42,0.42)] duration-300 md:p-10 transition-[box-shadow,border-color,background-color]">
          {/* 选项卡 */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6 md:mb-8">
            {(Object.keys(tabConfig) as CreationType[]).map((type) => {
              const config = tabConfig[type];
              return (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium duration-200 md:gap-2 md:px-6 md:py-3 md:text-base transition-[background-color,color,box-shadow,border-color] ${
                    activeTab === type
                      ? 'bg-banana-500 text-white'
                      : 'bg-white border border-banana-500 text-banana-500 hover:bg-banana-500 hover:text-white'
                  }`}
                >
                  <span className="scale-90 md:scale-100">{config.icon}</span>
                  <span className="truncate">{config.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => navigate('/knowledge-base')}
              className="flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium duration-200 md:gap-2 md:px-6 md:py-3 md:text-base transition-[background-color,color,box-shadow,border-color] bg-white border border-banana-500 text-banana-500 hover:bg-banana-500 hover:text-white"
            >
              <span className="scale-90 md:scale-100"><BookOpen size={20} /></span>
              <span className="truncate">从文档生成</span>
            </button>
          </div>

          {/* 描述 */}
          <div className="relative">
            <p className="text-sm md:text-base mb-4 md:mb-6 leading-relaxed">
              <span className="inline-flex items-center gap-2 text-gray-600">
                <Lightbulb size={16} className="text-banana-500 flex-shrink-0" />
                <span className="font-semibold">
                  {tabConfig[activeTab].description}
                </span>
              </span>
            </p>
          </div>

          {/* 输入区 - 带按钮 */}
          <div className="relative mb-4">
            <HomeCharactersPromptStage
              isPromptFocused={isPromptFocused}
              hasPromptContent={Boolean(content.trim())}
            >
              <div className="relative mb-2 group">
                <div className="absolute -inset-3 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(245,146,22,0.18),transparent_65%)] opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                <Textarea
                  ref={textareaRef}
                  placeholder={tabConfig[activeTab].placeholder}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setIsPromptFocused(true)}
                  onBlur={() => setIsPromptFocused(false)}
                  onPaste={handlePaste}
                  rows={activeTab === 'idea' ? 4 : 8}
                  className="relative min-h-[180px] rounded-[24px] pr-20 md:pr-28 pb-12 md:pb-14 text-sm md:text-base border-2 border-banana-200/80 bg-white/98 shadow-[0_26px_54px_-38px_rgba(245,146,22,0.45)] focus:border-banana-400 focus:shadow-[0_30px_60px_-36px_rgba(245,146,22,0.48)] transition-[border-color,box-shadow] duration-200"
                />

                {/* 左下角：上传文件按钮（回形针图标） */}
                <button
                  type="button"
                  onClick={handlePaperclipClick}
                  className="absolute left-3 md:left-4 bottom-3 md:bottom-4 z-10 p-1.5 md:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors active:scale-95 touch-manipulation"
                  title="选择参考文件"
                >
                  <Paperclip size={18} className="md:w-5 md:h-5" />
                </button>

                {/* 右下角：开始生成按钮 */}
                <div className="absolute right-3 md:right-4 bottom-3 md:bottom-4 z-10">
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    loading={isGlobalLoading}
                    disabled={
                      !content.trim() ||
                      referenceFiles.some(f => f.parse_status === 'pending' || f.parse_status === 'parsing')
                    }
                    className="rounded-xl text-xs md:text-sm px-3 md:px-4 shadow-sm"
                  >
                    {referenceFiles.some(f => f.parse_status === 'pending' || f.parse_status === 'parsing')
                      ? '解析中...'
                      : '下一步'}
                  </Button>
                </div>
              </div>
            </HomeCharactersPromptStage>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 图片预览列表 */}
          <ImagePreviewList
            content={content}
            onRemoveImage={handleRemoveImage}
            className="mb-4"
          />

          <ReferenceFileList
            files={referenceFiles}
            onFileClick={setPreviewFileId}
            onFileDelete={handleFileRemove}
            onFileStatusChange={handleFileStatusChange}
            deleteMode="remove"
            className="mb-4"
          />

          {/* 模板选择 */}
          <div className="mb-6 md:mb-8 pt-4 border-t border-gray-100">
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb size={16} className="text-banana-500" />
                <span className="text-sm font-medium text-gray-900">生成模式</span>
              </div>
              <div className="inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  aria-pressed={renderMode === 'html'}
                  onClick={() => setRenderMode('html')}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    renderMode === 'html'
                      ? 'bg-white text-banana-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  结构化生成
                </button>
                {import.meta.env.VITE_SHOW_DEBUG_BUTTONS === 'true' && (
                  <button
                    type="button"
                    aria-pressed={renderMode === 'image'}
                    onClick={() => setRenderMode('image')}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      renderMode === 'image'
                        ? 'bg-white text-banana-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    图片化生成
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {renderMode === 'html'
                  ? '当前使用教学模板，先生成结构化大纲，再进入编辑。'
                  : '当前使用图片模式，可选模板图或文字风格来生成页面。'}
              </p>
            </div>

            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <Palette size={18} className="text-banana-500 flex-shrink-0" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                  {renderMode === 'html' ? '选择教学模板' : '选择风格模板'}
                </h3>
              </div>
              {renderMode !== 'html' && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    使用文字描述风格
                  </span>
                  <div className="relative">
                    <input
                        type="checkbox"
                        checked={useTemplateStyle}
                        onChange={(e) => {
                          setUseTemplateStyle(e.target.checked);
                          // 切换到无模板图模式时，清空模板选择
                          if (e.target.checked) {
                            setSelectedTemplate(null);
                            setSelectedTemplateId(null);
                          }
                          // 不再清空风格描述，允许用户保留已输入的内容
                        }}
                        className="sr-only peer"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 transition-colors duration-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-banana-300 peer-checked:bg-banana-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:content-[''] after:transition-transform after:duration-200"></div>
                  </div>
                </label>
              )}
            </div>

            {renderMode === 'html' ? (
              <SchemeSelector
                value={selectedSchemeId}
                onChange={setSelectedSchemeId}
              />
            ) : useTemplateStyle ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="描述您想要的 PPT 风格，例如：简约商务风格，使用蓝色和白色配色，字体清晰大方..."
                  value={templateStyle}
                  onChange={(e) => setTemplateStyle(e.target.value)}
                  rows={3}
                  className="text-sm border-2 border-gray-200 focus:border-banana-400 transition-colors duration-200"
                />

                {/* 预设风格按钮 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">
                    快速选择预设风格：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isLoadingPresetStyles ? (
                      <p className="text-xs text-gray-500">加载预设风格中...</p>
                    ) : presetStyles.length === 0 ? (
                      <p className="text-xs text-gray-500">暂无预设风格</p>
                    ) : (
                      presetStyles.map((preset) => {
                        const isActive = activePresetStyleId === preset.id;
                        const isPreviewOpen = activePresetPreview?.id === preset.id;

                        return (
                          <div key={preset.id} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-pressed={isActive}
                              onClick={() => applyPresetStyle(preset)}
                              className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium duration-200 transition-[border-color,background-color,box-shadow,color] ${
                                isActive
                                  ? 'border-banana-400 bg-banana-50 text-banana-700 shadow-sm'
                                  : 'border-gray-200 text-gray-700 hover:border-banana-400 hover:bg-banana-50 hover:shadow-sm'
                              }`}
                            >
                              {preset.name}
                            </button>

                            {preset.previewImage && (
                              <button
                                type="button"
                                aria-label={`预览 ${preset.name} 风格`}
                                aria-haspopup="dialog"
                                aria-expanded={isPreviewOpen}
                                aria-controls={isPreviewOpen ? 'preset-style-preview-dialog' : undefined}
                                onClick={(event) => openPresetPreview(preset, event.currentTarget)}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-500 duration-200 hover:border-banana-300 hover:bg-banana-50 hover:text-banana-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana-300/80 focus-visible:ring-offset-2 transition-[border-color,background-color,color,box-shadow]"
                              >
                                <Eye size={12} />
                                预览
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  💡 提示：点击名称可快速应用风格，点击“预览”可查看样张后再决定是否采用
                </p>
              </div>
            ) : (
              <TemplateSelector
                onSelect={handleTemplateSelect}
                selectedTemplateId={selectedTemplateId}
                showUpload={true} // 在主页上传的模板保存到用户模板库
                projectId={currentProjectId}
              />
            )}
          </div>
        </Card>
        </div>{/* 中间主内容 end */}

        {/* 右侧理念卡片：案 */}
        <div className="hidden xl:block sticky top-20">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-banana-100 shadow-sm">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-banana-400 to-banana-600 text-white font-bold text-xl mb-4 shadow-yellow">
              案
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-2">教案即产品</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              从构想到完整教案，一气呵成。比"课"更聚焦备课的生产过程，强调教师的创作者价值。
            </p>
            <div className="mt-4 pt-4 border-t border-banana-100">
              <p className="text-xs text-banana-500 font-medium">支持格式</p>
              <p className="text-xs text-gray-600 mt-1.5 space-y-1">
                <span className="block">📄 PPTX 可编辑导出</span>
                <span className="block">🖼 PDF 高清导出</span>
                <span className="block">📚 多课件模板</span>
              </p>
            </div>
          </div>
        </div>

        </div>{/* grid wrapper end */}
      </main>
      <ToastContainer />
      {/* 素材生成模态 - 在主页始终生成全局素材 */}
      <MaterialGeneratorModal
        projectId={null}
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
      />
      {/* 参考文件选择器 */}
      {/* 在 Home 页面，始终查询全局文件，因为此时还没有项目 */}
      <ReferenceFileSelector
        projectId={null}
        isOpen={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFilesSelected}
        multiple={true}
        initialSelectedIds={selectedFileIds}
      />
      
      <FilePreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />

      {activePresetPreview?.previewImage && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[95]" data-testid="preset-style-preview-overlay">
              <div
                className="absolute inset-0 bg-slate-950/32 backdrop-blur-[3px]"
                onClick={closePresetPreview}
              />
              <div className="relative flex h-full items-center justify-center p-4 md:p-8">
                <div
                  id="preset-style-preview-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="preset-style-preview-title"
                  aria-describedby="preset-style-preview-description"
                  className="relative flex w-full max-w-[860px] flex-col overflow-hidden rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(248,250,252,0.93)_100%)] shadow-[0_32px_120px_rgba(15,23,42,0.28)] backdrop-blur-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="border-b border-slate-200/80 bg-white/70 px-5 py-5 md:px-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-banana-400" />
                          风格预览
                        </div>
                        <h4
                          id="preset-style-preview-title"
                          className="text-xl font-semibold text-slate-900 md:text-2xl"
                        >
                          {activePresetPreview.name}
                        </h4>
                        <p
                          id="preset-style-preview-description"
                          className="mt-2 max-w-[660px] text-sm leading-6 text-slate-600"
                        >
                          {activePresetPreview.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closePresetPreview}
                        className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-500 duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana-300/80 focus-visible:ring-offset-2 transition-[border-color,color,background-color]"
                      >
                        关闭
                      </button>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-5 md:px-7 md:pb-7">
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-[0_18px_60px_rgba(15,23,42,0.14)]">
                      <img
                        src={activePresetPreview.previewImage}
                        alt={`${activePresetPreview.name} 预览图`}
                        className="block max-h-[65vh] w-full object-contain"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs leading-5 text-slate-500">
                        点击“应用该风格”会将这条预设描述填入输入框，方便继续微调。
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={closePresetPreview}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 duration-200 hover:border-slate-300 hover:text-slate-900 transition-[border-color,color]"
                        >
                          稍后再看
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            applyPresetStyle(activePresetPreview);
                            closePresetPreview();
                          }}
                          className="rounded-full bg-banana-500 px-4 py-2 text-sm font-medium text-white duration-200 hover:bg-banana-600 transition-[background-color,box-shadow]"
                        >
                          {activePresetStyleId === activePresetPreview.id ? '已应用该风格' : '应用该风格'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
