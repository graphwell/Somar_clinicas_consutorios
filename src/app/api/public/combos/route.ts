import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/public/combos?slug=clinica-slug&servico=Nome+do+Servico
 *
 * Rota pública (sem autenticação) — usada no fluxo de agendamento público.
 * Retorna combos ativos cujo gatilhoServico corresponde ao serviço selecionado.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const servico = searchParams.get('servico');

    if (!slug || !servico) {
      return NextResponse.json({ combos: [] });
    }

    // Busca a clínica pelo slug para obter o tenantId
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true, nome: true },
    });

    if (!clinica) {
      return NextResponse.json({ combos: [] });
    }

    const combos = await prisma.marketingCombo.findMany({
      where: {
        tenantId: clinica.tenantId,
        ativo: true,
        gatilhoServico: { equals: servico, mode: 'insensitive' },
      },
      select: {
        id: true,
        nome: true,
        descricao: true,
        servicos: true,
        precoOriginal: true,
        precoCombo: true,
        descontoPct: true,
        validadeDias: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 3,
    });

    return NextResponse.json({ combos, clinicaNome: clinica.nome });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
