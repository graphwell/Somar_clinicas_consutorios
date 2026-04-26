import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { confirmarPagamentoAssinatura } from '@/lib/confirmar-pagamento-assinatura';

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const { assinaturaClienteId, transacaoId } = await request.json() as {
      assinaturaClienteId?: string;
      transacaoId?: string;
    };

    if (!assinaturaClienteId) {
      return NextResponse.json({ error: 'assinaturaClienteId obrigatório.' }, { status: 400 });
    }

    const prisma = getTenantPrisma();
    const result = await confirmarPagamentoAssinatura(
      assinaturaClienteId,
      transacaoId,
      tenantId,
      prisma,
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    if (msg === 'ASSINATURA_NAO_ENCONTRADA') {
      return NextResponse.json({ error: 'Assinatura não encontrada ou não pertence a este tenant.' }, { status: 403 });
    }
    console.error('[confirmar-pagamento]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
