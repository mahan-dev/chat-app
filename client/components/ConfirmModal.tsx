'use client';

import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
  error?: string;
  onConfirm: (e?: any) => void | Promise<void>;
  onClose: () => void;
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
  error,
  onConfirm,
  onClose,
  children,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-lg font-semibold text-[#2B2D2F]">{title}</h3>
        <p className="mt-2 text-sm text-[#6B6E70]">{description}</p>

        {error && (
          <div className="mt-4 rounded-2xl bg-[#FDF2F0] p-3 text-sm text-[#C66B3D]">
            {error}
          </div>
        )}

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-[#E2DCD2] bg-white px-4 py-2.5 text-sm font-medium text-[#2B2D2F] transition-colors hover:bg-[#F4F1EA] disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isDestructive
                ? 'bg-[#C66B3D] hover:bg-[#B55A30] focus:ring-[#C66B3D]'
                : 'bg-[#2B2D2F] hover:bg-[#4A4D4E] focus:ring-[#2B2D2F]'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
