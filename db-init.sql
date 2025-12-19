-- ScaleAI Systems - PostgreSQL Database Initialization
-- Run this once to set up your database tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Audits table
CREATE TABLE IF NOT EXISTS ai_audits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_description TEXT NOT NULL,
  current_revenue TEXT,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_audits_user_id ON ai_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audits_created_at ON ai_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Optional: Future extensions

-- User preferences table (for settings page)
-- CREATE TABLE IF NOT EXISTS user_preferences (
--   user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
--   email_notifications BOOLEAN DEFAULT TRUE,
--   theme TEXT DEFAULT 'light',
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Audit shares table (for shareable audit links)
-- CREATE TABLE IF NOT EXISTS audit_shares (
--   id SERIAL PRIMARY KEY,
--   audit_id INTEGER NOT NULL REFERENCES ai_audits(id) ON DELETE CASCADE,
--   share_token TEXT UNIQUE NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   expires_at TIMESTAMP,
--   view_count INTEGER DEFAULT 0
-- );

-- Sessions table (for connect-pg-simple session store)
-- CREATE TABLE IF NOT EXISTS session (
--   sid VARCHAR NOT NULL PRIMARY KEY,
--   sess JSON NOT NULL,
--   expire TIMESTAMP NOT NULL
-- );
-- CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
