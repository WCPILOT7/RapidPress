import { embeddings } from '../../ai/core';

/**
 * Обёртка над OpenAIEmbeddings (или другой реализацией).
 * Для dev: можно внедрить fallback псевдо-вектор (хэш -> псевдо-числа), если нет ключа.
 */

export async function embedTexts(texts: string[]): Promise<number[][]> {
  try {
    const vectors = await embeddings.embedDocuments(texts);
    return vectors;
  } catch (e) {
    // Fallback: deterministic pseudo-vector based on char codes (НЕ для продакшена)
    return texts.map(t => pseudoVector(t, 32));
  }
}

function pseudoVector(text: string, dim: number): number[] {
  const v = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    v[i % dim] += text.charCodeAt(i) / 255;
  }
  // normalize
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / ((Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1));
}
