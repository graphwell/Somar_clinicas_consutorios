import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || 'clinica_id_default';

  try {
    // @ts-ignore
    const servicos = await prisma.servico.findMany({
      where: { 
        tenantId,
        ativo: true 
      },
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(servicos);
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    return NextResponse.json({ error: 'Erro ao buscar serviços' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nome, descricao, preco, duracaoMinutos, tenantId, color } = body;

    const parsedPreco = parseFloat(String(preco).replace(',', '.')) || 0;
    const parsedDuracao = parseInt(String(duracaoMinutos)) || 30;

    if (id) {
       // @ts-ignore
       const updated = await prisma.servico.update({
          where: { id },
          data: { nome, descricao, preco: parsedPreco, duracaoMinutos: parsedDuracao, color }
       });
       return NextResponse.json({ servico: updated });
    }

    const novoServico = await prisma.servico.create({
      data: {
        nome,
        descricao,
        preco: parsedPreco,
        duracaoMinutos: parsedDuracao,
        tenantId,
        color: color || '#3B82F6'
      }
    });

    return NextResponse.json({ servico: novoServico });
  } catch (error) {
    console.error('Erro ao processar serviço:', error);
    return NextResponse.json({ error: 'Erro ao processar serviço' }, { status: 500 });
  }
}
