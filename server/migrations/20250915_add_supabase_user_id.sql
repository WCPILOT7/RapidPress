-- Add supabase_user_id column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id text;
CREATE INDEX IF NOT EXISTS idx_users_supabase_user_id ON users(supabase_user_id);
