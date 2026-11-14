import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mic,
  PhoneCall,
  PhoneOff,
  Send,
  Square,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  describeMicrophoneError,
  MicrophoneSession,
  sendTamraChat,
  startMicrophoneSession,
  synthesizeTamraSpeech,
  transcribeAudioBlob,
} from '../../services/tamraApi';
import type {
  AppLanguage,
  AvatarState,
  ChatMessage,
  FarmEnvironmentSnapshot,
  FarmPlot,
  TamraEmotion,
} from '../../types/farm';
import { formatArea } from '../../utils/farmGeometry';
import { getEmotionLabel, TamraCharacter } from './TamraCharacter';

interface TamraAssistantProps {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  farmSnapshot: FarmEnvironmentSnapshot | null;
  cropType: string;
  soilType: string;
  farmPlots?: FarmPlot[];
  activePlotId?: string | null;
  activeSectionId?: string | null;
  farmSummaryExtra?: string;
  onSelectSectionFocus?: (sectionId: string | null) => void;
  onOpenMapPage?: () => void;
  autoSpeakDefault?: boolean;
  continuousVoiceDefault?: boolean;
  speechRate?: number;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

const QUICK_PROMPTS_EN = [
  'Is my soil too dry right now?',
  'Do I need to irrigate my crops today?',
  'What crop should I rotate into next?',
  'Any weather or disease risk conditions to watch for?',
];

const SECTION_PROMPTS_EN = [
  'Which section needs more irrigation right now?',
  'Compare conditions & rotation plans across my sections.',
  'Which part of my farm has the driest conditions?',
  'What crop suits my unused section next?',
];

const QUICK_PROMPTS_AR = [
  'هل تربتي جافة جداً حالياً؟',
  'هل أحتاج إلى ري محاصيلي اليوم؟',
  'ما المحصول الأنسب للدورة الزراعية القادمة؟',
  'هل هناك ظروف تزيد خطر الأمراض أو الإجهاد؟',
];

const SECTION_PROMPTS_AR = [
  'أي قسم يحتاج إلى ري أكثر الآن؟',
  'قارن الظروف وخطط الدورة الزراعية بين أقسام مزرعتي.',
  'أي جزء من مزرعتي هو الأكثر جفافاً؟',
  'ما المحصول الأنسب للقسم غير المزروع؟',
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export const TamraAssistant: React.FC<TamraAssistantProps> = ({
  language,
  farmSnapshot,
  cropType,
  soilType,
  farmPlots = [],
  activePlotId = null,
  activeSectionId = null,
  farmSummaryExtra,
  onSelectSectionFocus,
  onOpenMapPage,
  autoSpeakDefault = true,
  continuousVoiceDefault = true,
  speechRate = 1.0,
  initialPrompt = null,
  onClearInitialPrompt,
}) => {
  const isAr = language === 'ar';
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      sender: 'tamra',
      text:
        language === 'ar'
          ? 'أهلاً بك! أنا تمرة، مساعدتك الزراعية الذكية في البحرين. اضغط "بدء محادثة صوتية" للتحدث معي بالعربية أو الإنجليزية، أو افتح مربع المحادثة في الأسفل.'
          : "Marhaba! I'm Tamra, your AI farming companion for Bahrain. Tap Start Voice Session for a hands-free conversation, or expand the chat drawer below.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      emotion: 'happy',
    },
  ]);

  const [currentEmotion, setCurrentEmotion] = useState<TamraEmotion>('happy');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(autoSpeakDefault);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const voiceSessionActiveRef = useRef(false);
  voiceSessionActiveRef.current = voiceSessionActive;

  const micSessionRef = useRef<MicrophoneSession | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const avatarState: AvatarState = recording
    ? 'listening'
    : sending || transcribing
      ? 'thinking'
      : speakingMessageId
        ? 'speaking'
        : 'idle';

  useEffect(() => {
    setAutoSpeak(autoSpeakDefault);
  }, [autoSpeakDefault]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome-1') {
        return [
          {
            ...prev[0],
            text:
              language === 'ar'
                ? 'أهلاً بك! أنا تمرة، مساعدتك الزراعية الذكية في البحرين. اضغط "بدء محادثة صوتية" للتحدث معي بشكل مستمر بالعربية أو الإنجليزية، أو اكتب سؤالك أدناه.'
                : "Marhaba! I'm Tamra, your AI farming companion for Bahrain. Tap Start Voice Session for a hands-free conversation in English or Arabic, or type your question below.",
          },
        ];
      }
      return prev;
    });
  }, [language]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, transcribing]);

  const stopSpeaking = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = '';
      activeAudioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  };

  const endVoiceSession = () => {
    voiceSessionActiveRef.current = false;
    setVoiceSessionActive(false);
    micSessionRef.current?.cancel();
    micSessionRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setRecordSeconds(0);
    setMicLevel(0);
    stopSpeaking();
  };

  useEffect(() => {
    return () => {
      endVoiceSession();
    };
  }, []);

  const speakWithBrowserFallback = (
    text: string,
    messageId: string,
    onDone?: () => void,
  ) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeakingMessageId(null);
      onDone?.();
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const hasArabic = /[\u0600-\u06FF]/.test(text);
      utterance.lang = hasArabic ? 'ar-SA' : 'en-US';
      utterance.rate = Math.max(0.75, Math.min(1.4, speechRate));
      utterance.onend = () => {
        setSpeakingMessageId(null);
        onDone?.();
      };
      utterance.onerror = () => {
        setSpeakingMessageId(null);
        onDone?.();
      };
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMessageId(null);
      onDone?.();
    }
  };

  const speakMessage = async (
    messageId: string,
    text: string,
    msgEmotion?: TamraEmotion,
    onDone?: () => void,
  ) => {
    if (speakingMessageId === messageId) {
      stopSpeaking();
      onDone?.();
      return;
    }
    stopSpeaking();
    if (msgEmotion) setCurrentEmotion(msgEmotion);
    setSpeakingMessageId(messageId);

    try {
      const { audioBase64, mimeType } = await synthesizeTamraSpeech(text);
      const url = base64ToBlobUrl(audioBase64, mimeType);
      activeAudioUrlRef.current = url;

      const audio = new Audio(url);
      audio.playbackRate = Math.max(0.75, Math.min(1.4, speechRate));
      activeAudioRef.current = audio;

      audio.onended = () => {
        if (activeAudioUrlRef.current === url) {
          URL.revokeObjectURL(url);
          activeAudioUrlRef.current = null;
        }
        setSpeakingMessageId(null);
        onDone?.();
      };

      audio.onerror = () => {
        stopSpeaking();
        speakWithBrowserFallback(text, messageId, onDone);
      };

      await audio.play();
    } catch {
      speakWithBrowserFallback(text, messageId, onDone);
    }
  };

  const startContinuousMicListenRef = useRef<() => Promise<void>>(async () => {});

  const processCapturedAudio = async (
    blob: Blob,
    mimeType: string,
    peakLevel: number,
  ) => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    micSessionRef.current = null;
    setRecording(false);
    setRecordSeconds(0);
    setMicLevel(0);

    if (blob.size < 500 || peakLevel < 0.015) {
      if (voiceSessionActiveRef.current) {
        // Silently resume listening in continuous voice session
        await startContinuousMicListenRef.current();
        return;
      }
      setCurrentEmotion('confused');
      setMicError(
        isAr
          ? 'لم يتم التقاط صوت واضح. تأكد من عدم كتم الميكروفون وتحدث بوضوح ثم أعد المحاولة.'
          : 'No clear audio was detected. Check that your microphone is unmuted and speak clearly, or type below.',
      );
      return;
    }

    setTranscribing(true);
    setCurrentEmotion('thinking');
    try {
      const transcript = await transcribeAudioBlob({ blob, mimeType, language });
      if (!transcript) {
        if (voiceSessionActiveRef.current) {
          setTranscribing(false);
          await startContinuousMicListenRef.current();
          return;
        }
        setCurrentEmotion('confused');
        setMicError(
          isAr
            ? 'لم أتمكن من تمييز كلام واضح في التسجيل. حاول التحدث أقرب للميكروفون.'
            : "I couldn't catch clear words in that clip. Try speaking closer to your microphone.",
        );
        return;
      }

      setTranscribing(false);
      await submitQuestion(transcript, true);
    } catch (err) {
      setCurrentEmotion('concerned');
      setMicError(describeMicrophoneError(err, language));
      endVoiceSession();
    } finally {
      setTranscribing(false);
    }
  };

  startContinuousMicListenRef.current = async () => {
    if (!voiceSessionActiveRef.current) return;
    stopSpeaking();
    setMicError(null);
    try {
      const session = await startMicrophoneSession((level) => setMicLevel(level), {
        autoStopOnSilence: true,
        silenceTimeoutMs: 1450,
        onAutoSilenceStop: (result) => {
          void processCapturedAudio(result.blob, result.mimeType, result.peakLevel);
        },
      });
      if (!voiceSessionActiveRef.current) {
        session.cancel();
        return;
      }
      micSessionRef.current = session;
      setRecording(true);
      setCurrentEmotion('neutral');
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setCurrentEmotion('concerned');
      setMicError(describeMicrophoneError(err, language));
      endVoiceSession();
    }
  };

  const submitQuestion = async (rawQuestion: string, viaVoice = false) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || sending) return;

    setMicError(null);
    if (!viaVoice) setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      viaVoice,
    };

    const nextHistory = [...messagesRef.current, userMsg];
    setMessages(nextHistory);
    setSending(true);
    setCurrentEmotion('thinking');

    try {
      const result = await sendTamraChat({
        message: trimmed,
        language,
        history: nextHistory,
        farmSnapshot,
        cropType,
        soilType,
        farmPlots,
        focusedPlotId: activePlotId,
        focusedSectionId: activeSectionId,
        farmSummaryExtra,
      });

      setCurrentEmotion(result.emotion);

      const tamraMsg: ChatMessage = {
        id: `tamra-${Date.now()}`,
        sender: 'tamra',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotion: result.emotion,
        dataContextLabel: result.dataContextLabel,
        isSampleContext: result.isSampleContext,
      };

      setMessages((prev) => [...prev, tamraMsg]);

      const shouldAutoResume = voiceSessionActiveRef.current;
      if (autoSpeak || shouldAutoResume) {
        void speakMessage(tamraMsg.id, tamraMsg.text, result.emotion, () => {
          if (shouldAutoResume && voiceSessionActiveRef.current) {
            void startContinuousMicListenRef.current();
          }
        });
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Unable to reach Tamra right now.';
      setCurrentEmotion('concerned');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'tamra',
          text: isAr ? `عذراً، حدث خطأ: ${errText}` : `Sorry, I ran into an error: ${errText}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          emotion: 'concerned',
        },
      ]);
      if (voiceSessionActiveRef.current) {
        endVoiceSession();
      }
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim() && !sending) {
      const q = initialPrompt.trim();
      onClearInitialPrompt?.();
      void submitQuestion(q, false);
    }
  }, [initialPrompt]);

  const handleToggleVoiceSession = async () => {
    if (voiceSessionActive) {
      endVoiceSession();
      return;
    }
    voiceSessionActiveRef.current = true;
    setVoiceSessionActive(true);
    await startContinuousMicListenRef.current();
  };

  const handleSingleMicToggle = async () => {
    if (recording) {
      const session = micSessionRef.current;
      if (!session) return;
      const { blob, mimeType, peakLevel } = await session.stop();
      await processCapturedAudio(blob, mimeType, peakLevel);
      return;
    }

    stopSpeaking();
    setMicError(null);
    try {
      const session = await startMicrophoneSession((level) => setMicLevel(level), {
        autoStopOnSilence: continuousVoiceDefault,
        silenceTimeoutMs: 1650,
        onAutoSilenceStop: (result) => {
          void processCapturedAudio(result.blob, result.mimeType, result.peakLevel);
        },
      });
      micSessionRef.current = session;
      setRecording(true);
      setCurrentEmotion('neutral');
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setCurrentEmotion('concerned');
      setMicError(describeMicrophoneError(err, language));
      setRecording(false);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMicError(null);
    setTranscribing(true);
    setCurrentEmotion('thinking');
    try {
      const transcript = await transcribeAudioBlob({
        blob: file,
        mimeType: file.type || 'audio/webm',
        language,
      });
      if (!transcript) {
        setCurrentEmotion('confused');
        setMicError(
          isAr ? 'لم يتم اكتشاف كلام واضح في الملف الصوتي.' : 'No clear speech detected in audio file.',
        );
        return;
      }
      await submitQuestion(transcript, true);
    } catch (err) {
      setCurrentEmotion('concerned');
      setMicError(err instanceof Error ? err.message : 'Unable to transcribe audio file.');
    } finally {
      setTranscribing(false);
    }
  };

  const handleAvatarTap = () => {
    if (avatarState !== 'idle') return;
    const cycle: TamraEmotion[] = ['happy', 'wink', 'proud', 'love', 'excited'];
    const idx = cycle.indexOf(currentEmotion);
    setCurrentEmotion(cycle[(idx + 1) % cycle.length]);
  };

  const activePlot = farmPlots.find((p) => p.id === activePlotId) ?? farmPlots[0] ?? null;
  const activeSection = activePlot?.sections.find((s) => s.id === activeSectionId) ?? null;
  const hasSections = Boolean(activePlot && activePlot.sections.length > 0);
  const quickPrompts = hasSections
    ? isAr
      ? SECTION_PROMPTS_AR
      : SECTION_PROMPTS_EN
    : isAr
      ? QUICK_PROMPTS_AR
      : QUICK_PROMPTS_EN;
  const moodLabel = getEmotionLabel(
    avatarState === 'thinking' ? 'thinking' : currentEmotion,
    language,
  );

  const friendlyMoisture = farmSnapshot
    ? farmSnapshot.smap.available
      ? farmSnapshot.smap.statusLabel
      : farmSnapshot.power.latest?.gwetTop !== null &&
          farmSnapshot.power.latest?.gwetTop !== undefined
        ? `${Math.round(farmSnapshot.power.latest.gwetTop * 100)}% moisture`
        : 'Moisture N/A'
    : '';

  const latestTamraMessage =
    [...messages].reverse().find((m) => m.sender === 'tamra') ?? messages[0];

  return (
    <section
      className="flex flex-col thamra-card overflow-hidden animate-thamra-in"
      dir={isAr ? 'rtl' : 'ltr'}
      aria-label={isAr ? 'تمرة — المساعدة الزراعية الذكية' : 'Tamra AI Farming Assistant'}
    >
      {/* Compact Farm Context Top Strip */}
      <div className="px-4 sm:px-5 py-2.5 bg-[#faf8f4] border-b border-[#D5D5D5] text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[#1C250C] min-w-0">
          {activePlot ? (
            <>
              <span className="font-semibold truncate">
                {activePlot.name} ({formatArea(activePlot.areaSqMeters, language)})
              </span>
              {activePlot.sections.length > 0 && onSelectSectionFocus && (
                <select
                  value={activeSection?.id ?? ''}
                  onChange={(e) => onSelectSectionFocus(e.target.value || null)}
                  aria-label="Focused crop section"
                  className="px-2 py-1 bg-white border border-[#D5D5D5] rounded-md text-xs font-medium text-[#1C250C]"
                >
                  <option value="">{isAr ? 'كل أقسام المزرعة' : 'All Sections'}</option>
                  {activePlot.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} · {sec.crop}
                    </option>
                  ))}
                </select>
              )}
            </>
          ) : farmSnapshot ? (
            <span className="font-semibold truncate">{farmSnapshot.location.name}</span>
          ) : (
            <span className="text-[#8E7D49]">
              {isAr ? 'حدد مزرعتك على الخريطة للبدء' : 'Select your farm on the Map for tailored data'}
            </span>
          )}

          {farmSnapshot && (
            <span className="text-[#535C21] font-mono-tabular">
              {friendlyMoisture} ·{' '}
              {farmSnapshot.power.latest?.t2m !== null && farmSnapshot.power.latest?.t2m !== undefined
                ? `${Math.round(farmSnapshot.power.latest.t2m)}°C`
                : '—'}
              {farmSnapshot.isSampleData
                ? isAr
                  ? ' · عينة اختبار'
                  : ' · Sample'
                : isAr
                  ? ' · ناسا'
                  : ' · NASA'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (autoSpeak) stopSpeaking();
              setAutoSpeak((v) => !v);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
              autoSpeak
                ? 'bg-[#535C21] border-[#535C21] text-white'
                : 'bg-white border-[#D5D5D5] text-[#1C250C]'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{isAr ? 'صوت تلقائي' : 'Voice Reply'}</span>
          </button>

          {onOpenMapPage && (
            <button
              type="button"
              onClick={onOpenMapPage}
              className="text-xs font-semibold text-[#535C21] hover:text-[#1C250C] underline underline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAr ? 'الخريطة' : 'Farm Map'}
            </button>
          )}
        </div>
      </div>

      {/* HERO CENTER-STAGE TAMRA VISUAL */}
      <div
        className="px-5 py-7 sm:py-9 flex flex-col items-center text-center relative overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, #dde6c5 0%, #eef2e1 44%, #faf8f4 100%)',
        }}
      >
        {/* Subtle decorative botanical rings behind pure-white Tamra */}
        <div className="relative flex items-center justify-center">
          {(avatarState === 'listening' || avatarState === 'speaking' || avatarState === 'thinking') && (
            <span
              aria-hidden="true"
              className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border-2 border-[#535C21]/35 animate-tamra-ring pointer-events-none"
            />
          )}
          <div
            className={`relative rounded-full p-5 sm:p-6 transition-all duration-300 shadow-lg border ${
              avatarState === 'listening'
                ? 'bg-[#535C21]/25 border-[#535C21] scale-[1.03]'
                : avatarState === 'speaking'
                  ? 'bg-[#535C21]/20 border-[#6e7d2e] scale-[1.02]'
                  : avatarState === 'thinking'
                    ? 'bg-[#8E7D49]/20 border-[#8E7D49]'
                    : 'bg-[#535C21]/14 border-[#535C21]/25'
            }`}
          >
            <TamraCharacter
              emotion={currentEmotion}
              avatarState={avatarState}
              micLevel={micLevel}
              size={176}
              onClick={handleAvatarTap}
            />
          </div>
        </div>

        {/* Tamra Name & Active State Indicator */}
        <div className="mt-4 space-y-1">
          <h1 className="text-2xl font-bold text-[#1C250C]">
            {isAr ? 'تمرة' : 'Tamra'}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#535C21]">
            {recording
              ? isAr
                ? voiceSessionActive
                  ? 'محادثة صوتية نشطة · أستمع إليك الآن...'
                  : 'تستمع لصوتك الآن...'
                : voiceSessionActive
                  ? 'Voice Session Active · Listening (auto-stops when you pause)...'
                  : 'Listening to your voice...'
              : transcribing
                ? isAr
                  ? 'تحول صوتك إلى نص...'
                  : 'Transcribing your voice...'
                : sending
                  ? isAr
                    ? 'تفكر وتراجع بيانات مزرعتك وناسا...'
                    : 'Thinking — reviewing your farm, NASA & rotation data...'
                  : speakingMessageId
                    ? `${isAr ? 'تتحدث الآن' : 'Speaking'} · ${moodLabel}`
                    : `${moodLabel} · ${isAr ? 'اضغط للتحدث أو المس تمرة لتغيير تعبيرها' : 'Ready for Voice · Tap Tamra for expressions'}`}
          </p>
        </div>

        {/* Prominent Primary Voice Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 w-full max-w-lg">
          <button
            type="button"
            onClick={() => void handleToggleVoiceSession()}
            disabled={sending && !voiceSessionActive}
            className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer ${
              voiceSessionActive
                ? 'bg-[#8E7D49] hover:bg-[#77683b] text-white'
                : 'bg-[#1C250C] hover:bg-[#2c3a14] text-[#DBAE83]'
            }`}
          >
            {voiceSessionActive ? (
              <>
                <PhoneOff className="w-4 h-4" />
                <span>{isAr ? 'إنهاء المحادثة الصوتية' : 'End Voice Session'}</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-4 h-4" />
                <span>{isAr ? 'بدء محادثة صوتية مستمرة' : 'Start Voice Session'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void handleSingleMicToggle()}
            disabled={sending || transcribing || voiceSessionActive}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-colors cursor-pointer disabled:opacity-55 ${
              recording
                ? 'bg-[#8E7D49] border-[#8E7D49] text-white'
                : 'bg-white border-[#535C21]/40 hover:border-[#535C21] text-[#1C250C]'
            }`}
          >
            {recording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>
                  {isAr ? 'إيقاف وإرسال' : 'Stop'} ·{' '}
                  <span className="font-mono-tabular">{formatDuration(recordSeconds)}</span>
                </span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-[#535C21]" />
                <span>{isAr ? 'تحدث مرة واحدة' : 'Tap Mic Once'}</span>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => void handleAudioFileUpload(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={recording || transcribing || sending}
            title={isAr ? 'رفع تسجيل صوتي' : 'Upload voice recording'}
            className="p-3 rounded-2xl border border-[#D5D5D5] bg-white hover:bg-[#DBAE83]/20 text-[#1C250C] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Latest Tamra Response Spotlight (Clean & Calm — not cluttered chat wall) */}
        {latestTamraMessage && (
          <div className="mt-5 w-full max-w-2xl rounded-2xl bg-white/92 backdrop-blur-xs border border-[#D5D5D5] p-4 text-start shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#8E7D49]">
              <span className="font-bold text-[#535C21]">
                {transcribing
                  ? isAr
                    ? 'جاري تحويل صوتك...'
                    : 'Transcribing speech...'
                  : sending
                    ? isAr
                      ? 'تمرة تجهز الإجابة...'
                      : 'Tamra is preparing an answer...'
                    : isAr
                      ? 'أحدث رد من تمرة'
                      : 'Latest Response from Tamra'}
              </span>
              <button
                type="button"
                onClick={() =>
                  void speakMessage(
                    latestTamraMessage.id,
                    latestTamraMessage.text,
                    latestTamraMessage.emotion,
                  )
                }
                className="inline-flex items-center gap-1 text-[#535C21] hover:text-[#1C250C] font-bold cursor-pointer"
              >
                {speakingMessageId === latestTamraMessage.id ? (
                  <>
                    <Square className="w-2.5 h-2.5 fill-current" />
                    <span>{isAr ? 'إيقاف الصوت' : 'Stop Audio'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'استماع' : 'Play Voice'}</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-[#1C250C] leading-relaxed whitespace-pre-line">
              {latestTamraMessage.text}
            </p>
          </div>
        )}

        {/* Quick Prompts */}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5 max-w-2xl">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending || recording || transcribing}
              onClick={() => void submitQuestion(prompt, false)}
              className="px-3 py-1.5 text-xs text-[#1C250C] bg-white/90 border border-[#D5D5D5] hover:border-[#535C21] hover:bg-[#edf2e2] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Microphone Error Banner */}
      {micError && (
        <div className="px-5 py-2.5 bg-[#DBAE83]/25 border-t border-[#AD927E] text-xs text-[#1C250C] flex flex-wrap items-center justify-between gap-2">
          <span>{micError}</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#AD927E] rounded text-[#1C250C] font-medium hover:bg-[#faf8f4] cursor-pointer shrink-0"
          >
            <Upload className="w-3 h-3" />
            <span>{isAr ? 'رفع ملف صوتي' : 'Upload Audio'}</span>
          </button>
        </div>
      )}

      {/* Secondary Collapsible Chat & Text Drawer Toggle */}
      <div className="border-t border-[#D5D5D5] bg-white">
        <button
          type="button"
          onClick={() => setShowChatDrawer((v) => !v)}
          className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-[#535C21] hover:bg-[#faf8f4] transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>
              {showChatDrawer
                ? isAr
                  ? 'إخفاء سجل المحادثة ومربع الكتابة'
                  : 'Hide Conversation History & Text Input'
                : isAr
                  ? `عرض سجل المحادثة والكتابة النصية (${messages.length})`
                  : `Open Chat History & Text Input (${messages.length})`}
            </span>
          </span>
          {showChatDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showChatDrawer && (
          <div className="border-t border-[#D5D5D5] animate-thamra-in">
            <div
              ref={chatScrollRef}
              className="max-h-[340px] overflow-y-auto px-5 py-4 space-y-3 bg-[#faf8f4]/50"
            >
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isSpeakingThis = speakingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                        isUser
                          ? 'bg-[#535C21] text-white'
                          : 'bg-white border border-[#D5D5D5] text-[#1C250C]'
                      }`}
                    >
                      {msg.text}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#AD927E]">
                      <span className="font-mono-tabular">{msg.timestamp}</span>
                      {!isUser && msg.emotion && (
                        <>
                          <span>·</span>
                          <span className="text-[#8E7D49] font-medium">
                            {getEmotionLabel(msg.emotion, language)}
                          </span>
                        </>
                      )}
                      {!isUser && (
                        <>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => void speakMessage(msg.id, msg.text, msg.emotion)}
                            className="inline-flex items-center gap-1 text-[#535C21] hover:text-[#1C250C] font-semibold cursor-pointer"
                          >
                            {isSpeakingThis ? (
                              <>
                                <Square className="w-2.5 h-2.5 fill-current" />
                                <span>{isAr ? 'إيقاف' : 'Stop'}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>{isAr ? 'استماع' : 'Listen'}</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Text Input Form inside Secondary Drawer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitQuestion(inputText, false);
              }}
              className="p-4 border-t border-[#D5D5D5] bg-white flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending || recording || transcribing}
                placeholder={
                  isAr
                    ? 'اكتب سؤالك بالعربية أو الإنجليزية...'
                    : 'Type a question in English or Arabic...'
                }
                className="flex-1 min-h-[42px] px-3.5 py-2 text-sm bg-[#faf8f4] border border-[#D5D5D5] rounded-xl text-[#1C250C] placeholder:text-[#AD927E] focus:outline-none focus:ring-2 focus:ring-[#535C21]/25 focus:border-[#535C21] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending || recording || transcribing}
                aria-label={isAr ? 'إرسال' : 'Send'}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#535C21] hover:bg-[#414919] text-white text-sm font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{isAr ? 'إرسال' : 'Ask'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};
