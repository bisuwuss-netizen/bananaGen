import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Image as ImageIcon, ImagePlus, Upload, X, FolderOpen } from 'lucide-react';
import { Modal, Textarea, Button, useToast, MaterialSelector, Skeleton } from '@/components/shared';
import { generateMaterialImage, listMaterials, deleteMaterial } from '@/api/endpoints';
import { getImageUrl, openTaskWebSocket } from '@/api/client';
import { materialUrlToFile } from './MaterialSelector';
import type { Material } from '@/api/endpoints';
import type { Task } from '@/types';

interface MaterialGeneratorModalProps {
  projectId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMaterial?: (material: Material) => void;
}

export const MaterialGeneratorModal: React.FC<MaterialGeneratorModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onSelectMaterial,
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

  const refImageUrl = useMemo(() => (refImage ? URL.createObjectURL(refImage) : null), [refImage]);
  const extraImageUrls = useMemo(() => extraImages.map((f) => URL.createObjectURL(f)), [extraImages]);
  useEffect(() => () => { if (refImageUrl) URL.revokeObjectURL(refImageUrl); }, [refImageUrl]);
  useEffect(() => () => extraImageUrls.forEach((u) => URL.revokeObjectURL(u)), [extraImageUrls]);

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
    if (file) setRefImage(file);
  };

  const addImages = (files: File[]) => {
    if (files.length === 0) return;
    if (!refImage) {
      const [first, ...rest] = files;
      setRefImage(first);
      if (rest.length > 0) setExtraImages((prev) => [...prev, ...rest]);
    } else {
      setExtraImages((prev) => [...prev, ...files]);
    }
  };

  const handleExtraImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImages(Array.from(e.target.files || []));
  };

  const removeExtraImage = (index: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectMaterials = async (materials: Material[]) => {
    try {
      const files = await Promise.all(materials.map((m) => materialUrlToFile(m)));
      addImages(files);
      if (files.length > 0) show({ message: `已添加 ${files.length} 个素材`, type: 'success' });
    } catch (error: any) {
      show({ message: '加载素材失败: ' + (error.message || '未知错误'), type: 'error' });
    }
  };

  const taskSocketRef = useRef<WebSocket | null>(null);

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
      if (response.data?.materials) setMaterials(response.data.materials);
    } catch (error: any) {
      show({
        message: error?.response?.data?.error?.message || error.message || '加载素材库失败',
        type: 'error',
      });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadMaterials();
  }, [isOpen, projectId]);

  const pollMaterialTask = async (taskId: string) => {
    const targetProjectId = projectId || 'none';
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
          setIsGenerating(false);
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
      const targetProjectId = projectId || 'none';
      const resp = await generateMaterialImage(targetProjectId, prompt.trim(), refImage as File, extraImages);
      const taskId = resp.data?.task_id;
      if (taskId) {
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
    <Modal isOpen={isOpen} onClose={handleClose} title="素材生成" size="xl">
      <div className="flex gap-6" style={{ height: '62vh', minHeight: '400px' }}>
        {/* 左栏：提示词 + 模板 + 参考图 */}
        <div className="flex w-72 flex-shrink-0 flex-col gap-4 overflow-y-auto pr-1">
          <Textarea
            label="提示词"
            placeholder="例如：蓝紫色渐变背景，带几何图形和科技感线条..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />

          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-500">快速模板</div>
            {promptTemplateGroups.map((group) => (
              <div key={group.label}>
                <div className="mb-1.5 text-[11px] font-medium text-gray-400">{group.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {group.templates.map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setPrompt(tpl)}
                      className={`rounded-md border-2 border-gray-900 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        prompt === tpl
                          ? 'bg-[#f5d040] text-gray-900'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 参考图上传 */}
          <div className="rounded-md p-3" style={{ border: '2px solid #1a1a1a', background: '#f9f6f0' }}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <ImagePlus size={13} />
                参考图片（可选）
              </div>
              <button
                type="button"
                onClick={() => setIsMaterialSelectorOpen(true)}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
              >
                <FolderOpen size={12} />
                从素材库选
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* 主参考图 */}
              <label className="relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-900 bg-white transition-colors hover:bg-gray-50 group">
                {refImage ? (
                  <>
                    <img src={refImageUrl!} alt="主参考图" className="h-full w-full rounded object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRefImage(null); }}
                      className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon size={18} className="mb-1 text-gray-400" />
                    <span className="text-[10px] text-gray-400">主参考图</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleRefImageChange} />
              </label>

              {/* 额外参考图 */}
              {extraImages.map((_file, idx) => (
                <div key={idx} className="group relative">
                  <img src={extraImageUrls[idx]} alt={`extra-${idx + 1}`} className="h-20 w-20 rounded border border-gray-300 object-cover" />
                  <button
                    onClick={() => removeExtraImage(idx)}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 bg-white transition-colors hover:border-banana-500">
                <Upload size={16} className="mb-1 text-gray-400" />
                <span className="text-[10px] text-gray-400">添加</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleExtraImagesChange} />
              </label>
            </div>
          </div>
        </div>

        {/* 右栏：生成结果 + 素材库 */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto min-w-0 pr-1">
          {/* 生成结果 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 text-xs font-medium text-gray-600">生成结果</div>
            {isGenerating ? (
              <div className="aspect-video overflow-hidden rounded-lg border border-gray-200">
                <Skeleton className="h-full w-full" />
              </div>
            ) : previewUrl ? (
              <>
                <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                  <img src={previewUrl} alt="生成的素材" className="h-full w-full object-contain" />
                </div>
                {onSelectMaterial && materials.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectMaterial(materials[0])}
                    className="mt-2 w-full rounded-md bg-banana-500 py-1.5 text-sm font-medium text-white hover:bg-banana-600 transition-colors"
                  >
                    使用此素材
                  </button>
                )}
              </>
            ) : (
              <div className="aspect-video rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-400 text-sm">
                <div className="mb-2 text-3xl">🎨</div>
                <div>生成的素材会展示在这里</div>
              </div>
            )}
          </div>

          {/* 素材库 */}
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-600">素材库</div>
              <button
                type="button"
                onClick={loadMaterials}
                disabled={isLoadingMaterials}
                className="text-[11px] text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {isLoadingMaterials ? '加载中...' : '刷新'}
              </button>
            </div>
            {isLoadingMaterials ? (
              <div className="py-6 text-center text-sm text-gray-400">加载中...</div>
            ) : materials.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">暂无素材</div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {materials.map((material) => (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => onSelectMaterial ? onSelectMaterial(material) : setPreviewMaterial(material)}
                      className={`group relative aspect-video overflow-hidden rounded border text-left transition-all ${onSelectMaterial ? 'border-gray-200 hover:border-banana-400 hover:ring-2 hover:ring-banana-200' : 'border-gray-200'}`}
                    >
                      {failedImageUrls.has(material.url) ? (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 p-2 text-center text-[10px] text-gray-400">
                          加载失败
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(material.url)}
                          alt={material.filename}
                          className="h-full w-full object-cover"
                          onError={() => setFailedImageUrls((prev) => new Set(prev).add(material.url))}
                        />
                      )}
                      {!onSelectMaterial && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(material.id); }}
                          disabled={deletingIds.has(material.id)}
                          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 disabled:opacity-60"
                          aria-label="删除素材"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
                {onSelectMaterial && (
                  <div className="mt-2 text-center text-[11px] text-gray-400">点击选择</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-4">
        <Button variant="ghost" onClick={handleClose} disabled={isGenerating}>
          关闭
        </Button>
        <Button variant="primary" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
          {isGenerating ? '生成中...' : '生成素材'}
        </Button>
      </div>

      <MaterialSelector
        projectId={projectId || undefined}
        isOpen={isMaterialSelectorOpen}
        onClose={() => setIsMaterialSelectorOpen(false)}
        onSelect={handleSelectMaterials}
        multiple={true}
      />

      {previewMaterial && (
        <Modal isOpen={true} onClose={() => setPreviewMaterial(null)} title="素材预览" size="lg">
          <div className="w-full">
            <img
              src={getImageUrl(previewMaterial.url)}
              alt={previewMaterial.filename}
              className="max-h-[70vh] w-full rounded object-contain"
            />
          </div>
        </Modal>
      )}
    </Modal>
  );
};
