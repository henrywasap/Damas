import React, { useEffect, useState, useRef } from 'react';

// ─── Phrase pools — {LOSER} and {WINNER} get replaced at runtime ─────────────

const ROAST_TOP: string[] = [
  '¡{LOSER}! ¿EN SERIO?',
  '¡OH NO, {LOSER}!',
  '¡ADIÓS, FICHITA DE {LOSER}!',
  '¡{LOSER} NO VIO VENIR ESO!',
  '¿ESTO ES LO MEJOR QUE TIENES, {LOSER}?',
  'QUÉ PENA, {LOSER} 😬',
  '¡{LOSER} HA SIDO ELIMINADO!',
  'R.I.P. {LOSER} 💀 (2024-2024)',
  '¡{WINNER} SE LA COMIÓ, {LOSER}!',
  '¡{LOSER} TE DESPISTAS MÁS QUE UN PULPO EN UN GARAJE!',
];

const ROAST_BOTTOM: string[] = [
  '¿Cómo pudiste NO ver eso, {LOSER}?! 🤦',
  '¡{WINNER} te mandó al cementerio de fichas!',
  '¡Eso dolió más que pisar un LEGO!',
  '¡{LOSER}, el tablero te llamó… para decirte adiós!',
  '¡Esa ficha ya no sufre más, {LOSER}!',
  '¡Error 404: ficha de {LOSER} no encontrada!',
  '¿Ibas dormido, {LOSER}? 😴',
  '¡{WINNER} te hizo un recorte de personal!',
  '¡La ficha de {LOSER} ha abandonado el chat!',
  '¡Eso es lo que pasa por no poner atención, {LOSER}!',
  '¡Bruh, hasta yo lo vi venir y soy el tablero!',
  '¡{LOSER}, tu ficha fue al paraíso de las damas!',
  '¡{WINNER}: 1 — {LOSER}: 🪦',
  '¡Mi abuela juega mejor que tú, {LOSER}!',
  '¡Ni en un simulacro era tan fácil, {LOSER}!',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillNames(template: string, loser: string, winner: string): string {
  return template.replace(/\{LOSER\}/g, loser).replace(/\{WINNER\}/g, winner);
}

// ─── Floating emoji rain ──────────────────────────────────────────────────────

const RAIN_EMOJIS = ['💀', '😂', '🤡', '😭', '☠️', '🪦', '👻', '🫠', '🤣', '😬'];

interface RainDrop {
  id: number;
  emoji: string;
  left: number;   // %
  delay: number;  // s
  dur: number;    // s
  size: number;   // rem
}

function makeRain(count: number): RainDrop[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: pick(RAIN_EMOJIS),
    left: Math.random() * 92,
    delay: Math.random() * 0.6,
    dur: 0.9 + Math.random() * 0.8,
    size: 1.2 + Math.random() * 1.6,
  }));
}

// ─── Meme templates ───────────────────────────────────────────────────────────

interface MemeDef {
  id: string;
  emoji: string;
  bgFrom: string;
  bgVia: string;
  bgTo: string;
  borderColor: string;
  glowColor: string;
  animClass: string;
  duration: number;
}

const MEMES: MemeDef[] = [
  {
    id: 'bruh',
    emoji: '😐',
    bgFrom: '#1a1a2e', bgVia: '#16213e', bgTo: '#0f3460',
    borderColor: '#e94560',
    glowColor: 'rgba(233,69,96,0.6)',
    animClass: 'meme-bruh',
    duration: 2800,
  },
  {
    id: 'oof',
    emoji: '💀',
    bgFrom: '#3d0000', bgVia: '#6b0f0f', bgTo: '#3d0000',
    borderColor: '#ff4500',
    glowColor: 'rgba(255,69,0,0.7)',
    animClass: 'meme-oof',
    duration: 2400,
  },
  {
    id: 'trombone',
    emoji: '😭',
    bgFrom: '#0d1b2a', bgVia: '#1b263b', bgTo: '#0d1b2a',
    borderColor: '#415a77',
    glowColor: 'rgba(65,90,119,0.8)',
    animClass: 'meme-trombone',
    duration: 3000,
  },
  {
    id: 'victory',
    emoji: '🏆',
    bgFrom: '#3d2300', bgVia: '#7c4a00', bgTo: '#3d2300',
    borderColor: '#ffd700',
    glowColor: 'rgba(255,215,0,0.8)',
    animClass: 'meme-victory',
    duration: 2600,
  },
  {
    id: 'boom',
    emoji: '💥',
    bgFrom: '#2d0000', bgVia: '#5c0000', bgTo: '#2d0000',
    borderColor: '#ff0000',
    glowColor: 'rgba(255,0,0,0.9)',
    animClass: 'meme-boom',
    duration: 2200,
  },
  {
    id: 'pikachu',
    emoji: '😮',
    bgFrom: '#3a2e00', bgVia: '#6b5300', bgTo: '#3a2e00',
    borderColor: '#ffc800',
    glowColor: 'rgba(255,200,0,0.75)',
    animClass: 'meme-pikachu',
    duration: 2800,
  },
  {
    id: 'airhorn',
    emoji: '📯',
    bgFrom: '#1a0030', bgVia: '#3d0060', bgTo: '#1a0030',
    borderColor: '#bf00ff',
    glowColor: 'rgba(191,0,255,0.8)',
    animClass: 'meme-airhorn',
    duration: 2400,
  },
  {
    id: 'facepalm',
    emoji: '🤦',
    bgFrom: '#002200', bgVia: '#004400', bgTo: '#002200',
    borderColor: '#00ff88',
    glowColor: 'rgba(0,255,136,0.7)',
    animClass: 'meme-facepalm',
    duration: 2600,
  },
  {
    id: 'clown',
    emoji: '🤡',
    bgFrom: '#1a0010', bgVia: '#400030', bgTo: '#1a0010',
    borderColor: '#ff69b4',
    glowColor: 'rgba(255,105,180,0.8)',
    animClass: 'meme-clown',
    duration: 2800,
  },
  {
    id: 'skull',
    emoji: '☠️',
    bgFrom: '#0a0a0a', bgVia: '#1a1a1a', bgTo: '#0a0a0a',
    borderColor: '#aaaaaa',
    glowColor: 'rgba(170,170,170,0.6)',
    animClass: 'meme-skull',
    duration: 2400,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface MemeAnimationProps {
  captureCount: number;
  loserName: string;
  winnerName: string;
}

let _rainId = 0;

export const MemeAnimation: React.FC<MemeAnimationProps> = ({
  captureCount,
  loserName,
  winnerName,
}) => {
  const [visible, setVisible] = useState(false);
  const [meme, setMeme] = useState<MemeDef>(MEMES[0]);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [rain, setRain] = useState<RainDrop[]>([]);
  const [shaking, setShaking] = useState(false);
  const prevCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (captureCount > prevCountRef.current) {
      prevCountRef.current = captureCount;

      const pool = MEMES.filter((m) => m.id !== meme.id);
      const next = pool[Math.floor(Math.random() * pool.length)];

      const safeLoser  = loserName  || 'crack';
      const safeWinner = winnerName || 'crack';

      setMeme(next);
      setTopText(fillNames(pick(ROAST_TOP), safeLoser, safeWinner));
      setBottomText(fillNames(pick(ROAST_BOTTOM), safeLoser, safeWinner));
      setRain(makeRain(14).map(d => ({ ...d, id: _rainId++ })));
      setVisible(true);
      setShaking(true);

      if (shakeRef.current) clearTimeout(shakeRef.current);
      shakeRef.current = setTimeout(() => setShaking(false), 500);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setRain([]);
      }, next.duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureCount]);

  if (!visible) return null;

  const dur = `${meme.duration}ms`;

  return (
    <>
      <style>{`
        /* ── Card entry animations ── */
        @keyframes meme-bruh-kf {
          0%   { transform: scaleX(0) rotate(-12deg); opacity:0; }
          20%  { transform: scaleX(1.12) rotate(4deg); opacity:1; }
          40%  { transform: scaleX(0.95) rotate(-2deg); }
          60%  { transform: scaleX(1.03) rotate(1deg); }
          80%  { transform: scaleX(1) rotate(0deg); opacity:1; }
          100% { transform: scaleX(0.7) rotate(8deg); opacity:0; }
        }
        @keyframes meme-oof-kf {
          0%   { transform: translateY(-100px) scale(0.5); opacity:0; }
          18%  { transform: translateY(12px) scale(1.08); opacity:1; }
          28%  { transform: translateY(-6px) scale(0.97); }
          38%  { transform: translateY(4px) scale(1.02); }
          80%  { transform: translateY(0) scale(1); opacity:1; }
          100% { transform: translateY(60px) scale(0.6); opacity:0; }
        }
        @keyframes meme-trombone-kf {
          0%,100% { opacity:0; }
          8%   { opacity:1; }
          15%  { transform: skewX(-6deg) scale(1.04); }
          30%  { transform: skewX(5deg)  scale(0.97); }
          45%  { transform: skewX(-3deg) scale(1.02); }
          60%  { transform: skewX(2deg)  scale(0.99); }
          90%  { transform: skewX(0deg)  scale(1); opacity:1; }
        }
        @keyframes meme-victory-kf {
          0%   { transform: scale(0) rotate(540deg); opacity:0; }
          35%  { transform: scale(1.25) rotate(-12deg); opacity:1; }
          55%  { transform: scale(0.95) rotate(5deg); }
          70%  { transform: scale(1.05) rotate(-2deg); }
          85%  { transform: scale(1) rotate(0deg); opacity:1; }
          100% { transform: scale(1.2) rotate(0deg); opacity:0; }
        }
        @keyframes meme-boom-kf {
          0%   { transform: scale(3.5); opacity:0; filter:blur(12px) brightness(3); }
          20%  { transform: scale(1.02); opacity:1; filter:blur(0) brightness(1); }
          30%  { transform: scale(1.08); }
          40%  { transform: scale(0.96); }
          80%  { transform: scale(1); opacity:1; }
          100% { transform: scale(0.5); opacity:0; }
        }
        @keyframes meme-pikachu-kf {
          0%   { transform: scaleY(0) scaleX(1.4); opacity:0; }
          22%  { transform: scaleY(1.12) scaleX(0.92); opacity:1; }
          40%  { transform: scaleY(0.95) scaleX(1.03); }
          55%  { transform: scaleY(1.02) scaleX(0.99); }
          80%  { transform: scale(1); opacity:1; }
          100% { transform: scale(0) rotate(25deg); opacity:0; }
        }
        @keyframes meme-airhorn-kf {
          0%   { transform:translateX(-120%) rotate(-15deg); opacity:0; }
          20%  { transform:translateX(8px) rotate(3deg); opacity:1; }
          32%  { transform:translateX(-6px) rotate(-2deg); }
          44%  { transform:translateX(4px) rotate(1deg); }
          80%  { transform:translateX(0) rotate(0deg); opacity:1; }
          100% { transform:translateX(120%) rotate(15deg); opacity:0; }
        }
        @keyframes meme-facepalm-kf {
          0%   { transform: rotateX(90deg) scale(0.6); opacity:0; }
          25%  { transform: rotateX(-10deg) scale(1.05); opacity:1; }
          45%  { transform: rotateX(5deg) scale(0.98); }
          65%  { transform: rotateX(0deg) scale(1); opacity:1; }
          100% { transform: rotateX(-90deg) scale(0.6); opacity:0; }
        }
        @keyframes meme-clown-kf {
          0%   { transform: scale(0.1) rotate(1080deg); opacity:0; }
          30%  { transform: scale(1.15) rotate(-8deg); opacity:1; }
          50%  { transform: scale(0.95) rotate(4deg); }
          70%  { transform: scale(1.03) rotate(-2deg); }
          85%  { transform: scale(1) rotate(0deg); opacity:1; }
          100% { transform: scale(0.1) rotate(-1080deg); opacity:0; }
        }
        @keyframes meme-skull-kf {
          0%   { transform: translateX(0) scale(0.8); opacity:0; }
          5%,10%,15%,20%,25% { transform: translateX(-18px); opacity:1; }
          7.5%,12.5%,17.5%,22.5% { transform: translateX(18px); }
          30%  { transform: translateX(0) scale(1); opacity:1; }
          80%  { opacity:1; }
          100% { transform: scale(0.5); opacity:0; }
        }

        .meme-bruh     { animation: meme-bruh-kf     ${dur} cubic-bezier(.34,1.3,.64,1) forwards; }
        .meme-oof      { animation: meme-oof-kf       ${dur} cubic-bezier(.22,1,.36,1) forwards; }
        .meme-trombone { animation: meme-trombone-kf  ${dur} ease-in-out forwards; }
        .meme-victory  { animation: meme-victory-kf   ${dur} cubic-bezier(.34,1.56,.64,1) forwards; }
        .meme-boom     { animation: meme-boom-kf      ${dur} ease forwards; }
        .meme-pikachu  { animation: meme-pikachu-kf   ${dur} cubic-bezier(.34,1.4,.64,1) forwards; }
        .meme-airhorn  { animation: meme-airhorn-kf   ${dur} cubic-bezier(.22,.8,.36,1) forwards; }
        .meme-facepalm { animation: meme-facepalm-kf  ${dur} ease forwards; perspective:800px; }
        .meme-clown    { animation: meme-clown-kf     ${dur} cubic-bezier(.34,1.56,.64,1) forwards; }
        .meme-skull    { animation: meme-skull-kf     ${dur} ease forwards; }

        /* ── Emoji & text loops ── */
        @keyframes emoji-wild {
          0%,100% { transform: scale(1) rotate(0deg) translateY(0); }
          20%  { transform: scale(1.35) rotate(-15deg) translateY(-12px); }
          40%  { transform: scale(0.85) rotate(12deg) translateY(6px); }
          60%  { transform: scale(1.2) rotate(-8deg) translateY(-8px); }
          80%  { transform: scale(0.9) rotate(6deg) translateY(4px); }
        }
        @keyframes glitch-text {
          0%,90%,100% { clip-path: none; transform: none; }
          92% { clip-path: inset(20% 0 30% 0); transform: translateX(-4px) skewX(-2deg); }
          94% { clip-path: inset(60% 0 10% 0); transform: translateX(4px) skewX(2deg); }
          96% { clip-path: inset(40% 0 50% 0); transform: translateX(-2px); }
          98% { clip-path: none; transform: skewX(-1deg); }
        }
        @keyframes neon-pulse {
          0%,100% { text-shadow: 0 0 4px currentColor, 0 0 12px currentColor; }
          50% { text-shadow: 0 0 8px currentColor, 0 0 24px currentColor, 0 0 48px currentColor; }
        }
        @keyframes shake-card {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          10% { transform: translate(-8px,-4px) rotate(-2deg); }
          20% { transform: translate(8px,4px) rotate(2deg); }
          30% { transform: translate(-6px,2px) rotate(-1deg); }
          40% { transform: translate(6px,-2px) rotate(1deg); }
          50% { transform: translate(-4px,4px) rotate(-1.5deg); }
          60% { transform: translate(4px,-4px) rotate(1.5deg); }
          70% { transform: translate(-2px,2px) rotate(0deg); }
        }
        @keyframes rain-drop {
          0%   { transform: translateY(-60px) rotate(0deg); opacity:1; }
          80%  { opacity:1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity:0; }
        }
        .meme-emoji-wild { animation: emoji-wild 0.5s ease-in-out infinite; }
        .meme-neon-text  { animation: neon-pulse 0.65s ease-in-out infinite, glitch-text 3s steps(1) infinite; }
        .meme-card-shake { animation: shake-card 0.45s ease; }
      `}</style>

      {/* ── Emoji rain layer ── */}
      <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
        {rain.map((d) => (
          <span
            key={d.id}
            style={{
              position: 'absolute',
              top: '-60px',
              left: `${d.left}%`,
              fontSize: `${d.size}rem`,
              animationName: 'rain-drop',
              animationDuration: `${d.dur}s`,
              animationDelay: `${d.delay}s`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }}
          >
            {d.emoji}
          </span>
        ))}
      </div>

      {/* ── Main card ── */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      >
        <div
          className={`${meme.animClass} ${shaking ? 'meme-card-shake' : ''} flex flex-col items-center gap-3 px-8 py-7 rounded-3xl max-w-xs sm:max-w-sm mx-4`}
          style={{
            background: `linear-gradient(135deg, ${meme.bgFrom}, ${meme.bgVia}, ${meme.bgTo})`,
            border: `4px solid ${meme.borderColor}`,
            boxShadow: `0 0 40px ${meme.glowColor}, 0 0 80px ${meme.glowColor}, inset 0 0 20px rgba(255,255,255,0.04)`,
          }}
        >
          {/* TOP TEXT — glitch neon */}
          <span
            className="meme-neon-text font-black text-center leading-tight"
            style={{
              fontFamily: "'Impact','Arial Black',sans-serif",
              fontSize: 'clamp(0.9rem, 4vw, 1.6rem)',
              color: meme.borderColor,
              WebkitTextStroke: '1px rgba(0,0,0,0.8)',
              letterSpacing: '0.06em',
              maxWidth: '100%',
              wordBreak: 'break-word',
            }}
          >
            {topText}
          </span>

          {/* EMOJI — wild bounce */}
          <span
            className="meme-emoji-wild select-none"
            style={{ fontSize: 'clamp(3.5rem, 14vw, 6rem)', lineHeight: 1 }}
          >
            {meme.emoji}
          </span>

          {/* BOTTOM TEXT */}
          <span
            className="text-center font-bold leading-snug"
            style={{
              fontFamily: "'Impact','Arial Black',sans-serif",
              fontSize: 'clamp(0.7rem, 3vw, 1.05rem)',
              color: 'rgba(255,255,255,0.92)',
              WebkitTextStroke: '0.5px rgba(0,0,0,0.6)',
              maxWidth: '100%',
              wordBreak: 'break-word',
            }}
          >
            {bottomText}
          </span>

          {/* Small "no sabías que…" tag */}
          <span
            className="text-[10px] text-white/30 italic tracking-wide"
            style={{ fontFamily: 'monospace' }}
          >
            — La IA del tablero
          </span>
        </div>
      </div>
    </>
  );
};
