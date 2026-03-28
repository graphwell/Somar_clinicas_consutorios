import { headers } from 'next/headers';

/**
 * Extrai o tenantId validado pelo Middleware dos headers da requisição.
 */
export async function getAuthorizedTenantId(): Promise<string> {
  const headerList = await headers();
  const tenantId = headerList.get('x-tenant-id');

  if (!tenantId) {
    throw new Error('Tenant não autorizado ou não identificado na sessão');
  }

  return tenantId;
}

/**
 * Retorna { tenantId, userId, role, profissionalId } da sessão atual.
 */
export async function getSessionInfo(): Promise<{
  tenantId: string;
  userId: string;
  role: string;
  profissionalId: string | null;
}> {
  const headerList = await headers();
  const tenantId = headerList.get('x-tenant-id');
  if (!tenantId) throw new Error('Tenant não autorizado');

  return {
    tenantId,
    userId: headerList.get('x-user-id') || '',
    role: headerList.get('x-user-role') || '',
    profissionalId: headerList.get('x-profissional-id') || null,
  };
}
