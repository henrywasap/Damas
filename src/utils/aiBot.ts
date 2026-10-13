import { BoardState, PlayerColor, Position, MoveStep } from '../types/checkers.js';
import {
  getAllLegalMovesForPlayer,
  applyMove,
  countPieces,
  isWithinBoard,
  BOARD_SIZE,
} from './checkersLogic.js';

export type BotDifficulty = 'facil' | 'medio' | 'dificil';

// Evaluate board for AI (positive score means better for botColor)
function evaluateBoard(board: BoardState, botColor: PlayerColor): number {
  const opponent: PlayerColor = botColor === 'red' ? 'black' : 'red';
  let score = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const isBot = piece.player === botColor;
      const multiplier = isBot ? 1 : -1;

      // Base piece value: King is worth 2.5x a regular piece
      const pieceValue = piece.isKing ? 250 : 100;
      score += pieceValue * multiplier;

      // Positional incentives:
      // Center control bonus
      if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
        score += 15 * multiplier;
      }

      // Back row defense bonus (prevents opponent kings early)
      if (!piece.isKing) {
        if (piece.player === 'black' && r === 0) {
          score += 20 * multiplier;
        } else if (piece.player === 'red' && r === 7) {
          score += 20 * multiplier;
        }

        // Advancement bonus for regular pieces
        const rankAdvancement = piece.player === 'black' ? r : 7 - r;
        score += rankAdvancement * 5 * multiplier;
      }
    }
  }

  return score;
}

// Minimax with Alpha-Beta pruning for hard bot
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  botColor: PlayerColor
): number {
  const opponent: PlayerColor = botColor === 'red' ? 'black' : 'red';
  const currentTurn: PlayerColor = isMaximizing ? botColor : opponent;

  const legalMoves = getAllLegalMovesForPlayer(board, currentTurn, null);

  if (depth === 0 || legalMoves.length === 0) {
    if (legalMoves.length === 0) {
      // If player has no moves, they lost
      return isMaximizing ? -10000 : 10000;
    }
    return evaluateBoard(board, botColor);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      try {
        const { newBoard } = applyMove(board, move);
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, botColor);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      } catch {
        continue;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      try {
        const { newBoard } = applyMove(board, move);
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, botColor);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      } catch {
        continue;
      }
    }
    return minEval;
  }
}

// Select best move for bot based on chosen difficulty
export function getBotMove(
  board: BoardState,
  botColor: PlayerColor,
  chainJumpPiece: Position | null,
  difficulty: BotDifficulty = 'medio'
): MoveStep | null {
  const legalMoves = getAllLegalMovesForPlayer(board, botColor, chainJumpPiece);
  if (legalMoves.length === 0) return null;

  // Jump/capture moves
  const captureMoves = legalMoves.filter((m) => !!m.captured);

  // EASY: Picks random move, with 50% preference for captures
  if (difficulty === 'facil') {
    if (captureMoves.length > 0 && Math.random() > 0.3) {
      const randomIndex = Math.floor(Math.random() * captureMoves.length);
      return captureMoves[randomIndex];
    }
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[randomIndex];
  }

  // MEDIUM: Heuristic 1-ply search (prefers captures, king promotions, center)
  if (difficulty === 'medio') {
    let bestScore = -Infinity;
    let bestMoves: MoveStep[] = [];

    for (const move of legalMoves) {
      let score = 0;
      if (move.captured) score += 100;
      if (move.isKingPromotion) score += 80;

      // Central landing bonus
      if (move.to.row >= 2 && move.to.row <= 5 && move.to.col >= 2 && move.to.col <= 5) {
        score += 10;
      }

      // Avoid edge blunders or simulate board
      try {
        const { newBoard } = applyMove(board, move);
        const boardScore = evaluateBoard(newBoard, botColor);
        score += boardScore * 0.1;
      } catch {
        // ignore
      }

      // Add a tiny randomness to avoid predictability
      score += Math.random() * 5;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (Math.abs(score - bestScore) < 0.1) {
        bestMoves.push(move);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)] || legalMoves[0];
  }

  // HARD: Minimax 3-ply search
  let bestScore = -Infinity;
  let bestMoves: MoveStep[] = [];

  for (const move of legalMoves) {
    try {
      const { newBoard } = applyMove(board, move);
      // Minimax depth of 3 plies
      const score = minimax(newBoard, 2, -Infinity, Infinity, false, botColor);

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (Math.abs(score - bestScore) < 1) {
        bestMoves.push(move);
      }
    } catch {
      continue;
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || legalMoves[0];
}
