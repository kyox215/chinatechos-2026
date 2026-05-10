"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OverlayPortal } from "@/components/ui/OverlayPortal";

type Props = {
  open: boolean;
  onScan: (value: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ open, onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanning(true);
      } catch {
        if (!cancelled) setError("无法访问摄像头，请检查权限设置");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    let cancelled = false;
    let handled = false;
    /** Avoid NodeJS.Timeout vs DOM number clash under @types/node */
    let intervalId: number | undefined;
    let zxingStop: (() => void) | null = null;

    const video = videoRef.current;

    const complete = (raw: string) => {
      if (cancelled || handled || !raw) return;
      handled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      zxingStop?.();
      onScan(raw);
      stopCamera();
      onClose();
    };

    if ("BarcodeDetector" in window) {
      const BD = (
        window as unknown as {
          BarcodeDetector: new (opts: { formats: string[] }) => {
            detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
          };
        }
      ).BarcodeDetector;
      const detector = new BD({
        formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code", "itf", "data_matrix"],
      });

      intervalId = window.setInterval(async () => {
        if (cancelled || handled) return;
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            complete(barcodes[0].rawValue);
          }
        } catch {
          // ignore frame decode errors
        }
      }, 300) as unknown as number;

      return () => {
        cancelled = true;
        if (intervalId !== undefined) window.clearInterval(intervalId);
      };
    }

    void (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoElement(video, (result, _err, ctrl) => {
          if (cancelled || handled || !result) return;
          ctrl.stop();
          complete(result.getText());
        });
        zxingStop = () => {
          try {
            controls.stop();
          } catch {
            // ignore
          }
        };
        if (cancelled) zxingStop();
      } catch {
        if (!cancelled) setError("当前环境无法自动识别条码，请手动输入 IMEI");
      }
    })();

    return () => {
      cancelled = true;
      zxingStop?.();
    };
  }, [scanning, onScan, onClose, stopCamera]);

  const nativeBarcode =
    typeof window !== "undefined" && typeof (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !== "undefined";

  return (
    <OverlayPortal
      open={open}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
    >
      <div className="flex w-full max-w-md flex-col rounded-t-2xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-2xl md:pb-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground font-display">扫描 IMEI / 条形码</span>
          <button
            className="ui-btn ui-btn-secondary flex h-9 w-9 items-center justify-center text-xs"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-[70%] rounded-lg border-2 border-white/70" />
          </div>
        </div>

        {error && <div className="px-4 py-3 text-xs text-status-danger-foreground">{error}</div>}

        <div className="px-4 py-3 text-center text-xs text-muted-foreground">
          {nativeBarcode ? "将条形码对准框内，自动识别" : "兼容模式：请将条码对准取景框并保持清晰稳定"}
        </div>
      </div>
    </OverlayPortal>
  );
}
