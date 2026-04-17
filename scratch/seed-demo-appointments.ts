import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando clínica...');
  let clinicaId = 'demo-synka-master';

  if (!clinicaId) {
    console.log('Nenhuma clínica encontrada.');
    return;
  }

  const clinica = await prisma.clinica.findUnique({
    where: { tenantId: clinicaId },
    include: {
      profissionais: true,
      servicos: true,
      pacientes: true
    }
  });

  if (!clinica) {
    console.log('Clínica não encontrada.');
    return;
  }

  console.log(`Clínica: ${clinica.nome} - Profissionais: ${clinica.profissionais.length}`);

  if (clinica.profissionais.length === 0 || clinica.servicos.length === 0) {
    console.log('Sem profissionais ou serviços para agendar.');
    return;
  }

  // Paciente demo (pega o primeiro ou cria um)
  let paciente = clinica.pacientes[0];
  if (!paciente) {
    paciente = await prisma.paciente.create({
      data: {
        nome: 'Paciente Demo',
        telefone: '5511999999999',
        tenantId: clinica.tenantId
      }
    });
  }

  const datasOrigem = ['2026-04-16', '2026-04-17', '2026-04-18', '2026-04-20', '2026-04-21'];
  const horariosDisponiveis = ['08:00', '09:00', '10:30', '14:00', '15:30', '16:00', '17:00'];
  const statusPossiveis = ['pendente', 'confirmado', 'done', 'confirmado'];

  let count = 0;

  for (const dateStr of datasOrigem) {
    console.log(`\nGerando para o dia ${dateStr}...`);
    for (const profissional of clinica.profissionais) {
      // Cria 1 ou 2 agendamentos por profissional por dia
      const numAgendamentos = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < numAgendamentos; i++) {
        const servico = clinica.servicos[Math.floor(Math.random() * clinica.servicos.length)];
        const horario = horariosDisponiveis[Math.floor(Math.random() * horariosDisponiveis.length)];
        const status = statusPossiveis[Math.floor(Math.random() * statusPossiveis.length)];
        
        const dataStr = `${dateStr}T${horario}:00.000Z`;
        const horaSpl = horario.split(':');
        const nextHour = String(parseInt(horaSpl[0]) + 1).padStart(2, '0');
        const dataFimStr = `${dateStr}T${nextHour}:${horaSpl[1]}:00.000Z`;
        
        const existing = await prisma.agendamento.findFirst({
          where: {
            profissionalId: profissional.id,
            dataHora: dataStr
          }
        });

        if (!existing) {
          await prisma.agendamento.create({
            data: {
              dataHora: new Date(dataStr),
              fimDataHora: new Date(dataFimStr),
              durationMinutes: 60,
              status: status as any,
              pacienteId: paciente.id,
              profissionalId: profissional.id,
              servicoId: servico.id,
              tenantId: clinica.tenantId,
              origemAgendamento: 'SISTEMA',
              eventoId: 'seed-' + Math.random().toString(36).substring(2, 10)
            }
          });
          count++;
          console.log(`+ [${profissional.nome}] ${dateStr} às ${horario}`);
        }
      }
    }
  }
  
  console.log(`\nSucesso! ${count} agendamentos demo criados.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
