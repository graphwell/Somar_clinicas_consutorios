import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const prisma = getTenantPrisma();
    const plano = await prisma.planoAssinatura.findUnique({ where: { id: params.id } });
    if (!plano || plano.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    const assinantesAtivos = await prisma.assinaturaCliente.count({
      where: { planoId: params.id, status: 'ativo' },
    });

    const body = await request.json();
    const { nome, descricao, valor, periodicidade, servicos,
            agendamentoPrioritario, descontoProdutos,
            descontoServicosExtras, ativo } = body;

    // Não permite alterar valor/periodicidade se tiver assinantes ativos
    const alterandoPreco = (valor && valor !== plano.valor) ||
                           (periodicidade && periodicidade !== plano.periodicidade);
    if (assinantesAtivos > 0 && alterandoPreco) {
      return NextResponse.json({
        error: 'Plano com assinantes ativos. Crie um novo plano para alterar valor ou periodicidade.',
        assinantesAtivos,
      }, { status: 422 });
    }

    const updated = await prisma.planoAssinatura.update({
      where: { id: params.id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(valor !== undefined && { valor }),
        ...(periodicidade !== undefined && { periodicidade }),
        ...(servicos !== undefined && { servicos }),
        ...(agendamentoPrioritario !== undefined && { agendamentoPrioritario }),
        ...(descontoProdutos !== undefined && { descontoProdutos }),
        ...(descontoServicosExtras !== undefined && { descontoServicosExtras }),
        ...(ativo !== undefined && { ativo }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[SUBSCRIPTIONS_PLANOS_PATCH]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const prisma = getTenantPrisma();
    const plano = await prisma.planoAssinatura.findUnique({ where: { id: params.id } });
    if (!plano || plano.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    // Soft delete — desativar
    await prisma.planoAssinatura.update({
      where: { id: params.id },
      data: { ativo: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[SUBSCRIPTIONS_PLANOS_DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
