"use client";

import { useRef, useState } from "react";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { recognizeImeiFromImage } from "@/lib/ocr/recognize-imei";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (imei: string) => void;
};

export function ImeiImageRecognizer({ open, onClose, onPick }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);

  async function handleFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    setCandidates([]);
    try {
      const result = await recognizeImeiFromImage(file);
      if (!result.best) {
        setError("未识别到有效 IMEI，请重试或手动输入");
        return;
      }
      setCandidates(result.candidates);
      if (result.candidates.length === 1) {
        onPick(result.best);
        onClose();
      }
    } catch {
      setError("识别失败，请更换更清晰图片后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OverlayPortal
      open={open}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-2xl md:pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">OCR 图片识别 IMEI</h3>
          <button
            className="ui-btn ui-btn-secondary flex h-9 w-9 items-center justify-center text-xs"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <input
          ref={inputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          type="file"
        />

        <button
          className="ui-btn ui-btn-primary h-11 w-full text-sm md:h-10"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {loading ? "识别中..." : "上传图片开始识别"}
        </button>

        {error ? <div className="mt-3 text-xs text-status-danger-foreground">{error}</div> : null}

        {candidates.length > 1 ? (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-muted-foreground">识别到多个候选，请选择：</div>
            {candidates.map((imei) => (
              <button
                key={imei}
                className="ui-btn ui-btn-secondary h-11 w-full justify-start px-3 font-mono text-sm md:h-10"
                onClick={() => {
                  onPick(imei);
                  onClose();
                }}
                type="button"
              >
                {imei}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </OverlayPortal>
  );
}


