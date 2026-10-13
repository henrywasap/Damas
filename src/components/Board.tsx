import React, { useState, useMemo } from 'react';
import {
  BoardState,
  Position,
  PlayerColor,
  MoveStep,
  Piece,
} from '../types/checkers.js';
import {
  BOARD_SIZE,
  getValidMovesForSelectedPiece,
  getAllLegalMovesForPlayer,
} from '../utils/checkersLogic.js';
import { Crown, RotateCcw, Sparkles } from 'lucide-react';

export type PieceSymbolMode =
  | 'tulip-red_pisces-black'
  | 'all-tulip'
  | 'all-pisces'
  | 'pisces-red_tulip-black';

// SVG Icon for Tulip (Tulipán Rosa)
export const TulipIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Left petal gradient: Vibrant rose pink */}
        <linearGradient id={`${id}-petalLeft`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdf2f8" />
          <stop offset="25%" stopColor="#fbcfe8" />
          <stop offset="65%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>

        {/* Right petal gradient: Deep rich pink */}
        <linearGradient id={`${id}-petalRight`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbcfe8" />
          <stop offset="35%" stopColor="#f472b6" />
          <stop offset="75%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>

        {/* Center petal gradient: Luminous soft blush pink */}
        <linearGradient id={`${id}-petalCenter`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#fce7f3" />
          <stop offset="70%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        {/* Stem: Emerald green */}
        <linearGradient id={`${id}-stem`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Subtle drop shadow */}
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" floodColor="#831843" floodOpacity="0.7" />
        </filter>
      </defs>

      <g filter={`url(#${id}-shadow)`}>
        {/* Stem */}
        <path
          d="M12 16.2V21.5"
          stroke={`url(#${id}-stem)`}
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Small organic base leaf */}
        <path
          d="M12 18.2C13.2 18.2 14.8 17.2 15.2 15.8C13.6 16 12.8 17 12 18.2Z"
          fill={`url(#${id}-stem)`}
        />

        {/* Center Petal (inside bloom) */}
        <path
          d="M12 2.5C10.5 5.2 9.7 8.4 9.8 11.8C10 14.5 10.9 16 12 16C13.1 16 14 14.5 14.2 11.8C14.3 8.4 13.5 5.2 12 2.5Z"
          fill={`url(#${id}-petalCenter)`}
          stroke="#f472b6"
          strokeWidth="0.3"
        />

        {/* Left Curved Petal */}
        <path
          d="M5.6 7.2C5.3 12.2 8 16 11.8 16C10.2 14.8 9.2 12.2 9.2 9.6C9.2 7 10.1 4.6 11.4 3C8.1 4.2 5.8 5.5 5.6 7.2Z"
          fill={`url(#${id}-petalLeft)`}
          stroke="#fbcfe8"
          strokeWidth="0.4"
        />

        {/* Right Curved Petal */}
        <path
          d="M18.4 7.2C18.7 12.2 16 16 12.2 16C13.8 14.8 14.8 12.2 14.8 9.6C14.8 7 13.9 4.6 12.6 3C15.9 4.2 18.2 5.5 18.4 7.2Z"
          fill={`url(#${id}-petalRight)`}
          stroke="#fbcfe8"
          strokeWidth="0.4"
        />
      </g>
    </svg>
  );
};

// SVG Icon for Pisces (Piscis)
export const PiscesIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Left crescent fish body */}
    <path d="M7 3.5C3.8 7.5 3.8 16.5 7 20.5" />
    {/* Right crescent fish body */}
    <path d="M17 3.5C20.2 7.5 20.2 16.5 17 20.5" />
    {/* Central binding bar */}
    <path d="M2.5 12H21.5" />
    {/* Left fish fin/tail accent */}
    <path d="M5.5 4.5L7.5 3L8 5.5" strokeWidth="1.5" fill="currentColor" />
    {/* Right fish fin/tail accent */}
    <path d="M18.5 19.5L16.5 21L16 18.5" strokeWidth="1.5" fill="currentColor" />
  </svg>
);

export function getPieceSymbol(player: PlayerColor, mode: PieceSymbolMode): 'tulip' | 'pisces' {
  if (mode === 'all-tulip') return 'tulip';
  if (mode === 'all-pisces') return 'pisces';
  if (mode === 'pisces-red_tulip-black') {
    return player === 'red' ? 'pisces' : 'tulip';
  }
  return player === 'red' ? 'tulip' : 'pisces';
}

interface BoardProps {
  board: BoardState;
  turn: PlayerColor;
  myRole: 'red' | 'black' | 'spectator' | null;
  chainJumpPiece: Position | null;
  lastMove: { from: Position; to: Position } | null;
  disabled: boolean;
  onMakeMove: (from: Position, to: Position) => void;
  onEndChainTurn?: () => void;
  redPiecesCount: number;
  blackPiecesCount: number;
}

export const Board: React.FC<BoardProps> = ({
  board,
  turn,
  myRole,
  chainJumpPiece,
  lastMove,
  disabled,
  onMakeMove,
  onEndChainTurn,
  redPiecesCount,
  blackPiecesCount,
}) => {
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(myRole === 'black');
  const [symbolMode, setSymbolMode] = useState<PieceSymbolMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('damas_piece_symbol_mode') as PieceSymbolMode;
      if (saved) return saved;
    }
    return 'tulip-red_pisces-black';
  });

  const handleCycleSymbolMode = () => {
    const modes: PieceSymbolMode[] = [
      'tulip-red_pisces-black',
      'all-tulip',
      'all-pisces',
      'pisces-red_tulip-black',
    ];
    const currentIndex = modes.indexOf(symbolMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setSymbolMode(nextMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('damas_piece_symbol_mode', nextMode);
    }
  };

  const getSymbolModeLabel = () => {
    switch (symbolMode) {
      case 'tulip-red_pisces-black':
        return '🌷 Rojas / ♓ Negras';
      case 'all-tulip':
        return '🌷 Todas: Tulipán';
      case 'all-pisces':
        return '♓ Todas: Piscis';
      case 'pisces-red_tulip-black':
        return '♓ Rojas / 🌷 Negras';
      default:
        return '🌷 / ♓';
    }
  };

  // If user role changes, default flip orientation
  React.useEffect(() => {
    if (myRole === 'black') {
      setIsFlipped(true);
    } else if (myRole === 'red') {
      setIsFlipped(false);
    }
  }, [myRole]);

  // If forced to chain jump, auto-select the chain piece
  React.useEffect(() => {
    if (chainJumpPiece) {
      setSelectedPos(chainJumpPiece);
    }
  }, [chainJumpPiece]);

  // Compute valid moves for currently selected piece
  const validMovesForSelected = useMemo(() => {
    if (!selectedPos || disabled) return [];
    return getValidMovesForSelectedPiece(
      board,
      selectedPos,
      turn,
      chainJumpPiece
    );
  }, [board, selectedPos, turn, chainJumpPiece, disabled]);

  // Check if player has any piece that can jump (optional capture indicator)
  const isCaptureAvailable = useMemo(() => {
    if (disabled) return false;
    const moves = getAllLegalMovesForPlayer(board, turn, chainJumpPiece);
    return moves.some((m) => m.captured !== undefined);
  }, [board, turn, chainJumpPiece, disabled]);

  const handleSquareClick = (row: number, col: number) => {
    if (disabled) return;

    // Is it a target for the currently selected piece?
    const matchedMove = validMovesForSelected.find(
      (m) => m.to.row === row && m.to.col === col
    );

    if (matchedMove && selectedPos) {
      onMakeMove(selectedPos, { row, col });
      setSelectedPos(null);
      return;
    }

    // Otherwise, check if user clicked their own piece
    const piece = board[row][col];
    if (piece && piece.player === turn) {
      // In chain jump, only the designated piece can be selected
      if (
        chainJumpPiece &&
        (chainJumpPiece.row !== row || chainJumpPiece.col !== col)
      ) {
        return;
      }

      // Check if this piece has legal moves
      const pieceMoves = getValidMovesForSelectedPiece(
        board,
        { row, col },
        turn,
        chainJumpPiece
      );

      if (pieceMoves.length > 0) {
        setSelectedPos({ row, col });
      }
    } else {
      // Clicked elsewhere
      if (!chainJumpPiece) {
        setSelectedPos(null);
      }
    }
  };

  // Generate row/col arrays respecting flip
  const rows = useMemo(() => {
    const list = Array.from({ length: BOARD_SIZE }, (_, i) => i);
    return isFlipped ? list.reverse() : list;
  }, [isFlipped]);

  const cols = useMemo(() => {
    const list = Array.from({ length: BOARD_SIZE }, (_, i) => i);
    return isFlipped ? list.reverse() : list;
  }, [isFlipped]);

  const colLabels = isFlipped
    ? ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A']
    : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const rowLabels = isFlipped
    ? ['1', '2', '3', '4', '5', '6', '7', '8']
    : ['8', '7', '6', '5', '4', '3', '2', '1'];

  const redSymbol = getPieceSymbol('red', symbolMode);
  const blackSymbol = getPieceSymbol('black', symbolMode);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-xl mx-auto">
      {/* Board controls & reminders banner */}
      <div className="w-full flex items-center justify-between mb-2 px-2 text-xs text-stone-400 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {isCaptureAvailable && !chainJumpPiece && (
            <span className="text-amber-400 font-medium">
              💡 Puedes capturar o mover libremente
            </span>
          )}
          {chainJumpPiece && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-medium">
                👑 Salto encadenado disponible
              </span>
              {onEndChainTurn && !disabled && (
                <button
                  onClick={onEndChainTurn}
                  className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded text-[11px] font-medium border border-stone-600 transition cursor-pointer"
                  title="Concluir tu turno sin realizar el salto encadenado adicional"
                >
                  Concluir turno
                </button>
              )}
            </div>
          )}
        </div>

        {/* Board actions: Symbol mode selector & Flip */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleCycleSymbolMode}
            className="flex items-center gap-1.5 px-2.5 py-1 text-stone-300 hover:text-white bg-stone-800/90 hover:bg-stone-750 rounded border border-stone-700 transition cursor-pointer"
            title="Cambiar símbolos de las fichas entre Tulipán y Piscis"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-[11px]">{getSymbolModeLabel()}</span>
          </button>

          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-750 rounded border border-stone-700 transition cursor-pointer"
            title="Girar orientación del tablero"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Girar tablero</span>
          </button>
        </div>
      </div>

      {/* Main Board Container */}
      <div className="relative p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-[#2b1b11] via-[#1f140e] to-[#160d09] shadow-2xl border-4 border-[#3d2719] shadow-stone-950/80">
        {/* Top coordinate labels */}
        <div className="grid grid-cols-8 gap-0 mb-1 text-center text-[10px] sm:text-xs font-mono font-bold text-amber-200/50">
          {colLabels.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>

        {/* Board with left coordinate labels */}
        <div className="flex">
          {/* Row Labels (Left) */}
          <div className="flex flex-col justify-around pr-1.5 text-[10px] sm:text-xs font-mono font-bold text-amber-200/50">
            {rowLabels.map((l, i) => (
              <div key={i} className="h-9 sm:h-14 md:h-16 flex items-center justify-center">
                {l}
              </div>
            ))}
          </div>

          {/* 8x8 Grid */}
          <div className="grid grid-cols-8 grid-rows-8 border-2 border-[#1c1109] rounded-lg overflow-hidden shadow-inner bg-[#f6ecd9]">
            {rows.map((row) =>
              cols.map((col) => {
                const isDarkSquare = (row + col) % 2 === 1;
                const piece = board[row][col];
                const isSelected =
                  selectedPos?.row === row && selectedPos?.col === col;
                const isValidTarget = validMovesForSelected.some(
                  (m) => m.to.row === row && m.to.col === col
                );
                const isLastMoveSquare =
                  (lastMove?.from.row === row && lastMove?.from.col === col) ||
                  (lastMove?.to.row === row && lastMove?.to.col === col);
                const isChainSquare =
                  chainJumpPiece?.row === row && chainJumpPiece?.col === col;

                return (
                  <div
                    key={`${row}-${col}`}
                    onClick={() => handleSquareClick(row, col)}
                    className={`
                      relative w-9 h-9 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center transition-colors
                      ${
                        isDarkSquare
                          ? 'bg-[#4a2e1d] hover:brightness-110'
                          : 'bg-[#ebd3b2]'
                      }
                      ${isLastMoveSquare && isDarkSquare ? 'bg-[#5e3820]' : ''}
                      ${
                        isValidTarget
                          ? 'cursor-pointer ring-2 ring-inset ring-amber-400/80 bg-[#593922]'
                          : isDarkSquare
                          ? 'cursor-pointer'
                          : 'cursor-default'
                      }
                    `}
                  >
                    {/* Valid move dot indicator */}
                    {isValidTarget && !piece && (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-400/90 shadow-md ring-2 ring-amber-200 animate-pulse pointer-events-none" />
                    )}

                    {/* Piece Rendering with Tulip or Pisces Symbol */}
                    {piece && (
                      <PieceComponent
                        piece={piece}
                        isSelected={isSelected}
                        isChainSquare={isChainSquare}
                        isValidTarget={isValidTarget}
                        symbolMode={symbolMode}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Captured Pieces Bar below */}
      <div className="w-full flex items-center justify-between mt-3 px-3 py-2 bg-stone-900/90 rounded-xl border border-stone-800 text-xs text-stone-300">
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 rounded-full bg-rose-700 border border-rose-300 flex items-center justify-center shadow p-0.5">
            {redSymbol === 'tulip' ? (
              <TulipIcon className="w-3.5 h-3.5" />
            ) : (
              <PiscesIcon className="w-2.5 h-2.5 text-white" />
            )}
          </div>
          <span className="font-medium text-stone-200">
            Rojas ({redSymbol === 'tulip' ? '🌷 Tulipán Rosa' : '♓ Piscis'}):
          </span>
          <span className="font-mono font-bold text-rose-400">{redPiecesCount}</span>
          <span className="text-stone-500">({12 - redPiecesCount} capturadas)</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 rounded-full bg-stone-950 border border-stone-500 flex items-center justify-center shadow p-0.5">
            {blackSymbol === 'tulip' ? (
              <TulipIcon className="w-3.5 h-3.5" />
            ) : (
              <PiscesIcon className="w-2.5 h-2.5 text-sky-300" />
            )}
          </div>
          <span className="font-medium text-stone-200">
            Negras ({blackSymbol === 'tulip' ? '🌷 Tulipán Rosa' : '♓ Piscis'}):
          </span>
          <span className="font-mono font-bold text-stone-300">{blackPiecesCount}</span>
          <span className="text-stone-500">({12 - blackPiecesCount} capturadas)</span>
        </div>
      </div>
    </div>
  );
};

interface PieceProps {
  piece: Piece;
  isSelected: boolean;
  isChainSquare: boolean;
  isValidTarget: boolean;
  symbolMode: PieceSymbolMode;
}

const PieceComponent: React.FC<PieceProps> = ({
  piece,
  isSelected,
  isChainSquare,
  isValidTarget,
  symbolMode,
}) => {
  const isRed = piece.player === 'red';
  const symbol = getPieceSymbol(piece.player, symbolMode);

  return (
    <div
      className={`
        relative w-7 h-7 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center
        transition-transform duration-150 transform hover:scale-105 active:scale-95
        ${isSelected ? 'scale-110 z-10' : ''}
        ${isChainSquare ? 'animate-bounce' : ''}
      `}
    >
      {/* 3D Drop Shadow */}
      <div className="absolute inset-0 rounded-full bg-black/60 translate-y-1 blur-[1px]" />

      {/* Outer Checker Body */}
      <div
        className={`
          relative w-full h-full rounded-full flex items-center justify-center border-2
          ${
            isRed
              ? 'bg-gradient-to-br from-rose-500 via-red-600 to-rose-900 border-rose-300/70 shadow-inner'
              : 'bg-gradient-to-br from-stone-700 via-stone-850 to-stone-950 border-stone-500/70 shadow-inner'
          }
          ${isSelected ? 'ring-4 ring-amber-400 shadow-lg' : ''}
          ${isValidTarget ? 'ring-2 ring-emerald-400' : ''}
        `}
      >
        {/* Inner concentric circular ridge with Tulip or Pisces Emblem */}
        <div
          className={`
            w-5 h-5 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full border border-dashed flex flex-col items-center justify-center relative overflow-visible
            ${
              isRed
                ? 'border-red-300/50 bg-gradient-to-tl from-red-700 to-red-500 shadow-inner text-amber-200'
                : 'border-stone-400/50 bg-gradient-to-tl from-stone-900 to-stone-750 shadow-inner text-sky-200'
            }
          `}
        >
          {/* King Crown if crowned */}
          {piece.isKing && (
            <div className="absolute -top-1 sm:-top-1.5 flex items-center justify-center z-10">
              <Crown className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-300 fill-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]" />
            </div>
          )}

          {/* Engraved Emblem: Tulipán or Piscis */}
          <div
            className={`
              flex items-center justify-center transition-transform
              ${piece.isKing ? 'scale-70 sm:scale-80 translate-y-0.5' : 'scale-90 sm:scale-100'}
            `}
          >
            {symbol === 'tulip' ? (
              <TulipIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5" />
            ) : (
              <PiscesIcon
                className={`w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 ${
                  isRed
                    ? 'text-amber-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]'
                    : 'text-sky-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]'
                }`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
