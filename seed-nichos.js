const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const nichos = [
  {
    nomeNicho: 'Salão de Beleza',
    labelCliente: 'Cliente',
    labelServico: 'Serviço',
    labelProfissional: 'Profissional',
    servicosPadraoJson: ['Corte masc.', 'Corte fem.', 'Coloração', 'Escova', 'Progressiva', 'Sobrancelha', 'Hidratação']
  },
  {
    nomeNicho: 'Barbearia',
    labelCliente: 'Cliente',
    labelServico: 'Serviço',
    labelProfissional: 'Barbeiro',
    servicosPadraoJson: ['Corte', 'Barba', 'Combo corte+barba', 'Sobrancelha', 'Pigmentação']
  },
  {
    nomeNicho: 'Clínica de Estética',
    labelCliente: 'Cliente',
    labelServico: 'Procedimento',
    labelProfissional: 'Profissional',
    servicosPadraoJson: ['Limpeza de pele', 'Peeling', 'Microagulhamento', 'Drenagem', 'Depilação', 'Modelagem']
  },
  {
    nomeNicho: 'Clínica Médica — Monoespecialidade',
    labelCliente: 'Paciente',
    labelServico: 'Consulta',
    labelProfissional: 'Médico',
    servicosPadraoJson: ['Consulta', 'Retorno', 'Exame', 'Cirurgia', 'Procedimento']
  },
  {
    nomeNicho: 'Clínica Médica — Multiespecialidades',
    labelCliente: 'Paciente',
    labelServico: 'Consulta',
    labelProfissional: 'Médico',
    servicosPadraoJson: ['Consulta', 'Retorno', 'Exame', 'Cirurgia', 'Procedimento']
  },
  {
    nomeNicho: 'Clínica de Fisioterapia',
    labelCliente: 'Paciente',
    labelServico: 'Sessão',
    labelProfissional: 'Fisioterapeuta',
    servicosPadraoJson: ['Avaliação', 'Sessão', 'Pilates', 'RPG', 'Dry Needling']
  },
  {
    nomeNicho: 'Odontologia',
    labelCliente: 'Paciente',
    labelServico: 'Atendimento',
    labelProfissional: 'Dentista',
    servicosPadraoJson: ['Consulta', 'Limpeza', 'Restauração', 'Extração', 'Ortodontia']
  }
];

async function main() {
  console.log('Iniciando seed de Nichos...');
  for (const n of nichos) {
    await prisma.nichoConfig.upsert({
      where: { nomeNicho: n.nomeNicho },
      update: n,
      create: n
    });
    console.log(`✅ Nicho salvo: ${n.nomeNicho}`);
  }
  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
