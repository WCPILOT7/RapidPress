/**
 * In-memory documents store (MVP).
 * Later: persist in DB with embeddings table (pgvector in Supabase) and metadata filters.
 */

export interface RawDocument {
  id: string;
  source: string; // e.g. 'company_profile' | 'past_release' | 'uploaded_file'
  title?: string;
  content: string;
  createdAt: number;
  metadata?: Record<string, any>;
}

const docs: RawDocument[] = [];

export function addDocument(doc: Omit<RawDocument, 'createdAt'>) {
  docs.push({ ...doc, createdAt: Date.now() });
}

export function listDocuments(filter?: { source?: string }) {
  return docs.filter(d => !filter?.source || d.source === filter.source);
}

export function clearDocuments() {
  docs.splice(0, docs.length);
}
