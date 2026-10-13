import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/checkers.js';
import { Send, MessageSquare } from 'lucide-react';

interface InGameChatProps {
  chat: ChatMessage[];
  onSendMessage: (text: string) => void;
  myUserName: string;
}

const QUICK_REACTIONS = [
  { emoji: '👋', text: '¡Hola! Buena suerte' },
  { emoji: '👏', text: '¡Excelente jugada!' },
  { emoji: '👑', text: '¡Dama coronada!' },
  { emoji: '🤔', text: 'Mmm... déjame pensar' },
  { emoji: '🤝', text: '¡Buena partida!' },
  { emoji: '🔥', text: '¡Qué gran duelo!' },
];

export const InGameChat: React.FC<InGameChatProps> = ({
  chat,
  onSendMessage,
  myUserName,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-4 bg-stone-900/95 border border-stone-800 rounded-2xl p-3.5 shadow-xl flex flex-col">
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
      <div className="h-32 overflow-y-auto pr-1 space-y-1.5 text-xs">
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
              <div
                className={`px-2.5 py-1.5 rounded-xl max-w-[85%] break-words ${
                  isMe
                    ? 'bg-amber-600 text-stone-950 font-medium rounded-tr-none'
                    : 'bg-stone-800 text-stone-200 rounded-tl-none border border-stone-700/60'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-2 pt-2 border-t border-stone-800">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe un mensaje en la sala..."
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
