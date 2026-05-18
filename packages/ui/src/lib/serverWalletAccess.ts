const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

interface EnvironmentLike {
  NODE_ENV?: string;
}

function getRequestHostname(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = forwardedHost ?? request.headers.get('host');

  if (hostHeader) {
    return hostHeader.split(',')[0]?.trim().split(':')[0] ?? '';
  }

  try {
    return new globalThis.URL(request.url).hostname;
  } catch {
    return '';
  }
}

export function isServerWalletAccessAllowed(request: Request, env: EnvironmentLike = process.env): boolean {
  return env.NODE_ENV === 'development' && LOCAL_HOSTNAMES.has(getRequestHostname(request));
}

export function createServerWalletAccessDeniedResponse(): Response {
  return Response.json(
    {
      ok: false,
      error:
        'This route is only enabled from local development because it can execute swaps with the server wallet.',
    },
    { status: 403 },
  );
}
