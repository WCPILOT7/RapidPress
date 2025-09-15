import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { embedTexts } from './embeddings';

/**
 * Semantic search через pgvector.
 * Требует: колонка embedding_vector (vector) в ai_documents.
 * Примечание: используем raw SQL, потому что drizzle пока не знает тип vector.
 */
export async function semanticSearchPg(userId: number, query: string, opts: { limit?: number; metric?: 'cosine' | 'l2' } = {}) {
  const { limit = 8, metric = 'cosine' } = opts;
  const queryVec = (await embedTexts([query]))[0];
  const vectorLiteral = `[${queryVec.join(',')}]`;

  // Выбор оператора под метрику
  const op = metric === 'l2' ? '<->' : '<=>' ; // <=> для cosine (в последних версиях pgvector);

  const rows = await db.execute(sql`
    select id, title, content,
           embedding_vector ${sql.raw(op)} ${sql.raw(`'${vectorLiteral}'`)} as distance
    from ai_documents
    where user_id = ${userId} and embedding_vector is not null
    order by embedding_vector ${sql.raw(op)} ${sql.raw(`'${vectorLiteral}'`)}
    limit ${limit};
  `);

  // Преобразуем distance в score (чем меньше distance, тем выше score). Для cosine distance: score = 1 - distance.
  return (rows as any[]).map(r => {
    const d = Number((r as any).distance);
    const score = metric === 'l2' ? (1 / (1 + d)) : (1 - d); // грубая нормализация
    return { ...r, score };
  });
}
