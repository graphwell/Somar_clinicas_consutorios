import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/public/clinic/[slug]/vitrine
 * Registra reservas de produtos vinculadas a um agendamento (sem auth — chamado pelo booking público).
 * Body: { agendamentoId?, items: [{ produtoId, quantidade, precoUnitario }] }
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;

  const clinica = await prisma.clinica.findUnique({ where: { slug }, select: { tenantId: true } });
  if (!clinica) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: { agendamentoId?: string; items?: Array<{ produtoId: string; quantidade?: number; precoUnitario: number }> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items[] obrigatório' }, { status: 400 });
  }

  try {
    const criados = await prisma.pedidoItem.createMany({
      data: body.items.map(i => ({
        tenantId: clinica.tenantId,
        produtoId: i.produtoId,
        comboId: null,
        quantidade: i.quantidade ?? 1,
        precoUnitario: i.precoUnitario,
        agendamentoId: body.agendamentoId ?? null,
        status: 'reserved',
      })),
    });
    return NextResponse.json({ count: criados.count }, { status: 201 });
  } catch (err) {
    console.error('[public/vitrine POST]', err);
    return NextResponse.json({ error: 'Erro ao registrar reserva' }, { status: 500 });
  }
}

/**
 * GET /api/public/clinic/[slug]/vitrine
 * Retorna produtos ativos, combos ativos e categorias para a vitrine pública.
 * Query params:
 *   categoriaId — filtrar por categoria
 *   servicoId   — retornar sugestões para o serviço (usado no fluxo de agendamento)
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const { searchParams } = new URL(req.url);
  const categoriaId = searchParams.get('categoriaId');
  const servicoId = searchParams.get('servicoId');

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true },
    });
    if (!clinica) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { tenantId } = clinica;

    const [produtos, combos, categorias, sugestoes] = await Promise.all([
      prisma.produto.findMany({
        where: {
          tenantId,
          status: 'active',
          ...(categoriaId ? { categoriaId } : {}),
        },
        select: {
          id: true, nome: true, descricao: true, dicaDeUso: true,
          preco: true, imageUrl: true, estoque: true, tags: true,
          categoriaId: true, categoria: { select: { id: true, nome: true } },
        },
        orderBy: { nome: 'asc' },
      }),

      prisma.comboProduto.findMany({
        where: { tenantId, status: 'active' },
        select: {
          id: true, nome: true, preco: true, desconto: true,
          itens: {
            select: {
              produto: { select: { id: true, nome: true, preco: true, imageUrl: true } },
            },
          },
        },
      }),

      prisma.categoriaProduto.findMany({
        where: { tenantId },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      }),

      servicoId
        ? prisma.servicoSugestao.findMany({
            where: { tenantId, servicoId },
            select: {
              produto: {
                select: { id: true, nome: true, preco: true, imageUrl: true, estoque: true, status: true },
              },
            },
            take: 3,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      produtos,
      combos,
      categorias,
      sugestoes: sugestoes.map((s: { produto: unknown }) => s.produto),
    });
  } catch (err) {
    console.error('[public/vitrine GET]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
