import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ThinkingLevel, Type } from '@google/genai';
import {
  getGeminiClient,
  isGeminiConfigured,
  isRetryableOrFallbackGeminiError,
  mapGeminiError,
  TAMRA_FAST_MODEL,
  TAMRA_MODEL,
} from './server/geminiClient.ts';
import { getNasaBahrainData, NasaBahrainSnapshot } from './server/nasaClient.ts';
import {
  clearColabAnalysis,
  getColabAnalysis,
  validateAndSaveColabAnalysis,
} from './server/colabClient.ts';
import {
  addAuditEntry,
  addSoilLogEntry,
  createFarmRequestTicket,
  getAuditLogs,
  getFarmState,
  hasRolePermission,
  normalizeUserRole,
  queryFarmPlots,
  queryFarmRequests,
  schedulePlotIrrigation,
  updatePlotSalinityThreshold,
  UserRole,
} from './server/farmStore.ts';
import {
  ALLOWED_EMOTIONS,
  executeTamraToolCall,
  extractEmotionAndReply,
  extractVoiceSegments,
  PendingFarmAction,
  tamraFunctionDeclarations,
  TamraUiEffect,
} from './server/tamraTools.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Backend & Gemini configuration health check (never returns any secrets)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: isGeminiConfigured(),
      model: TAMRA_MODEL,
      timestamp: new Date().toISOString(),
    });
  });

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Helper: call Gemini with automatic failover between flash-lite and gemini-4-hydrogen + short backoff on 503/429
  async function generateWithResilience(
    ai: ReturnType<typeof getGeminiClient>,
    params: {
      contents: unknown;
      systemInstruction?: string;
      responseSchema?: Record<string, unknown>;
      tools?: Array<{ functionDeclarations: typeof tamraFunctionDeclarations }>;
      preferFast?: boolean;
    },
  ) {
    const attempts: Array<{ model: string; thinkingLevel: ThinkingLevel; delayMs: number }> =
      params.preferFast
        ? [
            { model: TAMRA_FAST_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 0 },
            { model: TAMRA_MODEL, thinkingLevel: ThinkingLevel.LOW, delayMs: 400 },
            { model: TAMRA_FAST_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 900 },
          ]
        : [
            { model: TAMRA_MODEL, thinkingLevel: ThinkingLevel.LOW, delayMs: 0 },
            { model: TAMRA_FAST_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 250 },
            { model: TAMRA_FAST_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 900 },
          ];

    let lastError: unknown;

    for (const attempt of attempts) {
      if (attempt.delayMs > 0) {
        await sleep(attempt.delayMs);
      }
      try {
        return await ai.models.generateContent({
          model: attempt.model,
          contents: params.contents as Parameters<typeof ai.models.generateContent>[0]['contents'],
          config: {
            ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
            thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
            ...(params.tools ? { tools: params.tools } : {}),
            ...(params.responseSchema && !params.tools
              ? {
                  responseMimeType: 'application/json',
                  responseSchema: params.responseSchema,
                }
              : {}),
          },
        });
      } catch (err) {
        lastError = err;
        if (!isRetryableOrFallbackGeminiError(err)) {
          throw err;
        }
      }
    }

    throw lastError;
  }

  async function runGeminiWithTools(
    ai: ReturnType<typeof getGeminiClient>,
    params: {
      initialContents: unknown[];
      systemInstruction: string;
      preferFast: boolean;
      actorRole: UserRole;
    },
  ) {
    const conversation: unknown[] = [...params.initialContents];
    const uiEffects: TamraUiEffect[] = [];
    const pendingActions: PendingFarmAction[] = [];

    let response = await generateWithResilience(ai, {
      preferFast: params.preferFast,
      systemInstruction: params.systemInstruction,
      contents: conversation,
      tools: [{ functionDeclarations: tamraFunctionDeclarations }],
    });

    for (let step = 0; step < 3; step += 1) {
      const calls = response.functionCalls;
      const previousContent = response.candidates?.[0]?.content;
      if (!calls?.length || !previousContent) break;

      const responseParts = calls.map((fc) => {
        const executed = executeTamraToolCall(
          fc.name ?? '',
          (fc.args ?? {}) as Record<string, unknown>,
          params.actorRole,
        );
        if (executed.uiEffect) {
          uiEffects.push(executed.uiEffect);
        }
        if (executed.pendingAction) {
          pendingActions.push(executed.pendingAction);
        }
        return {
          functionResponse: {
            id: fc.id,
            name: fc.name,
            response: executed.result,
          },
        };
      });

      conversation.push(previousContent, {
        role: 'user',
        parts: responseParts,
      });

      response = await generateWithResilience(ai, {
        preferFast: params.preferFast,
        systemInstruction: params.systemInstruction,
        contents: conversation,
        tools: [{ functionDeclarations: tamraFunctionDeclarations }],
      });
    }

    return { response, uiEffects, pendingActions };
  }

  // 1b. Fast audio transcription endpoint
  app.post('/api/tamra/transcribe', async (req, res) => {
    try {
      const audioBase64 =
        typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
      const mimeType =
        typeof req.body?.mimeType === 'string' && req.body.mimeType.trim()
          ? req.body.mimeType.trim()
          : 'audio/webm';
      const language = req.body?.language === 'ar' ? 'ar' : 'en';

      if (!audioBase64) {
        res.status(400).json({ ok: false, error: 'Audio recording data is required.' });
        return;
      }

      const ai = getGeminiClient();
      const promptText =
        language === 'ar'
          ? 'انسخ فقط الكلمات المنطوقة بوضوح من الصوت البشري باللغة العربية أو الإنجليزية. لا تخمّن أو تؤلّف أي جمل إذا كان الصوت صامتاً أو مجرد ضوضاء؛ في هذه الحالة أرجع نصاً فارغاً "".'
          : 'Transcribe ONLY words clearly spoken by a human voice in English or Arabic. Never guess or invent words if the audio is silent, static, or background noise—in that case return an empty string "".';

      const response = await generateWithResilience(ai, {
        preferFast: true,
        contents: {
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: promptText },
          ],
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.STRING,
              description: 'Exact spoken words or empty string if silent.',
            },
          },
          required: ['transcript'],
        },
      });

      let transcript = '';
      try {
        const parsed = JSON.parse((response.text ?? '{}').trim()) as {
          transcript?: string;
        };
        transcript = (parsed.transcript ?? '').trim();
      } catch {
        transcript = (response.text ?? '').trim();
      }

      res.json({ ok: true, transcript });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 1c. Single-round-trip Voice Chat: audio -> { transcript, reply, emotion }
  app.post('/api/tamra/voice-chat', async (req, res) => {
    try {
      const audioBase64 =
        typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
      const mimeType =
        typeof req.body?.mimeType === 'string' && req.body.mimeType.trim()
          ? req.body.mimeType.trim()
          : 'audio/webm';
      const language = req.body?.language === 'ar' ? 'ar' : 'en';
      const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
      const farmContext = req.body?.farmContext ?? {};

      if (!audioBase64) {
        res.status(400).json({ ok: false, error: 'Audio recording data is required.' });
        return;
      }

      let nasaData: NasaBahrainSnapshot | null = null;
      try {
        nasaData = await getNasaBahrainData(false);
      } catch {
        nasaData = null;
      }

      const colabAnalysis = farmContext?.colabAnalysis ?? getColabAnalysis();
      const actorRole = normalizeUserRole(farmContext?.userRole);

      const ai = getGeminiClient();
      const systemInstruction = [
        'You are Tamra (تمرة), a warm, friendly, practical bilingual (English & Arabic) AI assistant for farmers in Bahrain.',
        `Default response language: ${language === 'ar' ? 'Arabic (العربية)' : 'English'}. Match the language the farmer spoke in the audio.`,
        `Current user role: ${actorRole}. Respect permission rules returned by tools.`,
        'Listen to the farmer audio carefully. First transcribe ONLY words clearly spoken by a human voice.',
        'If the audio is silent or unintelligible noise with no clear speech, reply strictly with:\nTRANSCRIPT: ""\nREPLY: ""\n[EMOTION:confused]',
        'You have read/navigate/prefill tools (`navigate_to_tab`, `get_farm_plots`, `check_request_status`, `prefill_farm_form`) AND confirmation-gated action tools (`propose_irrigation_schedule`, `propose_farm_request`, `propose_threshold_update`).',
        'Never claim a schedule/ticket/threshold is already saved when a `propose_*` tool returns `awaitingConfirmation: true`; instead ask the user to tap Confirm on the confirmation card.',
        'When speech is present, always return your final answer in this exact 3-part format (and nothing outside it):',
        'TRANSCRIPT: <exact spoken words>',
        'REPLY: <your 2-4 sentence helpful answer grounded in farm context, tools, NASA POWER data, and Colab analysis if present>',
        `[EMOTION:<one of ${ALLOWED_EMOTIONS.join(', ')}>]`,
        'Current Farm App Context:',
        JSON.stringify(farmContext),
        'Live NASA POWER Bahrain Data:',
        nasaData ? JSON.stringify(nasaData) : 'Unavailable right now',
        'Latest Google Colab Python Analysis:',
        colabAnalysis ? JSON.stringify(colabAnalysis) : 'None imported yet',
      ].join('\n');

      const transcriptHistory = history
        .map((item: { sender?: string; text?: string }) => {
          const role = item.sender === 'user' ? 'Farmer' : 'Tamra';
          return `${role}: ${item.text ?? ''}`;
        })
        .join('\n');

      const promptText = transcriptHistory
        ? `Recent conversation:\n${transcriptHistory}\n\nListen to the farmer's new spoken audio message, use tools if requested, and respond in the required TRANSCRIPT/REPLY/[EMOTION] format.`
        : "Listen to the farmer's spoken audio message, use tools if requested, and respond in the required TRANSCRIPT/REPLY/[EMOTION] format.";

      const { response, uiEffects, pendingActions } = await runGeminiWithTools(ai, {
        preferFast: true,
        actorRole,
        systemInstruction,
        initialContents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: audioBase64 } },
              { text: promptText },
            ],
          },
        ],
      });

      const parsed = extractVoiceSegments(response.text ?? '');

      res.json({
        ok: true,
        transcript: parsed.transcript,
        reply: parsed.reply,
        emotion: parsed.emotion,
        nasaUsed: Boolean(nasaData),
        uiEffects,
        pendingActions,
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  function splitTtsText(text: string, maxLen = 160): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current ? `${current} ${word}` : word).length <= maxLen) {
        current = current ? `${current} ${word}` : word;
      } else {
        if (current) chunks.push(current);
        if (word.length > maxLen) {
          for (let i = 0; i < word.length; i += maxLen) {
            chunks.push(word.slice(i, i + maxLen));
          }
          current = '';
        } else {
          current = word;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  // 1d. Server-side Text-to-Speech (ensures Arabic & English voice output on all devices)
  app.post('/api/tamra/tts', async (req, res) => {
    try {
      const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      if (!rawText) {
        res.status(400).json({ ok: false, error: 'Text is required for speech generation.' });
        return;
      }

      const cleaned = rawText
        .replace(/[*_`#>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const isArabic = /[\u0600-\u06FF]/.test(cleaned);
      const tl = isArabic ? 'ar' : 'en';
      const chunks = splitTtsText(cleaned, 160);

      const clips: string[] = [];
      for (const chunk of chunks) {
        const ttsUrl =
          `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=` +
          encodeURIComponent(chunk);
        const ttsRes = await fetch(ttsUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000),
        });
        if (!ttsRes.ok) {
          throw new Error(`TTS service returned status ${ttsRes.status}`);
        }
        const arrayBuf = await ttsRes.arrayBuffer();
        clips.push(Buffer.from(arrayBuf).toString('base64'));
      }

      res.json({
        ok: true,
        clips,
        mimeType: 'audio/mpeg',
        language: tl,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate speech audio.';
      res.status(502).json({ ok: false, error: message });
    }
  });

  // 2. Live NASA POWER Agroclimatology data for Bahrain
  app.get('/api/nasa/bahrain', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      const data = await getNasaBahrainData(forceRefresh);
      res.json({ ok: true, data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach NASA POWER API.';
      res.status(502).json({ ok: false, error: message });
    }
  });

  // 2b. Google Colab Python analysis ingestion & retrieval routes
  app.get('/api/colab/analysis', (_req, res) => {
    res.json({ ok: true, analysis: getColabAnalysis() });
  });

  app.post('/api/colab/analysis', (req, res) => {
    const result = validateAndSaveColabAnalysis(req.body, 'colab-api');
    if (result.ok === false) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, analysis: result.analysis });
  });

  app.delete('/api/colab/analysis', (_req, res) => {
    clearColabAnalysis();
    res.json({ ok: true });
  });

  // 2c. Bahrain Farm Host Application APIs (Step 9)
  app.get('/api/farm/state', (_req, res) => {
    res.json({ ok: true, ...getFarmState() });
  });

  app.get('/api/farm/plots', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json({ ok: true, plots: queryFarmPlots(q) });
  });

  app.get('/api/farm/requests', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json({ ok: true, requests: queryFarmRequests(q) });
  });

  app.get('/api/farm/audit', (_req, res) => {
    res.json({ ok: true, auditLogs: getAuditLogs() });
  });

  app.post('/api/farm/soil-logs', (req, res) => {
    const actorRole = normalizeUserRole(req.body?.userRole);
    if (!hasRolePermission(actorRole, 'farmer')) {
      addAuditEntry({
        actionType: 'soil_log',
        actorRole,
        status: 'denied',
        summary: 'Viewer role denied saving soil reading.',
      });
      res.status(403).json({
        ok: false,
        error: 'Viewer role is read-only. Switch to Farmer or Manager to save readings.',
        ...getFarmState(),
      });
      return;
    }

    const plotId = typeof req.body?.plotId === 'string' ? req.body.plotId : '';
    const moisturePercent = Number(req.body?.moisturePercent);
    const salinityDsM = Number(req.body?.salinityDsM);
    const ph = Number(req.body?.ph);
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;

    if (
      !plotId ||
      Number.isNaN(moisturePercent) ||
      Number.isNaN(salinityDsM) ||
      Number.isNaN(ph)
    ) {
      res.status(400).json({
        ok: false,
        error: 'plotId, moisturePercent, salinityDsM, and ph are required.',
      });
      return;
    }

    const entry = addSoilLogEntry({ plotId, moisturePercent, salinityDsM, ph, notes });
    addAuditEntry({
      actionType: 'soil_log',
      actorRole,
      status: 'confirmed',
      summary: `Saved soil reading on ${plotId}: ${moisturePercent}% moisture, ${salinityDsM} dS/m, pH ${ph}.`,
    });
    res.json({ ok: true, entry, ...getFarmState() });
  });

  app.post('/api/farm/requests', (req, res) => {
    const actorRole = normalizeUserRole(req.body?.userRole);
    if (!hasRolePermission(actorRole, 'farmer')) {
      addAuditEntry({
        actionType: 'create_farm_request',
        actorRole,
        status: 'denied',
        summary: 'Viewer role denied creating farm request.',
      });
      res.status(403).json({
        ok: false,
        error: 'Viewer role is read-only. Switch to Farmer or Manager to create requests.',
        ...getFarmState(),
      });
      return;
    }

    const plotId = typeof req.body?.plotId === 'string' ? req.body.plotId : 'plot-b';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;

    if (!title) {
      res.status(400).json({ ok: false, error: 'Request title is required.' });
      return;
    }

    const ticket = createFarmRequestTicket({ plotId, title, notes });
    addAuditEntry({
      actionType: 'create_farm_request',
      actorRole,
      status: 'confirmed',
      summary: `Created farm request ${ticket.id} (${title}) for ${plotId}.`,
    });
    res.json({ ok: true, ticket, ...getFarmState() });
  });

  // 2d. Step 10 Confirmation & Permission Gate for Tamra-Proposed Actions
  app.post('/api/tamra/actions/confirm', (req, res) => {
    const actorRole = normalizeUserRole(req.body?.userRole);
    const decision = req.body?.decision === 'confirm' ? 'confirm' : 'cancel';
    const action = req.body?.pendingAction as PendingFarmAction | undefined;

    if (!action || !action.actionType || !action.payload) {
      res.status(400).json({ ok: false, error: 'Valid pendingAction object is required.' });
      return;
    }

    const requiredRole = normalizeUserRole(action.requiredRole);

    if (decision === 'cancel') {
      addAuditEntry({
        actionType: action.actionType,
        actorRole,
        status: 'cancelled',
        summary: `Cancelled: ${action.titleEn} (${action.summaryEn})`,
      });
      res.json({
        ok: true,
        status: 'cancelled',
        message: 'Action cancelled. No farm records were modified.',
        ...getFarmState(),
      });
      return;
    }

    if (!hasRolePermission(actorRole, requiredRole)) {
      addAuditEntry({
        actionType: action.actionType,
        actorRole,
        status: 'denied',
        summary: `Role "${actorRole}" denied executing "${action.titleEn}" (requires "${requiredRole}").`,
      });
      res.status(403).json({
        ok: false,
        status: 'denied',
        error: `Permission denied: "${action.titleEn}" requires the ${requiredRole} role (current role: ${actorRole}).`,
        ...getFarmState(),
      });
      return;
    }

    if (action.actionType === 'schedule_irrigation') {
      const plotId = String(action.payload.plotId ?? 'plot-a');
      const durationMinutes = Number(action.payload.durationMinutes) || 30;
      const startTime = String(action.payload.startTime ?? '05:00 AM');
      const updated = schedulePlotIrrigation({ plotId, durationMinutes, startTime });
      if (!updated) {
        res.status(404).json({ ok: false, error: 'Target farm plot not found.' });
        return;
      }
      addAuditEntry({
        actionType: 'schedule_irrigation',
        actorRole,
        status: 'confirmed',
        summary: `Scheduled ${durationMinutes} min irrigation at ${startTime} on ${updated.nameEn}.`,
      });
      res.json({
        ok: true,
        status: 'confirmed',
        message: `Irrigation scheduled for ${updated.nameEn} at ${startTime} (${durationMinutes} min).`,
        ...getFarmState(),
      });
      return;
    }

    if (action.actionType === 'create_farm_request') {
      const plotId = String(action.payload.plotId ?? 'plot-b');
      const title = String(action.payload.title ?? 'Farm Inspection');
      const scheduledFor =
        typeof action.payload.scheduledFor === 'string'
          ? action.payload.scheduledFor
          : 'Pending schedule';
      const notes =
        typeof action.payload.notes === 'string' ? action.payload.notes : undefined;
      const ticket = createFarmRequestTicket({ plotId, title, scheduledFor, notes });
      addAuditEntry({
        actionType: 'create_farm_request',
        actorRole,
        status: 'confirmed',
        summary: `Created ticket ${ticket.id}: ${ticket.titleEn}.`,
      });
      res.json({
        ok: true,
        status: 'confirmed',
        message: `Created request ${ticket.id}: ${ticket.titleEn}.`,
        ...getFarmState(),
      });
      return;
    }

    if (action.actionType === 'update_threshold') {
      const plotId = String(action.payload.plotId ?? 'plot-b');
      const maxSalinityDsM = Number(action.payload.maxSalinityDsM) || 2.5;
      const updated = updatePlotSalinityThreshold({ plotId, maxSalinityDsM });
      if (!updated) {
        res.status(404).json({ ok: false, error: 'Target farm plot not found.' });
        return;
      }
      addAuditEntry({
        actionType: 'update_threshold',
        actorRole,
        status: 'confirmed',
        summary: `Updated max salinity alert on ${updated.nameEn} to ${updated.maxSalinityDsM} dS/m.`,
      });
      res.json({
        ok: true,
        status: 'confirmed',
        message: `Max salinity alert for ${updated.nameEn} set to ${updated.maxSalinityDsM} dS/m.`,
        ...getFarmState(),
      });
      return;
    }

    res.status(400).json({ ok: false, error: 'Unsupported action type.' });
  });

  // 3. Step 3 verification route: confirms server-side Gemini + NASA connection works
  app.post('/api/tamra/test', async (req, res) => {
    try {
      const language = req.body?.language === 'ar' ? 'ar' : 'en';

      let nasaData: NasaBahrainSnapshot | null = null;
      try {
        nasaData = await getNasaBahrainData(false);
      } catch {
        nasaData = null;
      }

      const ai = getGeminiClient();
      const prompt =
        language === 'ar'
          ? `أنتِ تمرة، مساعدة زراعية ودودة لمزارعي البحرين. في جملة قصيرة واحدة، رحّبي بالمزارع واذكري حالة الطقس من بيانات ناسا الحالية (${nasaData ? `${nasaData.temperatureC}°م، رطوبة ${nasaData.humidityPercent}%` : 'بيانات البحرين'}).`
          : `You are Tamra, a friendly agricultural assistant for farmers in Bahrain. In one short welcoming sentence, greet the farmer and mention current NASA Bahrain conditions (${nasaData ? `${nasaData.temperatureC}°C, ${nasaData.humidityPercent}% humidity` : 'Bahrain field telemetry'}).`;

      const response = await generateWithResilience(ai, {
        preferFast: false,
        contents: prompt,
      });

      res.json({
        ok: true,
        model: TAMRA_MODEL,
        reply: response.text?.trim() || 'Tamra backend is connected.',
        nasaAttached: Boolean(nasaData),
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 4. Structured chat endpoint (wired to full conversation UI in Step 4)
  app.post('/api/tamra/chat', async (req, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      if (!message) {
        res.status(400).json({ ok: false, error: 'Message text is required.' });
        return;
      }

      const language = req.body?.language === 'ar' ? 'ar' : 'en';
      const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
      const farmContext = req.body?.farmContext ?? {};

      let nasaData: NasaBahrainSnapshot | null = null;
      try {
        nasaData = await getNasaBahrainData(false);
      } catch {
        nasaData = null;
      }

      const colabAnalysis = farmContext?.colabAnalysis ?? getColabAnalysis();
      const actorRole = normalizeUserRole(farmContext?.userRole);
      const ai = getGeminiClient();

      const systemInstruction = [
        'You are Tamra (تمرة), a warm, friendly, practical bilingual (English & Arabic) AI assistant for farmers in Bahrain.',
        `Default response language: ${language === 'ar' ? 'Arabic (العربية)' : 'English'}. If the farmer writes clearly in Arabic, reply in Arabic; if in English, reply in English.`,
        `Current user role: ${actorRole}. Respect permission denials returned by tools honestly.`,
        'You are integrated directly into the Mazraa Bahrain farm dashboard.',
        'Read/navigate/prefill tools: `navigate_to_tab`, `get_farm_plots`, `check_request_status`, `prefill_farm_form`.',
        'Confirmation-gated write tools: `propose_irrigation_schedule`, `propose_farm_request`, `propose_threshold_update`.',
        'Never say an irrigation change, ticket creation, or threshold change is already completed when a `propose_*` tool returns `awaitingConfirmation: true`—clearly ask the user to tap Confirm on the confirmation card.',
        'Always ground your guidance in tool results, Bahrain farm context, live NASA POWER satellite dataset, AND imported Google Colab Python analysis whenever present.',
        'Keep responses clear, helpful, and concise (2-4 sentences unless the farmer asks for deeper steps).',
        `At the very end of your response on a new line, include strictly one emotion tag in the format [EMOTION:<name>] choosing from: ${ALLOWED_EMOTIONS.join(', ')}.`,
        'Current Farm App Context:',
        JSON.stringify(farmContext),
        'Live NASA POWER Bahrain Data:',
        nasaData ? JSON.stringify(nasaData) : 'Unavailable right now',
        'Latest Google Colab Python Analysis:',
        colabAnalysis ? JSON.stringify(colabAnalysis) : 'None imported yet',
      ].join('\n');

      const transcript = history
        .map((item: { sender?: string; text?: string }) => {
          const role = item.sender === 'user' ? 'Farmer' : 'Tamra';
          return `${role}: ${item.text ?? ''}`;
        })
        .join('\n');

      const fullContents = transcript
        ? `Recent conversation:\n${transcript}\n\nFarmer: ${message}`
        : message;

      const { response, uiEffects, pendingActions } = await runGeminiWithTools(ai, {
        preferFast: true,
        actorRole,
        systemInstruction,
        initialContents: [{ role: 'user', parts: [{ text: fullContents }] }],
      });

      const parsed = extractEmotionAndReply(response.text ?? '');

      res.json({
        ok: true,
        reply: parsed.reply,
        emotion: parsed.emotion,
        nasaUsed: Boolean(nasaData),
        uiEffects,
        pendingActions,
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tamra server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
