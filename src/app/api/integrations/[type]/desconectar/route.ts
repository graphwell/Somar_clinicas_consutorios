import { NextResponse } from 'next/server';
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
    const success = await IntegrationService.deactivateIntegration(tenantId, provider);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Integração desconectada com sucesso (soft-delete).', 
      integration: success 
    });
  } catch (error: any) {
    console.error(`[DISCONNECT_GATEWAY_ERROR] Provider: ${provider}`, error);
    return NextResponse.json({ success: false, error: 'Erro ao inativar integração' }, { status: 500 });
  }
}
