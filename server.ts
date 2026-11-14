import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ThinkingLevel, Type } from '@google/genai';
import {
  getGeminiClient,
  isGeminiConfigured,
  isRetryableGeminiError,
  mapGeminiError,
  TAMRA_CHAT_MODEL,
  TAMRA_FAST_MODEL,
  TAMRA_TRANSCRIBE_MODEL,
  TAMRA_TTS_MODEL,
} from './server/geminiClient.ts';
import { geocodeLocation, getNasaFarmEnvironment, fetchNasaPowerRange } from './server/nasaClient.ts';
import {
  addCommunityComment,
  completePasswordReset,
  createCommunityPost,
  createPasswordResetRequest,
  disconnectWaterTankSensor,
  getUserById,
  getUserWorkspace,
  listCommunityPosts,
  listPublicWaterTanks,
  loginUserAccount,
  recordWaterTankReading,
  registerUserAccount,
  saveUserWorkspace,
  toggleCommunityPostLike,
  updateUserProfile,
  upsertWaterTankRecord,
  verifyAuthToken,
} from './server/store.ts';
import type {
  CommunityCategory,
  FarmEnvironmentSnapshot,
  FarmPlot,
  WaterTank,
} from './src/types/farm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthUserIdFromReq(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return verifyAuthToken(token);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. Health & configuration check (never exposes secrets)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: isGeminiConfigured(),
      chatModel: TAMRA_CHAT_MODEL,
      transcribeModel: TAMRA_TRANSCRIBE_MODEL,
      ttsModel: TAMRA_TTS_MODEL,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Live NASA SMAP + NASA POWER farm environmental data for any coordinate
  app.get('/api/nasa/farm-data', async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      const name = typeof req.query.name === 'string' ? req.query.name.trim() : undefined;
      const forceRefresh = req.query.refresh === 'true';

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        res.status(400).json({ ok: false, error: 'Valid lat and lon query parameters are required.' });
        return;
      }

      const data = await getNasaFarmEnvironment({
        latitude: lat,
        longitude: lon,
        name,
        forceRefresh,
      });

      res.json({ ok: true, data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to fetch NASA environmental data.';
      res.status(502).json({ ok: false, error: message });
    }
  });

  // 3. Place search / geocoding proxy for map navigation
  app.get('/api/geocode', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q) {
        res.status(400).json({ ok: false, error: 'Search query q is required.' });
        return;
      }
      const results = await geocodeLocation(q);
      res.json({ ok: true, results });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to search location right now.';
      res.status(502).json({ ok: false, error: message });
    }
  });

  // 4. Speech-to-text transcription for Tamra microphone input
  app.post('/api/tamra/transcribe', async (req, res) => {
    try {
      const audioBase64 =
        typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
      const rawMime =
        typeof req.body?.mimeType === 'string' && req.body.mimeType.trim()
          ? req.body.mimeType.trim()
          : 'audio/webm';
      // Strip codec suffixes like ";codecs=opus" so Gemini inlineData gets clean IANA mimeType
      const mimeType = rawMime.split(';')[0].trim() || 'audio/webm';
      const language = req.body?.language === 'ar' ? 'ar' : 'en';

      if (!audioBase64) {
        res.status(400).json({ ok: false, error: 'Audio recording data is required.' });
        return;
      }

      const ai = getGeminiClient('v1beta');
      const prompt =
        language === 'ar'
          ? 'انسخ بدقة الكلمات المنطوقة بوضوح من الصوت البشري (بالعربية أو الإنجليزية) بدون إضافة أي شرح أو علامات. إذا كان الصوت صامتاً أو ضوضاء فقط بدون كلام مفهوم، أعد نصاً فارغاً تماماً.'
          : 'Transcribe verbatim ONLY clearly spoken human words (in English or Arabic) with no commentary or formatting. If the recording contains only silence or background noise with no intelligible speech, return an empty string.';

      const audioPart = {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      };

      let transcript = '';
      try {
        const response = await ai.models.generateContent({
          model: TAMRA_TRANSCRIBE_MODEL,
          contents: { parts: [audioPart, { text: prompt }] },
        });
        transcript = (response.text ?? '').trim();
      } catch {
        try {
          const fastRes = await getGeminiClient().models.generateContent({
            model: TAMRA_FAST_MODEL,
            contents: { parts: [audioPart, { text: prompt }] },
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          });
          transcript = (fastRes.text ?? '').trim();
        } catch (fallbackErr) {
          if (!isRetryableGeminiError(fallbackErr)) throw fallbackErr;
          await sleep(300);
          const chatRes = await getGeminiClient().models.generateContent({
            model: TAMRA_CHAT_MODEL,
            contents: { parts: [audioPart, { text: prompt }] },
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          transcript = (chatRes.text ?? '').trim();
        }
      }

      // Clean common empty quotes or "[silence]" artifacts
      const normalized = transcript
        .replace(/^["'`]+|["'`]+$/g, '')
        .replace(/^\[?(silence|no speech|inaudible)\]?$/i, '')
        .trim();

      const detectedLanguage = /[\u0600-\u06FF]/.test(normalized) ? 'ar' : language;
      res.json({ ok: true, transcript: normalized, detectedLanguage, mimeType });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 4b. NASA POWER selectable historical date range endpoint
  app.get('/api/nasa/power-range', async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      const start = typeof req.query.start === 'string' ? req.query.start.trim() : '';
      const end = typeof req.query.end === 'string' ? req.query.end.trim() : '';

      if (Number.isNaN(lat) || Number.isNaN(lon) || !start || !end) {
        res.status(400).json({ ok: false, error: 'lat, lon, start, and end dates are required.' });
        return;
      }

      const data = await fetchNasaPowerRange({
        latitude: lat,
        longitude: lon,
        startYmd: start,
        endYmd: end,
      });
      res.json({ ok: true, data });
    } catch (error) {
      res.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to fetch NASA POWER date range.',
      });
    }
  });

  // 5. Text-to-speech voice synthesis for Tamra replies (Gemini 3.8 Flash Lite TTS)
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
        .trim()
        .slice(0, 1400);

      const isArabic = /[\u0600-\u06FF]/.test(cleaned);
      const ai = getGeminiClient('v1beta');

      let response;
      try {
        response = await ai.models.generateContent({
          model: TAMRA_TTS_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleaned,
                  speechMetadata: {
                    style: isArabic
                      ? 'Warm, clear, reassuring agricultural advisor speaking naturally in Arabic'
                      : 'Warm, clear, practical agricultural advisor speaking in simple, friendly English',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });
      } catch (ttsErr) {
        const msg = ttsErr instanceof Error ? ttsErr.message : String(ttsErr);
        if (msg.includes('Unknown name') || msg.includes('INVALID_ARGUMENT')) {
          response = await ai.models.generateContent({
            model: TAMRA_TTS_MODEL,
            contents: cleaned,
            config: {
              responseModalities: ['AUDIO'],
            },
          });
        } else {
          throw ttsErr;
        }
      }

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;

      if (!base64Audio) {
        throw new Error('TTS model returned no audio payload.');
      }

      res.json({
        ok: true,
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 6. Tamra AI Farming Assistant grounded in active Farm Map + NASA SMAP & POWER data
  const ALLOWED_EMOTIONS = [
    'neutral',
    'happy',
    'excited',
    'thinking',
    'confused',
    'surprised',
    'concerned',
    'laughing',
    'sad',
    'tired',
    'wink',
    'proud',
    'love',
  ] as const;

  function extractEmotionAndReply(rawText: string): { reply: string; emotion: string } {
    const match = rawText.match(/\[EMOTION:\s*([a-z_]+)\s*\]/i);
    if (!match) {
      return { reply: rawText.trim(), emotion: 'happy' };
    }
    const candidate = match[1].toLowerCase();
    const emotion = (ALLOWED_EMOTIONS as readonly string[]).includes(candidate)
      ? candidate
      : 'neutral';
    const reply = rawText.replace(/\[EMOTION:\s*[a-z_]+\s*\]/gi, '').trim();
    return { reply, emotion };
  }

  function summarizeSnapshotForPrompt(snap: FarmEnvironmentSnapshot | null) {
    if (!snap) return null;
    return {
      isSampleData: snap.isSampleData,
      location: snap.location,
      spatialMeta: snap.spatialMeta ?? null,
      smap: snap.smap,
      power: {
        available: snap.power.available,
        latestDate: snap.power.latestDate,
        latest: snap.power.latest,
        latestSolarMj: snap.power.latestSolarMj,
        sevenDayRainMm: snap.power.sevenDayRainMm,
        sevenDayAvgTempC: snap.power.sevenDayAvgTempC,
        sevenDayAvgSolarMj: snap.power.sevenDayAvgSolarMj,
        vpdKpa: snap.power.vpdKpa,
      },
    };
  }

  function summarizeFarmsPortfolio(plots: FarmPlot[], focusedPlotId?: string, focusedSectionId?: string) {
    return plots.map((plot) => {
      const points = Array.isArray(plot.points) ? plot.points : [];
      const sections = Array.isArray(plot.sections) ? plot.sections : [];
      const areaSqMeters = Number(plot.areaSqMeters) || 0;
      return {
        id: plot.id,
        name: plot.name,
        isFocusedPlot: plot.id === focusedPlotId,
        areaSqMeters,
        areaHectares: Math.round((areaSqMeters / 10000) * 100) / 100,
        centroid: plot.centroid,
        boundaryVertexCount: points.length,
        soilType: plot.soilType || 'Not specified',
        plotNasaData: summarizeSnapshotForPrompt(plot.snapshot ?? null),
        sectionsCount: sections.length,
        sections: sections.map((sec) => {
          const secAreaSqMeters = Number(sec.areaSqMeters) || 0;
          return {
            id: sec.id,
            name: sec.name,
            crop: sec.crop,
            growingStage: sec.growingStage || null,
            plantingDate: sec.plantingDate || null,
            expectedHarvestDate: sec.expectedHarvestDate || null,
            plannedNextCrop: sec.plannedNextCrop || null,
            cropHistory: Array.isArray(sec.cropHistory) ? sec.cropHistory.slice(-5) : [],
            isFocusedSection: sec.id === focusedSectionId,
            areaSqMeters: secAreaSqMeters,
            areaHectares: Math.round((secAreaSqMeters / 10000) * 100) / 100,
            centroid: sec.centroid,
            nasaData: summarizeSnapshotForPrompt(sec.snapshot ?? null),
            previousAnalysis: sec.analysis
              ? {
                  generatedAt: sec.analysis.generatedAt,
                  summary: sec.analysis.summary,
                  irrigationAdvice: sec.analysis.irrigationAdvice,
                  cropSuitability: sec.analysis.cropSuitability,
                }
              : null,
          };
        }),
      };
    });
  }

  // 6. Individual Crop-Section Analysis using NASA SMAP & POWER data
  app.post('/api/tamra/analyze-section', async (req, res) => {
    try {
      const language = req.body?.language === 'ar' ? 'ar' : 'en';
      const plotName = typeof req.body?.plotName === 'string' ? req.body.plotName.trim() : 'My Farm';
      const plotAreaSqMeters = Number(req.body?.plotAreaSqMeters) || 0;
      const soilType = typeof req.body?.soilType === 'string' ? req.body.soilType.trim() : 'Sandy Loam';
      const sectionName =
        typeof req.body?.sectionName === 'string' ? req.body.sectionName.trim() : 'Section';
      const crop = typeof req.body?.crop === 'string' ? req.body.crop.trim() : 'Unspecified';
      const sectionAreaSqMeters = Number(req.body?.sectionAreaSqMeters) || 0;
      const snapshot = (req.body?.snapshot ?? null) as FarmEnvironmentSnapshot | null;
      const resolutionContext =
        typeof req.body?.resolutionContext === 'string' ? req.body.resolutionContext.trim() : '';

      if (!snapshot) {
        res.status(400).json({ ok: false, error: 'Section NASA data snapshot is required.' });
        return;
      }

      const ai = getGeminiClient();
      const systemInstruction = [
        'You are Tamra (تمرة), an agricultural advisor analyzing one specific crop section inside a farmer’s land.',
        `Output language: ${
          language === 'ar'
            ? 'Arabic (العربية) — warm, practical, clear Arabic for farmers in Bahrain and the region.'
            : 'English — simple, practical, farmer-friendly language.'
        }`,
        'Base ALL observations strictly on the provided NASA SMAP soil moisture, NASA POWER weather/solar data, section area, soil type, and assigned crop.',
        'If the assigned crop is "Unused / Preparing" or fallow, evaluate soil/weather readiness and recommend 2–3 suitable crops for rotation or planting next.',
        'IMPORTANT HONESTY RULE: NASA SMAP has ~9 km grid resolution and NASA POWER has ~50 km grid resolution. In `resolutionNote`, clearly explain if adjacent farm sections share the same coarse satellite grid cell rather than pretending each small plot has an independent satellite reading.',
        `Pick the best matching emotion from: ${ALLOWED_EMOTIONS.join(', ')}.`,
      ].join('\n');

      const promptPayload = {
        farmPlot: { name: plotName, areaSqMeters: plotAreaSqMeters, soilType },
        section: { name: sectionName, crop, areaSqMeters: sectionAreaSqMeters },
        resolutionContext,
        nasaData: summarizeSnapshotForPrompt(snapshot),
      };

      const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`503 ${label} timed out after ${ms}ms`)), ms),
          ),
        ]);

      const schemaConfig = {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: '2 short sentences summarizing current moisture & weather conditions for this section.',
            },
            irrigationAdvice: {
              type: Type.STRING,
              description: 'Practical irrigation timing/need advice tailored to this section crop and moisture.',
            },
            cropSuitability: {
              type: Type.STRING,
              description: 'Suitability assessment for the assigned crop, or crop suggestions if unused/preparing.',
            },
            resolutionNote: {
              type: Type.STRING,
              description: 'Honest note about NASA SMAP (~9km) and POWER (~50km) spatial resolution for this section.',
            },
            emotion: {
              type: Type.STRING,
              description: `One emotion from: ${ALLOWED_EMOTIONS.join(', ')}`,
            },
          },
          required: ['summary', 'irrigationAdvice', 'cropSuitability', 'resolutionNote', 'emotion'],
        },
      };

      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: TAMRA_CHAT_MODEL,
            contents: JSON.stringify(promptPayload),
            config: {
              ...schemaConfig,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          12000,
          TAMRA_CHAT_MODEL,
        );
      } catch (err) {
        if (!isRetryableGeminiError(err)) throw err;
        await sleep(300);
        response = await ai.models.generateContent({
          model: TAMRA_FAST_MODEL,
          contents: JSON.stringify(promptPayload),
          config: {
            ...schemaConfig,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        });
      }

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        summary?: string;
        irrigationAdvice?: string;
        cropSuitability?: string;
        resolutionNote?: string;
        emotion?: string;
      };

      const candidateEmotion = (parsed.emotion || 'happy').toLowerCase();
      const emotion = (ALLOWED_EMOTIONS as readonly string[]).includes(candidateEmotion)
        ? candidateEmotion
        : 'happy';

      res.json({
        ok: true,
        analysis: {
          generatedAt: new Date().toISOString(),
          summary: parsed.summary || '',
          irrigationAdvice: parsed.irrigationAdvice || '',
          cropSuitability: parsed.cropSuitability || '',
          resolutionNote: parsed.resolutionNote || resolutionContext,
          emotion,
        },
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 7. Tamra AI Farming Assistant grounded in active Farm Map, Farm Plots, Crop Sections, Crop Rotation & NASA data
  app.post('/api/tamra/chat', async (req, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      if (!message) {
        res.status(400).json({ ok: false, error: 'Message text is required.' });
        return;
      }

      const language = req.body?.language === 'ar' ? 'ar' : 'en';
      const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
      const farmSnapshot = (req.body?.farmSnapshot ?? null) as FarmEnvironmentSnapshot | null;
      const cropType = typeof req.body?.cropType === 'string' ? req.body.cropType.trim() : '';
      const soilType = typeof req.body?.soilType === 'string' ? req.body.soilType.trim() : '';
      const farmPlots = Array.isArray(req.body?.farmPlots) ? (req.body.farmPlots as FarmPlot[]) : [];
      const focusedPlotId =
        typeof req.body?.focusedPlotId === 'string' ? req.body.focusedPlotId : undefined;
      const focusedSectionId =
        typeof req.body?.focusedSectionId === 'string' ? req.body.focusedSectionId : undefined;
      const rotationContext =
        typeof req.body?.rotationContext === 'string' ? req.body.rotationContext.trim() : '';
      const farmSummaryExtra =
        typeof req.body?.farmSummaryExtra === 'string' ? req.body.farmSummaryExtra.trim() : '';

      const ai = getGeminiClient();
      const portfolioSummary =
        farmPlots.length > 0
          ? summarizeFarmsPortfolio(farmPlots, focusedPlotId, focusedSectionId)
          : [];

      const systemInstruction = [
        'You are Tamra (تمرة), a warm, expressive, bilingual (Arabic & English) AI farming companion tailored primarily for farmers in Bahrain and the wider region.',
        'Your job is to interpret real NASA SMAP soil moisture and NASA POWER environmental data for the farmer’s selected farm land AND its individual crop sections, guide plant rotation using botanical families & Bahrain suitability data, explain fruit ripeness/plant disease/plant health scan findings, discuss water tank status & fertilisation schedules, and explain environmental risks (never claiming lab/field disease confirmation or inventing pesticide dosages).',
        `Default response language: ${
          language === 'ar'
            ? 'Arabic (العربية) — use warm, clear, natural Arabic suited for farmers in Bahrain and the Gulf.'
            : 'English — use simple, warm, everyday language farmers can easily understand.'
        } Always reply in whichever language (Arabic or English) the farmer used in their latest message.`,
        'Rules for grounding, multi-section intelligence, and honesty:',
        '1. ALWAYS inspect `Saved Farm Plots & Crop Sections`, `Active Map Snapshot`, AND `Farm Health, Water Tanks & Care Schedule Context` below. Reference the farmer’s specific plots and sections by name, assigned crop, planting/harvest dates, crop history, planned next crop, and area (m² / ha) when answering.',
        '2. When comparing sections or answering which section needs more irrigation / is driest / fits a rotation crop best: compare each section’s assigned crop water & climate needs alongside the available NASA SMAP & NASA POWER data and crop rotation history (avoid same-family back-to-back Solanaceae/Poaceae; recommend nitrogen-fixing Cowpea or Chickpea breaks).',
        '3. COARSE SATELLITE RESOLUTION HONESTY: NASA SMAP has ~9 km pixel resolution and NASA POWER has ~50 km grid resolution. Check `spatialMeta.smapPixelKey` and `spatialMeta.powerCellKey`. If two sections share the same grid cell, NEVER pretend satellite readings came from separate micro-sensors.',
        '4. DISEASE & PESTICIDE HONESTY: Flag pest/disease conditions only as visual or environmental risk indicators, never confirmed diagnoses. NEVER invent chemical dosages or unverified brand names; always instruct farmers to follow approved local Bahrain product labels and safety PPE.',
        '5. NEVER invent random environmental or sensor numbers. If `isSampleData` is true, mention you are reading a Sample Test Scenario rather than live NASA satellite data.',
        '6. Keep answers clear, farmer-friendly, and conversational (2–5 short sentences) so they sound great when spoken aloud in continuous voice mode.',
        `7. Express genuine emotion matching your advice! At the very end of your response on a new line, include strictly one tag in the format [EMOTION:<name>] choosing the best fit from: ${ALLOWED_EMOTIONS.join(', ')}.`,
        '',
        'Farmer Field Profile:',
        JSON.stringify({
          cropType: cropType || 'Not specified by farmer',
          soilType: soilType || 'Not specified by farmer',
        }),
        '',
        'Bahrain FieldShift Rotation & Agronomic Reference:',
        rotationContext ||
          'Top Bahrain 3-crop rotations include Cowpea → Sorghum → Sunflower (84.94 score), Barley → Cowpea → Sunflower (80.8), Cowpea → White potato → Sorghum (76.85), Barley → Chickpea → Sunflower (78.3). All require irrigation assessment & local calendar validation.',
        '',
        'Saved Farm Plots & Crop Sections:',
        portfolioSummary.length > 0
          ? JSON.stringify(portfolioSummary)
          : 'No drawn farm boundaries or crop sections saved yet.',
        '',
        'Farm Health Detections, Water Tanks & Care Schedule Context:',
        farmSummaryExtra || 'No recent disease scans, connected tank telemetry, or scheduled activities attached.',
        '',
        'Active Map Environmental Snapshot:',
        farmSnapshot
          ? JSON.stringify(summarizeSnapshotForPrompt(farmSnapshot))
          : 'No location selected on the map yet.',
      ].join('\n');

      const transcript = history
        .map((item: { sender?: string; text?: string }) => {
          const speaker = item.sender === 'user' ? 'Farmer' : 'Tamra';
          return `${speaker}: ${item.text ?? ''}`;
        })
        .join('\n');

      const prompt = transcript
        ? `Previous conversation:\n${transcript}\n\nFarmer's new question: ${message}`
        : message;

      const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`503 ${label} timed out after ${ms}ms`)), ms),
          ),
        ]);

      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: TAMRA_CHAT_MODEL,
            contents: prompt,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          12000,
          TAMRA_CHAT_MODEL,
        );
      } catch (err) {
        console.warn('[tamra/chat] primary model fallback:', err instanceof Error ? err.message : err);
        if (!isRetryableGeminiError(err)) throw err;
        await sleep(300);
        try {
          response = await withTimeout(
            ai.models.generateContent({
              model: TAMRA_FAST_MODEL,
              contents: prompt,
              config: {
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              },
            }),
            15000,
            TAMRA_FAST_MODEL,
          );
        } catch (fastErr) {
          if (!isRetryableGeminiError(fastErr)) throw fastErr;
          await sleep(500);
          response = await ai.models.generateContent({
            model: TAMRA_FAST_MODEL,
            contents: prompt,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          });
        }
      }

      const rawReply = (response.text ?? '').trim();
      if (!rawReply) {
        throw new Error('Tamra returned an empty response. Please try asking again.');
      }

      const parsed = extractEmotionAndReply(rawReply);

      const focusedPlot = farmPlots.find((p) => p.id === focusedPlotId) ?? farmPlots[0] ?? null;
      const focusedSection =
        focusedPlot?.sections.find((s) => s.id === focusedSectionId) ?? null;

      const contextLabel = focusedSection && focusedPlot
        ? `${focusedPlot.name} · ${focusedSection.name} (${focusedSection.crop})`
        : focusedPlot
          ? `${focusedPlot.name} (${focusedPlot.sections.length} sections)`
          : farmSnapshot
            ? `${farmSnapshot.location.name} (${farmSnapshot.location.latitude.toFixed(2)}, ${farmSnapshot.location.longitude.toFixed(2)})`
            : 'No location selected';

      res.json({
        ok: true,
        reply: parsed.reply || rawReply,
        emotion: parsed.emotion,
        dataContextLabel: contextLabel,
        isSampleContext: Boolean(farmSnapshot?.isSampleData),
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 8. Authentication Endpoints (Salted scrypt + HMAC tokens)
  app.post('/api/auth/register', (req, res) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const farmRegion = typeof req.body?.farmRegion === 'string' ? req.body.farmRegion.trim() : 'Bahrain';

      if (!name || name.length < 2) {
        res.status(400).json({ ok: false, error: 'Please enter your full name.' });
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
        return;
      }
      if (!password || password.length < 6) {
        res.status(400).json({ ok: false, error: 'Password must be at least 6 characters.' });
        return;
      }

      const result = registerUserAccount({ name, email, password, farmRegion });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to register account.',
      });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!email || !password) {
        res.status(400).json({ ok: false, error: 'Email and password are required.' });
        return;
      }
      const result = loginUserAccount({ email, password });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(401).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Invalid email or password.',
      });
    }
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
      return;
    }
    const result = createPasswordResetRequest(email);
    res.json({
      ok: true,
      issued: result.issued,
      demoResetCode: result.demoResetCode,
      message: result.issued
        ? 'A 6-digit password reset code has been generated.'
        : 'If an account exists for that email, a reset code was prepared.',
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      if (!email || !code || newPassword.length < 6) {
        res.status(400).json({
          ok: false,
          error: 'Valid email, 6-digit code, and a new password (min 6 characters) are required.',
        });
        return;
      }
      const user = completePasswordReset({ email, code, newPassword });
      res.json({ ok: true, user });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to reset password.',
      });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const userId = getAuthUserIdFromReq(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: 'Not authenticated.' });
      return;
    }
    const user = getUserById(userId);
    if (!user) {
      res.status(401).json({ ok: false, error: 'Account no longer exists.' });
      return;
    }
    res.json({ ok: true, user });
  });

  app.put('/api/auth/profile', (req, res) => {
    const userId = getAuthUserIdFromReq(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: 'Please sign in first.' });
      return;
    }
    try {
      const user = updateUserProfile(userId, {
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
        farmRegion: typeof req.body?.farmRegion === 'string' ? req.body.farmRegion : undefined,
      });
      res.json({ ok: true, user });
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'Profile update failed.' });
    }
  });

  // 9. Persistent User Workspace (Farms, Sections, Crop History, Custom Crops, Settings)
  app.get('/api/workspace', (req, res) => {
    const userId = getAuthUserIdFromReq(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: 'Authentication required.' });
      return;
    }
    const workspace = getUserWorkspace(userId);
    res.json({ ok: true, workspace });
  });

  app.put('/api/workspace', (req, res) => {
    const userId = getAuthUserIdFromReq(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: 'Authentication required.' });
      return;
    }
    const saved = saveUserWorkspace(userId, req.body ?? {});
    res.json({ ok: true, workspace: saved });
  });

  // 10. Community Posts, Likes, and Comments
  app.get('/api/community/posts', (_req, res) => {
    res.json({ ok: true, posts: listCommunityPosts() });
  });

  app.post('/api/community/posts', (req, res) => {
    const userId = getAuthUserIdFromReq(req);
    const user = userId ? getUserById(userId) : null;

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    const categoryRaw = typeof req.body?.category === 'string' ? req.body.category : 'qa';
    const validCategories: CommunityCategory[] = ['qa', 'tip', 'crop_discussion', 'announcement'];
    const category: CommunityCategory = validCategories.includes(categoryRaw as CommunityCategory)
      ? (categoryRaw as CommunityCategory)
      : 'qa';
    const cropTag = typeof req.body?.cropTag === 'string' ? req.body.cropTag.trim() : '';
    const authorNameInput =
      typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';

    if (!title || !body) {
      res.status(400).json({ ok: false, error: 'Post title and message are required.' });
      return;
    }

    const post = createCommunityPost({
      authorId: user?.id ?? 'guest',
      authorName: user?.name || authorNameInput || 'Bahrain Grower',
      authorRegion: user?.farmRegion || 'Bahrain',
      category,
      cropTag,
      title,
      body,
    });
    res.json({ ok: true, post });
  });

  app.post('/api/community/posts/:id/like', (req, res) => {
    try {
      const userId = getAuthUserIdFromReq(req);
      const actorId =
        userId ||
        (typeof req.body?.actorId === 'string' && req.body.actorId.trim()
          ? req.body.actorId.trim()
          : 'guest-browser');
      const post = toggleCommunityPostLike(req.params.id, actorId);
      res.json({ ok: true, post });
    } catch (err) {
      res.status(404).json({ ok: false, error: err instanceof Error ? err.message : 'Post not found.' });
    }
  });

  app.post('/api/community/posts/:id/comments', (req, res) => {
    try {
      const userId = getAuthUserIdFromReq(req);
      const user = userId ? getUserById(userId) : null;
      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const authorNameInput =
        typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';

      if (!text) {
        res.status(400).json({ ok: false, error: 'Comment text is required.' });
        return;
      }

      const post = addCommunityComment({
        postId: req.params.id,
        authorId: user?.id ?? 'guest',
        authorName: user?.name || authorNameInput || 'Bahrain Grower',
        text,
      });
      res.json({ ok: true, post });
    } catch (err) {
      res.status(404).json({ ok: false, error: err instanceof Error ? err.message : 'Post not found.' });
    }
  });

  // 11. Gemini Multimodal Vision: Fruit Ripeness Detection
  app.post('/api/vision/fruit-ripeness', async (req, res) => {
    try {
      const imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64.trim() : '';
      const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : 'image/jpeg';
      const fruitType = typeof req.body?.fruitType === 'string' ? req.body.fruitType.trim() : 'Auto-detect';
      const language = req.body?.language === 'ar' ? 'ar' : 'en';

      if (!imageBase64) {
        res.status(400).json({ ok: false, error: 'Image payload is required.' });
        return;
      }

      const ai = getGeminiClient();
      const systemInstruction = [
        'You are THAMRA Vision, a careful agricultural image-analysis specialist.',
        `Output language for all prose fields: ${language === 'ar' ? 'Arabic (العربية)' : 'English'}.`,
        'Inspect the uploaded photo and evaluate fruit ripeness honestly.',
        'If the image is blurry, dark, occluded, contains no visible fruit, or you cannot identify the fruit clearly, set ripenessStage to "unclear", confidence to "low", confidencePct <= 40, and explain clearly in uncertaintyNote what better photo angle/lighting is needed. NEVER guess or fabricate ripeness on an unrecognizable image.',
        'Otherwise classify ripenessStage strictly as one of: "unripe", "ripe", "overripe", or "unclear".',
        'Cite only visible cues actually seen in the image (skin color, gloss, calyx, bruising, wrinkling, firmness indicators). Give practical harvest or immediate-use advice.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: TAMRA_CHAT_MODEL,
        contents: {
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            {
              text: `Selected or expected fruit type: ${fruitType}. Determine fruit type, ripeness stage (unripe/ripe/overripe/unclear), confidence, visible cues, explanation, and harvest/use recommendation.`,
            },
          ],
        },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedFruitType: { type: Type.STRING },
              ripenessStage: { type: Type.STRING, enum: ['unripe', 'ripe', 'overripe', 'unclear'] },
              confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
              confidencePct: { type: Type.INTEGER },
              visualCues: { type: Type.ARRAY, items: { type: Type.STRING } },
              explanation: { type: Type.STRING },
              harvestRecommendation: { type: Type.STRING },
              uncertaintyNote: { type: Type.STRING },
            },
            required: [
              'detectedFruitType',
              'ripenessStage',
              'confidence',
              'confidencePct',
              'visualCues',
              'explanation',
              'harvestRecommendation',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      res.json({
        ok: true,
        result: {
          id: `ripe-${Date.now()}`,
          fruitType: String(parsed.detectedFruitType || fruitType),
          ripenessStage: (parsed.ripenessStage as string) || 'unclear',
          confidence: (parsed.confidence as string) || 'low',
          confidencePct: Number(parsed.confidencePct) || 50,
          visualCues: Array.isArray(parsed.visualCues) ? parsed.visualCues.map(String) : [],
          explanation: String(parsed.explanation || ''),
          harvestRecommendation: String(parsed.harvestRecommendation || ''),
          uncertaintyNote: parsed.uncertaintyNote ? String(parsed.uncertaintyNote) : undefined,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 12. Gemini Multimodal Vision: Plant Disease & Injury Screening (Never Confirmed Diagnosis)
  app.post('/api/vision/plant-disease', async (req, res) => {
    try {
      const imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64.trim() : '';
      const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : 'image/jpeg';
      const crop = typeof req.body?.crop === 'string' ? req.body.crop.trim() : 'Crop';
      const language = req.body?.language === 'ar' ? 'ar' : 'en';
      const nasaSummary = req.body?.nasaSummary ? JSON.stringify(req.body.nasaSummary) : 'None provided';

      if (!imageBase64) {
        res.status(400).json({ ok: false, error: 'Plant image is required.' });
        return;
      }

      const ai = getGeminiClient();
      const systemInstruction = [
        'You are THAMRA Crop Health Screener, helping farmers visually inspect plant leaves, stems, or fruits for possible fungal infections, pests, physical injuries, spots, discolouration, or nutrient stress.',
        `Output language for all prose fields: ${language === 'ar' ? 'Arabic (العربية)' : 'English'}.`,
        'CRITICAL HONESTY & SAFETY RULES:',
        '1. NEVER present an AI image screening as a confirmed laboratory diagnosis. Always frame findings as "possible" or "suspected" issues.',
        '2. If the image is unclear, out of focus, too dark, or does not clearly show plant symptoms, set category to "unclear", confidence to "low", confidencePct <= 35, and ask the farmer in uncertaintyNote for a clearer close-up photo in natural light or more details.',
        '3. If symptoms resemble one of these THAMRA disease library IDs, set matchedDiseaseId to the closest ID, otherwise empty string: "powdery_mildew", "early_blight", "whitefly_tylc", "red_palm_weevil", "root_knot_nematode", "heat_salinity_stress".',
        '4. Never invent chemical pesticide dosages.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: TAMRA_CHAT_MODEL,
        contents: {
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            {
              text: `Affected crop reported by farmer: ${crop}. Environmental context: ${nasaSummary}. Identify suspected disease/pest/injury, visible symptoms, possible causes, next steps, prevention, and treatment guidance.`,
            },
          ],
        },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suspectedIssue: { type: Type.STRING },
              category: {
                type: Type.STRING,
                enum: ['fungal', 'pest', 'bacterial', 'viral', 'injury', 'nutrient', 'unclear'],
              },
              confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
              confidencePct: { type: Type.INTEGER },
              visibleSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
              possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              preventionMethods: { type: Type.ARRAY, items: { type: Type.STRING } },
              treatmentGuidance: { type: Type.STRING },
              matchedDiseaseId: { type: Type.STRING },
              uncertaintyNote: { type: Type.STRING },
            },
            required: [
              'suspectedIssue',
              'category',
              'confidence',
              'confidencePct',
              'visibleSymptoms',
              'possibleCauses',
              'recommendedNextSteps',
              'preventionMethods',
              'treatmentGuidance',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      res.json({
        ok: true,
        detection: {
          id: `dis-${Date.now()}`,
          crop,
          suspectedIssue: String(parsed.suspectedIssue || ''),
          category: (parsed.category as string) || 'unclear',
          confidence: (parsed.confidence as string) || 'low',
          confidencePct: Number(parsed.confidencePct) || 40,
          visibleSymptoms: Array.isArray(parsed.visibleSymptoms) ? parsed.visibleSymptoms.map(String) : [],
          possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses.map(String) : [],
          recommendedNextSteps: Array.isArray(parsed.recommendedNextSteps)
            ? parsed.recommendedNextSteps.map(String)
            : [],
          preventionMethods: Array.isArray(parsed.preventionMethods)
            ? parsed.preventionMethods.map(String)
            : [],
          treatmentGuidance: String(parsed.treatmentGuidance || ''),
          matchedDiseaseId: parsed.matchedDiseaseId ? String(parsed.matchedDiseaseId) : undefined,
          uncertaintyNote: parsed.uncertaintyNote ? String(parsed.uncertaintyNote) : undefined,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 13. Gemini Multimodal Vision: Plant Health Monitoring & Multi-Date Comparison
  app.post('/api/vision/plant-health', async (req, res) => {
    try {
      const imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64.trim() : '';
      const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : 'image/jpeg';
      const previousImageBase64 =
        typeof req.body?.previousImageBase64 === 'string' ? req.body.previousImageBase64.trim() : '';
      const previousSummary =
        typeof req.body?.previousSummary === 'string' ? req.body.previousSummary.trim() : '';
      const crop = typeof req.body?.crop === 'string' ? req.body.crop.trim() : 'Crop';
      const language = req.body?.language === 'ar' ? 'ar' : 'en';

      if (!imageBase64) {
        res.status(400).json({ ok: false, error: 'Plant photo is required.' });
        return;
      }

      const ai = getGeminiClient();
      const systemInstruction = [
        'You are THAMRA Plant Health Observer.',
        `Output language for all prose fields: ${language === 'ar' ? 'Arabic (العربية)' : 'English'}.`,
        'Inspect visible plant canopy/leaf appearance (chlorosis/yellowing, crispy brown margins, wilting, spots, insect chewing, vigor).',
        'CRITICAL RULE: NEVER assume a visible symptom has only one cause. For example, if yellowing leaves are visible, present multiple plausible possibilities (e.g., iron/nitrogen deficiency, calcareous soil pH lockup, root waterlogging/salinity, or early senescence) and recommend practical field checks (soil EC/pH, emitter check, new vs old leaf pattern).',
        'If a prior observation photo or summary is provided, compare changes honestly over time; otherwise state this establishes a visual baseline.',
        'If the photo is blurry or does not show a plant clearly, set overallStatus to "unclear", confidence to "low", and ask for a clearer photo in uncertaintyNote.',
      ].join('\n');

      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];
      if (previousImageBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: previousImageBase64 } });
      }
      parts.push({ inlineData: { mimeType, data: imageBase64 } });
      parts.push({
        text: previousImageBase64
          ? `Image 1 is the earlier observation (${previousSummary || 'previous check'}). Image 2 is the NEW current photo of ${crop}. Compare visible changes, list multiple possible causes for any symptoms, and suggest physical field checks & next steps.`
          : `Analyze this current photo of ${crop} for visible plant health status, multiple possible causes for any visible symptoms, and practical field checks.`,
      });

      const response = await ai.models.generateContent({
        model: TAMRA_CHAT_MODEL,
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallStatus: { type: Type.STRING, enum: ['healthy', 'watch', 'stressed', 'unclear'] },
              confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
              visibleFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
              possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
              comparisonNote: { type: Type.STRING },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              uncertaintyNote: { type: Type.STRING },
            },
            required: [
              'overallStatus',
              'confidence',
              'visibleFindings',
              'possibleCauses',
              'recommendedChecks',
              'recommendations',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      res.json({
        ok: true,
        observation: {
          id: `obs-${Date.now()}`,
          crop,
          overallStatus: (parsed.overallStatus as string) || 'unclear',
          confidence: (parsed.confidence as string) || 'medium',
          visibleFindings: Array.isArray(parsed.visibleFindings) ? parsed.visibleFindings.map(String) : [],
          possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses.map(String) : [],
          recommendedChecks: Array.isArray(parsed.recommendedChecks)
            ? parsed.recommendedChecks.map(String)
            : [],
          comparisonNote: parsed.comparisonNote ? String(parsed.comparisonNote) : undefined,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
          uncertaintyNote: parsed.uncertaintyNote ? String(parsed.uncertaintyNote) : undefined,
          recordedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 14. Pesticide, Fertiliser & Irrigation/Equipment Recommendations
  app.post('/api/recommendations/ag-inputs', async (req, res) => {
    try {
      const crop = typeof req.body?.crop === 'string' ? req.body.crop.trim() : 'Tomatoes';
      const issue = typeof req.body?.issue === 'string' ? req.body.issue.trim() : 'General preventive care';
      const soilType = typeof req.body?.soilType === 'string' ? req.body.soilType.trim() : 'Sandy Loam';
      const language = req.body?.language === 'ar' ? 'ar' : 'en';
      const nasaSummary = req.body?.nasaSummary ? JSON.stringify(req.body.nasaSummary) : 'None';

      const ai = getGeminiClient();
      const systemInstruction = [
        'You are THAMRA Agronomic Input Advisor for Bahrain farms.',
        `Output language for all text fields: ${language === 'ar' ? 'Arabic (العربية)' : 'English'}.`,
        'CRITICAL SAFETY & HONESTY RULES:',
        '1. NEVER invent commercial pesticide brand names, fabricated dilution ratios, or exact ml/L dosage numbers.',
        '2. Prioritize cultural/organic/IPM alternatives first (insect netting, yellow sticky traps, pruning, neem/soap/wettable sulfur where appropriate).',
        '3. For chemical/pesticide options, state only well-established active ingredients/classes (e.g. Wettable Sulfur, Copper Hydroxide, Azadirachtin, Spinosad, Bacillus thuringiensis) ONLY if relevant to the issue, state targetProblem and suitableCrops, and explicitly direct the farmer to follow the registered product label dosage, PPE, Pre-Harvest Interval (PHI), and Bahrain Ministry of Municipalities Affairs & Agriculture approved product lists.',
        '4. For irrigation pipes, accessories, fertilisers, and farm equipment, explain concisely WHY each item specifically solves the current issue & soil/climate context.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: TAMRA_CHAT_MODEL,
        contents: `Crop: ${crop}\nObserved/Suspected Issue: ${issue}\nSoil: ${soilType}\nNASA Environmental Context: ${nasaSummary}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              organicAlternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    whyHelpful: { type: Type.STRING },
                    howToUseSafely: { type: Type.STRING },
                  },
                  required: ['title', 'whyHelpful', 'howToUseSafely'],
                },
              },
              pesticideOptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    activeIngredientOrClass: { type: Type.STRING },
                    targetProblem: { type: Type.STRING },
                    suitableCrops: { type: Type.STRING },
                    labelAndApplicationGuidance: { type: Type.STRING },
                    safetyPrecautions: { type: Type.STRING },
                    localLabelRestrictionNote: { type: Type.STRING },
                  },
                  required: [
                    'activeIngredientOrClass',
                    'targetProblem',
                    'suitableCrops',
                    'labelAndApplicationGuidance',
                    'safetyPrecautions',
                    'localLabelRestrictionNote',
                  ],
                },
              },
              preventionMethods: { type: Type.ARRAY, items: { type: Type.STRING } },
              fertilizerGuidance: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    timingNote: { type: Type.STRING },
                  },
                  required: ['type', 'purpose', 'timingNote'],
                },
              },
              equipmentSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      enum: ['irrigation', 'pipe_accessory', 'monitoring', 'protection'],
                    },
                    whyUseful: { type: Type.STRING },
                  },
                  required: ['item', 'category', 'whyUseful'],
                },
              },
              disclaimer: { type: Type.STRING },
            },
            required: [
              'organicAlternatives',
              'pesticideOptions',
              'preventionMethods',
              'fertilizerGuidance',
              'equipmentSuggestions',
              'disclaimer',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      res.json({
        ok: true,
        recommendation: {
          id: `rec-${Date.now()}`,
          crop,
          issue,
          organicAlternatives: Array.isArray(parsed.organicAlternatives) ? parsed.organicAlternatives : [],
          pesticideOptions: Array.isArray(parsed.pesticideOptions) ? parsed.pesticideOptions : [],
          preventionMethods: Array.isArray(parsed.preventionMethods)
            ? parsed.preventionMethods.map(String)
            : [],
          fertilizerGuidance: Array.isArray(parsed.fertilizerGuidance) ? parsed.fertilizerGuidance : [],
          equipmentSuggestions: Array.isArray(parsed.equipmentSuggestions)
            ? parsed.equipmentSuggestions
            : [],
          disclaimer: String(
            parsed.disclaimer ||
              'Always confirm registration in Bahrain and follow official product label instructions, PPE, and harvest intervals.',
          ),
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ ok: false, error: mapped.message });
    }
  });

  // 15. Water-Level Sensor Integration Endpoints (IoT Webhook Ready — Zero Fake Readings)
  app.get('/api/sensors/water-tanks', (req, res) => {
    const userId = getAuthUserIdFromReq(req);
    res.json({ ok: true, tanks: listPublicWaterTanks(userId) });
  });

  app.post('/api/sensors/water-tanks', (req, res) => {
    const userId = getAuthUserIdFromReq(req);
    const body = req.body as Partial<WaterTank>;
    if (!body?.name || !String(body.name).trim()) {
      res.status(400).json({ ok: false, error: 'Tank name is required.' });
      return;
    }
    const tank: WaterTank = {
      id: body.id || `tank-${Date.now()}`,
      name: String(body.name).trim(),
      plotId: body.plotId,
      capacityLiters: Math.max(100, Number(body.capacityLiters) || 5000),
      minThresholdPercent: Math.max(5, Math.min(80, Number(body.minThresholdPercent) || 25)),
      criticalThresholdPercent: Math.max(2, Math.min(40, Number(body.criticalThresholdPercent) || 12)),
      status: 'disconnected',
      sensorModel: body.sensorModel || 'Ultrasonic / Float Webhook',
      webhookKey: body.webhookKey || `thm_${Math.random().toString(36).slice(2, 10)}`,
      currentLevelPercent: null,
      currentVolumeLiters: null,
      lastUpdatedAt: null,
      history: [],
    };
    const saved = upsertWaterTankRecord(tank, userId);
    res.json({ ok: true, tank: saved });
  });

  app.post('/api/sensors/water-tanks/:id/reading', (req, res) => {
    try {
      const userId = getAuthUserIdFromReq(req);
      const levelPercent = Number(req.body?.levelPercent);
      if (Number.isNaN(levelPercent) || levelPercent < 0 || levelPercent > 100) {
        res.status(400).json({ ok: false, error: 'levelPercent must be between 0 and 100.' });
        return;
      }
      const source =
        req.body?.source === 'demo_test_packet' ? 'demo_test_packet' : 'sensor_webhook';
      const webhookKey =
        typeof req.body?.webhookKey === 'string'
          ? req.body.webhookKey
          : typeof req.headers['x-sensor-key'] === 'string'
            ? req.headers['x-sensor-key']
            : undefined;
      const updated = recordWaterTankReading({
        tankId: req.params.id,
        levelPercent,
        source,
        webhookKey,
        userId,
      });
      res.json({ ok: true, tank: updated });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to ingest sensor reading.',
      });
    }
  });

  app.post('/api/sensors/water-tanks/:id/disconnect', (req, res) => {
    try {
      const userId = getAuthUserIdFromReq(req);
      const updated = disconnectWaterTankSensor(req.params.id, userId);
      res.json({ ok: true, tank: updated });
    } catch (err) {
      res.status(404).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Tank not found.',
      });
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
