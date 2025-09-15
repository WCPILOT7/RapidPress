// embeddings импортирован опосредованно через embedTexts util (fallback если нет ключа)
import { simpleSplit } from './splitter';
import { storage } from '../../storage';
import { db } from '../../db';
// @ts-ignore drizzle-orm types resolution in this context
import { sql } from 'drizzle-orm';
declare const process: { env: Record<string, string | undefined> };
import type { InsertAIDocument } from '@shared/schema';
import { embedTexts } from './embeddings';

/**
 * Ingest raw document: split -> (future) embed -> store chunks as ai_documents rows.
 * Сейчас embedding НЕ вычисляется (отложено до pgvector миграции).
 */
export async function ingestRawDocument(userId: number, doc: { source: string; title?: string; content: string; parentId?: number; metadata?: Record<string, any> }) {
  // Split content into chunks (simple)
  const chunks = simpleSplit('doc', doc.content, 2000); // chunk size bigger for base storage
  const vectors = await embedTexts(chunks.map(c => c.content));
  const strategy = (process.env.RAG_VECTOR_STRATEGY || 'json').toLowerCase();
  if (strategy === 'pgvector') {
    // Вставляем через raw SQL чтобы заполнить embedding_vector
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const vec = vectors[i];
      const vectorLiteral = `[${vec.join(',')}]`;
      await db.execute(sql`
        INSERT INTO ai_documents (user_id, parent_id, source, title, content, metadata, embedding_vector)
        VALUES (
          ${userId},
          ${doc.parentId ?? null},
          ${doc.source},
          ${doc.title ? `${doc.title} (part ${c.index + 1})` : null},
          ${c.content},
          ${doc.metadata ? JSON.stringify(doc.metadata) : null},
          ${sql.raw(`'${vectorLiteral}'::vector`)}
        );
      `);
    }
    return { inserted: chunks.length } as any;
  } else {
    const rows: InsertAIDocument[] = chunks.map((c, i) => ({
      parentId: doc.parentId,
      source: doc.source,
      title: doc.title ? `${doc.title} (part ${c.index + 1})` : undefined,
      content: c.content,
      metadata: doc.metadata ? JSON.stringify(doc.metadata) : undefined,
      embedding: JSON.stringify(vectors[i]),
    }));
    return storage.createAIDocuments(userId, rows);
  }
}
