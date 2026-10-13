import React, { useState, useEffect } from 'react';
import { RoomSummary } from '../types/checkers.js';
import { BotDifficulty } from '../utils/aiBot.js';
import {
  Users,
  Play,
  PlusCircle,
  Eye,
  Sparkles,
  Trophy,
  BookOpen,
  ArrowRight,
  Shield,
  Bot,
  Cpu,
} from 'lucide-react';

interface LobbyProps {
  onJoinRoom: (roomId: string, playerName: string, roomName?: string) => void;
  availableRooms: RoomSummary[];
  onOpenStats: () => void;
  onOpenRules: () => void;
  onStartLocalGame: (player1: string, player2: string) => void;
  onStartBotGame?: (playerName: string, difficulty: BotDifficulty, playerColor: 'red' | 'black') => void;
  initialRoomId?: string;
}

export const Lobby: React.FC<LobbyProps> = ({
  onJoinRoom,
  availableRooms,
  onOpenStats,
  onOpenRules,
  onStartLocalGame,
  onStartBotGame,
  initialRoomId = '',
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('damas_player_name') || '';
  });
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [activeTab, setActiveTab] = useState<'online' | 'bot' | 'local'>('online');
  const [localP2Name, setLocalP2Name] = useState('Jugador 2');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medio');
  const [botPlayerColor, setBotPlayerColor] = useState<'red' | 'black'>('red');

  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
    }
  }, [initialRoomId]);

  const handleJoin = (targetRoomId: string, customName?: string) => {
    const cleanName = playerName.trim();
    if (!cleanName) {
      setNameError('Por favor ingresa tu nombre para entrar a la sala');
      return;
    }

    setNameError('');
    localStorage.setItem('damas_player_name', cleanName);
    onJoinRoom(targetRoomId, cleanName, customName || targetRoomId);
  };

  const handleCreateQuickRoom = () => {
    const randomCode = `SALA-${Math.floor(100 + Math.random() * 900)}`;
    handleJoin(randomCode, roomNameInput.trim() || randomCode);
  };

  const handleStartLocal = () => {
    const cleanName1 = playerName.trim() || 'Jugador 1';
    const cleanName2 = localP2Name.trim() || 'Jugador 2';
    localStorage.setItem('damas_player_name', cleanName1);
    onStartLocalGame(cleanName1, cleanName2);
  };

  const handleStartBot = () => {
    const cleanName = playerName.trim() || 'Jugador';
    localStorage.setItem('damas_player_name', cleanName);
    if (onStartBotGame) {
      onStartBotGame(cleanName, botDifficulty, botPlayerColor);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-8 shadow-2xl">
      {/* Title & Badge */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Damas Multijugador en Tiempo Real</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-100 tracking-tight">
          ¡Bienvenido a Damas Online!
        </h1>
        <p className="text-stone-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Para acceder a una sala solo debes ingresar tu nombre. Juega partidas en vivo, compite contra la IA o reta a un amigo.
        </p>
      </div>

      {/* Primary Input: Player Name */}
      <div className="mb-6 bg-stone-950/80 p-4 rounded-2xl border border-stone-800/90 shadow-inner">
        <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5">
          Tu Nombre o Apodo <span className="text-rose-400">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              if (nameError) setNameError('');
            }}
            placeholder="Ej. Henry, Carlos, Campeón..."
            maxLength={20}
            className="w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-stone-100 font-medium placeholder-stone-600 focus:outline-none transition shadow-sm"
          />
        </div>
        {nameError && (
          <p className="text-rose-400 text-xs mt-2 font-medium flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            {nameError}
          </p>
        )}
      </div>

      {/* Segmented Mode Selector: Online vs Bot vs Local */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-stone-950 rounded-xl mb-6 border border-stone-800 text-[11px] sm:text-xs">
        <button
          onClick={() => setActiveTab('online')}
          className={`py-2 font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'online'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Online</span>
        </button>

        <button
          onClick={() => setActiveTab('bot')}
          className={`py-2 font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'bot'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Contra la IA</span>
        </button>

        <button
          onClick={() => setActiveTab('local')}
          className={`py-2 font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'local'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Local 2P</span>
        </button>
      </div>

      {/* Online Mode Content */}
      {activeTab === 'online' && (
        <div className="space-y-5">
          {/* Join / Create Custom Room */}
          <div className="bg-stone-950/50 p-4 rounded-2xl border border-stone-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">
                Código o Nombre de la Sala
              </span>
              {initialRoomId && (
                <span className="text-[10px] text-amber-400 font-mono">
                  (Sala en enlace detectada)
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Ej. SALA-1, TORNEO, AMIGOS..."
                className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 uppercase font-mono placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleJoin(roomId.trim() || 'SALA-1')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
              >
                <span>Entrar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Room button */}
            <div className="pt-2 flex items-center justify-between border-t border-stone-800/60">
              <span className="text-[11px] text-stone-500">¿Quieres una sala aleatoria?</span>
              <button
                onClick={handleCreateQuickRoom}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Crear sala rápida</span>
              </button>
            </div>
          </div>

          {/* Available Rooms Lobby */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                Salas Activas en Vivo
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                {availableRooms.length} en curso
              </span>
            </div>

            {availableRooms.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-stone-800 text-center text-xs text-stone-500">
                No hay salas activas en este momento. ¡Crea una para que otros se unan!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {availableRooms.map((r) => {
                  const isWaiting = r.playersCount < 2;
                  return (
                    <div
                      key={r.roomId}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-stone-700 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-stone-200">
                            {r.roomId}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              isWaiting
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {isWaiting ? 'Esperando rival (1/2)' : 'En juego (2/2)'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          Jugadores: {r.playerNames.join(', ') || 'Ninguno'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoin(r.roomId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                          isWaiting
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                            : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                        }`}
                      >
                        {isWaiting ? (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Jugar</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Ver</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bot Mode Content */}
      {activeTab === 'bot' && (
        <div className="space-y-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-2">
              Dificultad de la Inteligencia Artificial:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBotDifficulty('facil')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  botDifficulty === 'facil'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                Fácil
              </button>
              <button
                type="button"
                onClick={() => setBotDifficulty('medio')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  botDifficulty === 'medio'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                Medio
              </button>
              <button
                type="button"
                onClick={() => setBotDifficulty('dificil')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  botDifficulty === 'dificil'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                Difícil (Minimax)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-300 mb-2">
              Elige tu Color:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBotPlayerColor('red')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition cursor-pointer ${
                  botPlayerColor === 'red'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <span>Rojas (Inicias tú)</span>
              </button>
              <button
                type="button"
                onClick={() => setBotPlayerColor('black')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition cursor-pointer ${
                  botPlayerColor === 'black'
                    ? 'bg-stone-800 border-amber-500 text-stone-100 shadow-sm'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-stone-950 border border-stone-600 inline-block"></span>
                <span>Negras (IA inicia)</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-stone-400">
            Juega partidas individuales contra un motor de Damas con evaluación posicional y capturas inteligentes.
          </p>

          <button
            onClick={handleStartBot}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Bot className="w-4 h-4 text-stone-950" />
            <span>Comenzar Partida contra la IA</span>
          </button>
        </div>
      )}

      {/* Local Mode Content */}
      {activeTab === 'local' && (
        <div className="space-y-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Nombre Jugador 2 (Negras)
            </label>
            <input
              type="text"
              value={localP2Name}
              onChange={(e) => setLocalP2Name(e.target.value)}
              placeholder="Jugador 2"
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <p className="text-xs text-stone-400">
            Juega contra un amigo en esta misma pantalla compartiendo turnos. ¡Ideal para jugar cara a cara sin necesidad de otra conexión!
          </p>

          <button
            onClick={handleStartLocal}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>Comenzar Partida Local</span>
          </button>
        </div>
      )}

      {/* Bottom Auxiliary Actions: Stats & Rules */}
      <div className="mt-6 pt-5 border-t border-stone-800/80 flex items-center justify-between text-xs">
        <button
          onClick={onOpenStats}
          className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer py-1 px-2 rounded-lg hover:bg-amber-950/30 transition"
        >
          <Trophy className="w-4 h-4" />
          <span>Ver Ranking y Estadísticas</span>
        </button>

        <button
          onClick={onOpenRules}
          className="flex items-center gap-1.5 text-stone-400 hover:text-stone-200 cursor-pointer py-1 px-2 rounded-lg hover:bg-stone-800 transition"
        >
          <BookOpen className="w-4 h-4" />
          <span>Reglas del Juego</span>
        </button>
      </div>
    </div>
  );
};
