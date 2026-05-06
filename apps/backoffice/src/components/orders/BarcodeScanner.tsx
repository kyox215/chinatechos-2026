"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setScanning(true);
      } catch { if (!cancelled) setError("无法访问摄像头，请检查权限设置"); }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [open, stopCamera]);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    if (!("BarcodeDetector" in window)) {
      // Can't use BarcodeDetector - user must input manually
      return;
    }

    const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({
      formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code"],
    });

    let active = true;
    const interval = setInterval(async () => {
      if (!active || !videoRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          active = false;
          onScan(barcodes[0].rawValue);
          stopCamera();
          onClose();
        }
      } catch {
        // detection frame error, ignore
      }
    }, 300);

    return () => { active = false; clearInterval(interval); };
  }, [scanning, onScan, onClose, stopCamera]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4">
      <div className="flex w-full max-w-md flex-col rounded-t-2xl bg-surface md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-neutral-900">扫描 IMEI / 条形码</span>
          <button
            className="ui-btn ui-btn-secondary h-8 w-8 flex items-center justify-center text-xs"
            onClick={() => { stopCamera(); onClose(); }}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-[70%] rounded-lg border-2 border-white/70" />
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 text-xs text-rose-600">{error}</div>
        )}

        <div className="px-4 py-3 text-center text-xs text-neutral-500">
          将条形码对准框内，自动识别
        </div>
      </div>
    </div>
  );
}
