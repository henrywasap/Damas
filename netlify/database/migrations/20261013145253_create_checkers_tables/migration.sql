CREATE TABLE "game_rooms" (
	"id" text PRIMARY KEY,
	"room_name" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY,
	"room_id" text NOT NULL,
	"room_name" text NOT NULL,
	"red_player" text NOT NULL,
	"black_player" text NOT NULL,
	"winner" text NOT NULL,
	"winner_color" text NOT NULL,
	"win_reason" text NOT NULL,
	"total_moves" integer DEFAULT 0 NOT NULL,
	"pieces_left_red" integer DEFAULT 0 NOT NULL,
	"pieces_left_black" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"games_played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"win_rate" double precision DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"last_active" timestamp with time zone DEFAULT now() NOT NULL
);
