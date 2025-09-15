#!/usr/bin/env tsx
/**
 * Backfill script: переносит JSON embedding -> embedding_vector (pgvector).
 * Предполагает, что:
 *  - Миграция с добавлением embedding_vector уже применена.
 *  - ENV: DATABASE_URL установлен.
 *  - RAG_VECTOR_STRATEGY может оставаться любым (скрипт работает напрямую через SQL).
 */
import { pool } from '../db';
// @ts-ignore drizzle types resolution in this context
import { sql } from 'drizzle-orm';
declare const process: { exit(code?: number): never; env: Record<string,string|undefined> };
import { db } from '../db';

async function main() {
  console.log('[backfill] start');
  // Найдём строки где vector пуст, но есть JSON embedding
  const toConvert: any[] = await db.execute(sql`
    SELECT id, embedding FROM ai_documents
    WHERE embedding IS NOT NULL AND embedding_vector IS NULL
    LIMIT 5000; -- батч
  `);

  if (!toConvert.length) {
    console.log('[backfill] nothing to convert');
    process.exit(0);
  }

  let converted = 0;
  for (const row of toConvert) {
    try {
      const arr = JSON.parse(row.embedding) as number[];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const vectorLiteral = `[${arr.join(',')}]`;
      await db.execute(sql`
        UPDATE ai_documents
        SET embedding_vector = ${sql.raw(`'${vectorLiteral}'::vector`)}
        WHERE id = ${row.id};
      `);
      converted++;
    } catch (e) {
      console.warn('[backfill] skip id', row.id, 'error parsing embedding');
    }
  }
  console.log(`[backfill] converted ${converted} rows`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
