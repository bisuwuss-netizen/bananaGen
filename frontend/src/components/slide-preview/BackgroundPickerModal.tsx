import { Button, Modal } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import type { Material } from '@/api/endpoints';

type Props = {
  isOpen: boolean;
  mode: 'menu' | 'material';
  materials: Material[];
  isLoading: boolean;
  backgroundFileInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onBack: () => void;
  onPickLocal: () => void;
  onOpenMaterialLibrary: () => Promise<void> | void;
  onSelectMaterial: (material: Material) => void;
};

export function BackgroundPickerModal({
  isOpen,
  mode,
  materials,
  isLoading,
  onClose,
  onBack,
  onPickLocal,
  onOpenMaterialLibrary,
  onSelectMaterial,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="上传背景图" size="lg">
      {mode === 'menu' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="primary" onClick={onPickLocal}>
              从本地上传
            </Button>
            <Button variant="secondary" onClick={onOpenMaterialLibrary}>
              从素材库选择
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            选择素材库图片时会自动转换为 base64，确保导出 HTML/PPTX 无需额外上传。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">选择背景图</div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              返回
            </Button>
          </div>
          {isLoading ? (
            <div className="text-center text-sm text-gray-400 py-8">加载中...</div>
          ) : materials.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">暂无素材</div>
          ) : (
            <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
              {materials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => onSelectMaterial(material)}
                  className="relative group aspect-video rounded border border-gray-200 overflow-hidden"
                >
                  <img
                    src={getImageUrl(material.url)}
                    alt={material.filename}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
