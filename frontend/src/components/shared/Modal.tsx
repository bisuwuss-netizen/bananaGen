import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn('relative bg-white rounded-lg w-full', sizes[size])}
          style={{ border: '2px solid #1a1a1a', boxShadow: '8px 8px 0 #1a1a1a' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏 */}
          {title && (
            <div
              className="flex items-center justify-between px-6 py-4 rounded-t-lg"
              style={{ background: '#ede4d0', borderBottom: '2px solid #1a1a1a' }}
            >
              <h2 className="text-xl font-black text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-md border-2 border-gray-900 bg-white hover:bg-gray-50 transition-colors"
                style={{ boxShadow: '2px 2px 0 #1a1a1a' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 内容 */}
          <div className="px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
