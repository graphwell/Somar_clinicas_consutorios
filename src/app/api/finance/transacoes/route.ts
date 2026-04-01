import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { tenantId, role, profissionalId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);

    const tipo = searchParams.get('tipo'); // income|expense|todos
    const categoria = searchParams.get('categoria');
    const profId = searchParams.get('profissionalId');
    const convenioId = searchParams.get('convenioId');
    const formaPagamento = searchParams.get('formaPagamento');
    const status = searchParams.get('status');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { tenantId };

    // Profissional só vê próprias transações
    if (role === 'profissional' && profissionalId) {
      where.profissionalId = profissionalId;
    }

    if (tipo && tipo !== 'todos') where.tipo = tipo;
    if (categoria) where.categoria = categoria;
    if (profId) where.profissionalId = profId;
    if (convenioId) where.convenioId = convenioId;
    if (formaPagamento) where.formaPagamento = formaPagamento;
    if (status) where.status = status;
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }
    if (q) {
      where.descricao = { contains: q, mode: 'insensitive' };
    }

    const [total, transacoes] = await Promise.all([
      prisma.transacaoFinanceira.count({ where }),
      prisma.transacaoFinanceira.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          profissional: { select: { id: true, nome: true } },
          agendamento: {
            select: {
              paciente: { select: { nome: true } },
              servico: { select: { nome: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      transacoes,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, role } = await getSessionInfo();
    if (role === 'profissional') {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
    }

    const body = await req.json();
    const {
      tipo, valor, descricao, categoria, formaPagamento,
      profissionalId, convenioId, dataVencimento, dataPagamento,
      observacao, parcelas, contaBancaria,
    } = body;

    if (!tipo || !valor || !descricao) {
      return NextResponse.json({ error: 'tipo, valor e descricao são obrigatórios' }, { status: 400 });
    }

    // Gerar numeroRecibo
    const hoje = new Date();
    const anoMes = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const count = await prisma.transacaoFinanceira.count({
      where: { tenantId, numeroRecibo: { startsWith: `REC-${anoMes}-` } },
    });
    const numeroRecibo = `REC-${anoMes}-${String(count + 1).padStart(3, '0')}`;

    const statusTx = dataPagamento ? 'paid' : (tipo === 'expense' && dataVencimento ? 'pending' : 'paid');

    const tx = await prisma.transacaoFinanceira.create({
      data: {
        tenantId,
        tipo,
        valor: parseFloat(valor),
        descricao,
        categoria: categoria || 'outros',
        formaPagamento: formaPagamento || null,
        profissionalId: profissionalId || null,
        convenioId: convenioId || null,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
        dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
        observacao: observacao || null,
        parcelas: parcelas ? parseInt(parcelas) : 1,
        contaBancaria: contaBancaria || null,
        numeroRecibo,
        status: statusTx,
      },
      include: {
        profissional: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json(tx, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
