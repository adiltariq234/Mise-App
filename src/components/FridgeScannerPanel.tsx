import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Camera, ImageUp, Loader2, Sparkles, X } from 'lucide-react';
import type { UiStrings } from '../utils/i18n.ts';
import { getStrings } from '../utils/i18n.ts';

export type ScanStage =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'analyzing'
  | 'generating'
  | 'polling';

function stageLabel(s: UiStrings, stage: Exclude<ScanStage, 'idle'>): string {
  switch (stage) {
    case 'preparing':
      return s.stagePreparing;
    case 'uploading':
      return s.stageUploading;
    case 'analyzing':
      return s.stageAnalyzing;
    case 'generating':
      return s.stageGenerating;
    case 'polling':
      return s.stagePolling;
  }
}

interface FridgeScannerPanelProps {
  previewImageUrl: string;
  summaryText: string;
  isAnalyzing: boolean;
  scanStage: ScanStage;
  scanElapsedSeconds: number;
  errorMessage: string | null;
  isDemo: boolean;
  onDismissError: () => void;
  onAnalyzeFile: (file: File) => void;
  onAnalyzeDataUrl: (dataUrl: string, mimeType: string) => void;
  onClearScan: () => void;
  onShowLegal: (view: 'privacy' | 'terms') => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  s?: UiStrings;
}

export function FridgeScannerPanel({
  previewImageUrl,
  summaryText,
  isAnalyzing,
  scanStage,
  scanElapsedSeconds,
  errorMessage,
  isDemo,
  onDismissError,
  onAnalyzeFile,
  onAnalyzeDataUrl,
  onClearScan,
  onShowLegal,
  fileInputRef,
  s = getStrings('en'),
}: FridgeScannerPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [previewImageUrl]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const openCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera capture is not supported in this browser. Please upload a photo instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        'Could not access the camera. Grant camera permission or upload an image from your device.',
      );
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 960;
    // Downscale the capture to a max of 1024 px so the upload stays small.
    const scale = Math.min(1, 1024 / Math.max(srcW, srcH));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(srcW * scale));
    canvas.height = Math.max(1, Math.round(srcH * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    onAnalyzeDataUrl(dataUrl, 'image/jpeg');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAnalyzeFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onAnalyzeFile(file);
    }
  };

  const analyzeCurrentPreview = async () => {
    try {
      const response = await fetch(previewImageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onAnalyzeDataUrl(reader.result, blob.type || 'image/jpeg');
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setCameraError('Could not read the current fridge image for analysis.');
    }
  };

  const elapsedLabel = `${Math.floor(scanElapsedSeconds / 60)}:${String(scanElapsedSeconds % 60).padStart(2, '0')}`;

  return (
    <section
      aria-label="Fridge photo scanner"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
        {/* Left: Fridge Photo or Live Camera */}
        <div className="relative md:col-span-5 bg-slate-100 min-h-[220px]">
          {cameraOpen ? (
            <div className="relative h-full w-full bg-slate-900">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover min-h-[240px]"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  <span>{s.captureAnalyze}</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white"
                >
                  {s.cancel}
                </button>
              </div>
            </div>
          ) : !imgFailed ? (
            <img
              src={previewImageUrl}
              alt="Open refrigerator stocked with fresh ingredients"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover max-h-[290px] md:max-h-none"
            />
          ) : (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6 text-center">
              <Camera className="h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-slate-600">
                {s.fridgePreviewReady}
              </p>
            </div>
          )}
          {isDemo && !cameraOpen ? (
            <span className="absolute left-3 top-3 rounded-md bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
              {s.sampleFridge}
            </span>
          ) : null}
        </div>

        {/* Right: Upload & AI Analysis Controls */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`md:col-span-7 flex flex-col justify-between p-6 transition-colors ${
            isDragging ? 'bg-emerald-50/70' : 'bg-white'
          }`}
        >
          <div>
            <p className="text-xs font-medium tracking-wide text-emerald-800">
              {s.scannerKicker}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl text-balance">
              {s.scannerTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-xl">
              {summaryText}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Upload fridge photo"
          />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <ImageUp className="h-4 w-4" aria-hidden="true" />
              <span>{s.uploadPhoto}</span>
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={openCamera}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Camera className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>{s.useCamera}</span>
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={analyzeCurrentPreview}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-100/70 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              )}
              <span>{isAnalyzing ? s.analyzingFridge : s.rescanPhoto}</span>
            </button>

            {!isDemo && !isAnalyzing ? (
              <button
                type="button"
                onClick={onClearScan}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <span>{s.clearScan}</span>
              </button>
            ) : null}
          </div>

          {/* Scan progress — staged feedback for the 60–120 s AI call */}
          {isAnalyzing && scanStage !== 'idle' ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>{stageLabel(s, scanStage)}</span>
                <span className="ml-auto font-mono text-xs tabular-nums">{elapsedLabel}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-800">
                {s.scanTakesAboutAMinute}
              </p>
            </div>
          ) : null}

          {errorMessage || cameraError ? (
            <div
              role="alert"
              className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900"
            >
              <span>{errorMessage || cameraError}</span>
              <button
                type="button"
                aria-label="Dismiss error message"
                onClick={() => {
                  setCameraError(null);
                  onDismissError();
                }}
                className="rounded p-0.5 text-amber-700 hover:bg-amber-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Your photo is sent to OpenRouter and its AI model provider to
            detect ingredients. Photos are not stored on Fridjo&apos;s server.
            JPG, PNG, and WebP supported (HEIC photos need to be exported as
            JPG first).{' '}
            <button
              type="button"
              onClick={() => onShowLegal('privacy')}
              className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              {s.privacyPolicy}
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => onShowLegal('terms')}
              className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              {s.terms}
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
