import { n8nError } from '@/lib/n8n-response';

/**
 * Valida o header x-api-key (ou Authorization: Bearer) contra N8N_API_KEY.
 * Usado pelas rotas legadas /api/n8n/agenda/*, /api/n8n/servicos etc.
 */
export function autenticarApiKey(request: Request): boolean {
  const apiKey =
    request.headers.get('x-api-key') ??
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!apiKey) return false;
  if (!process.env.N8N_API_KEY) return false;
  return apiKey === process.env.N8N_API_KEY;
}

/**
 * Valida autenticação para as ferramentas do agente n8n.
 * Aceita:
 *   - x-n8n-token contra N8N_INTERNAL_TOKEN (header das ferramentas do agente)
 *   - x-api-key  contra N8N_API_KEY          (fallback p/ workflows existentes)
 */
export function autenticarTokenInterno(request: Request): boolean {
  const token =
    request.headers.get('x-n8n-token') ??
    request.headers.get('x-api-key') ??
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) return false;

  // Token das ferramentas do agente
  if (process.env.N8N_INTERNAL_TOKEN && token === process.env.N8N_INTERNAL_TOKEN) return true;
  // Fallback: N8N_API_KEY existente (retrocompatibilidade)
  if (process.env.N8N_API_KEY && token === process.env.N8N_API_KEY) return true;

  return false;
}

/** Atalho: retorna resposta de erro 401 pronta. */
export const UNAUTHORIZED = () => n8nError('API Key inválida ou ausente', 'UNAUTHORIZED', 401);
