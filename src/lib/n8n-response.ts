/** Resposta padronizada para todas as rotas /api/n8n/* */

export function n8nSuccess(data: unknown, meta?: unknown) {
  return Response.json({
    success: true,
    data,
    meta: meta ?? null,
    timestamp: new Date().toISOString(),
  });
}

export function n8nError(message: string, code: string, status = 400) {
  return Response.json(
    {
      success: false,
      error: { message, code },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
