/**
 * Utilitário de autenticação compartilhado pelas rotas /api/n8n/*.
 *
 * Ferramentas do agente usam autenticarTokenInterno (x-n8n-token / N8N_INTERNAL_TOKEN).
 * Rotas legadas usam autenticarApiKey (x-api-key / N8N_API_KEY).
 *
 * Arquivos que começam com _ são ignorados pelo roteador do Next.js App Router
 * e servem apenas como utilitários internos.
 */
export { autenticarTokenInterno, autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
export { n8nSuccess, n8nError } from '@/lib/n8n-response';
