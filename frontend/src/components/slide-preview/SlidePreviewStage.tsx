import { Button } from '@/components/shared';

type Props = {
  hasPages: boolean;
  onBackToEdit: () => void;
  children: React.ReactNode;
};

export function SlidePreviewStage({ hasPages, onBackToEdit, children }: Props) {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: '#d4c9b0' }}>
      {!hasPages ? (
        <div className="flex-1 flex items-center justify-center overflow-y-auto">
          <div className="text-center">
            <div className="text-4xl md:text-6xl mb-4">📊</div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">还没有页面</h3>
            <p className="text-sm md:text-base text-gray-500 mb-6">请先返回编辑页面添加内容</p>
            <Button variant="primary" onClick={onBackToEdit} className="text-sm md:text-base">
              返回编辑
            </Button>
          </div>
        </div>
      ) : (
        children
      )}
    </main>
  );
}
