import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, ImagePlus, Upload, X, FolderOpen } from 'lucide-react';
import { Modal, Textarea, Button, useToast, MaterialSelector, Skeleton } from '@/components/shared';
import { generateMaterialImage, listMaterials, deleteMaterial } from '@/api/endpoints';
import { getImageUrl, openTaskWebSocket } from '@/api/client';
import { materialUrlToFile } from './MaterialSelector';
import type { Material } from '@/api/endpoints';
import type { Task } from '@/types';

interface MaterialGeneratorModalProps {
  projectId?: string | null; // 可选，如果不提供则生成全局素材
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 素材生成模态卡片
 * - 输入提示词 + 上传参考图
 * - 提示词原样传给文生图模型（不做额外修饰）
 * - 生成结果展示在模态顶部
 * - 结果统一保存在项目下的历史素材库（backend /uploads/{projectId}/materials）
 */
export const MaterialGeneratorModal: React.FC<MaterialGeneratorModalProps> = ({
  projectId,
  isOpen,
  onClose,
}) => {
  const { show } = useToast();
  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState<File | null>(null);
  const [extraImages, setExtraImages] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());

  const promptTemplateGroups = [
    {
      label: '通用背景',
      templates: [
        '蓝紫色渐变背景，带细线几何图形与柔和光晕，科技感，PPT封面背景',
        '极简抽象几何背景，浅色系，留白丰富，适合商务汇报',
        '城市天际线商务背景：日出/日落，柔焦，现代感',
      ],
    },
    {
      label: '科技与AI',
      templates: [
        '人工智能芯片与电路板，细节清晰，深色科技质感',
        '金融数据可视化背景：K线/网格/发光曲线，深蓝色科技风',
        '数字网络连接节点背景，蓝色粒子光点，未来感',
      ],
    },
    {
      label: '教育与学术',
      templates: [
        '教育课堂场景插画：老师与学生，暖色调，卡通扁平风',
        '书本与实验器材平铺插画，学术氛围，浅米色底',
        '黑板粉笔风格背景，手绘公式与图表，复古教育感',
      ],
    },
    {
      label: '医疗与健康',
      templates: [
        '医疗健康主题插画：医生与医疗设备，扁平风，干净明亮',
        '分子结构与DNA双螺旋，浅蓝绿色，生物科技感',
      ],
    },
    {
      label: '环保与能源',
      templates: [
        '新能源环保概念图：风电与光伏，清新绿色，现代插画',
        '自然山水风景背景，晨雾远山，清新淡雅，留白丰富',
      ],
    },
  ];

  const handleRefImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files && e.target.files[0]) || null;
    if (file) {
      setRefImage(file);
    }
  };

  const handleExtraImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 如果还没有主参考图，优先把第一张作为主参考图，其余作为额外参考图
    if (!refImage) {
      const [first, ...rest] = files;
      setRefImage(first);
      if (rest.length > 0) {
        setExtraImages((prev) => [...prev, ...rest]);
      }
    } else {
      setExtraImages((prev) => [...prev, ...files]);
    }
  };

  const removeExtraImage = (index: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectMaterials = async (materials: Material[]) => {
    try {
      // 将选中的素材转换为File对象
      const files = await Promise.all(
        materials.map((material) => materialUrlToFile(material))
      );

      if (files.length === 0) return;

      // 如果没有主图，优先把第一张设为主参考图
      if (!refImage) {
        const [first, ...rest] = files;
        setRefImage(first);
        if (rest.length > 0) {
          setExtraImages((prev) => [...prev, ...rest]);
        }
      } else {
        setExtraImages((prev) => [...prev, ...files]);
      }

      show({ message: `已添加 ${files.length} 个素材`, type: 'success' });
    } catch (error: any) {
      console.error('加载素材失败:', error);
      show({
        message: '加载素材失败: ' + (error.message || '未知错误'),
        type: 'error',
      });
    }
  };

  const taskSocketRef = useRef<WebSocket | null>(null);

  // 清理连接
  useEffect(() => {
    return () => {
      taskSocketRef.current?.close();
      taskSocketRef.current = null;
    };
  }, []);

  const loadMaterials = async () => {
    setIsLoadingMaterials(true);
    try {
      const targetProjectId = projectId || 'all';
      const response = await listMaterials(targetProjectId);
      if (response.data?.materials) {
        setMaterials(response.data.materials);
      }
    } catch (error: any) {
      console.error('加载素材库失败:', error);
      show({
        message: error?.response?.data?.error?.message || error.message || '加载素材库失败',
        type: 'error',
      });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMaterials();
    }
  }, [isOpen, projectId]);

  const pollMaterialTask = async (taskId: string) => {
    const targetProjectId = projectId || 'none'; // 使用'none'匹配后端NULL project_id
    await new Promise<void>((resolve) => {
      taskSocketRef.current?.close();
      taskSocketRef.current = openTaskWebSocket<Task>(targetProjectId, taskId, {
        onMessage: (task) => {
          if (task.status === 'COMPLETED') {
            const progress = (task.progress || {}) as Record<string, any>;
            const imageUrl = progress.image_url;
            if (imageUrl) {
              setPreviewUrl(getImageUrl(imageUrl));
              show({
                message: projectId ? '素材生成成功，已保存到历史素材库' : '素材生成成功，已保存到全局素材库',
                type: 'success',
              });
              loadMaterials();
            } else {
              show({ message: '素材生成完成，但未找到图片地址', type: 'error' });
            }
            setIsGenerating(false);
            taskSocketRef.current?.close();
            taskSocketRef.current = null;
            resolve();
            return;
          }

          if (task.status === 'FAILED') {
            show({ message: task.error_message || '素材生成失败', type: 'error' });
            setIsGenerating(false);
            taskSocketRef.current?.close();
            taskSocketRef.current = null;
            resolve();
          }
        },
        onError: () => {
          show({ message: '素材生成任务连接失败', type: 'error' });
          setIsGenerating(false);
          taskSocketRef.current = null;
          resolve();
        },
        onClose: () => {
          resolve();
        },
      });
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      show({ message: '请输入提示词', type: 'error' });
      return;
    }

    setIsGenerating(true);
    try {
      // 如果没有projectId，使用'none'表示生成全局素材（后端将task的project_id设为NULL）
      const targetProjectId = projectId || 'none';
      const resp = await generateMaterialImage(targetProjectId, prompt.trim(), refImage as File, extraImages);
      const taskId = resp.data?.task_id;
      
      if (taskId) {
        // 开始轮询任务状态
        await pollMaterialTask(taskId);
      } else {
        show({ message: '素材生成失败：未返回任务ID', type: 'error' });
        setIsGenerating(false);
      }
    } catch (error: any) {
      show({
        message: error?.response?.data?.error?.message || error.message || '素材生成失败',
        type: 'error',
      });
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    taskSocketRef.current?.close();
    taskSocketRef.current = null;
    setIsGenerating(false);
    onClose();
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!materialId) return;
    setDeletingIds((prev) => new Set(prev).add(materialId));
    try {
      await deleteMaterial(materialId);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      show({ message: '素材已删除', type: 'success' });
    } catch (error: any) {
      console.error('删除素材失败:', error);
      show({
        message: error?.response?.data?.error?.message || error.message || '删除素材失败',
        type: 'error',
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(materialId);
        return next;
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="素材生成" size="lg">
      <blockquote className="text-sm text-gray-500 mb-4">生成的素材会保存到素材库</blockquote>
      <div className="space-y-4">
        {/* 顶部：生成结果预览（始终显示最新一次生成） */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">生成结果</h4>
          {isGenerating ? (
            <div className="aspect-video rounded-lg overflow-hidden border border-gray-200">
              <Skeleton className="w-full h-full" />
            </div>
          ) : previewUrl ? (
            <div className="aspect-video bg-white rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="生成的素材"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">🎨</div>
              <div>生成的素材会展示在这里</div>
            </div>
          )}
        </div>

        {/* 提示词：原样传给模型 */}
        <Textarea
          label="提示词（原样发送给文生图模型）"
          placeholder="例如：蓝紫色渐变背景，带几何图形和科技感线条，用于科技主题标题页..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <div className="space-y-3">
          {promptTemplateGroups.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-medium text-gray-400 mb-1.5">{group.label}</div>
              <div className="flex flex-wrap gap-2">
                {group.templates.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setPrompt(tpl)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      prompt === tpl
                        ? 'border-banana-400 bg-banana-50 text-banana-600'
                        : 'border-gray-200 text-gray-600 hover:border-banana-400 hover:text-banana-600 hover:bg-banana-50'
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 参考图上传区 */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <ImagePlus size={16} className="text-gray-500" />
              <span className="font-medium">参考图片（可选）</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<FolderOpen size={16} />}
              onClick={() => setIsMaterialSelectorOpen(true)}
            >
              从素材库选择
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            {/* 主参考图（可选） */}
            <div className="space-y-2">
              <div className="text-xs text-gray-600">主参考图（可选）</div>
              <label className="w-40 h-28 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-banana-500 transition-colors bg-white relative group">
                {refImage ? (
                  <>
                    <img
                      src={URL.createObjectURL(refImage)}
                      alt="主参考图"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRefImage(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon size={24} className="text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">点击上传</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleRefImageChange}
                />
              </label>
            </div>

            {/* 额外参考图（可选） */}
            <div className="flex-1 space-y-2 min-w-[180px]">
              <div className="text-xs text-gray-600">额外参考图（可选，多张）</div>
              <div className="flex flex-wrap gap-2">
                {extraImages.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`extra-${idx + 1}`}
                      className="w-20 h-20 object-cover rounded border border-gray-300"
                    />
                    <button
                      onClick={() => removeExtraImage(idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-banana-500 transition-colors bg-white">
                  <Upload size={18} className="text-gray-400 mb-1" />
                  <span className="text-[11px] text-gray-500">添加</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleExtraImagesChange}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">素材库</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMaterials}
              disabled={isLoadingMaterials}
            >
              {isLoadingMaterials ? '加载中...' : '刷新'}
            </Button>
          </div>
          {isLoadingMaterials ? (
            <div className="text-center text-sm text-gray-400 py-6">加载中...</div>
          ) : materials.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-6">暂无素材</div>
          ) : (
            <div className="grid grid-cols-4 gap-3 max-h-40 overflow-y-auto pr-1">
              {materials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => setPreviewMaterial(material)}
                  className="relative group aspect-video rounded border border-gray-200 overflow-hidden text-left"
                >
                  {failedImageUrls.has(material.url) ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2 bg-gray-100">
                      图片加载失败
                    </div>
                  ) : (
                    <img
                      src={getImageUrl(material.url)}
                      alt={material.filename}
                      className="w-full h-full object-cover"
                      onError={() => setFailedImageUrls(prev => new Set(prev).add(material.url))}
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMaterial(material.id);
                    }}
                    disabled={deletingIds.has(material.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow disabled:opacity-60"
                    aria-label="删除素材"
                  >
                    <X size={12} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={isGenerating}>
            关闭
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? '生成中...' : '生成素材'}
          </Button>
        </div>
      </div>
      {/* 素材选择器 */}
      <MaterialSelector
        projectId={projectId || undefined}
        isOpen={isMaterialSelectorOpen}
        onClose={() => setIsMaterialSelectorOpen(false)}
        onSelect={handleSelectMaterials}
        multiple={true}
      />
      {previewMaterial && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewMaterial(null)}
          title="素材预览"
          size="lg"
        >
          <div className="w-full">
            <img
              src={getImageUrl(previewMaterial.url)}
              alt={previewMaterial.filename}
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
          </div>
        </Modal>
      )}
    </Modal>
  );
};
