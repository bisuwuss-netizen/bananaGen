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
    <div className="min-h-screen" style={{ background: '#ede4d0' }}>

      {/* ═══ 1. 顶部导航 ═══════════════════════════════════════ */}
      <nav
        className="h-12 flex items-center px-4 md:px-6 relative"
        style={{ background: '#ede4d0', borderBottom: '2px solid #1a1a1a' }}
      >
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={redirectHomepage}
            className="flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-md border-2 border-gray-900"
            style={{ background: '#f5d040', boxShadow: '2px 2px 0 #1a1a1a' }}
          >
            <HomeIcon size={14} /><span>主页</span>
          </button>
          <button
            onClick={handleOpenMaterialModal}
            className="hidden sm:flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-md border-2 border-gray-900"
            style={{ background: '#ede4d0' }}
          >
            <ImagePlus size={14} /><span className="hidden md:inline">素材生成</span>
          </button>
          <button
            onClick={() => navigate('/history')}
            className="hidden sm:flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-md border-2 border-gray-900"
            style={{ background: '#ede4d0' }}
          >
            <span>历史项目</span>
          </button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none select-none">
          <img src="/yuean.svg" alt="跃案" className="h-7 w-auto rounded-lg object-contain" />
          <span className="text-base font-bold text-gray-900">跃案</span>
        </div>
      </nav>

      {/* ═══ 2. 核心滚动容器（pb 必须 >= 固定底栏高度，防遮挡）══ */}
      <main className="max-w-5xl mx-auto px-4 pt-3 pb-36">

        {/* 主副标题 */}
        <h1 className="text-3xl md:text-4xl font-black text-center text-gray-900 mb-1 tracking-tight">
          面向高职教育的智能课件生成平台
        </h1>
        <p className="text-sm text-center text-gray-700 mb-3 font-medium">
          一句话描述课程主题，AI 自动生成专业教学课件
        </p>

        {/* ═══ 3. 装饰悬浮层 + 白卡（relative 锚点）══════════════ */}
        {/*
          白卡 wrapper: position:relative → 作为插画绝对定位的唯一参照物
          插画: position:absolute, z-index:0  白卡: z-index:10
          使用 right:100% / left:100% 让插画贴着白卡左右外侧，不占文档流宽度
        */}
        <div className="relative mx-auto" style={{ maxWidth: 560 }}>

          {/* ── 左侧装饰插画 ── */}
          <div
            className="hidden md:block absolute bottom-0 z-0 pointer-events-none"
            style={{ right: '100%', width: 152 }}
          >
            <img src="/char-left.svg" alt="" className="w-full" />
          </div>

          {/* ── 右侧装饰插画 ── */}
          <div
            className="hidden md:block absolute bottom-0 z-0 pointer-events-none"
            style={{ left: '100%', width: 130 }}
          >
            <img src="/char-right.svg" alt="" className="w-full" />
          </div>

          {/* ── 主白卡（z-10 压住插画边缘）── */}
          <div
            className="relative z-10 bg-white"
            style={{
              border: '2px solid #1a1a1a',
              borderRadius: 16,
              boxShadow: '5px 5px 0 #1a1a1a',
            }}
          >
            {/* Tabs — 积木缝合：激活 tab 底边用白色压住分隔线 */}
            <div
              className="flex relative"
              style={{ borderBottom: '2px solid #1a1a1a', borderRadius: '14px 14px 0 0', overflow: 'visible' }}
            >
              {(Object.keys(tabConfig) as CreationType[]).map((type, idx, arr) => {
                const config = tabConfig[type];
                const isActive = activeTab === type;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 px-2 text-sm font-bold touch-manipulation"
                    style={{
                      background: isActive ? '#5c3a1e' : '#ede4d0',
                      color: isActive ? '#fff' : '#1a1a1a',
                      borderRight: idx < arr.length - 1 ? '2px solid #1a1a1a' : 'none',
                      margin: 0,
                      marginBottom: isActive ? -2 : 0,
                      paddingBottom: isActive ? '12px' : '10px',
                      borderRadius: idx === 0 ? '14px 0 0 0' : '0',
                      position: 'relative',
                      zIndex: isActive ? 1 : 0,
                    }}
                  >
                    <span style={{ transform: 'scale(0.85)', display: 'flex' }}>{config.icon}</span>
                    <span className="truncate">{config.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => navigate('/knowledge-base')}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 px-2 text-sm font-bold touch-manipulation"
                style={{
                  background: '#ede4d0',
                  color: '#1a1a1a',
                  borderLeft: '2px solid #1a1a1a',
                  margin: 0,
                  borderRadius: '0 14px 0 0',
                }}
              >
                <BookOpen size={14} />
                <span className="truncate">从文档生成</span>
              </button>
            </div>

            {/* 提示描述 */}
            <p className="px-3 pt-1.5 pb-0 text-xs text-gray-500 flex items-center gap-1">
              <Lightbulb size={11} className="text-banana-500 flex-shrink-0" />
              <span>{tabConfig[activeTab].description}</span>
            </p>

            {/* Textarea — 无边框无背景，完全融入白卡 */}
            <div className="px-2 pt-1">
              <textarea
                ref={textareaRef}
                placeholder={tabConfig[activeTab].placeholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsPromptFocused(true)}
                onBlur={() => setIsPromptFocused(false)}
                onPaste={handlePaste}
                rows={activeTab === 'idea' ? 5 : 8}
                style={{
                  width: '100%',
                  resize: 'none',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#1a1a1a',
                  padding: '6px 4px 4px 4px',
                }}
                className="placeholder:text-gray-400"
              />
            </div>

            {/* 图片预览 & 参考文件列表 */}
            <ImagePreviewList content={content} onRemoveImage={handleRemoveImage} className="px-3" />
            <ReferenceFileList
              files={referenceFiles}
              onFileClick={setPreviewFileId}
              onFileDelete={handleFileRemove}
              onFileStatusChange={handleFileStatusChange}
              deleteMode="remove"
              className="px-3"
            />

            {/* 底部留白（给绝对定位按钮腾空间） */}
            <div className="h-12" />

            {/* 回形针 — absolute 固定在白卡左下角 */}
            <button
              type="button"
              onClick={handlePaperclipClick}
              className="absolute left-3 bottom-3 z-20 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors active:scale-95"
              title="选择参考文件"
            >
              <Paperclip size={15} />
            </button>

            {/* 下一步按钮 — absolute 固定在白卡右下角 */}
            <div className="absolute bottom-3 right-3 z-20">
              <button
                onClick={handleSubmit}
                disabled={
                  !content.trim() ||
                  isGlobalLoading ||
                  referenceFiles.some((f) => f.parse_status === 'pending' || f.parse_status === 'parsing')
                }
                className="px-4 py-1.5 text-sm font-black rounded-md border-2 border-gray-900 disabled:opacity-50 transition-opacity"
                style={{ background: '#f5d040', boxShadow: '3px 3px 0 #1a1a1a' }}
              >
                {isGlobalLoading
                  ? '生成中...'
                  : referenceFiles.some((f) => f.parse_status === 'pending' || f.parse_status === 'parsing')
                  ? '解析中...'
                  : '下一步'}
              </button>
            </div>
          </div>
        </div>

        {/* 隐藏文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* ═══ 模板选择区（白卡下方，需留底部 padding 防固定栏遮挡）═ */}
        <div className="mt-5 mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Palette size={14} className="text-gray-400 flex-shrink-0" />
              <h3 className="text-sm font-bold text-gray-700">
                {renderMode === 'html' ? '选择教学模板' : '选择风格模板'}
              </h3>
            </div>
            {renderMode !== 'html' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-600">使用文字描述风格</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={useTemplateStyle}
                    onChange={(e) => {
                      setUseTemplateStyle(e.target.checked);
                      if (e.target.checked) {
                        setSelectedTemplate(null);
                        setSelectedTemplateId(null);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-gray-200 transition-colors duration-200 peer-checked:bg-banana-500 peer-checked:after:translate-x-full after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:content-[''] after:transition-transform after:duration-200" />
                </div>
              </label>
            )}
          </div>

          {renderMode === 'html' ? (
            <SchemeSelector value={selectedSchemeId} onChange={setSelectedSchemeId} />
          ) : useTemplateStyle ? (
            <div className="space-y-2">
              <Textarea
                placeholder="描述您想要的 PPT 风格，例如：简约商务风格，使用蓝色和白色配色..."
                value={templateStyle}
                onChange={(e) => setTemplateStyle(e.target.value)}
                rows={3}
                className="text-sm border-2 border-gray-900 rounded-lg focus:border-banana-400 transition-colors"
              />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-600">快速选择预设风格：</p>
                <div className="flex flex-wrap gap-1.5">
                  {isLoadingPresetStyles ? (
                    <p className="text-xs text-gray-500">加载中...</p>
                  ) : (
                    presetStyles.map((preset) => {
                      const isActive = activePresetStyleId === preset.id;
                      const isPreviewOpen = activePresetPreview?.id === preset.id;
                      return (
                        <div key={preset.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => applyPresetStyle(preset)}
                            className={`rounded-md border-2 px-2.5 py-1 text-xs font-medium transition-all ${
                              isActive
                                ? 'border-gray-900 bg-[#5c3a1e] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'border-gray-900 text-gray-700 hover:bg-[#f5d040] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            }`}
                          >
                            {preset.name}
                          </button>
                          {preset.previewImage && (
                            <button
                              type="button"
                              ref={isActive ? presetPreviewTriggerRef : undefined}
                              onClick={(e) => openPresetPreview(preset, e.currentTarget)}
                              className="inline-flex items-center gap-0.5 rounded-md border-2 border-gray-900 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-[#f5d040] transition-all"
                            >
                              <Eye size={11} />预览
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <TemplateSelector
              onSelect={handleTemplateSelect}
              selectedTemplateId={selectedTemplateId}
              showUpload={true}
              projectId={currentProjectId}
            />
          )}
        </div>
      </main>

      {/* ═══ 4. 底部固定栏（Portal → body，彻底规避 containing-block 问题）══════════ */}
      {createPortal(
        <div
          className="fixed bottom-0 left-0 w-full z-50"
          style={{ background: '#ede4d0', borderTop: '2px solid #1a1a1a' }}
        >
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-banana-600">Our Philosophy</p>
              <p className="text-xs text-gray-600 truncate">
                备课耗时，是教师最真实的痛点跃案，让 AI 把这段时间还给你——专注教学本身，而非反复打磨幻灯片。
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <img src="/yuean.svg" alt="跃案" className="h-7 w-auto rounded-md object-contain" />
              <span className="text-sm font-bold text-gray-900 hidden sm:inline">跃案</span>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <ToastContainer />

      {/* 素材生成模态 */}
      <MaterialGeneratorModal
        projectId={null}
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
      />

      {/* 参考文件选择器 */}
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
              <div className="absolute inset-0 bg-slate-950/32 backdrop-blur-[3px]" onClick={closePresetPreview} />
              <div className="relative flex h-full items-center justify-center p-4 md:p-8">
                <div
                  id="preset-style-preview-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="preset-style-preview-title"
                  aria-describedby="preset-style-preview-description"
                  className="relative flex w-full max-w-[860px] flex-col overflow-hidden rounded-[30px] border border-white/60 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.28)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="border-b border-slate-200 bg-white/70 px-5 py-4 md:px-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                          <span className="inline-block h-2 w-2 rounded-full bg-banana-400" />风格预览
                        </div>
                        <h4 id="preset-style-preview-title" className="text-xl font-semibold text-slate-900">
                          {activePresetPreview.name}
                        </h4>
                        <p id="preset-style-preview-description" className="mt-1 max-w-[660px] text-sm leading-6 text-slate-600">
                          {activePresetPreview.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closePresetPreview}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                      >关闭</button>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-4 md:px-7">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        src={activePresetPreview.previewImage}
                        alt={`${activePresetPreview.name} 预览图`}
                        className="block max-h-[65vh] w-full object-contain"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">点击"应用该风格"会将这条预设描述填入输入框，方便继续微调。</p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={closePresetPreview}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                        >稍后再看</button>
                        <button
                          type="button"
                          onClick={() => { applyPresetStyle(activePresetPreview); closePresetPreview(); }}
                          className="rounded-full bg-banana-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-banana-600 transition-colors"
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
