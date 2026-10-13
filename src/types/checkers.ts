export type PlayerColor = 'red' | 'black';

export interface Piece {
  player: PlayerColor;
  isKing: boolean;
}

export type BoardCell = Piece | null;
export type BoardState = BoardCell[][]; // 8x8

export interface Position {
  row: number;
  col: number;
}

export interface MoveStep {
  from: Position;
  to: Position;
  captured?: Position;
  isKingPromotion?: boolean;
}

export interface PlayerInfo {
  id: string;
  name: string;
  color: PlayerColor;
  connected: boolean;
  score: number; // in current session/room
}

export interface SpectatorInfo {
  id: string;
  name: string;
}

export interface MoveRecord {
  id: string;
  moveNumber: number;
  player: PlayerColor;
  playerName: string;
  from: Position;
  to: Position;
  captured?: Position;
  isKingPromotion?: boolean;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomHeadToHead {
  redWins: number;
  blackWins: number;
  draws: number;
}

export interface RoomState {
  roomId: string;
  roomName: string;
  status: 'waiting' | 'playing' | 'ended';
  players: {
    red: PlayerInfo | null;
    black: PlayerInfo | null;
  };
  spectators: SpectatorInfo[];
  board: BoardState;
  turn: PlayerColor;
  chainJumpPiece: Position | null; // If multi-jump is mandatory and piece must keep jumping
  winner: PlayerColor | 'draw' | null;
  winnerName: string | null;
  winReason: string | null;
  h2h: RoomHeadToHead;
  moveHistory: MoveRecord[];
  chat: ChatMessage[];
  rematchRequested: {
    red: boolean;
    black: boolean;
  };
  drawOfferedBy: PlayerColor | null;
  lastMove: { from: Position; to: Position } | null;
  gameStartTime?: number;
  redPiecesCount: number;
  blackPiecesCount: number;
}

export interface PlayerStats {
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0-100%
  currentStreak: number;
  bestStreak: number;
  lastActive: number;
}

export interface MatchHistoryItem {
  id: string;
  roomId: string;
  roomName: string;
  redPlayer: string;
  blackPlayer: string;
  winner: string; // name or 'Empate'
  winnerColor: PlayerColor | 'draw';
  winReason: string;
  totalMoves: number;
  piecesLeftRed: number;
  piecesLeftBlack: number;
  date: number;
  durationSeconds: number;
}

export interface GlobalStatsPayload {
  leaderboard: PlayerStats[];
  recentMatches: MatchHistoryItem[];
  totalGamesEver: number;
}

export interface RoomSummary {
  roomId: string;
  roomName: string;
  status: 'waiting' | 'playing' | 'ended';
  playersCount: number;
  spectatorsCount: number;
  playerNames: string[];
}
