import { GoogleGenAI } from '@google/genai';

export const TAMRA_CHAT_MODEL = 'gemini-4-hydrogen';
export const TAMRA_FAST_MODEL = 'gemini-3.1-flash-lite';
export const TAMRA_TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
export const TAMRA_TTS_MODEL = 'gemini-3.8-flash-lite-tts';

const cachedClients = new Map<string, GoogleGenAI>();

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

export function getGeminiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add your key in AI Studio Settings > Secrets.',
    );
  }
  const cacheKey = apiVersion || 'default';
  const existing = cachedClients.get(cacheKey);
  if (existing) return existing;

  const client = new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  cachedClients.set(cacheKey, client);
  return client;
}

export function isRetryableGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('429') ||
    message.includes('503') ||
    message.includes('unavailable') ||
    message.includes('overloaded') ||
    message.includes('rate limit')
  );
}

export function mapGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes('not configured') || lower.includes('api_key_invalid') || lower.includes('403')) {
    return {
      status: 400,
      message: 'Gemini API key is missing or invalid. Please check Settings > Secrets.',
    };
  }
  if (lower.includes('429') || lower.includes('resource_exhausted')) {
    return {
      status: 429,
      message: 'Gemini rate limit reached briefly. Please wait a moment and try again.',
    };
  }
  if (lower.includes('503') || lower.includes('unavailable')) {
    return {
      status: 503,
      message: 'AI service is temporarily busy. Please retry in a few seconds.',
    };
  }
  return {
    status: 500,
    message: raw || 'Unexpected error communicating with Gemini.',
  };
}
