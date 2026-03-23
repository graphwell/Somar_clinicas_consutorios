import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || 'clinica_id_default';

  try {
    // @ts-ignore - Prisma Client might not have refreshed in the IDE even after generate
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
    const { tenantId, nome, preco } = body;

    if (!tenantId || !nome) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // @ts-ignore
    const novoServico = await prisma.servico.create({
      data: {
        tenantId,
        nome,
        preco: Number(preco) || 0,
        duracaoMinutos: 30,
        ativo: true
      }
    });

    return NextResponse.json(novoServico);
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    return NextResponse.json({ error: 'Erro ao criar serviço' }, { status: 500 });
  }
}
