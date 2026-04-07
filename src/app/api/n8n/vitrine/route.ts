import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Autenticação via API Key — mesmo padrão das rotas n8n existentes */
function autenticarApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  return apiKey === process.env.N8N_API_KEY;
}

/**
 * GET /api/n8n/vitrine
 * Query: tenantId (obrigatório), category, status
 * Retorna produtos ativos do tenant
 */
export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'active';
  const servicoId = searchParams.get('servicoId');

  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });

  try {
    if (servicoId) {
      // Produtos sugeridos para um serviço
      const sugestoes = await prisma.servicoSugestao.findMany({
        where: { tenantId, servicoId },
        include: {
          produto: {
            select: { id: true, nome: true, preco: true, imageUrl: true, estoque: true, status: true, tags: true },
          },
        },
      });
      return NextResponse.json(sugestoes.map(s => s.produto));
    }

    const produtos = await prisma.produto.findMany({
      where: {
        tenantId,
        status,
        ...(category ? { categoria: { nome: { contains: category, mode: 'insensitive' } } } : {}),
      },
      include: { categoria: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    });
    return NextResponse.json(produtos);
  } catch (err) {
    console.error('[n8n/vitrine GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * POST /api/n8n/vitrine
 * Registrar reserva de produtos via agente IA
 * Body: { tenantId, agendamentoId?, pacienteId?, items: [{ produtoId?, comboId?, quantidade, precoUnitario }] }
 */
export async function POST(req: NextRequest) {
  if (!autenticarApiKey(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: {
    tenantId?: string;
    agendamentoId?: string;
    pacienteId?: string;
    items?: Array<{ produtoId?: string; comboId?: string; quantidade?: number; precoUnitario: number }>;
  };

  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

  if (!body.tenantId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'tenantId e items[] obrigatórios' }, { status: 400 });
  }

  try {
    const criados = await prisma.pedidoItem.createMany({
      data: body.items.map(i => ({
        tenantId: body.tenantId!,
        produtoId: i.produtoId ?? null,
        comboId: i.comboId ?? null,
        quantidade: i.quantidade ?? 1,
        precoUnitario: i.precoUnitario,
        agendamentoId: body.agendamentoId ?? null,
        pacienteId: body.pacienteId ?? null,
        status: 'reserved',
      })),
    });
    return NextResponse.json({ count: criados.count }, { status: 201 });
  } catch (err) {
    console.error('[n8n/vitrine POST]', err);
    return NextResponse.json({ error: 'Erro ao criar reservas' }, { status: 500 });
  }
}
