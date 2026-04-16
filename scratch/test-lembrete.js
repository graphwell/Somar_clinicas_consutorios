const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(14, 0, 0, 0);
  
  const fimAmanha = new Date(amanha);
  fimAmanha.setHours(15, 0, 0, 0);
  
  const tenantId = 'demo-synka-master';

  // Buscar servico
  const servico = await prisma.servico.findFirst({ where: { tenantId } });
  const servicoId = servico ? servico.id : "";

  // Buscar profissional
  const prof = await prisma.profissional.findFirst({ where: { tenantId } });
  const profissionalId = prof ? prof.id : "";

  const ag = await prisma.agendamento.create({
    data: {
      paciente: {
        create: {
          nome: 'Paciente Teste IA',
          telefone: '5511999999999',
          tenantId
        }
      },
      clinica: { connect: { id: tenantId } },
      dataHora: amanha,
      fimDataHora: fimAmanha,
      status: 'confirmado',
      servicoId,
      profissionalId,
      tenantId
    }
  });
  console.log('Agendamento criado para amanha. Pode apertar Test Workflow no n8n!', ag.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
