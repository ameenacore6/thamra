import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, RefreshCw, X } from 'lucide-react';
import type { AppLanguage } from '../../types/farm';

export interface CapturedImagePayload {
  base64: string;
  mimeType: string;
  previewDataUrl: string;
  thumbDataUrl: string;
}

interface ImageCaptureInputProps {
  language: AppLanguage;
  currentPreview: string | null;
  onImageSelected: (payload: CapturedImagePayload | null) => void;
  labelEn?: string;
  labelAr?: string;
}

async function processImageBlobToPayload(fileOrBlob: Blob): Promise<CapturedImagePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const img = new Image();
      img.onload = () => {
        // Primary analysis image (max 1024px)
        const maxDim = 1024;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
        const commaIdx = compressedUrl.indexOf(',');

        // Lightweight storage thumbnail (max 240px)
        const thumbScale = Math.min(1, 240 / Math.max(img.width, img.height));
        const tw = Math.max(1, Math.round(img.width * thumbScale));
        const th = Math.max(1, Math.round(img.height * thumbScale));
        const tCanvas = document.createElement('canvas');
        tCanvas.width = tw;
        tCanvas.height = th;
        const tCtx = tCanvas.getContext('2d');
        tCtx?.drawImage(img, 0, 0, tw, th);
        const thumbDataUrl = tCanvas.toDataURL('image/jpeg', 0.72);

        resolve({
          base64: compressedUrl.slice(commaIdx + 1),
          mimeType: 'image/jpeg',
          previewDataUrl: compressedUrl,
          thumbDataUrl,
        });
      };
      img.onerror = () => reject(new Error('Unable to decode selected image.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(fileOrBlob);
  });
}

export const ImageCaptureInput: React.FC<ImageCaptureInputProps> = ({
  language,
  currentPreview,
  onImageSelected,
  labelEn = 'Upload or capture a clear photo in natural light',
  labelAr = 'ارفع صورة واضحة أو التقطها بالكاميرا في إضاءة طبيعية',
}) => {
  const isAr = language === 'ar';
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleOpenCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      mobileCameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError(
        isAr
          ? 'تعذر فتح الكاميرا المباشرة في هذا المتصفح — يمكنك اختيار صورة من الجهاز.'
          : 'Live camera preview is unavailable in this browser frame — use device camera picker or upload an image.',
      );
      mobileCameraInputRef.current?.click();
    }
  };

  const handleCaptureFrame = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const payload = await processImageBlobToPayload(blob);
        onImageSelected(payload);
        stopCamera();
      },
      'image/jpeg',
      0.9,
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCameraError(null);
    try {
      const payload = await processImageBlobToPayload(file);
      onImageSelected(payload);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Unable to process selected photo.');
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl border-2 border-dashed border-[#8E7D49]/40 bg-gradient-to-br from-[#faf8f4] to-[#edf2e2]/45 p-4 text-center">
        {currentPreview ? (
          <div className="relative inline-block max-w-full">
            <img
              src={currentPreview}
              alt={isAr ? 'الصورة المختارة للتحليل' : 'Selected plant or fruit preview'}
              referrerPolicy="no-referrer"
              className="max-h-56 rounded-xl object-contain mx-auto border border-[#D5D5D5] shadow-sm bg-white"
            />
            <button
              type="button"
              onClick={() => onImageSelected(null)}
              aria-label={isAr ? 'إزالة الصورة' : 'Clear photo'}
              className="absolute -top-2 -end-2 w-7 h-7 rounded-full bg-[#1C250C] text-white flex items-center justify-center shadow cursor-pointer hover:bg-[#535C21]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="py-3 space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-[#535C21]/10 text-[#535C21] flex items-center justify-center mx-auto">
              <ImagePlus className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-[#535C21]">
              {isAr ? labelAr : labelEn}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D5D5D5] hover:border-[#535C21] text-xs font-semibold text-[#1C250C] shadow-xs cursor-pointer transition-colors"
          >
            <ImagePlus className="w-4 h-4 text-[#535C21]" />
            <span>{isAr ? 'رفع صورة' : 'Upload Photo'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleOpenCamera()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#535C21] hover:bg-[#414919] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Camera className="w-4 h-4 text-[#DBAE83]" />
            <span>{isAr ? 'التقاط بالكاميرا' : 'Take Photo'}</span>
          </button>

          {currentPreview && (
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#f3f2ee] text-xs font-medium text-[#535C21] hover:bg-[#e2ead2] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'تغيير' : 'Replace'}</span>
            </button>
          )}
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => void handleFileChange(e)}
          className="hidden"
        />
        <input
          ref={mobileCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void handleFileChange(e)}
          className="hidden"
        />
      </div>

      {cameraError && (
        <p className="text-[11px] text-[#8E7D49] bg-[#DBAE83]/20 border border-[#AD927E]/40 rounded-lg px-3 py-1.5">
          {cameraError}
        </p>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-[#D5D5D5]">
            <div className="px-4 py-3 bg-[#535C21] text-white flex items-center justify-between">
              <span className="text-sm font-bold">
                {isAr ? 'التقاط صورة عبر الكاميرا' : 'Capture Plant / Fruit Photo'}
              </span>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 bg-[#f3f2ee]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-xl bg-black max-h-72 object-cover"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCaptureFrame()}
                  className="flex-1 py-2.5 rounded-xl bg-[#1C250C] text-[#DBAE83] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isAr ? 'التقاط الصورة الآن' : 'Capture Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#D5D5D5] text-xs font-semibold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
