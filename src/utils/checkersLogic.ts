import { BoardState, BoardCell, PlayerColor, Position, MoveStep } from '../types/checkers.js';

export const BOARD_SIZE = 8;

export function createInitialBoard(): BoardState {
  const board: BoardState = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Checkers is played only on dark squares
      if ((row + col) % 2 === 1) {
        if (row < 3) {
          board[row][col] = { player: 'black', isKing: false };
        } else if (row > 4) {
          board[row][col] = { player: 'red', isKing: false };
        }
      }
    }
  }

  return board;
}

export function isWithinBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function countPieces(board: BoardState): { red: number; black: number; redKings: number; blackKings: number } {
  let red = 0;
  let black = 0;
  let redKings = 0;
  let blackKings = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece) {
        if (piece.player === 'red') {
          red++;
          if (piece.isKing) redKings++;
        } else {
          black++;
          if (piece.isKing) blackKings++;
        }
      }
    }
  }

  return { red, black, redKings, blackKings };
}

// Get all possible capture/jump moves for a specific piece at (row, col)
export function getAvailableJumpsForPiece(board: BoardState, pos: Position): MoveStep[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const jumps: MoveStep[] = [];
  const opponent: PlayerColor = piece.player === 'red' ? 'black' : 'red';

  // Si la pieza está coronada (Dama / Rey):
  // Reglas de Dama Voladora:
  // - Captura a distancia: Puede saltar sobre una pieza enemiga situada a cualquier distancia
  //   en la misma diagonal (siempre que haya una o más casillas libres después de la pieza capturada)
  //   y aterrizar en cualquier casilla libre posterior.
  // - Captura múltiple: Puede cambiar de dirección en ángulo recto (90°) durante una secuencia de capturas
  //   si hay más piezas enemigas para comer.
  if (piece.isKing) {
    const directions: [number, number][] = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    for (const [dr, dc] of directions) {
      let step = 1;
      let enemyFound: Position | null = null;

      // Avanzamos por la diagonal hasta encontrar un obstáculo o el borde del tablero
      while (true) {
        const r = pos.row + dr * step;
        const c = pos.col + dc * step;
        if (!isWithinBoard(r, c)) break;

        const currentCell = board[r][c];
        if (currentCell === null) {
          step++;
          continue;
        }

        if (currentCell.player === piece.player) {
          // Bloqueado por una pieza aliada: no se puede capturar en esta dirección
          break;
        }

        // Pieza enemiga encontrada
        enemyFound = { row: r, col: c };
        break;
      }

      // Si hay una pieza enemiga, exploramos todas las casillas libres posteriores a ella
      if (enemyFound) {
        let landStep = step + 1;
        while (true) {
          const landR = pos.row + dr * landStep;
          const landC = pos.col + dc * landStep;
          if (!isWithinBoard(landR, landC)) break;

          const landCell = board[landR][landC];
          // Si encontramos cualquier pieza posterior, no se puede aterrizar ni seguir más allá
          if (landCell !== null) break;

          jumps.push({
            from: { row: pos.row, col: pos.col },
            to: { row: landR, col: landC },
            captured: { row: enemyFound.row, col: enemyFound.col },
            isKingPromotion: false,
          });

          landStep++;
        }
      }
    }

    return jumps;
  }

  // Piezas regulares (peones no coronados):
  let directions: [number, number][] = [];
  if (piece.player === 'red') {
    // Red moves up (negative row)
    directions = [
      [-1, -1],
      [-1, 1],
    ];
  } else {
    // Black moves down (positive row)
    directions = [
      [1, -1],
      [1, 1],
    ];
  }

  for (const [dr, dc] of directions) {
    const midR = pos.row + dr;
    const midC = pos.col + dc;
    const destR = pos.row + dr * 2;
    const destC = pos.col + dc * 2;

    if (isWithinBoard(destR, destC) && isWithinBoard(midR, midC)) {
      const midPiece = board[midR][midC];
      const destCell = board[destR][destC];

      if (midPiece && midPiece.player === opponent && destCell === null) {
        const willBeKing =
          (piece.player === 'red' && destR === 0) || (piece.player === 'black' && destR === 7);

        jumps.push({
          from: { row: pos.row, col: pos.col },
          to: { row: destR, col: destC },
          captured: { row: midR, col: midC },
          isKingPromotion: willBeKing,
        });
      }
    }
  }

  return jumps;
}

// Get all possible normal (non-jump) moves for a specific piece
export function getSimpleMovesForPiece(board: BoardState, pos: Position): MoveStep[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const moves: MoveStep[] = [];

  // Pieza coronada (Dama / Rey):
  // Movimiento a larga distancia: La dama puede moverse cualquier número de casillas vacías
  // en diagonal, hacia adelante o hacia atrás.
  if (piece.isKing) {
    const directions: [number, number][] = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    for (const [dr, dc] of directions) {
      let step = 1;
      while (true) {
        const destR = pos.row + dr * step;
        const destC = pos.col + dc * step;

        if (!isWithinBoard(destR, destC)) break;
        if (board[destR][destC] !== null) break;

        moves.push({
          from: { row: pos.row, col: pos.col },
          to: { row: destR, col: destC },
          isKingPromotion: false,
        });

        step++;
      }
    }

    return moves;
  }

  // Piezas regulares:
  const directions: [number, number][] =
    piece.player === 'red'
      ? [
          [-1, -1],
          [-1, 1],
        ]
      : [
          [1, -1],
          [1, 1],
        ];

  for (const [dr, dc] of directions) {
    const destR = pos.row + dr;
    const destC = pos.col + dc;

    if (isWithinBoard(destR, destC) && board[destR][destC] === null) {
      const willBeKing =
        (piece.player === 'red' && destR === 0) || (piece.player === 'black' && destR === 7);

      moves.push({
        from: { row: pos.row, col: pos.col },
        to: { row: destR, col: destC },
        isKingPromotion: willBeKing,
      });
    }
  }

  return moves;
}

// Get all jumps across the entire board for the given player
export function getAllJumpsForPlayer(board: BoardState, player: PlayerColor): MoveStep[] {
  const allJumps: MoveStep[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        allJumps.push(...getAvailableJumpsForPiece(board, { row: r, col: c }));
      }
    }
  }
  return allJumps;
}

// Get all legal moves for a given player
export function getAllLegalMovesForPlayer(
  board: BoardState,
  player: PlayerColor,
  chainJumpPiece: Position | null = null
): MoveStep[] {
  // If in the middle of a multi-jump sequence, only jumps for that piece are allowed
  if (chainJumpPiece) {
    return getAvailableJumpsForPiece(board, chainJumpPiece);
  }

  // Captura opcional / libre:
  // El usuario puede elegir entre capturar una pieza contraria o mover cualquier
  // otra pieza normalmente, permitiendo un juego más justo, flexible y estratégico.
  const allJumps = getAllJumpsForPlayer(board, player);
  const simpleMoves: MoveStep[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        simpleMoves.push(...getSimpleMovesForPiece(board, { row: r, col: c }));
      }
    }
  }

  // Se combinan tanto saltos como movimientos simples:
  return [...allJumps, ...simpleMoves];
}

// Get valid moves for a selected piece by position
export function getValidMovesForSelectedPiece(
  board: BoardState,
  pos: Position,
  turn: PlayerColor,
  chainJumpPiece: Position | null = null
): MoveStep[] {
  const piece = board[pos.row][pos.col];
  if (!piece || piece.player !== turn) return [];

  const allLegalMoves = getAllLegalMovesForPlayer(board, turn, chainJumpPiece);
  return allLegalMoves.filter((m) => m.from.row === pos.row && m.from.col === pos.col);
}

// Apply a move and return the new board state, whether it became king, and if further chain jumps exist
export function applyMove(
  board: BoardState,
  move: MoveStep
): {
  newBoard: BoardState;
  becameKing: boolean;
  canChainJump: boolean;
  nextChainPiece: Position | null;
} {
  // Deep copy board
  const newBoard: BoardState = board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

  const sourcePiece = newBoard[move.from.row][move.from.col];
  if (!sourcePiece) {
    throw new Error('No piece at source position');
  }

  let becameKing = false;
  // Check king promotion
  if (
    !sourcePiece.isKing &&
    ((sourcePiece.player === 'red' && move.to.row === 0) ||
      (sourcePiece.player === 'black' && move.to.row === 7))
  ) {
    sourcePiece.isKing = true;
    becameKing = true;
  }

  // Move piece to destination
  newBoard[move.to.row][move.to.col] = sourcePiece;
  newBoard[move.from.row][move.from.col] = null;

  // Remove captured piece if any
  if (move.captured) {
    newBoard[move.captured.row][move.captured.col] = null;
  }

  // Check if chain jump is available (only if a piece was captured and did NOT just promote to king)
  let canChainJump = false;
  let nextChainPiece: Position | null = null;

  if (move.captured && !becameKing) {
    const furtherJumps = getAvailableJumpsForPiece(newBoard, move.to);
    if (furtherJumps.length > 0) {
      canChainJump = true;
      nextChainPiece = { row: move.to.row, col: move.to.col };
    }
  }

  return {
    newBoard,
    becameKing,
    canChainJump,
    nextChainPiece,
  };
}

// Check game end conditions
export function checkGameStatus(
  board: BoardState,
  nextPlayer: PlayerColor
): {
  isOver: boolean;
  winner: PlayerColor | 'draw' | null;
  reason: string | null;
} {
  const counts = countPieces(board);

  // 1. Cuando un jugador se queda sin piezas (0 piezas)
  if (counts.red === 0) {
    return { isOver: true, winner: 'black', reason: 'Rojas eliminadas por completo' };
  }
  if (counts.black === 0) {
    return { isOver: true, winner: 'red', reason: 'Negras eliminadas por completo' };
  }

  // 2. Fin de partida cuando solo queda 1 pieza en total en el tablero
  if (counts.red + counts.black <= 1) {
    const winner: PlayerColor = counts.red >= 1 ? 'red' : 'black';
    return {
      isOver: true,
      winner,
      reason: `Victoria: Solo queda 1 pieza en el tablero (gana ${winner === 'red' ? 'Rojo' : 'Negro'})`,
    };
  }

  // 3. Fin de partida cuando a un jugador le queda solo 1 pieza:
  // - Si ambos jugadores tienen 1 sola pieza: Tablas (empate)
  if (counts.red === 1 && counts.black === 1) {
    return {
      isOver: true,
      winner: 'draw',
      reason: 'Ambos jugadores quedaron con solo 1 pieza (Tablas)',
    };
  }

  // - Si el rival ha quedado con solo 1 pieza frente a más piezas
  if (counts.black === 1 && counts.red > 1) {
    return {
      isOver: true,
      winner: 'red',
      reason: 'Victoria: El rival ha quedado con solo 1 pieza',
    };
  }

  if (counts.red === 1 && counts.black > 1) {
    return {
      isOver: true,
      winner: 'black',
      reason: 'Victoria: El rival ha quedado con solo 1 pieza',
    };
  }

  // 4. Bloqueo: el jugador en turno no tiene movimientos legales
  const legalMoves = getAllLegalMovesForPlayer(board, nextPlayer, null);
  if (legalMoves.length === 0) {
    const winner: PlayerColor = nextPlayer === 'red' ? 'black' : 'red';
    return {
      isOver: true,
      winner,
      reason: `El jugador ${nextPlayer === 'red' ? 'Rojo' : 'Negro'} no tiene movimientos legales`,
    };
  }

  return { isOver: false, winner: null, reason: null };
}
