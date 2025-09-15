
export interface MetricsRecord {
  runId: string;
  name?: string;
  start: number;
  end?: number;
  latencyMs?: number;
  inputTokens?: number; // placeholder (depends on provider instrumentation)
  outputTokens?: number;
  hash?: string;
  error?: string;
}

const metricsBuffer: MetricsRecord[] = [];

function hashString(input: string): string {
  // Simple FNV-1a 32-bit hash converted to hex (good enough for fingerprinting small payloads)
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// Lightweight callback handler (avoids importing internal LangChain types to prevent path issues)
export class SimpleTracingHandler {
  name = 'simple-tracing-handler';
  private active: Map<string, MetricsRecord> = new Map();

  // LangChain callback signatures intentionally typed as any to avoid hard dependency
  // on internal types which may shift between minor versions. We only need runId timing.
  handleChainStart(_chain: any, _inputs: any, runId: string): void {
    this.active.set(runId, { runId, start: Date.now(), name: _chain.name });
  }
  handleLLMStart(_llm: any, _prompts: any, runId: string): void {
    this.active.set(runId, { runId, start: Date.now(), name: _llm?.model || _llm?.constructor?.name });
  }
  handleChainError(err: any, runId: string): void {
    const rec = this.active.get(runId);
    if (rec) {
      rec.end = Date.now();
      rec.latencyMs = rec.end - rec.start;
      rec.error = err?.message || String(err);
      metricsBuffer.push(rec);
      this.active.delete(runId);
    }
  }
  handleLLMError(err: any, runId: string): void { this.handleChainError(err, runId); }
  handleChainEnd(outputs: any, runId: string): void {
    const rec = this.active.get(runId);
    if (rec) {
      rec.end = Date.now();
      rec.latencyMs = rec.end - rec.start;
      const serialized = JSON.stringify(outputs).slice(0, 1000);
      rec.hash = hashString(serialized);
      metricsBuffer.push(rec);
      this.active.delete(runId);
    }
  }
  handleLLMEnd(output: any, runId: string): void { this.handleChainEnd(output, runId); }
}

// Lightweight wrapper to attach tracing callbacks. We intentionally avoid
// importing deep internal types so this remains stable across LangChain updates.
export function attachTracing<T extends { withConfig: (cfg: any) => T }>(r: T): T {
  // In future we might inject handler list. For now instantiate per attach.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return r.withConfig({ callbacks: [new SimpleTracingHandler()] }) as any;
}

export function drainMetrics(): MetricsRecord[] {
  const copy = metricsBuffer.splice(0, metricsBuffer.length);
  return copy;
}
