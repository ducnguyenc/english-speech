-- Run this in Supabase SQL Editor (https://app.supabase.com → SQL Editor)

CREATE TABLE IF NOT EXISTS words (
  id          TEXT        PRIMARY KEY,
  english     TEXT        NOT NULL DEFAULT '',
  ipa         TEXT        NOT NULL DEFAULT '',
  vietnamese  TEXT        NOT NULL DEFAULT '',
  lang        TEXT        NOT NULL DEFAULT 'en',
  image       TEXT        NOT NULL DEFAULT '',
  day         INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable Row Level Security (single-user app, access via service key)
ALTER TABLE words DISABLE ROW LEVEL SECURITY;
