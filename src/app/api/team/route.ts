import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();

    const profs = await prisma.profissional.findMany({
      where: { tenantId },
      include: { escalas: true },
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(profs);
  } catch (error: any) {
    console.error('Erro ao buscar profissionais:', error);
    return NextResponse.json({ error: 'Erro ao buscar profissionais', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();
    const body = await request.json();
    const { nome, especialidade, registroProfissional, bio, fotoUrl, color, horariosJson, ativo } = body;
  
    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  
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
  } catch (error: any) {
    console.error('Erro ao criar profissional:', error);
    return NextResponse.json({ error: 'Erro ao criar profissional', details: error.message }, { status: 500 });
  }
}
