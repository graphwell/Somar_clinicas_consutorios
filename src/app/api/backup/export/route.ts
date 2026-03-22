import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId é obrigatório.' }, { status: 400 });
  }

  const [pacientes, agendamentos] = await Promise.all([
    prisma.paciente.findMany({ where: { tenantId } }),
    prisma.agendamento.findMany({ where: { tenantId }, include: { paciente: { select: { nome: true, telefone: true } } } }),
  ]);

  // Gerar CSV de Pacientes
  const csvPacientes = [
    'id,nome,telefone,criado_em',
    ...pacientes.map(p => `${p.id},"${p.nome}",${p.telefone},${p.createdAt.toISOString()}`),
  ].join('\n');

  // Gerar CSV de Agendamentos
  const csvAgendamentos = [
    'id,paciente_nome,paciente_telefone,dataHora,status,criado_em',
    ...agendamentos.map(a => `${a.id},"${a.paciente.nome}",${a.paciente.telefone},${a.dataHora.toISOString()},${a.status},${a.createdAt.toISOString()}`),
  ].join('\n');

  const backupData = `==== BACKUP SOMAR.IA ====\nTenantId: ${tenantId}\nGerado em: ${new Date().toISOString()}\n\n==== PACIENTES ====\n${csvPacientes}\n\n==== AGENDAMENTOS ====\n${csvAgendamentos}`;

  return new NextResponse(backupData, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup_${tenantId}_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
