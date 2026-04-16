import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const a = await p.agendamento.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { profissional: true, paciente: true }
  });
  console.log(a.map(x => ({
    id: x.id,
    profissionalId: x.profissionalId,
    profNome: x.profissional?.nome,
    paciente: x.paciente.nome,
    dataHora: x.dataHora.toISOString(),
    createdAt: x.createdAt.toISOString()
  })));
}
main().finally(() => p.$disconnect());
