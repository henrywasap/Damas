import React, { useState } from 'react';
import { RoomState, PlayerColor } from '../types/checkers.js';
import {
  Trophy,
  Flag,
  Handshake,
  RotateCcw,
  Share2,
  Check,
  User,
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sounds } from '../utils/soundEffects.js';

interface ScoreBoardProps {
  roomState: RoomState;
  myRole: 'red' | 'black' | 'spectator' | null;
  onSurrender: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onRequestRematch: () => void;
  onLeaveRoom: () => void;
  onToggleSound: () => void;
  isMuted: boolean;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  roomState,
  myRole,
  onSurrender,
  onOfferDraw,
  onAcceptDraw,
  onRequestRematch,
  onLeaveRoom,
  onToggleSound,
  isMuted,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmSurrender, setConfirmSurrender] = useState(false);

  const { players, turn, status, h2h, drawOfferedBy, rematchRequested, winner, winnerName, winReason } = roomState;
  const isMyTurn = myRole === turn;
  const isPlaying = status === 'playing';
  const isEnded = status === 'ended';

  const handleShareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('sala', roomState.roomId);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-4 bg-stone-900/95 border border-stone-800 rounded-2xl p-4 shadow-xl">
      {/* Top Header: Room Name, Code, Spectators & Tools */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800/80 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-200">Sala:</span>
          <span className="font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
            {roomState.roomId}
          </span>
          {roomState.spectators.length > 0 && (
            <span className="text-stone-500">
              · {roomState.spectators.length} espectador(es)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShareLink}
            className="flex items-center gap-1 px-2.5 py-1 text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded transition cursor-pointer"
            title="Copiar enlace para invitar a un amigo"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">¡Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Invitar</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleSound}
            className="p-1.5 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded transition cursor-pointer"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 px-2 py-1 text-rose-300 hover:text-rose-100 bg-rose-950/40 hover:bg-rose-900/60 rounded border border-rose-900/40 transition cursor-pointer"
            title="Salir de la sala"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Versus Score Card */}
      <div className="grid grid-cols-3 items-center gap-2 mb-3">
        {/* Red Player */}
        <div
          className={`flex flex-col items-center p-2.5 rounded-xl border transition-all ${
            players.red
              ? turn === 'red' && isPlaying
                ? 'bg-rose-950/50 border-rose-600 shadow-md ring-1 ring-rose-500/40'
                : 'bg-stone-800/60 border-stone-700/60'
              : 'bg-stone-900/40 border-dashed border-stone-800 text-stone-600'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-rose-400 flex items-center justify-center text-[9px] shadow-sm">
              🌷
            </div>
            <span className="font-semibold text-sm text-stone-100 truncate max-w-[90px] sm:max-w-[120px]">
              {players.red?.name || 'Esperando...'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-stone-400">
            {myRole === 'red' && (
              <span className="text-amber-400 font-medium">(Tú)</span>
            )}
            <span>Victorias: <strong className="text-stone-200">{players.red?.score || 0}</strong></span>
          </div>
          {turn === 'red' && isPlaying && (
            <span className="mt-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider animate-pulse">
              En turno
            </span>
          )}
        </div>

        {/* Center H2H Score */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-semibold tracking-wider uppercase text-stone-400 mb-0.5">
            Cara a Cara
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-stone-100 tracking-tight">
            <span className="text-rose-400">{h2h.redWins}</span>
            <span className="text-stone-600 mx-1.5">-</span>
            <span className="text-stone-300">{h2h.blackWins}</span>
          </div>
          {h2h.draws > 0 && (
            <div className="text-[10px] text-stone-500">
              {h2h.draws} empate{h2h.draws > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Black Player */}
        <div
          className={`flex flex-col items-center p-2.5 rounded-xl border transition-all ${
            players.black
              ? turn === 'black' && isPlaying
                ? 'bg-stone-800 border-stone-400 shadow-md ring-1 ring-stone-300/40'
                : 'bg-stone-800/60 border-stone-700/60'
              : 'bg-stone-900/40 border-dashed border-stone-800 text-stone-600'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3.5 h-3.5 rounded-full bg-stone-950 border border-stone-400 flex items-center justify-center text-[9px] shadow-sm text-sky-300">
              ♓
            </div>
            <span className="font-semibold text-sm text-stone-100 truncate max-w-[90px] sm:max-w-[120px]">
              {players.black?.name || 'Esperando...'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-stone-400">
            {myRole === 'black' && (
              <span className="text-amber-400 font-medium">(Tú)</span>
            )}
            <span>Victorias: <strong className="text-stone-200">{players.black?.score || 0}</strong></span>
          </div>
          {turn === 'black' && isPlaying && (
            <span className="mt-1 text-[10px] font-bold text-stone-300 uppercase tracking-wider animate-pulse">
              En turno
            </span>
          )}
        </div>
      </div>

      {/* Turn or Game End Banner */}
      {status === 'waiting' && (
        <div className="py-2 px-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Esperando que el segundo jugador se una a la sala...</span>
        </div>
      )}

      {isPlaying && (
        <div className="flex items-center justify-between py-2 px-3 bg-stone-800/50 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                turn === 'red' ? 'bg-rose-500' : 'bg-stone-300'
              } ${isMyTurn ? 'animate-ping' : ''}`}
            />
            <span className="text-stone-200">
              {isMyTurn ? (
                <strong className="text-amber-400">¡Es tu turno de mover!</strong>
              ) : (
                <span>
                  Turno de:{' '}
                  <strong>
                    {turn === 'red' ? players.red?.name : players.black?.name}
                  </strong>
                </span>
              )}
            </span>
          </div>

          {/* Player In-Game Action Buttons */}
          {(myRole === 'red' || myRole === 'black') && (
            <div className="flex items-center gap-2">
              {drawOfferedBy && drawOfferedBy !== myRole ? (
                <button
                  onClick={onAcceptDraw}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium transition cursor-pointer"
                >
                  <Handshake className="w-3 h-3" />
                  <span>Aceptar Tablas</span>
                </button>
              ) : (
                <button
                  onClick={onOfferDraw}
                  disabled={drawOfferedBy === myRole}
                  className="flex items-center gap-1 px-2 py-1 text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 rounded text-xs transition disabled:opacity-50 cursor-pointer"
                  title="Ofrecer empate por mutuo acuerdo"
                >
                  <Handshake className="w-3 h-3" />
                  <span>{drawOfferedBy === myRole ? 'Tablas solicitadas' : 'Tablas'}</span>
                </button>
              )}

              {confirmSurrender ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={onSurrender}
                    className="px-2 py-1 bg-rose-700 hover:bg-rose-600 text-white text-xs rounded font-medium transition cursor-pointer"
                  >
                    ¿Confirmar rendición?
                  </button>
                  <button
                    onClick={() => setConfirmSurrender(false)}
                    className="px-1.5 py-1 text-stone-400 hover:text-stone-200 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmSurrender(true)}
                  className="flex items-center gap-1 px-2 py-1 text-rose-400 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/40 rounded text-xs transition cursor-pointer"
                  title="Rendirse en esta partida"
                >
                  <Flag className="w-3 h-3" />
                  <span>Rendirse</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isEnded && (
        <div className="py-3 px-4 bg-gradient-to-r from-amber-950/40 via-stone-800 to-amber-950/40 border border-amber-600/40 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-base font-bold text-amber-200">
              {winner === 'draw' ? '¡Partida en Tablas!' : `¡Victoria de ${winnerName}!`}
            </span>
          </div>
          <p className="text-xs text-stone-400 mb-3">{winReason}</p>

          {(myRole === 'red' || myRole === 'black') && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onRequestRematch}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition cursor-pointer shadow-md ${
                  rematchRequested[myRole]
                    ? 'bg-amber-600/50 text-amber-200 cursor-wait'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {rematchRequested[myRole]
                    ? 'Esperando que rival acepte...'
                    : 'Jugar Revancha'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
