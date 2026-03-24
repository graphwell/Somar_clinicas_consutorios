import prisma from './prisma';

export async function createFinancialTransaction(appointmentId: string, tenantId: string, valor: number) {
  try {
    // @ts-ignore
    await prisma.transacaoFinanceira.create({
      data: {
        tenantId,
        agendamentoId: appointmentId,
        valor,
        tipo: 'income',
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Erro ao criar transação automática:', error);
  }
}

export async function updateFinancialAndClientStats(appointmentId: string, tenantId: string, status: string) {
  try {
    // @ts-ignore
    const appointment = await prisma.agendamento.findUnique({
      where: { id: appointmentId },
      include: { paciente: true, servico: true }
    });

    if (!appointment) return;

    let financialStatus = 'pending';
    if (status === 'confirmado') financialStatus = 'previsto';
    if (status === 'done') financialStatus = 'realizado';
    if (status === 'cancelado') financialStatus = 'canceled';

    // Update Financial Transaction
    // @ts-ignore
    await prisma.transacaoFinanceira.updateMany({
      where: { agendamentoId: appointmentId, tenantId },
      data: { status: financialStatus }
    });

    // If DONE, update Client Stats
    if (status === 'done' && appointment.pacienteId) {
      const valorServico = appointment.servico?.preco || 0;
      
      // @ts-ignore
      await prisma.paciente.update({
        where: { id: appointment.pacienteId },
        data: {
          totalGasto: { increment: valorServico },
          contagemVisitas: { increment: 1 },
          ultimaVisita: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar automação financeira/cliente:', error);
  }
}
