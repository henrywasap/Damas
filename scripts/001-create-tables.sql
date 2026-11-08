CREATE TABLE IF NOT EXISTS players (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  games_played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  win_rate double precision NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_active timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  id text PRIMARY KEY,
  room_id text NOT NULL,
  room_name text NOT NULL,
  red_player text NOT NULL,
  black_player text NOT NULL,
  winner text NOT NULL,
  winner_color text NOT NULL,
  win_reason text NOT NULL,
  total_moves integer NOT NULL DEFAULT 0,
  pieces_left_red integer NOT NULL DEFAULT 0,
  pieces_left_black integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_rooms (
  id text PRIMARY KEY,
  room_name text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
