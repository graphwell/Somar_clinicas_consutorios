const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

const tenantId = 'demo-barbearia';

// IDs reais do banco
const PROFS = {
  leo:    'prof-barb-leo',
  rodrigo:'prof-barb-rodrigo',
  thiago: 'prof-barb-thiago',
};
const SERVS = {
  corte:     { id: 'servico-barb-corte-masculino-demo',  dur: 30, preco: 45, nome: 'Corte Masculino' },
  barba:     { id: 'servico-barb-barba-demo',            dur: 20, preco: 30, nome: 'Barba' },
  corteBarba:{ id: 'servico-barb-corte---barba-demo',    dur: 45, preco: 65, nome: 'Corte + Barba' },
  sobrancelha:{id: 'servico-barb-design-sobrancelha-demo',dur:15, preco: 20, nome: 'Design Sobrancelha' },
  hidratacao:{ id: 'servico-barb-hidrata--o-capilar-demo',dur:40, preco: 55, nome: 'Hidratação Capilar' },
  pigm:      { id: 'servico-barb-pigmenta--o-demo',      dur: 60, preco: 90, nome: 'Pigmentação' },
};
const CLIENTES = [
  { id: 'cliente-barb-1', nome: 'Rafael Almeida' },
  { id: 'cliente-barb-2', nome: 'Bruno Cavalcante' },
  { id: 'cliente-barb-3', nome: 'Kaique Souza' },
  { id: 'cliente-barb-4', nome: 'Felipe Nascimento' },
  { id: 'cliente-barb-5', nome: 'Matheus Oliveira' },
  { id: 'cliente-barb-6', nome: 'Diego Fernandes' },
  { id: 'cliente-barb-7', nome: 'Arthur Pereira' },
  { id: 'cliente-demo-barb-11', nome: 'Diego Martins' },
  { id: '5045d651-efd3-4f3f-833b-ec41fbd6a181', nome: 'Gabriel Marcelo' },
  { id: '17b64369-8f2d-4fe6-99f0-45d7336d4e09', nome: 'Pedro Silva' },
  { id: 'f9404f2d-9c03-47ba-a414-6eaa1b4d8c33', nome: 'Francisco Albuquerque' },
  { id: '1db45d7b-0a4b-433d-892f-58520b0c4483', nome: 'Einstein Barbosa' },
];

// Cria um Date no fuso -03:00 (Brasília) para hoje 17/04/2026
function horario(h, m = 0) {
  return new Date(`2026-04-17T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00-03:00`);
}

// Agenda: [profId, clienteIdx, servicoKey, hora, minuto, status]
const agenda = [
  // ── LEONARDO FREITAS ──────────────────────────────────
  [PROFS.leo,     0, 'corteBarba',  9, 0,  'done'],       // Rafael - Corte+Barba 09:00-09:45
  [PROFS.leo,     9, 'corte',      10, 0,  'done'],       // Pedro - Corte 10:00-10:30
  [PROFS.leo,     8, 'corteBarba', 10, 30, 'done'],       // Gabriel - Corte+Barba 10:30-11:15
  [PROFS.leo,     2, 'barba',      11, 30, 'confirmado'], // Kaique - Barba 11:30-11:50
  [PROFS.leo,    10, 'corte',      14, 0,  'confirmado'], // Francisco - Corte 14:00-14:30
  [PROFS.leo,     5, 'corteBarba', 14, 30, 'confirmado'], // Diego F - Corte+Barba 14:30-15:15
  [PROFS.leo,     6, 'corte',      15, 30, 'pendente'],   // Arthur - Corte 15:30-16:00
  [PROFS.leo,    11, 'barba',      16, 0,  'pendente'],   // Einstein - Barba 16:00-16:20
  [PROFS.leo,     3, 'corteBarba', 16, 30, 'pendente'],   // Felipe - Corte+Barba 16:30-17:15

  // ── RODRIGO SANTANA ───────────────────────────────────
  [PROFS.rodrigo, 4, 'hidratacao',  9, 0,  'done'],       // Matheus - Hidratação 09:00-09:40
  [PROFS.rodrigo, 1, 'corteBarba',  9, 30, 'done'],       // Bruno - Corte+Barba 09:30-10:15 (pula 10min buffer)
  [PROFS.rodrigo, 7, 'corte',      10, 30, 'done'],       // Diego M - Corte 10:30-11:00
  [PROFS.rodrigo, 0, 'sobrancelha',11, 0,  'done'],       // Rafael - Sobrancelha 11:00-11:15
  [PROFS.rodrigo, 9, 'corteBarba', 11, 30, 'confirmado'], // Pedro - Corte+Barba 11:30-12:15
  [PROFS.rodrigo, 5, 'corte',      14, 0,  'confirmado'], // Diego F - Corte 14:00-14:30
  [PROFS.rodrigo, 2, 'corteBarba', 14, 30, 'confirmado'], // Kaique - Corte+Barba 14:30-15:15
  [PROFS.rodrigo, 8, 'barba',      15, 30, 'confirmado'], // Gabriel - Barba 15:30-15:50
  [PROFS.rodrigo,10, 'corte',      16, 0,  'pendente'],   // Francisco - Corte 16:00-16:30
  [PROFS.rodrigo, 6, 'corteBarba', 16, 30, 'pendente'],   // Arthur - Corte+Barba 16:30-17:15

  // ── THIAGO MOREIRA ────────────────────────────────────
  [PROFS.thiago,  3, 'pigm',        9, 0,  'done'],       // Felipe - Pigmentação 09:00-10:00
  [PROFS.thiago, 11, 'corteBarba', 10, 0,  'done'],       // Einstein - Corte+Barba 10:00-10:45
  [PROFS.thiago,  6, 'corte',      11, 0,  'done'],       // Arthur - Corte 11:00-11:30
  [PROFS.thiago,  4, 'barba',      11, 30, 'done'],       // Matheus - Barba 11:30-11:50
  [PROFS.thiago,  7, 'pigm',       14, 0,  'confirmado'], // Diego M - Pigmentação 14:00-15:00
  [PROFS.thiago,  1, 'corteBarba', 15, 0,  'confirmado'], // Bruno - Corte+Barba 15:00-15:45
  [PROFS.thiago,  0, 'hidratacao', 15, 30, 'pendente'],   // Rafael - Hidratação 15:30-16:10 (overlap intencional c/ buffer)
  [PROFS.thiago,  9, 'corte',      16, 30, 'pendente'],   // Pedro - Corte 16:30-17:00
  [PROFS.thiago,  2, 'pigm',       17, 0,  'pendente'],   // Kaique - Pigmentação 17:00-18:00
];

async function main() {
  console.log('🗑  Removendo agendamentos de demo do dia anterior...');
  await prisma.agendamento.deleteMany({
    where: {
      tenantId,
      dataHora: {
        gte: new Date('2026-04-17T00:00:00-03:00'),
        lte: new Date('2026-04-17T23:59:59-03:00'),
      },
    },
  });

  console.log('📅 Criando agendamentos demo...');
  let ok = 0;

  for (const [profId, cliIdx, servKey, h, m, status] of agenda) {
    const serv = SERVS[servKey];
    const cli  = CLIENTES[cliIdx];
    const inicio = horario(h, m);
    const fim = new Date(inicio.getTime() + serv.dur * 60000);

    await prisma.agendamento.create({
      data: {
        tenantId,
        eventoId: randomUUID(),
        profissionalId: profId,
        pacienteId: cli.id,
        servicoId: serv.id,
        dataHora: inicio,
        fimDataHora: fim,
        durationMinutes: serv.dur,
        status,
        tipoAtendimento: 'particular',
        observacoes: null,
      },
    });

    const prof = Object.entries(PROFS).find(([,v]) => v === profId)[0];
    console.log(`  ✅ ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} [${prof.toUpperCase()}] ${cli.nome} → ${serv.nome} (${status})`);
    ok++;
  }

  console.log(`\n🎉 ${ok} agendamentos criados!`);
  await prisma.$disconnect();
}

main().catch(console.error);
