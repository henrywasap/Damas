import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
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
} from './src/types/checkers.js';
import {
  createInitialBoard,
  getAllLegalMovesForPlayer,
  applyMove,
  checkGameStatus,
  countPieces,
} from './src/utils/checkersLogic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const STATS_FILE = path.resolve(DATA_DIR, 'stats.json');

// Interface for persisted stats
interface PersistedStats {
  players: Record<string, PlayerStats>;
  recentMatches: MatchHistoryItem[];
  totalGamesEver: number;
}

// Initial mock data if empty to showcase real leaderboard and stats right away
function loadStats(): PersistedStats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading stats file:', err);
  }

  // Initial starter data so stats tab is rich on first load
  const starterStats: PersistedStats = {
    players: {
      "sofia_master": {
        name: "Sofia Master",
        gamesPlayed: 14,
        wins: 11,
        losses: 2,
        draws: 1,
        winRate: 78.5,
        currentStreak: 4,
        bestStreak: 5,
        lastActive: Date.now() - 1000 * 60 * 30,
      },
      "alex_damas": {
        name: "Alex Damas",
        gamesPlayed: 10,
        wins: 7,
        losses: 3,
        draws: 0,
        winRate: 70.0,
        currentStreak: 2,
        bestStreak: 3,
        lastActive: Date.now() - 1000 * 60 * 55,
      },
      "carlos_v": {
        name: "Carlos V",
        gamesPlayed: 8,
        wins: 4,
        losses: 3,
        draws: 1,
        winRate: 50.0,
        currentStreak: 1,
        bestStreak: 2,
        lastActive: Date.now() - 1000 * 60 * 120,
      },
      "lucia_pro": {
        name: "Lucia Pro",
        gamesPlayed: 6,
        wins: 3,
        losses: 3,
        draws: 0,
        winRate: 50.0,
        currentStreak: 0,
        bestStreak: 2,
        lastActive: Date.now() - 1000 * 60 * 180,
      }
    },
    recentMatches: [
      {
        id: 'hist-1',
        roomId: 'SALA-DIAMANTE',
        roomName: 'Sala Diamante',
        redPlayer: 'Sofia Master',
        blackPlayer: 'Carlos V',
        winner: 'Sofia Master',
        winnerColor: 'red',
        winReason: 'Negras eliminadas',
        totalMoves: 34,
        piecesLeftRed: 5,
        piecesLeftBlack: 0,
        date: Date.now() - 1000 * 60 * 45,
        durationSeconds: 320,
      },
      {
        id: 'hist-2',
        roomId: 'SALA-ORO',
        roomName: 'Sala Oro',
        redPlayer: 'Alex Damas',
        blackPlayer: 'Lucia Pro',
        winner: 'Alex Damas',
        winnerColor: 'red',
        winReason: 'Sin movimientos legales',
        totalMoves: 28,
        piecesLeftRed: 4,
        piecesLeftBlack: 1,
        date: Date.now() - 1000 * 60 * 120,
        durationSeconds: 280,
      }
    ],
    totalGamesEver: 22,
  };

  saveStats(starterStats);
  return starterStats;
}

function saveStats(stats: PersistedStats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving stats file:', err);
  }
}

const statsState: PersistedStats = loadStats();

function updatePlayerStats(
  redName: string,
  blackName: string,
  winner: PlayerColor | 'draw',
  reason: string,
  movesCount: number,
  redRemaining: number,
  blackRemaining: number,
  roomId: string,
  roomName: string,
  durationSeconds: number
) {
  const normRed = redName.trim();
  const normBlack = blackName.trim();
  const keyRed = normRed.toLowerCase();
  const keyBlack = normBlack.toLowerCase();

  const getOrCreate = (key: string, name: string): PlayerStats => {
    if (!statsState.players[key]) {
      statsState.players[key] = {
        name,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastActive: Date.now(),
      };
    }
    statsState.players[key].name = name; // keep latest casing
    return statsState.players[key];
  };

  const redStats = getOrCreate(keyRed, normRed);
  const blackStats = getOrCreate(keyBlack, normBlack);

  redStats.gamesPlayed += 1;
  blackStats.gamesPlayed += 1;
  redStats.lastActive = Date.now();
  blackStats.lastActive = Date.now();

  let winnerName = 'Empate';
  if (winner === 'red') {
    winnerName = normRed;
    redStats.wins += 1;
    blackStats.losses += 1;
    redStats.currentStreak += 1;
    if (redStats.currentStreak > redStats.bestStreak) {
      redStats.bestStreak = redStats.currentStreak;
    }
    blackStats.currentStreak = 0;
  } else if (winner === 'black') {
    winnerName = normBlack;
    blackStats.wins += 1;
    redStats.losses += 1;
    blackStats.currentStreak += 1;
    if (blackStats.currentStreak > blackStats.bestStreak) {
      blackStats.bestStreak = blackStats.currentStreak;
    }
    redStats.currentStreak = 0;
  } else {
    redStats.draws += 1;
    blackStats.draws += 1;
  }

  redStats.winRate = Math.round((redStats.wins / redStats.gamesPlayed) * 1000) / 10;
  blackStats.winRate = Math.round((blackStats.wins / blackStats.gamesPlayed) * 1000) / 10;

  statsState.totalGamesEver += 1;

  const matchRecord: MatchHistoryItem = {
    id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    roomId,
    roomName,
    redPlayer: normRed,
    blackPlayer: normBlack,
    winner: winnerName,
    winnerColor: winner,
    winReason: reason,
    totalMoves: movesCount,
    piecesLeftRed: redRemaining,
    piecesLeftBlack: blackRemaining,
    date: Date.now(),
    durationSeconds: Math.max(1, durationSeconds),
  };

  statsState.recentMatches.unshift(matchRecord);
  if (statsState.recentMatches.length > 50) {
    statsState.recentMatches.pop();
  }

  saveStats(statsState);
}

function getGlobalStatsPayload(): GlobalStatsPayload {
  const leaderboard = Object.values(statsState.players)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.gamesPlayed - a.gamesPlayed;
    })
    .slice(0, 30);

  return {
    leaderboard,
    recentMatches: statsState.recentMatches,
    totalGamesEver: statsState.totalGamesEver,
  };
}

// In-memory active rooms
interface ServerRoom {
  state: RoomState;
  clients: Map<WebSocket, { userId: string; name: string; role: 'red' | 'black' | 'spectator' }>;
}

const rooms = new Map<string, ServerRoom>();

function createNewRoom(roomId: string, roomName: string): ServerRoom {
  const board = createInitialBoard();
  const counts = countPieces(board);

  const state: RoomState = {
    roomId,
    roomName,
    status: 'waiting',
    players: {
      red: null,
      black: null,
    },
    spectators: [],
    board,
    turn: 'red',
    chainJumpPiece: null,
    winner: null,
    winnerName: null,
    winReason: null,
    h2h: {
      redWins: 0,
      blackWins: 0,
      draws: 0,
    },
    moveHistory: [],
    chat: [
      {
        id: `sys-${Date.now()}`,
        sender: 'Sistema',
        text: `¡Sala "${roomName}" creada! Esperando a que ambos jugadores se unan.`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ],
    rematchRequested: {
      red: false,
      black: false,
    },
    drawOfferedBy: null,
    lastMove: null,
    gameStartTime: undefined,
    redPiecesCount: counts.red,
    blackPiecesCount: counts.black,
  };

  return {
    state,
    clients: new Map(),
  };
}

function getRoomsList(): RoomSummary[] {
  const list: RoomSummary[] = [];
  for (const room of rooms.values()) {
    const playerNames: string[] = [];
    if (room.state.players.red) playerNames.push(room.state.players.red.name);
    if (room.state.players.black) playerNames.push(room.state.players.black.name);

    list.push({
      roomId: room.state.roomId,
      roomName: room.state.roomName,
      status: room.state.status,
      playersCount: playerNames.length,
      spectatorsCount: room.state.spectators.length,
      playerNames,
    });
  }
  return list;
}

function broadcastToRoom(room: ServerRoom, payload: any) {
  const json = JSON.stringify(payload);
  for (const client of room.clients.keys()) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

function broadcastToAll(wss: WebSocketServer, payload: any) {
  const json = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // API endpoints
  app.get('/api/stats', (_req, res) => {
    res.json(getGlobalStatsPayload());
  });

  app.get('/api/rooms', (_req, res) => {
    res.json(getRoomsList());
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // WebSocket handling
  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string = `user-${Math.random().toString(36).substring(2, 9)}`;
    let currentUserName: string = 'Jugador';

    // Send initial rooms list and stats to newly connected client
    ws.send(JSON.stringify({ type: 'stats_update', payload: getGlobalStatsPayload() }));
    ws.send(JSON.stringify({ type: 'rooms_update', payload: getRoomsList() }));

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        const { type } = data;

        if (type === 'join_room') {
          const { roomId, roomName, playerName } = data;
          const cleanRoomId = (roomId || 'default').trim().toUpperCase();
          const cleanName = (playerName || 'Jugador').trim() || 'Jugador';
          const cleanRoomName = (roomName || cleanRoomId).trim();

          // Leave current room if already in one
          if (currentRoomId && rooms.has(currentRoomId)) {
            const oldRoom = rooms.get(currentRoomId)!;
            handleUserLeave(oldRoom, ws);
          }

          currentRoomId = cleanRoomId;
          currentUserName = cleanName;

          let room = rooms.get(cleanRoomId);
          if (!room) {
            room = createNewRoom(cleanRoomId, cleanRoomName);
            rooms.set(cleanRoomId, room);
          }

          // Assign slot: red first, then black, then spectator
          let role: 'red' | 'black' | 'spectator' = 'spectator';

          if (!room.state.players.red || !room.state.players.red.connected) {
            role = 'red';
            room.state.players.red = {
              id: currentUserId,
              name: cleanName,
              color: 'red',
              connected: true,
              score: room.state.players.red?.score || 0,
            };
          } else if (!room.state.players.black || !room.state.players.black.connected) {
            role = 'black';
            room.state.players.black = {
              id: currentUserId,
              name: cleanName,
              color: 'black',
              connected: true,
              score: room.state.players.black?.score || 0,
            };
          } else {
            role = 'spectator';
            const existingIndex = room.state.spectators.findIndex((s) => s.id === currentUserId);
            if (existingIndex >= 0) {
              room.state.spectators[existingIndex].name = cleanName;
            } else {
              room.state.spectators.push({ id: currentUserId, name: cleanName });
            }
          }

          // Check if game can start
          if (
            room.state.players.red?.connected &&
            room.state.players.black?.connected &&
            room.state.status === 'waiting'
          ) {
            room.state.status = 'playing';
            room.state.gameStartTime = Date.now();
            room.state.chat.push({
              id: `sys-${Date.now()}`,
              sender: 'Sistema',
              text: `¡La partida ha comenzado! ${room.state.players.red.name} (Rojas) vs ${room.state.players.black.name} (Negras). ¡Buena suerte!`,
              timestamp: Date.now(),
              isSystem: true,
            });
          }

          room.clients.set(ws, { userId: currentUserId, name: cleanName, role });

          // Send your role and full room state
          ws.send(JSON.stringify({ type: 'joined_role', payload: { role, userId: currentUserId } }));
          broadcastToRoom(room, { type: 'room_state', payload: room.state });
          broadcastToAll(wss, { type: 'rooms_update', payload: getRoomsList() });
        } else if (type === 'move') {
          if (!currentRoomId || !rooms.has(currentRoomId)) return;
          const room = rooms.get(currentRoomId)!;
          const clientInfo = room.clients.get(ws);

          if (!clientInfo || room.state.status !== 'playing') return;

          // Must be client's turn
          if (clientInfo.role !== room.state.turn) {
            ws.send(JSON.stringify({ type: 'error', message: 'No es tu turno' }));
            return;
          }

          const { from, to } = data;
          const legalMoves = getAllLegalMovesForPlayer(
            room.state.board,
            room.state.turn,
            room.state.chainJumpPiece
          );

          const matchedMove = legalMoves.find(
            (m) =>
              m.from.row === from.row &&
              m.from.col === from.col &&
              m.to.row === to.row &&
              m.to.col === to.col
          );

          if (!matchedMove) {
            ws.send(JSON.stringify({ type: 'error', message: 'Movimiento no válido' }));
            return;
          }

          // Apply move
          const { newBoard, becameKing, canChainJump, nextChainPiece } = applyMove(
            room.state.board,
            matchedMove
          );

          room.state.board = newBoard;
          room.state.lastMove = { from, to };

          const counts = countPieces(newBoard);
          room.state.redPiecesCount = counts.red;
          room.state.blackPiecesCount = counts.black;

          const playerName =
            room.state.turn === 'red'
              ? room.state.players.red?.name || 'Rojo'
              : room.state.players.black?.name || 'Negro';

          // Record move
          room.state.moveHistory.push({
            id: `move-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            moveNumber: room.state.moveHistory.length + 1,
            player: room.state.turn,
            playerName,
            from,
            to,
            captured: matchedMove.captured,
            isKingPromotion: becameKing,
            timestamp: Date.now(),
          });

          // Check FIRST if game is over (e.g. only 1 piece remains, 0 pieces, or blockage)
          const nextTurn: PlayerColor = room.state.turn === 'red' ? 'black' : 'red';
          const status = checkGameStatus(room.state.board, nextTurn);

          if (status.isOver) {
            room.state.chainJumpPiece = null;
            handleGameEnd(room, status.winner, status.reason || 'Fin de juego');
          } else if (canChainJump && nextChainPiece) {
            room.state.chainJumpPiece = nextChainPiece;
            // Turn stays with same player!
          } else {
            room.state.chainJumpPiece = null;
            room.state.turn = nextTurn;
          }

          broadcastToRoom(room, { type: 'room_state', payload: room.state });
        } else if (type === 'end_chain_turn') {
          if (!currentRoomId || !rooms.has(currentRoomId)) return;
          const room = rooms.get(currentRoomId)!;
          const clientInfo = room.clients.get(ws);
          if (!clientInfo || room.state.status !== 'playing') return;
          if (clientInfo.role !== room.state.turn) return;

          // If in chain jump, user can voluntarily conclude their turn
          if (room.state.chainJumpPiece) {
            room.state.chainJumpPiece = null;
            const nextTurn: PlayerColor = room.state.turn === 'red' ? 'black' : 'red';
            room.state.turn = nextTurn;
            const status = checkGameStatus(room.state.board, nextTurn);
            if (status.isOver) {
              handleGameEnd(room, status.winner, status.reason || 'Fin de juego');
            }
            broadcastToRoom(room, { type: 'room_state', payload: room.state });
          }
        } else if (type === 'chat_message') {
          if (!currentRoomId || !rooms.has(currentRoomId)) return;
          const room = rooms.get(currentRoomId)!;
          const clientInfo = room.clients.get(ws);
          const text = (data.text || '').trim();
          if (!text) return;

          const chatMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            sender: clientInfo?.name || currentUserName,
            text,
            timestamp: Date.now(),
            isSystem: false,
          };

          room.state.chat.push(chatMsg);
          if (room.state.chat.length > 50) room.state.chat.shift();

          broadcastToRoom(room, { type: 'chat_message', payload: chatMsg });
        } else if (type === 'request_rematch') {
          if (!currentRoomId || !rooms.has(currentRoomId)) return;
          const room = rooms.get(currentRoomId)!;
          const clientInfo = room.clients.get(ws);
          if (!clientInfo || (clientInfo.role !== 'red' && clientInfo.role !== 'black')) return;

          if (clientInfo.role === 'red') room.state.rematchRequested.red = true;
          if (clientInfo.role === 'black') room.state.rematchRequested.black = true;

          // If both requested rematch, reset board for a new game!
          if (room.state.rematchRequested.red && room.state.rematchRequested.black) {
            resetRoomForRematch(room);
          } else {
            const requesterName =
              clientInfo.role === 'red'
                ? room.state.players.red?.name
                : room.state.players.black?.name;

            room.state.chat.push({
              id: `sys-${Date.now()}`,
              sender: 'Sistema',
              text: `${requesterName} solicitó revancha. Acepta pulsando "Revancha".`,
              timestamp: Date.now(),
              isSystem: true,
            });
          }

          broadcastToRoom(room, { type: 'room_state', payload: room.state });
        } else if (type === 'offer_draw') {
          if (!currentRoomId || !rooms.has(currentRoomId)) return;
          const room = rooms.get(currentRoomId)!;
          const clientInfo = room.clients.get(ws);
          if (!clientInfo || (clientInfo.role !== 'red' && clientInfo.role !== 'black')) return;
          if (room.state.status !== 'playing') return;

          room.state.drawOfferedBy = clientInfo.role;
          const requesterName =
            clientInfo.role === 'red'
              ? room.state.players.red?.name
              : room.state.players.black?.name;

          room.state.chat.push({
            id: `sys-${Date.now()}`,
            sender: 'Sistema',
            text: `${requesterName} ofrece tablas (empate). ¿Aceptas?`,
            timestamp: Date.now(),
            isSystem: true,
          });

          broadcastToRoom(room, { type: 'room_state', payload: room.state });
        } else if (type === 'accept_draw') {
          if (!currentRoomId || !rooms.has(currentRoomId)) return;
          const room = rooms.get(currentRoomId)!;
          const clientInfo = room.clients.get(ws);
          if (!clientInfo || (clientInfo.role !== 'red' && clientInfo.role !== 'black')) return;
          if (room.state.status !== 'playing') return;

          if (room.state.drawOfferedBy && room.state.drawOfferedBy !== clientInfo.role) {
            handleGameEnd(room, 'draw', 'Tablas acordadas mutuamente');
            broadcastToRoom(room, { type: 'room_state', payload: room.state });
          }
        } else if (type === 'surrender') {
          if (!currentRoomId || !rooms.has(currentRoomId)) return;
          const room = rooms.get(currentRoomId)!;
          const clientInfo = room.clients.get(ws);
          if (!clientInfo || (clientInfo.role !== 'red' && clientInfo.role !== 'black')) return;
          if (room.state.status !== 'playing') return;

          const winner: PlayerColor = clientInfo.role === 'red' ? 'black' : 'red';
          const surrenderingName =
            clientInfo.role === 'red'
              ? room.state.players.red?.name
              : room.state.players.black?.name;

          handleGameEnd(room, winner, `${surrenderingName} se ha rendido`);
          broadcastToRoom(room, { type: 'room_state', payload: room.state });
        } else if (type === 'leave_room') {
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId)!;
            handleUserLeave(room, ws);
            currentRoomId = null;
          }
        } else if (type === 'get_stats') {
          ws.send(JSON.stringify({ type: 'stats_update', payload: getGlobalStatsPayload() }));
        } else if (type === 'get_rooms') {
          ws.send(JSON.stringify({ type: 'rooms_update', payload: getRoomsList() }));
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId)!;
        handleUserLeave(room, ws);
      }
    });

    function handleUserLeave(room: ServerRoom, clientSocket: WebSocket) {
      const clientInfo = room.clients.get(clientSocket);
      if (!clientInfo) return;

      room.clients.delete(clientSocket);

      if (clientInfo.role === 'red' && room.state.players.red) {
        room.state.players.red.connected = false;
        // If in middle of a game, grant win to black
        if (room.state.status === 'playing' && room.state.players.black?.connected) {
          handleGameEnd(
            room,
            'black',
            `${room.state.players.red.name} abandonó la partida`
          );
        }
      } else if (clientInfo.role === 'black' && room.state.players.black) {
        room.state.players.black.connected = false;
        // If in middle of a game, grant win to red
        if (room.state.status === 'playing' && room.state.players.red?.connected) {
          handleGameEnd(
            room,
            'red',
            `${room.state.players.black.name} abandonó la partida`
          );
        }
      } else if (clientInfo.role === 'spectator') {
        room.state.spectators = room.state.spectators.filter(
          (s) => s.id !== clientInfo.userId
        );
      }

      room.state.chat.push({
        id: `sys-${Date.now()}`,
        sender: 'Sistema',
        text: `${clientInfo.name} ha salido de la sala.`,
        timestamp: Date.now(),
        isSystem: true,
      });

      // If room is empty, remove it after a short delay
      if (room.clients.size === 0) {
        setTimeout(() => {
          if (room.clients.size === 0) {
            rooms.delete(room.state.roomId);
            broadcastToAll(wss, { type: 'rooms_update', payload: getRoomsList() });
          }
        }, 60000);
      }

      broadcastToRoom(room, { type: 'room_state', payload: room.state });
      broadcastToAll(wss, { type: 'rooms_update', payload: getRoomsList() });
    }

    function handleGameEnd(
      room: ServerRoom,
      winner: PlayerColor | 'draw' | null,
      reason: string
    ) {
      room.state.status = 'ended';
      room.state.winner = winner;
      room.state.winReason = reason;
      room.state.chainJumpPiece = null;
      room.state.drawOfferedBy = null;
      room.state.rematchRequested = { red: false, black: false };

      const redName = room.state.players.red?.name || 'Rojo';
      const blackName = room.state.players.black?.name || 'Negro';

      if (winner === 'red') {
        room.state.winnerName = redName;
        room.state.h2h.redWins += 1;
        if (room.state.players.red) room.state.players.red.score += 1;
      } else if (winner === 'black') {
        room.state.winnerName = blackName;
        room.state.h2h.blackWins += 1;
        if (room.state.players.black) room.state.players.black.score += 1;
      } else {
        room.state.winnerName = 'Empate';
        room.state.h2h.draws += 1;
      }

      const duration = room.state.gameStartTime
        ? Math.round((Date.now() - room.state.gameStartTime) / 1000)
        : 60;

      // Update global leaderboard and match history
      if (room.state.players.red && room.state.players.black) {
        updatePlayerStats(
          redName,
          blackName,
          winner || 'draw',
          reason,
          room.state.moveHistory.length,
          room.state.redPiecesCount,
          room.state.blackPiecesCount,
          room.state.roomId,
          room.state.roomName,
          duration
        );

        // Broadcast stats update to EVERYONE in real-time!
        const globalStats = getGlobalStatsPayload();
        broadcastToAll(wss, { type: 'stats_update', payload: globalStats });
      }

      room.state.chat.push({
        id: `sys-${Date.now()}`,
        sender: 'Sistema',
        text: `🏆 ¡Partida finalizada! Ganador: ${room.state.winnerName}. Motivo: ${reason}.`,
        timestamp: Date.now(),
        isSystem: true,
      });

      broadcastToAll(wss, { type: 'rooms_update', payload: getRoomsList() });
    }

    function resetRoomForRematch(room: ServerRoom) {
      const board = createInitialBoard();
      const counts = countPieces(board);

      room.state.status = 'playing';
      room.state.board = board;
      room.state.turn = 'red';
      room.state.chainJumpPiece = null;
      room.state.winner = null;
      room.state.winnerName = null;
      room.state.winReason = null;
      room.state.rematchRequested = { red: false, black: false };
      room.state.drawOfferedBy = null;
      room.state.lastMove = null;
      room.state.moveHistory = [];
      room.state.gameStartTime = Date.now();
      room.state.redPiecesCount = counts.red;
      room.state.blackPiecesCount = counts.black;

      room.state.chat.push({
        id: `sys-${Date.now()}`,
        sender: 'Sistema',
        text: `¡Revancha iniciada! El tablero ha sido reiniciado.`,
        timestamp: Date.now(),
        isSystem: true,
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3500;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Damas Online server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
