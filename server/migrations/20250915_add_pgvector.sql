-- pgvector migration (idempotent where possible)
BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- Add new vector column if not exists (manual check pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='ai_documents' AND column_name='embedding_vector'
  ) THEN
    ALTER TABLE ai_documents ADD COLUMN embedding_vector vector(1536);
  END IF;
END$$;

-- Create index if not exists (cannot use IF NOT EXISTS directly for ivfflat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename='ai_documents' AND indexname='ai_documents_embedding_vector_ivfflat_idx'
  ) THEN
    CREATE INDEX ai_documents_embedding_vector_ivfflat_idx ON ai_documents USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
  END IF;
END$$;

COMMIT;
