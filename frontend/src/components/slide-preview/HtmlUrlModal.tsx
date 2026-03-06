import { Button, Modal } from '@/components/shared';

type Props = {
  isOpen: boolean;
  uploadedHtmlUrl: string | null;
  onClose: () => void;
  onCopyUrl: () => void;
};

export function HtmlUrlModal({
  isOpen,
  uploadedHtmlUrl,
  onClose,
  onCopyUrl,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="获取在线链接" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">HTML 文件已上传至服务器，您可以通过以下链接访问：</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={uploadedHtmlUrl || ''}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700"
          />
          <Button variant="primary" onClick={onCopyUrl} className="flex-shrink-0">
            复制链接
          </Button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (uploadedHtmlUrl) {
                window.open(uploadedHtmlUrl, '_blank');
              }
            }}
          >
            打开链接
          </Button>
        </div>
      </div>
    </Modal>
  );
}
