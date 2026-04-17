import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/auth-utils';

// PATCH /api/insumos/produtos/[id] — editar produto, entrada de estoque, etc
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { entradaEstoque, observacao, ...rest } = body;

  // Busca o produto atual para calcular saldo
  const atual = await prisma.produto.findFirst({
    where: { id: params.id, tenantId: tenant.tenantId },
  });
  if (!atual) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

  const updateData: any = {};
  if (rest.nome !== undefined)          updateData.nome = rest.nome;
  if (rest.descricao !== undefined)     updateData.descricao = rest.descricao;
  if (rest.tipo !== undefined)          updateData.tipo = rest.tipo;
  if (rest.unidade !== undefined)       updateData.unidade = rest.unidade;
  if (rest.preco !== undefined)         updateData.preco = rest.preco;
  if (rest.custoUnitario !== undefined) updateData.custoUnitario = rest.custoUnitario;
  if (rest.estoqueMinimo !== undefined) updateData.estoqueMinimo = rest.estoqueMinimo;
  if (rest.status !== undefined)        updateData.status = rest.status;
  if (rest.categoriaId !== undefined)   updateData.categoriaId = rest.categoriaId;
  if (rest.imageUrl !== undefined)      updateData.imageUrl = rest.imageUrl;
  if (rest.fabricante !== undefined)    updateData.fabricante = rest.fabricante;
  if (rest.dataValidade !== undefined)  updateData.dataValidade = rest.dataValidade ? new Date(rest.dataValidade) : null;

  // Entrada de estoque (adiciona quantidade)
  if (entradaEstoque && entradaEstoque > 0) {
    const novoSaldo = atual.estoque + entradaEstoque;
    updateData.estoque = novoSaldo;

    await prisma.movimentacaoEstoque.create({
      data: {
        tenantId: tenant.tenantId,
        produtoId: params.id,
        tipo: 'entrada',
        quantidade: entradaEstoque,
        saldoAntes: atual.estoque,
        saldoDepois: novoSaldo,
        observacao: observacao || 'Entrada manual',
      },
    });
  }

  // Ajuste direto de estoque (admin corrige divergência)
  if (rest.estoque !== undefined && entradaEstoque === undefined) {
    const diff = rest.estoque - atual.estoque;
    updateData.estoque = rest.estoque;

    await prisma.movimentacaoEstoque.create({
      data: {
        tenantId: tenant.tenantId,
        produtoId: params.id,
        tipo: 'ajuste',
        quantidade: diff,
        saldoAntes: atual.estoque,
        saldoDepois: rest.estoque,
        observacao: observacao || 'Ajuste manual de estoque',
      },
    });
  }

  const produto = await prisma.produto.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(produto);
}

// DELETE /api/insumos/produtos/[id] — desativar
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  await prisma.produto.update({
    where: { id: params.id },
    data: { status: 'inactive' },
  });

  return NextResponse.json({ ok: true });
}
