import { Button, Modal } from '@/components/shared';
import { TemplateSelector } from '@/components/shared/TemplateSelector';

type Props = {
  isOpen: boolean;
  isUploadingTemplate: boolean;
  selectedTemplateId: string | null;
  projectId: string | null;
  onClose: () => void;
  onSelect: (templateFile: File | null, templateId?: string) => Promise<void> | void;
};

export function TemplatePickerModal({
  isOpen,
  isUploadingTemplate,
  selectedTemplateId,
  projectId,
  onClose,
  onSelect,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="更换模板" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          选择一个新的模板将应用到后续PPT页面生成（不影响已经生成的页面）。你可以选择已有模板或上传新模板。
        </p>
        <TemplateSelector
          onSelect={onSelect}
          selectedTemplateId={selectedTemplateId}
          showUpload={false}
          projectId={projectId}
        />
        {isUploadingTemplate && (
          <div className="text-center py-2 text-sm text-gray-500">正在上传模板...</div>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={isUploadingTemplate}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
}
