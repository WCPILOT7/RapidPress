-- Migration: add usage/events/support tables (api_keys, usage_events, rag_queries, embedding_cache, user_profiles)
-- Date: 2025-09-15

-- Extensions (idempotent checks)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- vector already handled in previous migration if needed

-- user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  plan text DEFAULT 'free',
  quota_monthly_tokens_used integer DEFAULT 0 NOT NULL,
  quota_monthly_resets_at timestamptz,
  default_tone text,
  default_language text,
  allow_model_override boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  name text,
  revoked boolean DEFAULT false NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);

-- usage_events
CREATE TABLE IF NOT EXISTS usage_events (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  tokens_prompt integer,
  tokens_completion integer,
  cost_usd numeric(10,4),
  latency_ms integer,
  model text,
  meta jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_events_user_id_created_at_idx ON usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_event_type_idx ON usage_events(event_type);

-- rag_queries
CREATE TABLE IF NOT EXISTS rag_queries (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query text NOT NULL,
  strategy text NOT NULL,
  results_count integer DEFAULT 0 NOT NULL,
  used_in_generation boolean DEFAULT false NOT NULL,
  latency_ms integer,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS rag_queries_user_id_created_at_idx ON rag_queries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rag_queries_strategy_idx ON rag_queries(strategy);

-- embedding_cache
CREATE TABLE IF NOT EXISTS embedding_cache (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_hash text NOT NULL,
  model text NOT NULL,
  embedding text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS embedding_cache_user_input_hash_model_idx ON embedding_cache(user_id, input_hash, model);

-- Helpful indexes for existing tables (idempotent)
CREATE INDEX IF NOT EXISTS press_releases_user_created_at_idx ON press_releases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_documents_user_source_idx ON ai_documents(user_id, source);
CREATE INDEX IF NOT EXISTS ai_documents_user_created_at_idx ON ai_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS advertisements_user_press_release_idx ON advertisements(user_id, press_release_id);

-- NOTE: RLS policies to be added after migration to Supabase auth (documented separately)
