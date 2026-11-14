import React, { useEffect, useState } from 'react';
import type { AppLanguage, AvatarState, TamraEmotion } from '../../types/farm';

interface TamraCharacterProps {
  emotion: TamraEmotion;
  avatarState: AvatarState;
  micLevel?: number;
  size?: number;
  onClick?: () => void;
}

export const EMOTION_LABELS: Record<TamraEmotion, { en: string; ar: string }> = {
  neutral: { en: 'Calm', ar: 'هادئة' },
  happy: { en: 'Happy', ar: 'سعيدة' },
  excited: { en: 'Excited', ar: 'متحمسة' },
  thinking: { en: 'Thinking', ar: 'تفكر' },
  confused: { en: 'Unsure', ar: 'متحيرة' },
  surprised: { en: 'Surprised', ar: 'متفاجئة' },
  concerned: { en: 'Concerned', ar: 'قلقة' },
  laughing: { en: 'Laughing', ar: 'تضحك' },
  sad: { en: 'Sad', ar: 'حزينة' },
  tired: { en: 'Tired', ar: 'متعبة' },
  wink: { en: 'Playful', ar: 'مرحة' },
  proud: { en: 'Proud', ar: 'فخورة' },
  love: { en: 'Caring', ar: 'محبة' },
};

export function getEmotionLabel(emotion: TamraEmotion, lang: AppLanguage): string {
  const entry = EMOTION_LABELS[emotion] ?? EMOTION_LABELS.neutral;
  return lang === 'ar' ? entry.ar : entry.en;
}

export const TamraCharacter: React.FC<TamraCharacterProps> = ({
  emotion,
  avatarState,
  micLevel = 0,
  size = 76,
  onClick,
}) => {
  const isSpeaking = avatarState === 'speaking';
  const isListening = avatarState === 'listening';
  const isThinking = avatarState === 'thinking';

  const effectiveEmotion: TamraEmotion = isThinking ? 'thinking' : emotion;

  // Cycle mouth frames (0: neutral/rest, 1: Talking A oval, 2: Talking B tilted open, 3: smile open) while speaking
  const [mouthFrame, setMouthFrame] = useState<number>(0);

  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }
    const id = window.setInterval(() => {
      setMouthFrame((prev) => (prev + 1) % 4);
    }, 155);
    return () => window.clearInterval(id);
  }, [isSpeaking]);

  const headTransform = isSpeaking
    ? mouthFrame === 1
      ? 'translateY(-1.5px) rotate(-2deg)'
      : mouthFrame === 2
        ? 'translateY(-0.5px) rotate(2deg)'
        : 'translateY(0px) rotate(0deg)'
    : isListening
      ? `scale(${(1 + micLevel * 0.06).toFixed(3)}) rotate(-3deg)`
      : isThinking
        ? 'rotate(-4deg)'
        : 'rotate(0deg)';

  const renderEyes = () => {
    switch (effectiveEmotion) {
      case 'happy':
      case 'excited':
        return (
          <g stroke="#595959" strokeWidth="3.2" strokeLinecap="round" fill="none">
            <path d="M 33 59 Q 38 51 43 59" />
            <path d="M 65 59 Q 70 51 75 59" />
          </g>
        );
      case 'laughing':
        return (
          <g stroke="#595959" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M 33 52 L 42 56.5 L 33 61" />
            <path d="M 75 52 L 66 56.5 L 75 61" />
          </g>
        );
      case 'sad':
        return (
          <g>
            <path
              d="M 32 58 Q 38 63 44 58"
              stroke="#595959"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 64 58 Q 70 63 76 58"
              stroke="#595959"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 31 49 L 42 46"
              stroke="#595959"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M 77 49 L 66 46"
              stroke="#595959"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        );
      case 'tired':
        return (
          <g stroke="#595959" strokeWidth="3" strokeLinecap="round">
            <line x1="32" y1="57" x2="43" y2="57" />
            <line x1="65" y1="57" x2="76" y2="57" />
          </g>
        );
      case 'wink':
        return (
          <g>
            <circle cx="38" cy="57" r="3.6" fill="#595959" />
            <path
              d="M 75 52 L 66 56.5 L 75 61"
              stroke="#595959"
              strokeWidth="3.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        );
      case 'proud':
        return (
          <g stroke="#595959" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M 32 56 Q 38 62 44 56" />
            <path d="M 64 56 Q 70 62 76 56" />
          </g>
        );
      case 'love':
        return (
          <g fill="#595959">
            <path d="M 38 61.5 C 33 58 31 54.5 34 52 C 35.8 50.5 37.6 51.8 38 53 C 38.4 51.8 40.2 50.5 42 52 C 45 54.5 43 58 38 61.5 Z" />
            <path d="M 70 61.5 C 65 58 63 54.5 66 52 C 67.8 50.5 69.6 51.8 70 53 C 70.4 51.8 72.2 50.5 74 52 C 77 54.5 75 58 70 61.5 Z" />
          </g>
        );
      case 'concerned':
        return (
          <g>
            <path
              d="M 32 49 Q 38 46 43 44"
              stroke="#595959"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 76 49 Q 70 46 65 44"
              stroke="#595959"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="38" cy="57" r="3.6" fill="#595959" />
            <circle cx="70" cy="57" r="3.6" fill="#595959" />
          </g>
        );
      case 'confused':
        return (
          <g>
            <path
              d="M 32 46 Q 38 42 44 46"
              stroke="#595959"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="38" cy="57" r="3.6" fill="#595959" />
            <circle cx="70" cy="59" r="3.6" fill="#595959" />
          </g>
        );
      default:
        // neutral, thinking, surprised
        return (
          <g>
            <circle cx="38" cy="57" r="3.7" fill="#595959" />
            <circle cx="70" cy="57" r="3.7" fill="#595959" />
          </g>
        );
    }
  };

  const renderMouth = () => {
    // Active talking sequence overrides static mouth (Talking A -> Talking B -> Smile/Neutral)
    if (isSpeaking) {
      if (mouthFrame === 1) {
        // Talking (A): expressive oval O
        return <ellipse cx="54" cy="72.5" rx="4.6" ry="5.8" fill="#595959" />;
      }
      if (mouthFrame === 2) {
        // Talking (B): tilted open mouth
        return (
          <path
            d="M 46.5 70.5 Q 54 68.5 61.5 71.5 Q 59.5 78.5 52.5 78 Q 47 76.5 46.5 70.5 Z"
            fill="#595959"
          />
        );
      }
      if (mouthFrame === 3) {
        // Open D-smile
        return (
          <path
            d="M 46 69.5 L 62 69.5 Q 61.5 78 54 78 Q 46.5 78 46 69.5 Z"
            fill="#595959"
          />
        );
      }
      return <rect x="46" y="70.5" width="16" height="3.8" rx="1.9" fill="#595959" />;
    }

    switch (effectiveEmotion) {
      case 'happy':
      case 'excited':
      case 'laughing':
      case 'love':
        return (
          <path
            d="M 45.5 69 L 62.5 69 Q 62 79 54 79 Q 46 79 45.5 69 Z"
            fill="#595959"
          />
        );
      case 'wink':
      case 'proud':
        return (
          <path
            d="M 47 70.5 Q 54 76.5 61 70.5"
            stroke="#595959"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
        );
      case 'surprised':
        return <ellipse cx="54" cy="73" rx="4.2" ry="5.6" fill="#595959" />;
      case 'sad':
        return (
          <path
            d="M 46.5 75.5 Q 54 69 61.5 75.5"
            stroke="#595959"
            strokeWidth="3.1"
            strokeLinecap="round"
            fill="none"
          />
        );
      case 'concerned':
        return (
          <path
            d="M 48 73.5 Q 54 70.5 60 73.5"
            stroke="#595959"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        );
      case 'thinking':
      case 'confused':
        return (
          <line
            x1="48"
            y1="73"
            x2="60"
            y2="71"
            stroke="#595959"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        );
      case 'tired':
        return <rect x="49.5" y="71.5" width="9" height="3.2" rx="1.6" fill="#595959" />;
      default:
        // neutral
        return <rect x="45.5" y="70.5" width="17" height="3.8" rx="1.9" fill="#595959" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Tamra character (${effectiveEmotion})`}
      className="relative inline-flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#535C21] rounded-2xl cursor-pointer"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 108 108"
        width={size}
        height={size}
        className={`overflow-visible ${avatarState === 'idle' ? 'animate-tamra-bob' : ''}`}
        style={{
          transform: headTransform,
          transition: 'transform 140ms ease-out',
        }}
      >
        {/* Subtle neutral listening ring */}
        {isListening && (
          <circle
            cx="54"
            cy="58"
            r={44 + micLevel * 7}
            fill="none"
            stroke="#7A7A7A"
            strokeWidth="2.2"
            strokeDasharray="6 4"
            opacity="0.7"
          />
        )}

        {/* Pure White Plump Body (no colors, subtle neutral gray rim matching character sheet) */}
        <path
          d="M 54 23 C 77 23 93 38 93 60 C 93 81 77 95 54 95 C 31 95 15 81 15 60 C 15 38 31 23 54 23 Z"
          fill="#FFFFFF"
          stroke="#CFCFCF"
          strokeWidth="2.2"
        />

        {/* Soft monochrome inner edge shadow */}
        <path
          d="M 79 34 C 89 43 91 56 89 69 C 85 83 71 92 54 92 C 44 92 35 89 29 84 C 41 88 59 86 71 75 C 82 64 85 48 79 34 Z"
          fill="#F2F2F2"
          opacity="0.7"
        />

        {/* Subtle upper-left contour arc from character sheet */}
        <path
          d="M 24 53 Q 25 38 37 32"
          fill="none"
          stroke="#E0E0E0"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* Pure White Wavy Crown Cap with soft neutral shadow */}
        <path
          d="M 35 28 C 33 21 38 15 44 17 C 46 11 54 10 58 15 C 63 11 71 14 70 21 C 76 22 77 28 71 31 C 62 28 45 28 35 28 Z"
          fill="#FFFFFF"
          stroke="#CFCFCF"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M 37 29 Q 54 26 71 30"
          fill="none"
          stroke="#DCDCDC"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Iconic Central Recessed Nose (soft monochrome shading, no color) */}
        <path
          d="M 54 46.5 C 55.6 46.5 58.2 56.5 57.6 59.5 C 57.2 61 50.8 61 50.4 59.5 C 49.8 56.5 52.4 46.5 54 46.5 Z"
          fill="#EBEBEB"
          stroke="#C2C2C2"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Eyes */}
        {renderEyes()}

        {/* Mouth / Talking Sequence */}
        {renderMouth()}

        {/* Monochrome Expression Cues */}
        {effectiveEmotion === 'thinking' && (
          <text
            x="88"
            y="28"
            fill="#6E6E6E"
            fontSize="16"
            fontWeight="700"
            fontFamily="var(--font-display)"
          >
            ?
          </text>
        )}
        {effectiveEmotion === 'surprised' && (
          <text
            x="86"
            y="28"
            fill="#6E6E6E"
            fontSize="15"
            fontWeight="700"
            fontFamily="var(--font-display)"
          >
            !!
          </text>
        )}
        {effectiveEmotion === 'tired' && (
          <text
            x="82"
            y="24"
            fill="#8C8C8C"
            fontSize="13"
            fontWeight="700"
            fontFamily="var(--font-display)"
          >
            zZ
          </text>
        )}
        {(isSpeaking && (mouthFrame === 1 || mouthFrame === 2)) ||
        effectiveEmotion === 'laughing' ? (
          <g stroke="#7A7A7A" strokeWidth="2.1" strokeLinecap="round">
            <line x1="87" y1="68" x2="95" y2="65" />
            <line x1="88" y1="74" x2="96" y2="75" />
          </g>
        ) : null}
      </svg>
    </button>
  );
};
