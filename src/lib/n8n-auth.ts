import { n8nError } from '@/lib/n8n-response';

/**
 * Extrai o token de autenticação da requisição.
 * Aceita: header x-api-key, header authorization, header x-n8n-token
 * ou query param _key (usado por toolHttpRequest do agente n8n para
 * contornar o fato de o agente preencher os headers dinamicamente).
 */
function extrairToken(request: Request): string | null {
  // Headers têm prioridade
  const fromHeader =
    request.headers.get('x-n8n-token') ??
    request.headers.get('x-api-key') ??
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (fromHeader) return fromHeader;

  // Fallback: query param _key (hardcoded na URL dos toolHttpRequest)
  try {
    const url = new URL(request.url);
    const fromQuery = url.searchParams.get('_key');
    if (fromQuery) return fromQuery;
  } catch {
    // URL inválida — ignora
  }
  return null;
}

/**
 * Valida o header x-api-key (ou Authorization: Bearer, ou query ?_key)
 * contra N8N_API_KEY.
 * Usado pelas rotas legadas /api/n8n/agenda/*, /api/n8n/servicos etc.
 */
export function autenticarApiKey(request: Request): boolean {
  const token = extrairToken(request);
  if (!token) return false;
  if (!process.env.N8N_API_KEY) return false;
  return token === process.env.N8N_API_KEY;
}

/**
 * Valida autenticação para as ferramentas do agente n8n.
 * Aceita:
 *   - x-n8n-token contra N8N_INTERNAL_TOKEN (header das ferramentas do agente)
 *   - x-api-key  contra N8N_API_KEY          (fallback p/ workflows existentes)
 *   - query ?_key (para toolHttpRequest onde o agente preenche headers)
 */
export function autenticarTokenInterno(request: Request): boolean {
  const token = extrairToken(request);
  if (!token) return false;

  if (process.env.N8N_INTERNAL_TOKEN && token === process.env.N8N_INTERNAL_TOKEN) return true;
  if (process.env.N8N_API_KEY && token === process.env.N8N_API_KEY) return true;

  return false;
}

/** Atalho: retorna resposta de erro 401 pronta. */
export const UNAUTHORIZED = () => n8nError('API Key inválida ou ausente', 'UNAUTHORIZED', 401);
