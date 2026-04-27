import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// ─── GET — profissionais com regras de serviço e produto ──────────────────────
export async function GET(_req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();

    const profissionais = await prisma.profissional.findMany({
      where: { tenantId, ativo: true },
      select: {
        id:                true,
        nome:              true,
        percentualRepasse: true,
        repasseFixo:       true,
        repasseTipo:       true,
        comissaoRegras: {
          where: {
            ativo:        true,
            tipoBase:     { in: ['servico', 'produto'] },
            referenciaId: null,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({ profissionais });
  } catch (err) {
    console.error('[settings/comissoes GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ─── POST — upsert de regra (servico ou produto) ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json() as {
      profissionalId?: string;
      tipoBase?:       string;
      percentual?:     number;
      valorFixo?:      number;
    };

    const { profissionalId, tipoBase, percentual, valorFixo } = body;

    if (!profissionalId || !tipoBase) {
      return NextResponse.json({ error: 'profissionalId e tipoBase obrigatórios.' }, { status: 400 });
    }
    if (tipoBase !== 'servico' && tipoBase !== 'produto') {
      return NextResponse.json({ error: 'tipoBase deve ser "servico" ou "produto".' }, { status: 400 });
    }
    if (percentual === undefined && valorFixo === undefined) {
      return NextResponse.json({ error: 'percentual ou valorFixo obrigatório.' }, { status: 400 });
    }
    if (percentual !== undefined && (percentual < 0 || percentual > 100)) {
      return NextResponse.json({ error: 'percentual deve estar entre 0 e 100.' }, { status: 400 });
    }
    if (valorFixo !== undefined && valorFixo < 0) {
      return NextResponse.json({ error: 'valorFixo não pode ser negativo.' }, { status: 400 });
    }

    const prof = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: { id: true },
    });
    if (!prof) {
      return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 });
    }

    const existente = await prisma.comissaoRegra.findFirst({
      where: { profissionalId, tipoBase, referenciaId: null },
    });

    const dados = {
      percentual: percentual ?? null,
      valorFixo:  valorFixo  ?? null,
      ativo:      true,
    };

    const regra = existente
      ? await prisma.comissaoRegra.update({ where: { id: existente.id }, data: dados })
      : await prisma.comissaoRegra.create({
          data: { tenantId, profissionalId, tipoBase, referenciaId: null, ...dados },
        });

    return NextResponse.json(regra);
  } catch (err) {
    console.error('[settings/comissoes POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ─── DELETE — remover regra ───────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 });

    const regra = await prisma.comissaoRegra.findFirst({
      where: { id },
      include: { profissional: { select: { tenantId: true } } },
    });
    if (!regra || regra.profissional.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Regra não encontrada.' }, { status: 404 });
    }

    await prisma.comissaoRegra.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[settings/comissoes DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
