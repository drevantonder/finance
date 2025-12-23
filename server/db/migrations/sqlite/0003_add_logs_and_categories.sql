-- Add schema_version and category to expenses
ALTER TABLE expenses ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1;

-- Create categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create logs table
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  source TEXT NOT NULL,
  ip TEXT,
  created_at INTEGER NOT NULL
);
