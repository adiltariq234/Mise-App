import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Camera, ImageUp, Loader2, Sparkles, X } from 'lucide-react';

interface FridgeScannerPanelProps {
  previewImageUrl: string;
  summaryText: string;
  isAnalyzing: boolean;
  errorMessage: string | null;
  onDismissError: () => void;
  onAnalyzeFile: (file: File) => void;
  onAnalyzeDataUrl: (dataUrl: string, mimeType: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function FridgeScannerPanel({
  previewImageUrl,
  summaryText,
  isAnalyzing,
  errorMessage,
  onDismissError,
  onAnalyzeFile,
  onAnalyzeDataUrl,
  fileInputRef,
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
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
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
                  <span>Capture & Analyze</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white"
                >
                  Cancel
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
                Fridge preview ready
              </p>
            </div>
          )}
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
              Visual Ingredient Recognition
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl text-balance">
              Snap your open fridge, cook what you have
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-xl">
              {summaryText}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
              <span>Upload Fridge Photo</span>
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={openCamera}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Camera className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>Use Camera</span>
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
              <span>{isAnalyzing ? 'Analyzing Fridge...' : 'Re-scan Current Photo'}</span>
            </button>
          </div>

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
        </div>
      </div>
    </section>
  );
}
