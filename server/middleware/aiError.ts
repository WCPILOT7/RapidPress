import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

interface AIErrorShape {
  type: string;
  message: string;
  details?: any;
  meta?: Record<string, any>;
}

export class AIBaseError extends Error {
  status: number;
  meta?: Record<string, any>;
  constructor(message: string, status = 500, meta?: Record<string, any>) {
    super(message);
    this.status = status;
    this.meta = meta;
  }
}
export class AIValidationError extends AIBaseError {
  constructor(message: string, meta?: Record<string, any>) {
    super(message, 400, meta);
  }
}
export class AIModelError extends AIBaseError {
  constructor(message: string, status = 502, meta?: Record<string, any>) {
    super(message, status, meta);
  }
}

function normalize(err: any): { status: number; body: { error: AIErrorShape } } {
  // Zod validation
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          type: "ValidationError",
          message: "Invalid input",
          details: err.issues.map(i => ({ path: i.path, message: i.message })),
        },
      },
    };
  }

  if (err instanceof AIBaseError) {
    return {
      status: err.status,
      body: {
        error: {
          type: err.constructor.name,
            message: err.message,
            meta: err.meta,
        },
      },
    };
  }

  // OpenAI style error (heuristic)
  if (err && err.error && typeof err.error === 'object') {
    const status = err.status || err.error?.status || 500;
    return {
      status,
      body: {
        error: {
          type: err.error.type || 'AIProviderError',
          message: err.error.message || 'Upstream AI provider error',
          details: err.error,
        },
      },
    };
  }

  return {
    status: err.status || 500,
    body: {
      error: {
        type: err.name || 'Error',
        message: err.message || 'Internal Server Error',
      },
    },
  };
}

export function aiErrorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const { status, body } = normalize(err);
  if (status >= 500) {
    // Basic logging (replace with structured logger later)
    console.error("[AI ERROR]", status, body.error.type, body.error.message, body.error.details || body.error.meta || '');
  }
  res.status(status).json(body);
}
