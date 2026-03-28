import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const headerList = await headers();
    const role = headerList.get('x-user-role') || '';
    if (role === 'recepcao' || role === 'profissional') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);

    // Busca transações manuais e automáticas
    const transactions = await prisma.transacaoFinanceira.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100
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
  } catch (error: any) {
    console.error('Finance API Error:', error);
    return NextResponse.json([], { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const headerList = await headers();
    const role = headerList.get('x-user-role') || '';
    if (role === 'recepcao' || role === 'profissional') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    const body = await request.json();
    const { descricao, valor, tipo, categoria } = body;

    const tx = await prisma.transacaoFinanceira.create({
      data: {
        tenantId,
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
