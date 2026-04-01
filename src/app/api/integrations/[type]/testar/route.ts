import { NextResponse } from 'next/server';
import { GatewayFactory } from '@/services/gateways/GatewayFactory';
import { IntegrationService } from '@/services/IntegrationService';

export async function POST(
  request: Request,
  { params }: { params: { type: string } }
) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Nenhum tenantId fornecido' }, { status: 401 });
  }

  const { type: provider } = params;

  try {
    const { credentials } = await request.json();

    if (!credentials || Object.keys(credentials).length === 0) {
      return NextResponse.json({ error: 'Nenhuma credencial enviada para teste' }, { status: 400 });
    }

    const gateway = GatewayFactory.getProvider(provider);
    const isValid = await gateway.ping(credentials);

    if (isValid) {
      // Se tiver credenciais validas, aproveitamos para salvar (upsert) se solicitarem ou mantemos flexível.
      // Neste endpoint vamos apenas TESTAR p/ a UI.
      return NextResponse.json({ success: true, message: 'Credenciais válidas e conexão estabelecida.' });
    } else {
      return NextResponse.json({ success: false, error: 'Credenciais inválidas ou serviço indisponível.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[TEST_GATEWAY_ERROR] Provider: ${provider}`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
