import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

// GET /api/insumos/produtos?tipo=insumo&status=active&alerta=true
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const tipo   = searchParams.get('tipo')   || undefined;
    const status = searchParams.get('status') || undefined;

    const produtos = await prisma.produto.findMany({
      where: {
        tenantId,
        ...(tipo   ? { tipo }   : {}),
        ...(status ? { status } : {}),
      },
      include: { categoria: true },
      orderBy: { nome: 'asc' },
    });

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
        alertas: { estoqueMinimo: emAlerta, vencendoEm7, vencido },
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('[insumos/produtos GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/insumos/produtos — criar produto/insumo
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json();
    const {
      nome, descricao, dicaDeUso, tipo = 'insumo', unidade = 'un',
      preco = 0, custoUnitario = 0, estoque = 0, estoqueMinimo = 0,
      status = 'active', categoriaId, imageUrl, fabricante, tags = [],
      dataEntrada, dataValidade,
    } = body;

    if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const produto = await prisma.produto.create({
      data: {
        tenantId,
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
      },
    });

    // Registrar entrada inicial de estoque
    if (estoque > 0) {
      await prisma.movimentacaoEstoque.create({
        data: {
          tenantId,
          produtoId: produto.id,
          tipo: 'entrada',
          quantidade: estoque,
          saldoAntes: 0,
          saldoDepois: estoque,
          observacao: 'Estoque inicial',
        },
      });
    }

    return NextResponse.json(produto);
  } catch (error: any) {
    console.error('[insumos/produtos POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
