import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });

  try {
    // @ts-ignore
    const profs = await prisma.profissional.findMany({
      where: { tenantId },
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(profs);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar profissionais' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { tenantId, nome, especialidade, registroProfissional, bio, fotoUrl, color, horariosJson, ativo } = body;
  
    if (!tenantId || !nome) return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  
    try {
      // @ts-ignore
      const prof = await prisma.profissional.create({
        data: {
          tenantId,
          nome,
          especialidade: especialidade || null,
          registroProfissional: registroProfissional || null,
          bio: bio || null,
          fotoUrl: fotoUrl || null,
          color: color || '#4a4ae2',
          horariosJson: horariosJson || null,
          ativo: ativo ?? true
        }
      });
    return NextResponse.json(prof);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar profissional' }, { status: 500 });
  }
}
