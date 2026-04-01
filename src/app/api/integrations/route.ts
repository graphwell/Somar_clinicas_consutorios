import { NextResponse } from 'next/server';
import { IntegrationService } from '@/services/IntegrationService';

// Middleware injeta x-tenant-id baseado no JWT
function getTenantId(req: Request) {
  return req.headers.get('x-tenant-id') || '';
}

export async function GET(request: Request) {
  const tenantId = getTenantId(request);

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID não fornecido ou inválido' }, { status: 401 });
  }

  try {
    const integrations = await IntegrationService.getIntegrationsByTenant(tenantId);
    return NextResponse.json(integrations);
  } catch (error: any) {
    console.error('[INTEGRATIONS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao buscar integrações.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID não fornecido.' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { provider, credentials, nomeExibicao } = data;

    if (!provider || !credentials) {
      return NextResponse.json({ error: 'Provedor e Credenciais são obrigatórios' }, { status: 400 });
    }

    const result = await IntegrationService.createIntegration(tenantId, {
      provider,
      credentials,
      nomeExibicao
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[INTEGRATIONS_POST_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao criar integração: ' + error.message }, { status: 500 });
  }
}
