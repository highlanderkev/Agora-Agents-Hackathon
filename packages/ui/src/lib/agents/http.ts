import { UnknownAgentError } from './errors.js';

export async function readJsonObjectBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  } catch {
    return {};
  }
}

export function errorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof UnknownAgentError) {
    return Response.json(
      {
        ok: false,
        error: error.message,
      },
      { status: error.statusCode },
    );
  }

  return Response.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status: 500 },
  );
}
