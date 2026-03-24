import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'TenantId required' }, { status: 400 });
  }

  try {
    // Busca transações manuais e automáticas
    const transactions = await prisma.transacaoFinanceira.findMany({
      where: { clinicaId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Mapeia para o formato esperado pelo frontend
    const mapped = transactions.map((t: any) => ({
      id: t.id,
      descricao: t.descricao || 'Transação sem descrição',
      valor: t.valor,
      tipo: t.tipo === 'revenue' ? 'entrada' : 'saida',
      categoria: t.categoria || 'Geral',
      data: t.createdAt.toISOString()
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Finance API Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, descricao, valor, tipo, categoria } = body;

    const tx = await prisma.transacaoFinanceira.create({
      data: {
        clinicaId: tenantId,
        descricao,
        valor: parseFloat(valor),
        tipo: tipo === 'entrada' ? 'revenue' : 'expense',
        categoria,
        status: 'completed'
      }
    });

    return NextResponse.json(tx);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
