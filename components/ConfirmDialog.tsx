'use client';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E8E8ED] max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Content */}
        <div className="p-6">
          <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">
            {title}
          </h2>
          <p className="text-[15px] text-[#6E6E73] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-[15px] font-medium text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-[15px] font-medium text-white rounded-lg transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-[#FF3B30] hover:bg-[#FF453A]'
                : 'bg-[#0071E3] hover:bg-[#0077ED]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
