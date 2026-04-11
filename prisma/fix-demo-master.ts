import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const TENANT = 'demo-synka-master';

  const profs = await prisma.profissional.findMany({
    where: { tenantId: TENANT, ativo: true },
    include: { servicos: { select: { id: true } }, escalas: { select: { id: true } } },
  });
  const servicos = await prisma.servico.findMany({
    where: { tenantId: TENANT, ativo: true },
    select: { id: true, nome: true },
  });

  console.log('Profissionais:', profs.length, '| Serviços:', servicos.length);

  const mapa: Record<string, string[]> = {
    'Recepção':      [],
    'Estética':      ['Drenagem Linfática','Hidratação Facial','Limpeza de Pele','Massagem Relaxante','Peeling Químico','Bioimpedância'],
    'Clínico Geral': ['Atestado Médico','Consulta Clínica','Retorno'],
    'Odontologia':   ['Clareamento','Extração','Limpeza Dental','Restauração'],
    'Psicologia':    ['Avaliação Psicológica','Sessão Psicológica'],
    'Nutrição':      ['Bioimpedância','Consulta Nutricional','Retorno Nutricional'],
  };

  for (const prof of profs) {
    const esp = prof.especialidade || '';
    const nomesServicos = mapa[esp] ?? [];
    const ids = servicos.filter(s => nomesServicos.includes(s.nome)).map(s => s.id);
    const jaVinculados = prof.servicos.map(s => s.id);
    const faltando = ids.filter(id => !jaVinculados.includes(id));

    if (faltando.length > 0) {
      await prisma.profissional.update({
        where: { id: prof.id },
        data: { servicos: { connect: faltando.map(id => ({ id })) } },
      });
      console.log('✅', prof.nome, '→', faltando.length, 'serviço(s) vinculado(s)');
    } else {
      console.log(ids.length > 0 ? '✓' : '—', prof.nome, ids.length === 0 ? '(sem serviços)' : 'já vinculado');
    }

    // Criar escalas se não tiver
    if (prof.escalas.length === 0 && esp !== 'Recepção') {
      for (const dia of [1, 2, 3, 4, 5]) {
        await prisma.professionalSchedule.upsert({
          where: { profissionalId_diaSemana: { profissionalId: prof.id, diaSemana: dia } },
          update: {},
          create: {
            profissionalId: prof.id,
            diaSemana: dia,
            horaInicio: '08:00',
            horaFim: '18:00',
            lunchStart: '12:00',
            lunchEnd: '13:00',
            ativo: true,
          },
        });
      }
      console.log('  📅 Escalas seg–sex criadas para', prof.nome);
    }
  }

  // Verificação
  console.log('\nVerificação:');
  const check = await prisma.servico.findMany({
    where: { tenantId: TENANT, ativo: true },
    select: { nome: true, profissionais: { select: { nome: true } } },
  });
  check.forEach(s =>
    console.log(' ', s.nome, '→', s.profissionais.map(p => p.nome).join(', ') || '(nenhum)')
  );
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
