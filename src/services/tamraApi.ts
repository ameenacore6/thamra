import type {
  AppLanguage,
  ChatMessage,
  FarmEnvironmentSnapshot,
  FarmPlot,
  SectionAiAnalysis,
  TamraEmotion,
} from '../types/farm';

export async function checkBackendHealth(): Promise<{
  ok: boolean;
  geminiConfigured: boolean;
}> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error('Backend server is unreachable.');
  }
  return (await res.json()) as { ok: boolean; geminiConfigured: boolean };
}

export async function sendTamraChat(params: {
  message: string;
  language: AppLanguage;
  history: ChatMessage[];
  farmSnapshot: FarmEnvironmentSnapshot | null;
  cropType?: string;
  soilType?: string;
  farmPlots?: FarmPlot[];
  focusedPlotId?: string | null;
  focusedSectionId?: string | null;
  rotationContext?: string;
  farmSummaryExtra?: string;
}): Promise<{
  reply: string;
  emotion: TamraEmotion;
  dataContextLabel: string;
  isSampleContext: boolean;
}> {
  const res = await fetch('/api/tamra/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      language: params.language,
      history: params.history.slice(-10).map((m) => ({
        sender: m.sender,
        text: m.text,
      })),
      farmSnapshot: params.farmSnapshot,
      cropType: params.cropType,
      soilType: params.soilType,
      farmPlots: params.farmPlots ?? [],
      focusedPlotId: params.focusedPlotId ?? undefined,
      focusedSectionId: params.focusedSectionId ?? undefined,
      rotationContext: params.rotationContext ?? undefined,
      farmSummaryExtra: params.farmSummaryExtra ?? undefined,
    }),
  });

  const payload = (await res.json()) as {
    ok: boolean;
    reply?: string;
    emotion?: TamraEmotion;
    dataContextLabel?: string;
    isSampleContext?: boolean;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.reply) {
    throw new Error(payload.error || 'Tamra could not generate a response.');
  }

  return {
    reply: payload.reply,
    emotion: payload.emotion ?? 'happy',
    dataContextLabel: payload.dataContextLabel ?? '',
    isSampleContext: Boolean(payload.isSampleContext),
  };
}

export async function analyzeSectionWithTamra(params: {
  language: AppLanguage;
  plotName: string;
  plotAreaSqMeters: number;
  soilType?: string;
  sectionName: string;
  crop: string;
  sectionAreaSqMeters: number;
  snapshot: FarmEnvironmentSnapshot;
  resolutionContext: string;
}): Promise<SectionAiAnalysis> {
  const res = await fetch('/api/tamra/analyze-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const payload = (await res.json()) as {
    ok: boolean;
    analysis?: SectionAiAnalysis;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.analysis) {
    throw new Error(payload.error || 'Failed to analyze this farm section.');
  }

  return payload.analysis;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('Failed to encode recorded audio.'));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(new Error('Unable to read recorded audio buffer.'));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudioBlob(params: {
  blob: Blob;
  mimeType: string;
  language: AppLanguage;
}): Promise<string> {
  if (params.blob.size < 400) {
    return '';
  }
  const audioBase64 = await blobToBase64(params.blob);
  const res = await fetch('/api/tamra/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: params.mimeType || params.blob.type || 'audio/webm',
      language: params.language,
    }),
  });

  const payload = (await res.json()) as {
    ok: boolean;
    transcript?: string;
    error?: string;
  };

  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || 'Speech transcription failed.');
  }

  return (payload.transcript ?? '').trim();
}

export async function synthesizeTamraSpeech(text: string): Promise<{
  audioBase64: string;
  mimeType: string;
}> {
  const res = await fetch('/api/tamra/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const payload = (await res.json()) as {
    ok: boolean;
    audioBase64?: string;
    mimeType?: string;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.audioBase64) {
    throw new Error(payload.error || 'Voice synthesis failed.');
  }

  return {
    audioBase64: payload.audioBase64,
    mimeType: payload.mimeType || 'audio/wav',
  };
}

export interface MicrophoneSession {
  stop: () => Promise<{ blob: Blob; mimeType: string; peakLevel: number }>;
  cancel: () => void;
}

function pickSupportedRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function describeMicrophoneError(error: unknown, language: AppLanguage): string {
  const name = error instanceof DOMException ? error.name : '';
  const msg = error instanceof Error ? error.message : String(error);

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return language === 'ar'
      ? 'تم رفض إذن الميكروفون. يرجى السماح بالوصول إلى الميكروفون في إعدادات المتصفح أو فتح التطبيق في نافذة جديدة.'
      : 'Microphone permission was blocked. Allow microphone access in your browser site settings (or open the app in a new tab if inside a restricted preview).';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return language === 'ar'
      ? 'لم يتم العثور على ميكروفون متصل بهذا الجهاز.'
      : 'No microphone was detected on this device. Connect a mic or type your question below.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return language === 'ar'
      ? 'الميكروفون مستخدم حالياً بواسطة تطبيق آخر.'
      : 'Your microphone is currently busy in another app. Close other audio apps and try again.';
  }
  if (name === 'SecurityError') {
    return language === 'ar'
      ? 'يتطلب الميكروفون اتصالاً آمناً (HTTPS).'
      : 'Microphone capture requires a secure HTTPS context.';
  }
  return msg || 'Unable to start microphone recording.';
}

export interface MicrophoneSessionOptions {
  autoStopOnSilence?: boolean;
  silenceTimeoutMs?: number;
  onAutoSilenceStop?: (result: { blob: Blob; mimeType: string; peakLevel: number }) => void;
}

export async function startMicrophoneSession(
  onLevel?: (level: number) => void,
  options?: MicrophoneSessionOptions,
): Promise<MicrophoneSession> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser mediaDevices.getUserMedia is not available in this environment.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not supported in this browser.');
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    // Some devices or browsers reject advanced constraints; retry with plain { audio: true }
    if (err instanceof DOMException && err.name === 'OverconstrainedError') {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
      throw err;
    }
  }

  const preferredMime = pickSupportedRecorderMimeType();
  const recorder = preferredMime
    ? new MediaRecorder(stream, { mimeType: preferredMime })
    : new MediaRecorder(stream);

  const actualMime = recorder.mimeType || preferredMime || 'audio/webm';
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  let audioCtx: AudioContext | null = null;
  let rafId = 0;
  let peakLevel = 0;
  let hasSpoken = false;
  let lastSpeechAt = Date.now();
  let autoStopTriggered = false;
  const silenceTimeoutMs = options?.silenceTimeoutMs ?? 1450;

  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    stream.getTracks().forEach((track) => track.stop());
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
    onLevel?.(0);
  };

  const stopInternal = (): Promise<{ blob: Blob; mimeType: string; peakLevel: number }> =>
    new Promise((resolve, reject) => {
      if (recorder.state === 'inactive') {
        cleanup();
        const blob = new Blob(chunks, { type: actualMime });
        resolve({ blob, mimeType: actualMime, peakLevel });
        return;
      }

      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: actualMime });
        resolve({ blob, mimeType: actualMime, peakLevel });
      };

      recorder.onerror = () => {
        cleanup();
        reject(new Error('Microphone recording failed unexpectedly.'));
      };

      try {
        recorder.stop();
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const norm = (buffer[i] - 128) / 128;
          sum += norm * norm;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const level = Math.min(1, rms * 4.5);
        if (level > peakLevel) peakLevel = level;
        onLevel?.(level);

        if (options?.autoStopOnSilence && !autoStopTriggered) {
          const now = Date.now();
          if (level > 0.08) {
            hasSpoken = true;
            lastSpeechAt = now;
          } else if (hasSpoken && now - lastSpeechAt >= silenceTimeoutMs) {
            autoStopTriggered = true;
            void stopInternal().then((res) => options.onAutoSilenceStop?.(res));
            return;
          }
        }

        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }
  } catch {
    // Level meter is purely visual enhancement; recording continues if AudioContext fails
  }

  recorder.start(200);

  return {
    stop: stopInternal,
    cancel: () => {
      autoStopTriggered = true;
      try {
        if (recorder.state !== 'inactive') {
          recorder.onstop = null;
          recorder.stop();
        }
      } catch {
        // ignore
      } finally {
        cleanup();
      }
    },
  };
}
