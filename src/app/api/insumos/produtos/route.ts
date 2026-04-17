import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/auth-utils';

// GET /api/insumos/produtos?tipo=insumo&status=active&alerta=true
export async function GET(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo     = searchParams.get('tipo')   || undefined;   // venda|insumo|ambos
  const status   = searchParams.get('status') || undefined;
  const alerta   = searchParams.get('alerta') === 'true';     // só produtos críticos

  const produtos = await prisma.produto.findMany({
    where: {
      tenantId: tenant.tenantId,
      ...(tipo   ? { tipo }   : {}),
      ...(status ? { status } : {}),
      ...(alerta ? { estoqueMinimo: { gt: 0 }, estoque: { lte: prisma.produto.fields.estoqueMinimo } } : {}),
    },
    include: { categoria: true },
    orderBy: { nome: 'asc' },
  });

  // Calcular métricas de alerta
  const agora = new Date();
  const enriched = produtos.map(p => {
    const diasParaVencer = p.dataValidade
      ? Math.ceil((p.dataValidade.getTime() - agora.getTime()) / 86400000)
      : null;
    const emAlerta = p.estoqueMinimo > 0 && p.estoque <= p.estoqueMinimo;
    const vencendoEm7 = diasParaVencer !== null && diasParaVencer <= 7 && diasParaVencer >= 0;
    const vencido = diasParaVencer !== null && diasParaVencer < 0;

    return {
      ...p,
      alertas: {
        estoqueMinimo: emAlerta,
        vencendoEm7,
        vencido,
      },
    };
  });

  return NextResponse.json(enriched);
}

// POST /api/insumos/produtos — criar produto/insumo
export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const {
    id, nome, descricao, dicaDeUso, tipo = 'insumo', unidade = 'un',
    preco = 0, custoUnitario = 0, estoque = 0, estoqueMinimo = 0,
    status = 'active', categoriaId, imageUrl, fabricante, tags = [],
    dataEntrada, dataValidade,
  } = body;

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const data = {
    tenantId: tenant.tenantId,
    nome: nome.trim(),
    descricao: descricao || null,
    dicaDeUso: dicaDeUso || null,
    tipo, unidade, preco, custoUnitario, estoque, estoqueMinimo, status,
    categoriaId: categoriaId || null,
    imageUrl: imageUrl || null,
    fabricante: fabricante || null,
    tags,
    dataEntrada: dataEntrada ? new Date(dataEntrada) : null,
    dataValidade: dataValidade ? new Date(dataValidade) : null,
  };

  let produto;
  if (id) {
    produto = await prisma.produto.update({ where: { id }, data });
  } else {
    produto = await prisma.produto.create({ data });
    // Registrar entrada inicial de estoque
    if (estoque > 0) {
      await prisma.movimentacaoEstoque.create({
        data: {
          tenantId: tenant.tenantId,
          produtoId: produto.id,
          tipo: 'entrada',
          quantidade: estoque,
          saldoAntes: 0,
          saldoDepois: estoque,
          observacao: 'Estoque inicial',
        },
      });
    }
  }

  return NextResponse.json(produto);
}
