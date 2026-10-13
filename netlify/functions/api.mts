import type { Config, Context } from "@netlify/functions";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { players, matches, gameRooms } from "../../db/schema.js";
import {
  createInitialBoard,
  countPieces,
  getAllLegalMovesForPlayer,
  applyMove,
  checkGameStatus,
} from "../../src/utils/checkersLogic.js";
import type {
  BoardState,
  PlayerColor,
  Position,
  MoveStep,
  PlayerInfo,
  SpectatorInfo,
  RoomState,
  PlayerStats,
  MatchHistoryItem,
  ChatMessage,
  GlobalStatsPayload,
  RoomSummary,
} from "../../src/types/checkers.js";

// In-memory fallback if database is not reachable during initial provisioning
const memoryRooms = new Map<string, { state: RoomState; version: number; updatedAt: number }>();
let memoryMatches: MatchHistoryItem[] = [];
let memoryPlayers: Record<string, PlayerStats> = {};

// Default starter seed data
const STARTER_PLAYERS: Array<Omit<PlayerStats, 'lastActive'> & { lastActive: Date }> = [
  {
    name: "Sofia Master",
    gamesPlayed: 14,
    wins: 11,
    losses: 2,
    draws: 1,
    winRate: 78.5,
    currentStreak: 4,
    bestStreak: 5,
    lastActive: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    name: "Alex Damas",
    gamesPlayed: 10,
    wins: 7,
    losses: 3,
    draws: 0,
    winRate: 70.0,
    currentStreak: 2,
    bestStreak: 3,
    lastActive: new Date(Date.now() - 1000 * 60 * 55),
  },
  {
    name: "Carlos V",
    gamesPlayed: 8,
    wins: 4,
    losses: 3,
    draws: 1,
    winRate: 50.0,
    currentStreak: 1,
    bestStreak: 2,
    lastActive: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    name: "Lucia Pro",
    gamesPlayed: 6,
    wins: 3,
    losses: 3,
    draws: 0,
    winRate: 50.0,
    currentStreak: 0,
    bestStreak: 2,
    lastActive: new Date(Date.now() - 1000 * 60 * 180),
  },
];

const STARTER_MATCHES = [
  {
    id: "hist-seed-1",
    roomId: "SALA-DIAMANTE",
    roomName: "Sala Diamante",
    redPlayer: "Sofia Master",
    blackPlayer: "Carlos V",
    winner: "Sofia Master",
    winnerColor: "red",
    winReason: "Negras eliminadas",
    totalMoves: 34,
    piecesLeftRed: 5,
    piecesLeftBlack: 0,
    durationSeconds: 320,
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
  },
];

async function seedDatabaseIfEmpty() {
  try {
    const existing = await db.select().from(players).limit(1);
    if (existing.length === 0) {
      for (const p of STARTER_PLAYERS) {
        await db.insert(players).values(p).onConflictDoNothing();
      }
      for (const m of STARTER_MATCHES) {
        await db.insert(matches).values(m).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.warn("DB seed check notice:", err);
  }
}

// Update player stats in database after match
async function recordMatchOutcome(
  roomId: string,
  roomName: string,
  redPlayer: string,
  blackPlayer: string,
  winner: string,
  winnerColor: PlayerColor | 'draw',
  winReason: string,
  totalMoves: number,
  piecesLeftRed: number,
  piecesLeftBlack: number,
  durationSeconds: number
) {
  const matchId = `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    await db.insert(matches).values({
      id: matchId,
      roomId,
      roomName,
      redPlayer,
      blackPlayer,
      winner,
      winnerColor,
      winReason,
      totalMoves,
      piecesLeftRed,
      piecesLeftBlack,
      durationSeconds,
      createdAt: new Date(),
    });

    const updateOnePlayer = async (name: string, won: boolean, isDraw: boolean) => {
      const existing = await db.select().from(players).where(eq(players.name, name)).limit(1);
      if (existing.length === 0) {
        const gamesPlayed = 1;
        const wins = won ? 1 : 0;
        const draws = isDraw ? 1 : 0;
        const losses = (!won && !isDraw) ? 1 : 0;
        const winRate = (wins / gamesPlayed) * 100;
        const currentStreak = won ? 1 : 0;
        const bestStreak = won ? 1 : 0;
        await db.insert(players).values({
          name,
          gamesPlayed,
          wins,
          losses,
          draws,
          winRate,
          currentStreak,
          bestStreak,
          lastActive: new Date(),
        });
      } else {
        const p = existing[0];
        const gamesPlayed = p.gamesPlayed + 1;
        const wins = p.wins + (won ? 1 : 0);
        const draws = p.draws + (isDraw ? 1 : 0);
        const losses = p.losses + (!won && !isDraw ? 1 : 0);
        const winRate = Number(((wins / gamesPlayed) * 100).toFixed(1));
        const currentStreak = won ? p.currentStreak + 1 : 0;
        const bestStreak = Math.max(p.bestStreak, currentStreak);

        await db
          .update(players)
          .set({
            gamesPlayed,
            wins,
            losses,
            draws,
            winRate,
            currentStreak,
            bestStreak,
            lastActive: new Date(),
          })
          .where(eq(players.name, name));
      }
    };

    const isDraw = winnerColor === 'draw';
    await updateOnePlayer(redPlayer, winnerColor === 'red', isDraw);
    await updateOnePlayer(blackPlayer, winnerColor === 'black', isDraw);
  } catch (err) {
    console.error("Error recording match outcome to database:", err);
  }
}

// Main Netlify Functions Handler
export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/\.netlify\/functions\/api/, "/api");

  // 1. GET /api/health
  if (pathname === "/api/health") {
    return Response.json({ status: "ok", time: Date.now() });
  }

  // 2. GET /api/stats
  if (pathname === "/api/stats" && req.method === "GET") {
    try {
      await seedDatabaseIfEmpty();

      const dbPlayers = await db.select().from(players).orderBy(desc(players.wins), desc(players.winRate)).limit(50);
      const dbMatches = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(30);

      const leaderboard: PlayerStats[] = dbPlayers.map((p) => ({
        name: p.name,
        gamesPlayed: p.gamesPlayed,
        wins: p.wins,
        losses: p.losses,
        draws: p.draws,
        winRate: p.winRate,
        currentStreak: p.currentStreak,
        bestStreak: p.bestStreak,
        lastActive: p.lastActive ? new Date(p.lastActive).getTime() : Date.now(),
      }));

      const recentMatches: MatchHistoryItem[] = dbMatches.map((m) => ({
        id: m.id,
        roomId: m.roomId,
        roomName: m.roomName,
        redPlayer: m.redPlayer,
        blackPlayer: m.blackPlayer,
        winner: m.winner,
        winnerColor: m.winnerColor as PlayerColor | 'draw',
        winReason: m.winReason,
        totalMoves: m.totalMoves,
        piecesLeftRed: m.piecesLeftRed,
        piecesLeftBlack: m.piecesLeftBlack,
        date: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
        durationSeconds: m.durationSeconds,
      }));

      const totalGamesEver = recentMatches.length;

      return Response.json({
        leaderboard,
        recentMatches,
        totalGamesEver,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Graceful fallback
      return Response.json({
        leaderboard: STARTER_PLAYERS.map((p) => ({
          ...p,
          lastActive: p.lastActive.getTime(),
        })),
        recentMatches: STARTER_MATCHES.map((m) => ({
          ...m,
          winnerColor: m.winnerColor as PlayerColor,
          date: m.createdAt.getTime(),
        })),
        totalGamesEver: STARTER_MATCHES.length,
      });
    }
  }

  // 3. GET /api/rooms
  if (pathname === "/api/rooms" && req.method === "GET") {
    try {
      const activeDbRooms = await db.select().from(gameRooms).orderBy(desc(gameRooms.updatedAt)).limit(20);
      const summaries: RoomSummary[] = activeDbRooms.map((r) => {
        const state = r.state as RoomState;
        const playerNames: string[] = [];
        if (state.players?.red) playerNames.push(state.players.red.name);
        if (state.players?.black) playerNames.push(state.players.black.name);

        return {
          roomId: r.id,
          roomName: r.roomName,
          status: (r.status as any) || state.status || "waiting",
          playersCount: playerNames.length,
          spectatorsCount: state.spectators?.length || 0,
          playerNames,
        };
      });

      return Response.json(summaries);
    } catch (err) {
      console.warn("Error fetching rooms from db, using memory:", err);
      const summaries: RoomSummary[] = Array.from(memoryRooms.entries()).map(([id, item]) => {
        const playerNames: string[] = [];
        if (item.state.players?.red) playerNames.push(item.state.players.red.name);
        if (item.state.players?.black) playerNames.push(item.state.players.black.name);
        return {
          roomId: id,
          roomName: item.state.roomName,
          status: item.state.status,
          playersCount: playerNames.length,
          spectatorsCount: item.state.spectators?.length || 0,
          playerNames,
        };
      });
      return Response.json(summaries);
    }
  }

  // 4. POST /api/rooms/join
  if (pathname === "/api/rooms/join" && req.method === "POST") {
    try {
      const body = await req.json();
      const rawRoomId = String(body.roomId || "SALA-1").trim().toUpperCase();
      const roomId = rawRoomId.replace(/[^A-Z0-9_-]/g, "") || "SALA-1";
      const playerName = String(body.playerName || "Jugador").trim().slice(0, 24);
      const roomName = String(body.roomName || roomId).trim().slice(0, 32);

      let roomState: RoomState | null = null;
      let roomVersion = 1;

      // Try get room from DB
      try {
        const rows = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
        if (rows.length > 0) {
          roomState = rows[0].state as RoomState;
          roomVersion = rows[0].version;
        }
      } catch (e) {
        console.warn("DB read room fallback:", e);
        const mem = memoryRooms.get(roomId);
        if (mem) {
          roomState = mem.state;
          roomVersion = mem.version;
        }
      }

      let assignedRole: 'red' | 'black' | 'spectator' = 'spectator';
      let userId = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      if (!roomState) {
        // Create new room
        const initialBoard = createInitialBoard();
        const counts = countPieces(initialBoard);

        assignedRole = 'red';
        const p1: PlayerInfo = {
          id: userId,
          name: playerName,
          color: 'red',
          connected: true,
          score: 0,
        };

        roomState = {
          roomId,
          roomName,
          status: 'waiting',
          players: {
            red: p1,
            black: null,
          },
          spectators: [],
          board: initialBoard,
          turn: 'red',
          chainJumpPiece: null,
          winner: null,
          winnerName: null,
          winReason: null,
          h2h: { redWins: 0, blackWins: 0, draws: 0 },
          moveHistory: [],
          chat: [
            {
              id: `msg-${Date.now()}`,
              sender: 'Sistema',
              text: `Sala creada por ${playerName}. Esperando al Jugador 2 (Negras)...`,
              timestamp: Date.now(),
              isSystem: true,
            },
          ],
          rematchRequested: { red: false, black: false },
          drawOfferedBy: null,
          lastMove: null,
          redPiecesCount: counts.red,
          blackPiecesCount: counts.black,
        };
        roomVersion = 1;
      } else {
        // Room exists
        // Check if player is reconnecting with same name
        if (roomState.players.red?.name.toLowerCase() === playerName.toLowerCase()) {
          assignedRole = 'red';
          userId = roomState.players.red.id;
          roomState.players.red.connected = true;
        } else if (roomState.players.black?.name.toLowerCase() === playerName.toLowerCase()) {
          assignedRole = 'black';
          userId = roomState.players.black.id;
          roomState.players.black.connected = true;
        } else if (!roomState.players.red) {
          assignedRole = 'red';
          roomState.players.red = {
            id: userId,
            name: playerName,
            color: 'red',
            connected: true,
            score: 0,
          };
          if (roomState.players.black) {
            roomState.status = 'playing';
            roomState.gameStartTime = Date.now();
          }
        } else if (!roomState.players.black) {
          assignedRole = 'black';
          roomState.players.black = {
            id: userId,
            name: playerName,
            color: 'black',
            connected: true,
            score: 0,
          };
          roomState.status = 'playing';
          roomState.gameStartTime = Date.now();
          roomState.chat.push({
            id: `msg-${Date.now()}`,
            sender: 'Sistema',
            text: `¡${playerName} se unió como Negras! La partida ha comenzado. Turno de Rojas.`,
            timestamp: Date.now(),
            isSystem: true,
          });
        } else {
          // Both seats occupied -> spectator
          assignedRole = 'spectator';
          const existingSpec = roomState.spectators.find((s) => s.name.toLowerCase() === playerName.toLowerCase());
          if (!existingSpec) {
            roomState.spectators.push({ id: userId, name: playerName });
          }
        }
        roomVersion += 1;
      }

      // Persist room
      try {
        await db
          .insert(gameRooms)
          .values({
            id: roomId,
            roomName: roomState.roomName,
            status: roomState.status,
            state: roomState,
            version: roomVersion,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: gameRooms.id,
            set: {
              roomName: roomState.roomName,
              status: roomState.status,
              state: roomState,
              version: roomVersion,
              updatedAt: new Date(),
            },
          });
      } catch (e) {
        console.warn("DB save room error, keeping in memory:", e);
      }
      memoryRooms.set(roomId, { state: roomState, version: roomVersion, updatedAt: Date.now() });

      return Response.json({
        role: assignedRole,
        userId,
        roomState,
        version: roomVersion,
      });
    } catch (err) {
      console.error("Join room error:", err);
      return Response.json({ error: "No se pudo unir a la sala" }, { status: 500 });
    }
  }

  // 5. GET /api/rooms/:id
  const matchGetRoom = pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)$/);
  if (matchGetRoom && req.method === "GET") {
    const roomId = matchGetRoom[1].toUpperCase();
    const clientVersion = parseInt(url.searchParams.get("version") || "0", 10);

    let roomState: RoomState | null = null;
    let currentVersion = 1;

    try {
      const rows = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
      if (rows.length > 0) {
        roomState = rows[0].state as RoomState;
        currentVersion = rows[0].version;
      }
    } catch (e) {
      const mem = memoryRooms.get(roomId);
      if (mem) {
        roomState = mem.state;
        currentVersion = mem.version;
      }
    }

    if (!roomState) {
      const mem = memoryRooms.get(roomId);
      if (mem) {
        roomState = mem.state;
        currentVersion = mem.version;
      }
    }

    if (!roomState) {
      return Response.json({ error: "Sala no encontrada" }, { status: 404 });
    }

    if (clientVersion > 0 && clientVersion === currentVersion) {
      return Response.json({ modified: false, version: currentVersion });
    }

    return Response.json({
      modified: true,
      roomState,
      version: currentVersion,
    });
  }

  // 6. POST /api/rooms/:id/action
  const matchActionRoom = pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/action$/);
  if (matchActionRoom && req.method === "POST") {
    const roomId = matchActionRoom[1].toUpperCase();
    try {
      const body = await req.json();
      const { type, userId } = body;

      let roomState: RoomState | null = null;
      let roomVersion = 1;

      try {
        const rows = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
        if (rows.length > 0) {
          roomState = rows[0].state as RoomState;
          roomVersion = rows[0].version;
        }
      } catch (e) {
        const mem = memoryRooms.get(roomId);
        if (mem) {
          roomState = mem.state;
          roomVersion = mem.version;
        }
      }

      if (!roomState) {
        const mem = memoryRooms.get(roomId);
        if (mem) {
          roomState = mem.state;
          roomVersion = mem.version;
        }
      }

      if (!roomState) {
        return Response.json({ error: "Sala no encontrada" }, { status: 404 });
      }

      // Determine sender role
      let senderRole: 'red' | 'black' | 'spectator' = 'spectator';
      let senderName = 'Espectador';
      if (roomState.players.red && (roomState.players.red.id === userId || roomState.players.red.name === body.playerName)) {
        senderRole = 'red';
        senderName = roomState.players.red.name;
      } else if (roomState.players.black && (roomState.players.black.id === userId || roomState.players.black.name === body.playerName)) {
        senderRole = 'black';
        senderName = roomState.players.black.name;
      } else {
        const spec = roomState.spectators.find((s) => s.id === userId || s.name === body.playerName);
        if (spec) senderName = spec.name;
      }

      // Handle action types
      if (type === 'move') {
        const { from, to } = body;
        if (roomState.status !== 'playing') {
          return Response.json({ error: 'La partida no está en curso' }, { status: 400 });
        }
        if (senderRole !== roomState.turn) {
          return Response.json({ error: 'No es tu turno' }, { status: 400 });
        }

        const legalMoves = getAllLegalMovesForPlayer(roomState.board, roomState.turn, roomState.chainJumpPiece);
        const valid = legalMoves.find(
          (m) => m.from.row === from.row && m.from.col === from.col && m.to.row === to.row && m.to.col === to.col
        );

        if (!valid) {
          return Response.json({ error: 'Movimiento no permitido según las reglas' }, { status: 400 });
        }

        const { newBoard, becameKing, canChainJump, nextChainPiece } = applyMove(roomState.board, valid);
        const counts = countPieces(newBoard);

        const nextTurn: PlayerColor = roomState.turn === 'red' ? 'black' : 'red';
        const gameStatus = checkGameStatus(newBoard, nextTurn);

        let finalTurn = roomState.turn;
        let chainPiece: Position | null = null;

        if (gameStatus.isOver) {
          chainPiece = null;
          roomState.status = 'ended';
          roomState.winner = gameStatus.winner;
          roomState.winReason = gameStatus.reason;

          if (gameStatus.winner === 'red') {
            roomState.winnerName = roomState.players.red?.name || 'Rojo';
            roomState.h2h.redWins += 1;
          } else if (gameStatus.winner === 'black') {
            roomState.winnerName = roomState.players.black?.name || 'Negro';
            roomState.h2h.blackWins += 1;
          } else {
            roomState.winnerName = 'Empate';
            roomState.h2h.draws += 1;
          }

          // Record match in DB
          const duration = roomState.gameStartTime ? Math.round((Date.now() - roomState.gameStartTime) / 1000) : 0;
          await recordMatchOutcome(
            roomState.roomId,
            roomState.roomName,
            roomState.players.red?.name || 'Rojo',
            roomState.players.black?.name || 'Negro',
            roomState.winnerName || 'Empate',
            gameStatus.winner || 'draw',
            gameStatus.reason || 'Fin de partida',
            roomState.moveHistory.length + 1,
            counts.red,
            counts.black,
            duration
          );
        } else if (canChainJump && nextChainPiece) {
          chainPiece = nextChainPiece;
          finalTurn = roomState.turn;
        } else {
          finalTurn = nextTurn;
          chainPiece = null;
        }

        roomState.board = newBoard;
        roomState.turn = finalTurn;
        roomState.chainJumpPiece = chainPiece;
        roomState.lastMove = { from, to };
        roomState.redPiecesCount = counts.red;
        roomState.blackPiecesCount = counts.black;

        roomState.moveHistory.push({
          id: `move-${Date.now()}`,
          moveNumber: roomState.moveHistory.length + 1,
          player: senderRole,
          playerName: senderName,
          from,
          to,
          captured: valid.captured,
          isKingPromotion: becameKing,
          timestamp: Date.now(),
        });
      } else if (type === 'end_chain_turn') {
        if (senderRole === roomState.turn && roomState.chainJumpPiece) {
          roomState.chainJumpPiece = null;
          roomState.turn = roomState.turn === 'red' ? 'black' : 'red';
        }
      } else if (type === 'chat_message') {
        const text = String(body.text || '').trim().slice(0, 200);
        if (text) {
          roomState.chat.push({
            id: `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            sender: senderName,
            text,
            timestamp: Date.now(),
            isSystem: false,
          });
          if (roomState.chat.length > 60) {
            roomState.chat.shift();
          }
        }
      } else if (type === 'offer_draw') {
        if (senderRole === 'red' || senderRole === 'black') {
          roomState.drawOfferedBy = senderRole;
          roomState.chat.push({
            id: `chat-sys-${Date.now()}`,
            sender: 'Sistema',
            text: `${senderName} ha ofrecido tablas (empate).`,
            timestamp: Date.now(),
            isSystem: true,
          });
        }
      } else if (type === 'accept_draw') {
        if (roomState.drawOfferedBy && roomState.drawOfferedBy !== senderRole && (senderRole === 'red' || senderRole === 'black')) {
          roomState.status = 'ended';
          roomState.winner = 'draw';
          roomState.winnerName = 'Empate por mutuo acuerdo';
          roomState.winReason = 'Tablas acordadas entre jugadores';
          roomState.drawOfferedBy = null;
          roomState.h2h.draws += 1;

          const duration = roomState.gameStartTime ? Math.round((Date.now() - roomState.gameStartTime) / 1000) : 0;
          await recordMatchOutcome(
            roomState.roomId,
            roomState.roomName,
            roomState.players.red?.name || 'Rojo',
            roomState.players.black?.name || 'Negro',
            'Empate',
            'draw',
            'Tablas acordadas',
            roomState.moveHistory.length,
            roomState.redPiecesCount,
            roomState.blackPiecesCount,
            duration
          );
        }
      } else if (type === 'surrender') {
        if ((senderRole === 'red' || senderRole === 'black') && roomState.status === 'playing') {
          const opponentColor: PlayerColor = senderRole === 'red' ? 'black' : 'red';
          const opponentName = opponentColor === 'red' ? roomState.players.red?.name : roomState.players.black?.name;

          roomState.status = 'ended';
          roomState.winner = opponentColor;
          roomState.winnerName = opponentName || (opponentColor === 'red' ? 'Rojas' : 'Negras');
          roomState.winReason = `${senderName} se ha rendido`;

          if (opponentColor === 'red') roomState.h2h.redWins += 1;
          else roomState.h2h.blackWins += 1;

          const duration = roomState.gameStartTime ? Math.round((Date.now() - roomState.gameStartTime) / 1000) : 0;
          await recordMatchOutcome(
            roomState.roomId,
            roomState.roomName,
            roomState.players.red?.name || 'Rojo',
            roomState.players.black?.name || 'Negro',
            roomState.winnerName,
            opponentColor,
            `${senderName} se ha rendido`,
            roomState.moveHistory.length,
            roomState.redPiecesCount,
            roomState.blackPiecesCount,
            duration
          );
        }
      } else if (type === 'request_rematch') {
        if (senderRole === 'red' || senderRole === 'black') {
          roomState.rematchRequested[senderRole] = true;

          // If both requested rematch, reset board and start new match
          if (roomState.rematchRequested.red && roomState.rematchRequested.black) {
            const initialBoard = createInitialBoard();
            const counts = countPieces(initialBoard);

            roomState.board = initialBoard;
            roomState.status = 'playing';
            roomState.turn = 'red';
            roomState.chainJumpPiece = null;
            roomState.winner = null;
            roomState.winnerName = null;
            roomState.winReason = null;
            roomState.moveHistory = [];
            roomState.lastMove = null;
            roomState.rematchRequested = { red: false, black: false };
            roomState.drawOfferedBy = null;
            roomState.gameStartTime = Date.now();
            roomState.redPiecesCount = counts.red;
            roomState.blackPiecesCount = counts.black;

            roomState.chat.push({
              id: `chat-sys-${Date.now()}`,
              sender: 'Sistema',
              text: '¡Revancha aceptada! Nueva partida comenzada.',
              timestamp: Date.now(),
              isSystem: true,
            });
          } else {
            roomState.chat.push({
              id: `chat-sys-${Date.now()}`,
              sender: 'Sistema',
              text: `${senderName} ha solicitado una revancha.`,
              timestamp: Date.now(),
              isSystem: true,
            });
          }
        }
      } else if (type === 'leave_room') {
        if (senderRole === 'red' && roomState.players.red) {
          roomState.players.red.connected = false;
        } else if (senderRole === 'black' && roomState.players.black) {
          roomState.players.black.connected = false;
        } else {
          roomState.spectators = roomState.spectators.filter((s) => s.id !== userId);
        }
      }

      roomVersion += 1;

      // Save state to DB
      try {
        await db
          .update(gameRooms)
          .set({
            status: roomState.status,
            state: roomState,
            version: roomVersion,
            updatedAt: new Date(),
          })
          .where(eq(gameRooms.id, roomId));
      } catch (e) {
        console.warn("DB save action error:", e);
      }
      memoryRooms.set(roomId, { state: roomState, version: roomVersion, updatedAt: Date.now() });

      return Response.json({
        success: true,
        roomState,
        version: roomVersion,
      });
    } catch (err) {
      console.error("Room action error:", err);
      return Response.json({ error: "Error procesando acción" }, { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
};

export const config: Config = {
  path: "/api/*",
};
