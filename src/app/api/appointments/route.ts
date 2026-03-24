import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();

    const appointments = await prisma.agendamento.findMany({
      where: { tenantId },
      include: { 
        paciente: { select: { nome: true, telefone: true } },
        servico: true,
        profissional: { select: { id: true, nome: true } }
      },
      orderBy: { dataHora: 'desc' },
      take: 100,
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
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
    return NextResponse.json({ error: 'Erro ao criar profissional' }, { status: 500 });
  }
}
