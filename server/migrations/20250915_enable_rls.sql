-- Enable Row Level Security on key tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_cache ENABLE ROW LEVEL SECURITY;

-- Helper function to extract authenticated user id from JWT claim (Supabase convention: auth.uid())
-- (In Supabase this is usually built-in via auth.uid())
-- Policies: allow owner CRUD
CREATE POLICY IF NOT EXISTS pr_user_is_owner ON press_releases
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS contacts_user_is_owner ON contacts
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS ads_user_is_owner ON advertisements
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS ai_docs_user_is_owner ON ai_documents
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS profiles_user_is_owner ON user_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS api_keys_user_is_owner ON api_keys
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS usage_events_user_is_owner ON usage_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS rag_queries_user_is_owner ON rag_queries
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS embedding_cache_user_is_owner ON embedding_cache
  FOR ALL USING (user_id = auth.uid());
