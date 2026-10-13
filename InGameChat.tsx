import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types/checkers.js';
import { Send, MessageSquare, Image, X, Search, Loader2 } from 'lucide-react';

interface InGameChatProps {
  chat: ChatMessage[];
  onSendMessage: (text: string) => void;
  myUserName: string;
}

// ─── Tenor search helper ──────────────────────────────────────────────────────
// Uses the free Tenor v2 API. Falls back to curated GIFs if no API key is set.
const TENOR_KEY = 'AIzaSyBaFubpHFzfEIMh5WKl3eXnXVGFUGIlmqA'; // demo key (rate-limited)
const TENOR_CLIENT_KEY = 'damas_online_meme_chat';

async function searchTenor(query: string): Promise<string[]> {
  try {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=12&media_filter=gif`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('tenor error');
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.results.map((r: any) => r.media_formats?.gif?.url || r.media_formats?.tinygif?.url).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchFeaturedTenor(): Promise<string[]> {
  try {
    const url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=12&media_filter=gif&q=chess checkers funny`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.results.map((r: any) => r.media_formats?.gif?.url || r.media_formats?.tinygif?.url).filter(Boolean);
  } catch {
    return CURATED_GIFS;
  }
}

// ─── Curated fallback GIFs ────────────────────────────────────────────────────
// Public Tenor embeds — always available, no key needed
const CURATED_GIFS: string[] = [
  'https://media.tenor.com/FGdV3fCBjiUAAAAC/thinking-minions.gif',
  'https://media.tenor.com/sHAOA-TpUWgAAAAC/chess-game.gif',
  'https://media.tenor.com/jLMxw5QXQHAAAAAC/cat-chess.gif',
  'https://media.tenor.com/M9xODtDRbxcAAAAC/checkers-game.gif',
  'https://media.tenor.com/9mzaE1U8XLAAAAAC/bruh-seriously.gif',
  'https://media.tenor.com/y4GXJZ-v7VcAAAAC/oof-roblox.gif',
  'https://media.tenor.com/5e0jKkHBxFUAAAAC/sad-trombone.gif',
  'https://media.tenor.com/OGGFPZRfOrQAAAAC/victory-royale.gif',
  'https://media.tenor.com/pBYMesoQ9OEAAAAC/minions-running.gif',
  'https://media.tenor.com/C2UhBDmh1gcAAAAC/facepalm.gif',
  'https://media.tenor.com/g3sXO6UhcloAAAAC/evil-laugh.gif',
  'https://media.tenor.com/e3FAj2LrxH0AAAAC/clown-honk.gif',
];

// ─── Quick reactions ──────────────────────────────────────────────────────────
const QUICK_REACTIONS = [
  { emoji: '👋', text: '¡Hola! Buena suerte' },
  { emoji: '👏', text: '¡Excelente jugada!' },
  { emoji: '👑', text: '¡Dama coronada!' },
  { emoji: '🤔', text: 'Mmm… déjame pensar' },
  { emoji: '🤝', text: '¡Buena partida!' },
  { emoji: '🔥', text: '¡Qué gran duelo!' },
  { emoji: '😂', text: '¡JAJAJA no lo puedo creer!' },
  { emoji: '🫠', text: 'Me derretí de vergüenza' },
];

// ─── GIF message detector ─────────────────────────────────────────────────────
function isGifUrl(text: string): boolean {
  return /^https?:\/\/.+\.(gif|webp)(\?.*)?$/.test(text) ||
    text.startsWith('https://media.tenor.com');
}

// ─── Component ────────────────────────────────────────────────────────────────
export const InGameChat: React.FC<InGameChatProps> = ({
  chat,
  onSendMessage,
  myUserName,
}) => {
  const [inputText, setInputText]       = useState('');
  const [showGifPanel, setShowGifPanel] = useState(false);
  const [gifQuery, setGifQuery]         = useState('');
  const [gifResults, setGifResults]     = useState<string[]>([]);
  const [gifLoading, setGifLoading]     = useState(false);
  const [gifPage, setGifPage]           = useState<'featured' | 'search'>('featured');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // Load featured GIFs when panel opens
  useEffect(() => {
    if (showGifPanel && gifPage === 'featured' && gifResults.length === 0) {
      setGifLoading(true);
      fetchFeaturedTenor().then((urls) => {
        setGifResults(urls.length > 0 ? urls : CURATED_GIFS);
        setGifLoading(false);
      });
    }
  }, [showGifPanel, gifPage, gifResults.length]);

  // Debounced search
  const handleGifSearch = useCallback((q: string) => {
    setGifQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!q.trim()) {
      setGifPage('featured');
      setGifResults([]);
      return;
    }
    setGifPage('search');
    setGifLoading(true);
    searchDebounce.current = setTimeout(async () => {
      const results = await searchTenor(q);
      setGifResults(results.length > 0 ? results : CURATED_GIFS.slice(0, 6));
      setGifLoading(false);
    }, 500);
  }, []);

  const handleSendGif = (url: string) => {
    onSendMessage(url);
    setShowGifPanel(false);
    setGifQuery('');
    setGifResults([]);
    setGifPage('featured');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-4 bg-stone-900/95 border border-stone-800 rounded-2xl p-3.5 shadow-xl flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-stone-800 text-xs font-semibold text-stone-300">
        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
        <span>Chat de la sala y reacciones</span>
      </div>

      {/* Quick reaction chips */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {QUICK_REACTIONS.map((r, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(r.text)}
            className="flex items-center gap-1 px-2 py-1 bg-stone-800/80 hover:bg-stone-700 text-[11px] text-stone-300 rounded-lg border border-stone-700/60 transition cursor-pointer"
          >
            <span>{r.emoji}</span>
            <span className="hidden sm:inline">{r.text}</span>
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="h-40 overflow-y-auto pr-1 space-y-1.5 text-xs">
        {chat.map((msg) => {
          if (msg.isSystem) {
            return (
              <div
                key={msg.id}
                className="py-1 px-2.5 rounded bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-300/90 text-center italic"
              >
                {msg.text}
              </div>
            );
          }

          const isMe = msg.sender.toLowerCase() === myUserName.toLowerCase();
          const isGif = isGifUrl(msg.text);
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mb-0.5">
                <span className={isMe ? 'text-amber-400 font-medium' : 'text-stone-300 font-medium'}>
                  {msg.sender}
                </span>
                <span>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {isGif ? (
                /* GIF bubble */
                <div
                  className={`rounded-xl overflow-hidden max-w-[200px] border-2 ${isMe ? 'border-amber-500/60' : 'border-stone-600/60'}`}
                  style={{ borderRadius: isMe ? '12px 2px 12px 12px' : '2px 12px 12px 12px' }}
                >
                  <img
                    src={msg.text}
                    alt="GIF"
                    className="w-full h-auto block"
                    style={{ maxHeight: '140px', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </div>
              ) : (
                /* Text bubble */
                <div
                  className={`px-2.5 py-1.5 rounded-xl max-w-[85%] break-words ${
                    isMe
                      ? 'bg-amber-600 text-stone-950 font-medium rounded-tr-none'
                      : 'bg-stone-800 text-stone-200 rounded-tl-none border border-stone-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── GIF Panel ── */}
      {showGifPanel && (
        <div className="mt-2 border-t border-stone-800 pt-2">
          {/* Search bar */}
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={gifQuery}
                onChange={(e) => handleGifSearch(e.target.value)}
                placeholder="Buscar GIFs (bruh, oof, chess…)"
                className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-stone-950 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={() => {
                setShowGifPanel(false);
                setGifQuery('');
                setGifResults([]);
                setGifPage('featured');
              }}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* GIF grid */}
          {gifLoading ? (
            <div className="flex items-center justify-center h-24 text-stone-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Cargando GIFs…</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto rounded-lg">
              {gifResults.map((url, i) => (
                <button
                  key={i}
                  onClick={() => handleSendGif(url)}
                  className="relative rounded-lg overflow-hidden border border-stone-700 hover:border-amber-400 transition group cursor-pointer aspect-video"
                >
                  <img
                    src={url}
                    alt={`gif-${i}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-amber-400/20 transition" />
                </button>
              ))}
              {gifResults.length === 0 && (
                <div className="col-span-3 text-center text-xs text-stone-500 py-6">
                  Sin resultados para «{gifQuery}»
                </div>
              )}
            </div>
          )}

          {/* Tenor attribution (required by ToS) */}
          <div className="text-[9px] text-stone-600 text-right mt-1">
            Powered by <span className="text-stone-500 font-semibold">Tenor</span>
          </div>
        </div>
      )}

      {/* Chat Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-2 pt-2 border-t border-stone-800">
        {/* GIF toggle button */}
        <button
          type="button"
          onClick={() => setShowGifPanel((v) => !v)}
          className={`p-1.5 rounded-lg border transition cursor-pointer flex-shrink-0 ${
            showGifPanel
              ? 'bg-amber-500 border-amber-400 text-stone-950'
              : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-amber-400 hover:border-amber-500'
          }`}
          title="Enviar GIF"
        >
          <Image className="w-3.5 h-3.5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe un mensaje en la sala…"
          maxLength={140}
          className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
};
