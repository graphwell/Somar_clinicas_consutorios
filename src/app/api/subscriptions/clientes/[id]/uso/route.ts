import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const { servicoId } = await request.json();
    if (!servicoId) return NextResponse.json({ error: 'servicoId obrigatório.' }, { status: 400 });

    const prisma = getTenantPrisma();
    const assinatura = await prisma.assinaturaCliente.findUnique({
      where:   { id: params.id },
      include: { plano: true },
    });

    if (!assinatura || assinatura.tenantId !== tenantId || assinatura.status !== 'ativo') {
      return NextResponse.json({ error: 'Assinatura não encontrada ou inativa.' }, { status: 404 });
    }

    const contador = (assinatura.contadorUso as any)[servicoId];
    if (!contador) {
      return NextResponse.json({ temPlano: true, cobrarNormal: true, servicoNaoIncluso: true });
    }

    // Ilimitado — só incrementar para estatísticas
    if (contador.limite === null) {
      const novo = { ...(assinatura.contadorUso as any) };
      novo[servicoId] = { ...contador, usado: contador.usado + 1 };
      await prisma.assinaturaCliente.update({
        where: { id: assinatura.id },
        data:  { contadorUso: novo },
      });
      return NextResponse.json({ temPlano: true, ilimitado: true, cobrar: false, usado: contador.usado + 1, limite: null });
    }

    // Limitado — verificar saldo
    if (contador.usado >= contador.limite) {
      return NextResponse.json({
        temPlano:       true,
        limiteSuperado: true,
        cobrar:         true,
        desconto:       (assinatura.plano as any).descontoServicosExtras ?? null,
        usado:          contador.usado,
        limite:         contador.limite,
      });
    }

    // Debitar uso
    const novoContador = { ...(assinatura.contadorUso as any) };
    novoContador[servicoId] = { ...contador, usado: contador.usado + 1 };
    await prisma.assinaturaCliente.update({
      where: { id: assinatura.id },
      data:  { contadorUso: novoContador },
    });

    return NextResponse.json({
      temPlano: true,
      cobrar:   false,
      usado:    contador.usado + 1,
      limite:   contador.limite,
    });
  } catch (error: any) {
    console.error('[USO_POST_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
