-- Refined RLS policies with operation-specific granularity
-- Assumes RLS already enabled on relevant tables (users, press_releases, contacts, advertisements, ai_documents, api_keys, usage_events, rag_queries, embedding_cache, user_profiles)
-- Uses supabase_user_id linkage when available, falls back to user id claim mapping.

-- Helper: ensure current_setting fallback (some connections might not have jwt.claims.sub)
-- NOTE: Supabase sets request.jwt.claim.sub; we use coalesce to allow future custom claim mapping.

-- USERS TABLE (read/update only own row once linked)
DROP POLICY IF EXISTS select_own_user ON users;
CREATE POLICY select_own_user ON users
  FOR SELECT USING (
    (supabase_user_id IS NOT NULL AND supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS update_own_user ON users;
CREATE POLICY update_own_user ON users
  FOR UPDATE USING (
    (supabase_user_id IS NOT NULL AND supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- PRESS RELEASES
DROP POLICY IF EXISTS select_own_press_releases ON press_releases;
CREATE POLICY select_own_press_releases ON press_releases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = press_releases.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_press_releases ON press_releases;
CREATE POLICY insert_own_press_releases ON press_releases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = press_releases.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS update_own_press_releases ON press_releases;
CREATE POLICY update_own_press_releases ON press_releases
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = press_releases.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS delete_own_press_releases ON press_releases;
CREATE POLICY delete_own_press_releases ON press_releases
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = press_releases.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- CONTACTS
DROP POLICY IF EXISTS select_own_contacts ON contacts;
CREATE POLICY select_own_contacts ON contacts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = contacts.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_contacts ON contacts;
CREATE POLICY insert_own_contacts ON contacts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = contacts.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS update_own_contacts ON contacts;
CREATE POLICY update_own_contacts ON contacts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = contacts.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS delete_own_contacts ON contacts;
CREATE POLICY delete_own_contacts ON contacts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = contacts.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- ADVERTISEMENTS
DROP POLICY IF EXISTS select_own_advertisements ON advertisements;
CREATE POLICY select_own_advertisements ON advertisements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = advertisements.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_advertisements ON advertisements;
CREATE POLICY insert_own_advertisements ON advertisements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = advertisements.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS update_own_advertisements ON advertisements;
CREATE POLICY update_own_advertisements ON advertisements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = advertisements.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS delete_own_advertisements ON advertisements;
CREATE POLICY delete_own_advertisements ON advertisements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = advertisements.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- AI DOCUMENTS
DROP POLICY IF EXISTS select_own_ai_documents ON ai_documents;
CREATE POLICY select_own_ai_documents ON ai_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = ai_documents.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_ai_documents ON ai_documents;
CREATE POLICY insert_own_ai_documents ON ai_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = ai_documents.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS update_own_ai_documents ON ai_documents;
CREATE POLICY update_own_ai_documents ON ai_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = ai_documents.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS delete_own_ai_documents ON ai_documents;
CREATE POLICY delete_own_ai_documents ON ai_documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = ai_documents.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- API KEYS (ownership)
DROP POLICY IF EXISTS select_own_api_keys ON api_keys;
CREATE POLICY select_own_api_keys ON api_keys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = api_keys.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_api_keys ON api_keys;
CREATE POLICY insert_own_api_keys ON api_keys
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = api_keys.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS update_own_api_keys ON api_keys;
CREATE POLICY update_own_api_keys ON api_keys
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = api_keys.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS delete_own_api_keys ON api_keys;
CREATE POLICY delete_own_api_keys ON api_keys
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = api_keys.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- USAGE EVENTS (read own, insert own)
DROP POLICY IF EXISTS select_own_usage_events ON usage_events;
CREATE POLICY select_own_usage_events ON usage_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = usage_events.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_usage_events ON usage_events;
CREATE POLICY insert_own_usage_events ON usage_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = usage_events.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- RAG QUERIES
DROP POLICY IF EXISTS select_own_rag_queries ON rag_queries;
CREATE POLICY select_own_rag_queries ON rag_queries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = rag_queries.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_rag_queries ON rag_queries;
CREATE POLICY insert_own_rag_queries ON rag_queries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = rag_queries.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- EMBEDDING CACHE (select/insert only own; updates rare)
DROP POLICY IF EXISTS select_own_embedding_cache ON embedding_cache;
CREATE POLICY select_own_embedding_cache ON embedding_cache
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = embedding_cache.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_embedding_cache ON embedding_cache;
CREATE POLICY insert_own_embedding_cache ON embedding_cache
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = embedding_cache.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- USER PROFILES
DROP POLICY IF EXISTS select_own_user_profiles ON user_profiles;
CREATE POLICY select_own_user_profiles ON user_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = user_profiles.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS insert_own_user_profiles ON user_profiles;
CREATE POLICY insert_own_user_profiles ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = user_profiles.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

DROP POLICY IF EXISTS update_own_user_profiles ON user_profiles;
CREATE POLICY update_own_user_profiles ON user_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = user_profiles.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))
  );

-- No DELETE policy for user_profiles now (prevent accidental deletion)
