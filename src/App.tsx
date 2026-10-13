import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCheckersSocket } from './hooks/useCheckersSocket.js';
import { Board } from './components/Board.js';
import { ScoreBoard } from './components/ScoreBoard.js';
import { InGameChat } from './components/InGameChat.js';
import { Lobby } from './components/Lobby.js';
import { StatsView } from './components/StatsView.js';
import { RulesModal } from './components/RulesModal.js';
import {
  BoardState,
  PlayerColor,
  Position,
  RoomState,
} from './types/checkers.js';
import {
  createInitialBoard,
  getAllLegalMovesForPlayer,
  applyMove,
  checkGameStatus,
  countPieces,
} from './utils/checkersLogic.js';
import { getBotMove, BotDifficulty } from './utils/aiBot.js';
import { sounds } from './utils/soundEffects.js';
import { Trophy, BookOpen, Volume2, VolumeX, AlertCircle, ArrowLeft, Crown, Bot } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const {
    isConnected,
    roomState,
    myRole,
    globalStats,
    availableRooms,
    joinRoom,
    sendMove,
    sendChat,
    requestRematch,
    offerDraw,
    acceptDraw,
    surrender,
    leaveRoom,
    endChainTurn,
    refreshStats,
    lastError,
    clearError,
  } = useCheckersSocket();

  const [view, setView] = useState<'lobby' | 'game' | 'stats'>('lobby');
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.muted);
  const [initialRoomParam, setInitialRoomParam] = useState<string>('');

  // Local / Bot mode state
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [isBotMode, setIsBotMode] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medio');
  const [botColor, setBotColor] = useState<PlayerColor>('black');
  const [playerBotColor, setPlayerBotColor] = useState<PlayerColor>('red');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [localRoomState, setLocalRoomState] = useState<RoomState | null>(null);

  // Check URL query parameters for ?sala= or ?room=
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('sala') || params.get('room');
      if (roomParam) {
        setInitialRoomParam(roomParam.trim().toUpperCase());
      }
    }
  }, []);

  // Sync view when remote roomState arrives or resets
  useEffect(() => {
    if (roomState && !isLocalMode) {
      setView('game');
    } else if (!roomState && !isLocalMode && view === 'game') {
      setView('lobby');
    }
  }, [roomState, isLocalMode, view]);

  const toggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
  };

  // Join remote room
  const handleJoinOnline = (roomId: string, playerName: string, roomName?: string) => {
    setIsLocalMode(false);
    setIsBotMode(false);
    joinRoom(roomId, playerName, roomName);
  };

  // Start local pass & play
  const handleStartLocalGame = (p1Name: string, p2Name: string) => {
    setIsLocalMode(true);
    setIsBotMode(false);
    const board = createInitialBoard();
    const counts = countPieces(board);

    const initialLocal: RoomState = {
      roomId: 'LOCAL-2P',
      roomName: 'Partida Local',
      status: 'playing',
      players: {
        red: {
          id: 'p1',
          name: p1Name,
          color: 'red',
          connected: true,
          score: 0,
        },
        black: {
          id: 'p2',
          name: p2Name,
          color: 'black',
          connected: true,
          score: 0,
        },
      },
      spectators: [],
      board,
      turn: 'red',
      chainJumpPiece: null,
      winner: null,
      winnerName: null,
      winReason: null,
      h2h: { redWins: 0, blackWins: 0, draws: 0 },
      moveHistory: [],
      chat: [
        {
          id: 'local-init',
          sender: 'Sistema',
          text: `Partida local iniciada: ${p1Name} (Rojas) vs ${p2Name} (Negras)`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      rematchRequested: { red: false, black: false },
      drawOfferedBy: null,
      lastMove: null,
      gameStartTime: Date.now(),
      redPiecesCount: counts.red,
      blackPiecesCount: counts.black,
    };

    setLocalRoomState(initialLocal);
    setView('game');
  };

  // Start Bot game
  const handleStartBotGame = (
    playerName: string,
    difficulty: BotDifficulty,
    playerColorChoice: PlayerColor
  ) => {
    setIsLocalMode(true);
    setIsBotMode(true);
    setBotDifficulty(difficulty);

    const botCol: PlayerColor = playerColorChoice === 'red' ? 'black' : 'red';
    setBotColor(botCol);
    setPlayerBotColor(playerColorChoice);

    const board = createInitialBoard();
    const counts = countPieces(board);

    const diffLabel = difficulty === 'facil' ? 'Fácil' : difficulty === 'medio' ? 'Medio' : 'Difícil';
    const botName = `IA Bot (${diffLabel})`;

    const initialLocal: RoomState = {
      roomId: `BOT-${difficulty.toUpperCase()}`,
      roomName: `Partida vs IA (${diffLabel})`,
      status: 'playing',
      players: {
        red: {
          id: playerColorChoice === 'red' ? 'player' : 'bot',
          name: playerColorChoice === 'red' ? playerName : botName,
          color: 'red',
          connected: true,
          score: 0,
        },
        black: {
          id: playerColorChoice === 'black' ? 'player' : 'bot',
          name: playerColorChoice === 'black' ? playerName : botName,
          color: 'black',
          connected: true,
          score: 0,
        },
      },
      spectators: [],
      board,
      turn: 'red',
      chainJumpPiece: null,
      winner: null,
      winnerName: null,
      winReason: null,
      h2h: { redWins: 0, blackWins: 0, draws: 0 },
      moveHistory: [],
      chat: [
        {
          id: 'bot-init',
          sender: 'Sistema',
          text: `Partida contra IA (${diffLabel}) iniciada. ${playerName} juega con ${
            playerColorChoice === 'red' ? 'Rojas' : 'Negras'
          }.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      rematchRequested: { red: false, black: false },
      drawOfferedBy: null,
      lastMove: null,
      gameStartTime: Date.now(),
      redPiecesCount: counts.red,
      blackPiecesCount: counts.black,
    };

    setLocalRoomState(initialLocal);
    setView('game');
  };

  // Handle local / bot move
  const handleLocalMove = useCallback(
    (from: Position, to: Position) => {
      setLocalRoomState((prev) => {
        if (!prev || prev.status !== 'playing') return prev;

        try {
          const legalMoves = getAllLegalMovesForPlayer(
            prev.board,
            prev.turn,
            prev.chainJumpPiece
          );
          const matchedMove = legalMoves.find(
            (m) =>
              m.from.row === from.row &&
              m.from.col === from.col &&
              m.to.row === to.row &&
              m.to.col === to.col
          );

          if (!matchedMove) return prev;

          const isCapture = !!matchedMove.captured;
          const { newBoard, becameKing, canChainJump, nextChainPiece } = applyMove(
            prev.board,
            matchedMove
          );

          const counts = countPieces(newBoard);

          if (becameKing) {
            sounds.playCrown();
          } else if (isCapture) {
            sounds.playCapture();
          } else {
            sounds.playMove();
          }

          const nextTurn: PlayerColor = prev.turn === 'red' ? 'black' : 'red';
          const status = checkGameStatus(newBoard, nextTurn);

          let nextChain = null;
          let finalTurn = prev.turn;

          if (status.isOver) {
            nextChain = null;
          } else if (canChainJump && nextChainPiece) {
            nextChain = nextChainPiece;
            finalTurn = prev.turn;
          } else {
            finalTurn = nextTurn;
          }

          const newH2h = { ...prev.h2h };
          let winner = prev.winner;
          let winnerName = prev.winnerName;
          let winReason = prev.winReason;
          let gameStatus: RoomState['status'] = prev.status;

          if (status.isOver) {
            gameStatus = 'ended';
            winner = status.winner;
            winReason = status.reason;
            if (winner === 'red') {
              winnerName = prev.players.red?.name || 'Rojo';
              newH2h.redWins += 1;
            } else if (winner === 'black') {
              winnerName = prev.players.black?.name || 'Negro';
              newH2h.blackWins += 1;
            } else {
              winnerName = 'Empate';
              newH2h.draws += 1;
            }
            sounds.playVictory();
            confetti({ particleCount: 90, spread: 60 });
          }

          return {
            ...prev,
            board: newBoard,
            turn: finalTurn,
            chainJumpPiece: nextChain,
            status: gameStatus,
            winner,
            winnerName,
            winReason,
            h2h: newH2h,
            lastMove: { from, to },
            redPiecesCount: counts.red,
            blackPiecesCount: counts.black,
          };
        } catch (e) {
          console.error(e);
          return prev;
        }
      });
    },
    []
  );

  const handleLocalEndChain = () => {
    if (!localRoomState) return;
    const nextTurn = localRoomState.turn === 'red' ? 'black' : 'red';
    setLocalRoomState((prev) =>
      prev
        ? {
            ...prev,
            turn: nextTurn,
            chainJumpPiece: null,
          }
        : null
    );
  };

  // Bot Turn Automation Effect
  useEffect(() => {
    if (!isBotMode || !localRoomState || localRoomState.status !== 'playing') {
      return;
    }

    if (localRoomState.turn === botColor) {
      setIsBotThinking(true);
      const timer = setTimeout(() => {
        setIsBotThinking(false);
        const botMove = getBotMove(
          localRoomState.board,
          botColor,
          localRoomState.chainJumpPiece,
          botDifficulty
        );

        if (botMove) {
          handleLocalMove(botMove.from, botMove.to);
        } else {
          // No legal moves
          const opponentWin: PlayerColor = botColor === 'red' ? 'black' : 'red';
          setLocalRoomState((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'ended',
                  winner: opponentWin,
                  winnerName: opponentWin === 'red' ? prev.players.red?.name || '' : prev.players.black?.name || '',
                  winReason: 'La IA no tiene movimientos legales disponibles',
                }
              : null
          );
        }
      }, 550);

      return () => clearTimeout(timer);
    }
  }, [isBotMode, localRoomState, botColor, botDifficulty, handleLocalMove]);

  const handleExitCurrentGame = () => {
    if (isLocalMode) {
      setIsLocalMode(false);
      setIsBotMode(false);
      setLocalRoomState(null);
      setView('lobby');
    } else {
      leaveRoom();
      setView('lobby');
    }
  };

  const activeRoom = isLocalMode ? localRoomState : roomState;
  const currentUserName =
    typeof window !== 'undefined'
      ? localStorage.getItem('damas_player_name') || 'Jugador'
      : 'Jugador';

  // In Bot mode, player role is their chosen color. In local 2P, active player role is current turn.
  const activeRole = isLocalMode
    ? isBotMode
      ? playerBotColor
      : activeRoom?.turn || 'red'
    : myRole;

  return (
    <div className="min-h-screen bg-[#0e0c0a] text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navbar */}
      <header className="border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div
            onClick={() => setView('lobby')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-md">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-stone-100 block">
                Centro de humillacion, donde los jugadores se enfrentan en partidas de damas online
              </span>
              <span className="text-[10px] text-amber-400 font-medium block">
                Multijugador en tiempo real
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            {/* Live Connection Dot */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 text-[11px] text-stone-400"
              title={isConnected ? 'Conectado al servidor en tiempo real' : 'Conectando...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
                }`}
              />
              <span className="hidden sm:inline">
                {isConnected ? 'Servidor activo' : 'Conectando'}
              </span>
            </div>

            <button
              onClick={() => {
                refreshStats();
                setView(view === 'stats' ? (activeRoom ? 'game' : 'lobby') : 'stats');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                view === 'stats'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Estadísticas</span>
            </button>

            <button
              onClick={() => setShowRules(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 font-semibold transition cursor-pointer flex items-center gap-1"
              title="Reglas del juego"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reglas</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition cursor-pointer flex items-center gap-1"
              title={isMuted ? 'Activar sonido' : 'Silenciar efectos'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-stone-300" />}
            </button>
          </div>
        </div>
      </header>

      {/* Error alert toast */}
      {lastError && (
        <div className="max-w-xl mx-auto w-full px-4 mt-3">
          <div className="bg-rose-950/80 border border-rose-700/80 p-3 rounded-xl text-xs text-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{lastError}</span>
            </div>
            <button
              onClick={clearError}
              className="text-stone-400 hover:text-white text-xs px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main App Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 flex flex-col items-center justify-center">
        {/* VIEW 1: LOBBY */}
        {view === 'lobby' && (
          <Lobby
            onJoinRoom={handleJoinOnline}
            availableRooms={availableRooms}
            onOpenStats={() => {
              refreshStats();
              setView('stats');
            }}
            onOpenRules={() => setShowRules(true)}
            onStartLocalGame={handleStartLocalGame}
            onStartBotGame={handleStartBotGame}
            initialRoomId={initialRoomParam}
          />
        )}

        {/* VIEW 2: GAMEPLAY */}
        {view === 'game' && activeRoom && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Top Navigation in game */}
            <div className="w-full max-w-xl flex items-center justify-between mb-3 text-xs">
              <button
                onClick={handleExitCurrentGame}
                className="flex items-center gap-1 text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al vestíbulo</span>
              </button>

              <div className="text-stone-400 flex items-center gap-2">
                {isBotMode ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Modo vs IA {isBotThinking && '(Pensando...)'}</span>
                  </span>
                ) : isLocalMode ? (
                  <span className="text-amber-400 font-medium">Partida Local (Mismo Equipo)</span>
                ) : (
                  <span>
                    Rol: <strong className="text-stone-200 uppercase">{myRole === 'red' ? 'Rojas' : myRole === 'black' ? 'Negras' : 'Espectador'}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* ScoreBoard & Turn Indicator */}
            <ScoreBoard
              roomState={activeRoom}
              myRole={activeRole}
              onSurrender={
                isLocalMode
                  ? () => {
                      const win = activeRoom.turn === 'red' ? 'black' : 'red';
                      setLocalRoomState((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: 'ended',
                              winner: win,
                              winnerName: win === 'red' ? prev.players.red?.name || '' : prev.players.black?.name || '',
                              winReason: 'Rendición voluntaria',
                            }
                          : null
                      );
                    }
                  : surrender
              }
              onOfferDraw={
                isLocalMode
                  ? () => {}
                  : offerDraw
              }
              onAcceptDraw={
                isLocalMode
                  ? () => {}
                  : acceptDraw
              }
              onRequestRematch={
                isLocalMode
                  ? () => {
                      if (isBotMode) {
                        handleStartBotGame(
                          playerBotColor === 'red'
                            ? activeRoom.players.red?.name || 'Jugador'
                            : activeRoom.players.black?.name || 'Jugador',
                          botDifficulty,
                          playerBotColor
                        );
                      } else {
                        handleStartLocalGame(
                          activeRoom.players.red?.name || 'Jugador 1',
                          activeRoom.players.black?.name || 'Jugador 2'
                        );
                      }
                    }
                  : requestRematch
              }
              onLeaveRoom={handleExitCurrentGame}
              onToggleSound={toggleSound}
              isMuted={isMuted}
            />

            {/* 8x8 Tactile Checkers Board */}
            <Board
              board={activeRoom.board}
              turn={activeRoom.turn}
              myRole={activeRole}
              chainJumpPiece={activeRoom.chainJumpPiece}
              lastMove={activeRoom.lastMove}
              disabled={
                activeRoom.status !== 'playing' ||
                (isBotMode && activeRoom.turn === botColor) ||
                (!isLocalMode && myRole !== activeRoom.turn)
              }
              onMakeMove={(from, to) => {
                if (isLocalMode) {
                  handleLocalMove(from, to);
                } else {
                  sendMove(from, to);
                }
              }}
              onEndChainTurn={isLocalMode ? handleLocalEndChain : endChainTurn}
              redPiecesCount={activeRoom.redPiecesCount}
              blackPiecesCount={activeRoom.blackPiecesCount}
            />

            {/* In-Game Chat (Online only) */}
            {!isLocalMode && (
              <InGameChat
                chat={activeRoom.chat}
                onSendMessage={sendChat}
                myUserName={currentUserName}
              />
            )}
          </div>
        )}

        {/* VIEW 3: STATS & LEADERBOARD */}
        {view === 'stats' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="w-full max-w-4xl flex items-center justify-start mb-3 text-xs">
              <button
                onClick={() => setView(activeRoom ? 'game' : 'lobby')}
                className="flex items-center gap-1.5 text-stone-400 hover:text-stone-200 cursor-pointer px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{activeRoom ? 'Volver a la partida' : 'Volver a las salas'}</span>
              </button>
            </div>

            <StatsView
              stats={globalStats}
              initialPlayerName={currentUserName}
            />
          </div>
        )}
      </main>

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-[11px] text-stone-500 border-t border-stone-900 bg-stone-950/60">
        Damas Online Multijugador · Entra con tu nombre · Tablero interactivo y estadísticas en tiempo real
      </footer>
    </div>
  );
}
