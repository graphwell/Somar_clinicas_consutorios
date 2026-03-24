import { headers } from 'next/headers';

/**
 * Extrai o tenantId validado pelo Middleware dos headers da requisição.
 * O Middlewares garante que apenas tokens válidos injetem este header x-tenant-id.
 */
export async function getAuthorizedTenantId(): Promise<string> {
  const headerList = await headers();
  const tenantId = headerList.get('x-tenant-id');

  if (!tenantId) {
    throw new Error('Tenant não autorizado ou não identificado na sessão');
  }

  return tenantId;
}
