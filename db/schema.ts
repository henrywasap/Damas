import { pgTable, serial, text, timestamp, integer, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  winRate: doublePrecision("win_rate").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lastActive: timestamp("last_active", { withTimezone: true }).defaultNow().notNull(),
});

export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  roomName: text("room_name").notNull(),
  redPlayer: text("red_player").notNull(),
  blackPlayer: text("black_player").notNull(),
  winner: text("winner").notNull(),
  winnerColor: text("winner_color").notNull(),
  winReason: text("win_reason").notNull(),
  totalMoves: integer("total_moves").notNull().default(0),
  piecesLeftRed: integer("pieces_left_red").notNull().default(0),
  piecesLeftBlack: integer("pieces_left_black").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameRooms = pgTable("game_rooms", {
  id: text("id").primaryKey(), // roomId
  roomName: text("room_name").notNull(),
  status: text("status").notNull().default("waiting"), // waiting | playing | ended
  state: jsonb("state").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
