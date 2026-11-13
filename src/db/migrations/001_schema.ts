import type { SQLiteDatabase } from 'expo-sqlite';

// Tarihler yerel 'YYYY-MM-DD', zaman damgaları ISO metni. Ağırlık kg, su ml, adım adet olarak saklanır.
export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
CREATE TABLE regions (
  id TEXT PRIMARY KEY NOT NULL,
  name_tr TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('front','back')),
  sort INTEGER NOT NULL
);
CREATE TABLE muscles (
  id TEXT PRIMARY KEY NOT NULL,
  name_tr TEXT NOT NULL,
  name_latin TEXT NOT NULL,
  region_id TEXT NOT NULL REFERENCES regions(id),
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name_tr TEXT NOT NULL,
  name_en TEXT,
  equipment TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'reps' CHECK (mode IN ('reps','time')),
  is_heavy INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  instructions_tr TEXT,
  mistakes_tr TEXT,
  tips_tr TEXT,
  instructions_en TEXT,
  image_key TEXT,
  photo_uri TEXT,
  source TEXT NOT NULL CHECK (source IN ('seed','fedb','user'))
);
CREATE TABLE exercise_muscles (
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id TEXT NOT NULL REFERENCES muscles(id),
  role TEXT NOT NULL CHECK (role IN ('primary','secondary')),
  PRIMARY KEY (exercise_id, muscle_id)
);
CREATE INDEX idx_exercise_muscles_muscle ON exercise_muscles(muscle_id);

CREATE TABLE workout_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  notes TEXT
);
CREATE TABLE template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  rep_min INTEGER,
  rep_max INTEGER,
  duration_sec INTEGER,
  rest_sec INTEGER,
  per_side INTEGER NOT NULL DEFAULT 0,
  superset_group INTEGER
);
CREATE INDEX idx_template_exercises_template ON template_exercises(template_id, position);
CREATE TABLE day_schedule (
  weekday INTEGER PRIMARY KEY NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  kind TEXT NOT NULL CHECK (kind IN ('workout','rest','walk')),
  template_id INTEGER REFERENCES workout_templates(id) ON DELETE SET NULL
);

CREATE TABLE workout_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER REFERENCES workout_templates(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','done','abandoned'))
);
CREATE INDEX idx_sessions_date ON workout_sessions(date);
CREATE TABLE session_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  set_index INTEGER NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  duration_sec INTEGER,
  completed_at TEXT
);
CREATE INDEX idx_sets_exercise ON session_sets(exercise_id, session_id);

CREATE TABLE habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  weekdays INTEGER NOT NULL DEFAULT 127,
  position INTEGER NOT NULL,
  archived_at TEXT
);
CREATE TABLE habit_logs (
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE daily_trackers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL,
  UNIQUE (type, date)
);
CREATE TABLE tracker_settings (
  type TEXT PRIMARY KEY NOT NULL,
  goal REAL NOT NULL,
  display_unit TEXT NOT NULL,
  unit_size REAL
);
CREATE TABLE sleep_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  bedtime TEXT NOT NULL,
  wake_time TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  quality INTEGER CHECK (quality BETWEEN 1 AND 5),
  note TEXT
);
CREATE TABLE body_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  date TEXT NOT NULL
);
CREATE INDEX idx_measurements ON body_measurements(type, date);

CREATE TABLE streak_days (
  date TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed','frozen','missed'))
);
CREATE TABLE streak_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current INTEGER NOT NULL DEFAULT 0,
  longest INTEGER NOT NULL DEFAULT 0,
  freezes_available INTEGER NOT NULL DEFAULT 0,
  last_evaluated TEXT
);
CREATE TABLE badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone INTEGER NOT NULL UNIQUE,
  earned_at TEXT NOT NULL
);
CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`);
}
