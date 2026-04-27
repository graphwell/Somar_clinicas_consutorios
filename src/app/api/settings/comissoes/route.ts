import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// ─── GET — listar profissionais com suas regras ───────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const filtroProfId = searchParams.get('profissionalId');

    const where = { tenantId, ativo: true, ...(filtroProfId ? { id: filtroProfId } : {}) };

    const profissionais = await prisma.profissional.findMany({
      where,
      select: {
        id:                true,
        nome:              true,
        percentualRepasse: true,
        repasseFixo:       true,
        repasseTipo:       true,
        comissaoRegras:    {
          where:   { ativo: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    });

    // Categorias de serviço: valores únicos do campo Servico.categoria
    const servicosCategorias = await prisma.servico.findMany({
      where:   { tenantId, ativo: true, categoria: { not: null } },
      select:  { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    });
    const categoriasServico = servicosCategorias
      .map(s => s.categoria)
      .filter((c): c is string => !!c);

    // Categorias de produto: entidade CategoriaProduto
    const categoriasProduto = await prisma.categoriaProduto.findMany({
      where:   { tenantId },
      select:  { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({ profissionais, categoriasServico, categoriasProduto });
  } catch (err) {
    console.error('[settings/comissoes GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ─── POST — criar ou atualizar regra (upsert) ─────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json() as {
      profissionalId?: string;
      tipoBase?:       string;
      referenciaId?:   string | null;
      percentual?:     number;
      valorFixo?:      number;
    };

    const { profissionalId, tipoBase, referenciaId = null, percentual, valorFixo } = body;

    if (!profissionalId || !tipoBase) {
      return NextResponse.json({ error: 'profissionalId e tipoBase obrigatórios.' }, { status: 400 });
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

    // Verificar que o profissional pertence ao tenant
    const prof = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: { id: true },
    });
    if (!prof) {
      return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 });
    }

    // Upsert manual (não usar prisma.upsert por causa do referenciaId null)
    const existente = await prisma.comissaoRegra.findFirst({
      where: {
        profissionalId,
        tipoBase,
        referenciaId: referenciaId ?? null,
      },
    });

    const dados = {
      percentual: percentual ?? null,
      valorFixo:  valorFixo  ?? null,
      ativo:      true,
    };

    let regra;
    if (existente) {
      regra = await prisma.comissaoRegra.update({
        where: { id: existente.id },
        data:  dados,
      });
    } else {
      regra = await prisma.comissaoRegra.create({
        data: {
          tenantId,
          profissionalId,
          tipoBase,
          referenciaId: referenciaId ?? null,
          ...dados,
        },
      });
    }

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

    // Verificar ownership via profissional.tenantId
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
