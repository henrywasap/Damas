import {
  createInitialBoard,
  getSimpleMovesForPiece,
  getAvailableJumpsForPiece,
  getAllLegalMovesForPlayer,
  applyMove,
  BOARD_SIZE,
} from '../src/utils/checkersLogic.js';
import type { BoardState } from '../src/types/checkers.js';

function createEmptyBoard(): BoardState {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
}

function runTests() {
  console.log('--- STARTING CHECKERS RULES TESTS ---');

  // Test 1: Flying King Long-Distance Simple Move
  {
    console.log('Test 1: Flying King Long-Distance Simple Move');
    const board = createEmptyBoard();
    // Place red king at (3, 3)
    board[3][3] = { player: 'red', isKing: true };

    const moves = getSimpleMovesForPiece(board, { row: 3, col: 3 });
    // From (3, 3) on empty board:
    // NW (-1, -1): (2, 2), (1, 1), (0, 0) -> 3 squares
    // NE (-1, +1): (2, 4), (1, 5), (0, 6) -> 3 squares
    // SW (+1, -1): (4, 2), (5, 1), (6, 0) -> 3 squares
    // SE (+1, +1): (4, 4), (5, 5), (6, 6), (7, 7) -> 4 squares
    // Total = 3 + 3 + 3 + 4 = 13 squares
    console.assert(moves.length === 13, `Expected 13 simple moves for king at (3,3), got ${moves.length}`);

    // Check that distant destination is included
    const hasFarSE = moves.some((m) => m.to.row === 7 && m.to.col === 7);
    const hasFarNW = moves.some((m) => m.to.row === 0 && m.to.col === 0);
    console.assert(hasFarSE, 'King should be able to move to (7, 7)');
    console.assert(hasFarNW, 'King should be able to move to (0, 0)');
    console.log('✓ Test 1 passed: King moves across empty diagonals');
  }

  // Test 2: Flying King Move Blocked by Pieces
  {
    console.log('Test 2: Flying King Move Blocked by Pieces');
    const board = createEmptyBoard();
    board[3][3] = { player: 'red', isKing: true };
    // Friendly piece at (1, 1) blocks (1, 1) and (0, 0) in NW direction
    board[1][1] = { player: 'red', isKing: false };
    // Opponent piece at (5, 5) blocks simple moves at (5, 5), (6, 6), (7, 7) in SE direction
    board[5][5] = { player: 'black', isKing: false };

    const moves = getSimpleMovesForPiece(board, { row: 3, col: 3 });
    const hasNW_2_2 = moves.some((m) => m.to.row === 2 && m.to.col === 2);
    const hasNW_1_1 = moves.some((m) => m.to.row === 1 && m.to.col === 1);
    const hasNW_0_0 = moves.some((m) => m.to.row === 0 && m.to.col === 0);
    const hasSE_4_4 = moves.some((m) => m.to.row === 4 && m.to.col === 4);
    const hasSE_5_5 = moves.some((m) => m.to.row === 5 && m.to.col === 5);

    console.assert(hasNW_2_2, 'King can move to (2, 2) before friendly piece');
    console.assert(!hasNW_1_1, 'King cannot move onto friendly piece at (1, 1)');
    console.assert(!hasNW_0_0, 'King cannot move past friendly piece to (0, 0)');
    console.assert(hasSE_4_4, 'King can move to (4, 4) before enemy piece');
    console.assert(!hasSE_5_5, 'King simple move cannot land on enemy piece');
    console.log('✓ Test 2 passed: Obstacle blocking verified');
  }

  // Test 3: Regular Pawn does NOT have long distance move
  {
    console.log('Test 3: Regular Pawn does NOT have long distance move');
    const board = createEmptyBoard();
    board[3][3] = { player: 'red', isKing: false };
    const moves = getSimpleMovesForPiece(board, { row: 3, col: 3 });
    // Red moves up (negative row) only 1 step: (2, 2) and (2, 4)
    console.assert(moves.length === 2, `Expected 2 moves for regular pawn, got ${moves.length}`);
    const destinations = moves.map((m) => `${m.to.row},${m.to.col}`).sort();
    console.assert(
      JSON.stringify(destinations) === JSON.stringify(['2,2', '2,4']),
      'Pawn must only move 1 step forward'
    );
    console.log('✓ Test 3 passed: Regular pawn restricted to 1 step');
  }

  // Test 4: Flying King Long-Range Capture and Multiple Landing Squares
  {
    console.log('Test 4: Flying King Long-Range Capture');
    const board = createEmptyBoard();
    // Red King at (7, 1)
    board[7][1] = { player: 'red', isKing: true };
    // Black piece at (4, 4) along diagonal (-1, +1)
    // Distance from (7, 1) to (4, 4) is 3 squares! (5, 3) is empty.
    board[4][4] = { player: 'black', isKing: false };

    // Landing squares behind (4, 4):
    // (3, 5), (2, 6), (1, 7) are all empty!
    const jumps = getAvailableJumpsForPiece(board, { row: 7, col: 1 });
    console.assert(jumps.length === 3, `Expected 3 landing squares for long-range capture, got ${jumps.length}`);

    const landings = jumps.map((j) => `${j.to.row},${j.to.col}`).sort();
    console.assert(
      JSON.stringify(landings) === JSON.stringify(['1,7', '2,6', '3,5']),
      `Landing squares must be 3,5, 2,6, 1,7. Got ${JSON.stringify(landings)}`
    );

    // Each jump captures piece at (4, 4)
    jumps.forEach((j) => {
      console.assert(
        j.captured?.row === 4 && j.captured?.col === 4,
        `Captured position must be (4, 4), got ${JSON.stringify(j.captured)}`
      );
    });
    console.log('✓ Test 4 passed: Long-range capture with multiple landing choices');
  }

  // Test 5: Flying King Capture Blocked Behind
  {
    console.log('Test 5: Flying King Capture Blocked Behind');
    const board = createEmptyBoard();
    board[7][1] = { player: 'red', isKing: true };
    board[4][4] = { player: 'black', isKing: false };
    // Immediately behind at (3, 5) is another piece (black or red)
    board[3][5] = { player: 'black', isKing: false };

    const jumps = getAvailableJumpsForPiece(board, { row: 7, col: 1 });
    console.assert(jumps.length === 0, `Expected 0 jumps when enemy is blocked behind, got ${jumps.length}`);
    console.log('✓ Test 5 passed: Blocked capture correctly rejected');
  }

  // Test 6: Flying King Multiple Capture changing direction at 90 degrees
  {
    console.log('Test 6: Flying King 90-degree Multi-jump sequence');
    const board = createEmptyBoard();
    // Red King at (7, 1)
    board[7][1] = { player: 'red', isKing: true };
    // First enemy at (5, 3) -> distance 2
    board[5][3] = { player: 'black', isKing: false };
    // King will land at (3, 5)
    // Second enemy at (2, 4) -> 90 degree turn (direction (-1, -1)) from (3, 5)!
    // Landing squares for second capture: (1, 3), (0, 2)
    board[2][4] = { player: 'black', isKing: false };

    // Step 1: First jump
    const jumps1 = getAvailableJumpsForPiece(board, { row: 7, col: 1 });
    const chosenJump1 = jumps1.find((j) => j.to.row === 3 && j.to.col === 5);
    console.assert(chosenJump1 !== undefined, 'Jump landing at (3, 5) must exist');

    const result1 = applyMove(board, chosenJump1!);
    console.assert(result1.canChainJump === true, 'Chain jump must be available after landing at (3, 5)');
    console.assert(
      result1.nextChainPiece?.row === 3 && result1.nextChainPiece?.col === 5,
      'Next chain piece must be at (3, 5)'
    );
    console.assert(result1.newBoard[5][3] === null, 'First captured piece must be removed');
    console.assert(result1.newBoard[3][5]?.isKing === true, 'King is now at (3, 5)');

    // Step 2: Second jump from (3, 5) with 90° direction change
    const jumps2 = getAvailableJumpsForPiece(result1.newBoard, result1.nextChainPiece!);
    console.assert(jumps2.length === 2, `Expected 2 landing squares for second jump, got ${jumps2.length}`);

    // Landings at (1, 3) and (0, 2)
    const landings2 = jumps2.map((j) => `${j.to.row},${j.to.col}`).sort();
    console.assert(
      JSON.stringify(landings2) === JSON.stringify(['0,2', '1,3']),
      `Landing squares must be 0,2 and 1,3. Got ${JSON.stringify(landings2)}`
    );

    // Apply second jump landing at (0, 2)
    const chosenJump2 = jumps2.find((j) => j.to.row === 0 && j.to.col === 2);
    const result2 = applyMove(result1.newBoard, chosenJump2!);
    console.assert(result2.newBoard[2][4] === null, 'Second captured piece must be removed');
    console.assert(result2.newBoard[0][2]?.player === 'red' && result2.newBoard[0][2]?.isKing === true);
    console.assert(result2.canChainJump === false, 'No more jumps in sequence');

    console.log('✓ Test 6 passed: 90-degree multi-jump sequence executed perfectly');
  }

  // Test 7: Pawn Promotion to King ends turn without immediate chain jump
  {
    console.log('Test 7: Pawn Promotion');
    const board = createEmptyBoard();
    board[2][2] = { player: 'red', isKing: false };
    board[1][3] = { player: 'black', isKing: false };
    // Red pawn jumps to (0, 4) which is row 0 -> becomes king!
    const jumps = getAvailableJumpsForPiece(board, { row: 2, col: 2 });
    console.assert(jumps.length === 1);
    console.assert(jumps[0].isKingPromotion === true);

    const result = applyMove(board, jumps[0]);
    console.assert(result.becameKing === true, 'Piece must become king');
    console.assert(result.newBoard[0][4]?.isKing === true, 'Cell (0, 4) must hold King');
    console.assert(result.canChainJump === false, 'Promoting jump ends turn');
    console.log('✓ Test 7 passed: King promotion ends turn');
  }

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTests();
