import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Middleware injeta x-tenant-id baseado no JWT
function getTenantId(req: Request) {
  return req.headers.get('x-tenant-id') || '';
}

export async function GET(request: Request) {
  const tenantId = getTenantId(request);

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID não fornecido' }, { status: 401 });
  }

  try {
    const config = await prisma.pixConfig.findUnique({
      where: { tenantId }
    });

    return NextResponse.json(config ?? {
      ativo: false,
      tipoChave: 'telefone',
      chave: '',
      nomeFavorecido: '',
      exibirNoLink: true,
      exibirNoWpp: true
    });
  } catch (error) {
    console.error('[PIX_CONFIG_GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar configuração PIX' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const tenantId = getTenantId(request);

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID não fornecido' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Remove campos que não devem ser editados via upsert direto ou que venham a mais
    const { id, updatedAt, tenantId: _, ...data } = body;

    const config = await prisma.pixConfig.upsert({
      where: { tenantId },
      update: data,
      create: { 
        tenantId, 
        ...data 
      },
    });

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error('[PIX_CONFIG_POST]', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração PIX' }, { status: 500 });
  }
}
