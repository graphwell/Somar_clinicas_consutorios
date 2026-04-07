import { n8nError } from '@/lib/n8n-response';

/**
 * Valida o header x-api-key (ou Authorization: Bearer) contra N8N_API_KEY.
 * Retorna true se autorizado.
 */
export function autenticarApiKey(request: Request): boolean {
  const apiKey =
    request.headers.get('x-api-key') ??
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!apiKey) return false;
  if (!process.env.N8N_API_KEY) return false;
  return apiKey === process.env.N8N_API_KEY;
}

/** Atalho: retorna resposta de erro 401 pronta. */
export const UNAUTHORIZED = () => n8nError('API Key inválida ou ausente', 'UNAUTHORIZED', 401);
