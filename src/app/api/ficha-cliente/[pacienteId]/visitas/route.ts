import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — listar visitas
export async function GET(
  _req: Request,
  { params }: { params: { pacienteId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = params;

    const ficha = await prisma.fichaCliente.findUnique({
      where: { pacienteId },
      select: { id: true },
    });
    if (!ficha) return NextResponse.json({ visitas: [] });

    const visitas = await prisma.visitaCliente.findMany({
      where: { fichaId: ficha.id, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ visitas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — registrar visita
export async function POST(
  req: Request,
  { params }: { params: { pacienteId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = params;
    const body = await req.json();

    const { servicoNome, profissionalNome, valor, observacoes, satisfacao, fotosIds, agendamentoId } = body;

    if (!servicoNome) {
      return NextResponse.json({ error: 'servicoNome obrigatório' }, { status: 400 });
    }

    // Buscar ou criar ficha
    let ficha = await prisma.fichaCliente.findUnique({ where: { pacienteId } });
    if (!ficha) {
      const clinica = await prisma.clinica.findUnique({ where: { tenantId }, select: { nicho: true } });
      ficha = await prisma.fichaCliente.create({
        data: { pacienteId, tenantId, nicho: clinica?.nicho ?? 'BARBEARIA' },
      });
    }

    const visita = await prisma.visitaCliente.create({
      data: {
        fichaId: ficha.id,
        pacienteId,
        tenantId,
        agendamentoId: agendamentoId || null,
        servicoNome,
        profissionalNome: profissionalNome || null,
        valor: valor ?? null,
        observacoes: observacoes || null,
        satisfacao: satisfacao ?? null,
        fotosIds: fotosIds ?? [],
      },
    });

    // Atualizar stats do paciente
    await prisma.paciente.update({
      where: { id: pacienteId },
      data: {
        ultimaVisita: new Date(),
        contagemVisitas: { increment: 1 },
        ...(valor ? { totalGasto: { increment: valor } } : {}),
      },
    });

    return NextResponse.json(visita);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
