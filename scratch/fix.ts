import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.agendamento.update({
  where: { id: 'c997a301-7834-4a2f-8c45-98875b4bfd0b' },
  data: { profissionalId: 'prof-barb-leo' }
}).then(console.log).finally(() => p.$disconnect());
