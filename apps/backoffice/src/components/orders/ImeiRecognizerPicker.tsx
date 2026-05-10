"use client";

import { OverlayPortal } from "@/components/ui/OverlayPortal";

type Props = {
  open: boolean;
  onClose: () => void;
  onPickMode: (mode: "barcode" | "ocr") => void;
};

export function ImeiRecognizerPicker({ open, onClose, onPickMode }: Props) {
  return (
    <OverlayPortal
      open={open}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-2xl md:pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">选择识别方式</h3>
          <button
            className="ui-btn ui-btn-secondary flex h-9 w-9 items-center justify-center text-xs"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <button
            className="ui-btn ui-btn-primary flex h-11 w-full items-center justify-between px-4 text-sm md:h-10"
            onClick={() => onPickMode("barcode")}
            type="button"
          >
            <span>条形码 / 二维码识别</span>
            <span className="text-xs opacity-80">更快</span>
          </button>
          <button
            className="ui-btn ui-btn-secondary flex h-11 w-full items-center justify-between px-4 text-sm md:h-10"
            onClick={() => onPickMode("ocr")}
            type="button"
          >
            <span>OCR 图片识别</span>
            <span className="text-xs text-muted-foreground">文字标签兜底</span>
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          推荐优先使用条码识别；仅在条码难以识别时再用 OCR。
        </p>
      </div>
    </OverlayPortal>
  );
}

