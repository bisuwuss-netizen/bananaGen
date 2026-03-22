import { useState } from 'react';
import { Button, Modal } from '@/components/shared';
import { MaterialGeneratorModal } from '@/components/shared/MaterialGeneratorModal';
import type { Material } from '@/api/endpoints';

type Props = {
  isOpen: boolean;
  projectId?: string | null;
  onClose: () => void;
  onPickLocal: () => void;
  onSelectMaterial: (material: Material) => void;
};

export function ImageSlotPickerModal({
  isOpen,
  projectId,
  onClose,
  onPickLocal,
  onSelectMaterial,
}: Props) {
  const [isMaterialGeneratorOpen, setIsMaterialGeneratorOpen] = useState(false);

  const handleSelectMaterial = (material: Material) => {
    setIsMaterialGeneratorOpen(false);
    onSelectMaterial(material);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="替换图片" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="primary" onClick={onPickLocal}>
              从本地上传
            </Button>
            <Button variant="secondary" onClick={() => setIsMaterialGeneratorOpen(true)}>
              从素材库选择
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            选择素材库图片时会自动转换为 base64，确保导出 HTML/PPTX 无需额外上传。
          </p>
        </div>
      </Modal>

      <MaterialGeneratorModal
        projectId={projectId}
        isOpen={isMaterialGeneratorOpen}
        onClose={() => setIsMaterialGeneratorOpen(false)}
        onSelectMaterial={handleSelectMaterial}
      />
    </>
  );
}
