import prisma from '../src/lib/prisma'

const TENANT = 'demo-barbearia'

function dataHora(diasOffset: number, hora: number, minuto = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + diasOffset)
  d.setUTCHours(hora + 3, minuto, 0, 0)
  return d
}

async function main() {
  const clinica = await prisma.clinica.findFirst({ where: { tenantId: TENANT } })
  if (!clinica) throw new Error('Clínica demo-barbearia não encontrada')

  const profs = await prisma.profissional.findMany({ where: { tenantId: TENANT, ativo: true } })
  const servicos = await prisma.servico.findMany({ where: { tenantId: TENANT, ativo: true } })
  let pacientes = await prisma.paciente.findMany({ where: { tenantId: TENANT } })

  console.log(`Profissionais: ${profs.length}, Serviços: ${servicos.length}, Pacientes: ${pacientes.length}`)
  if (!profs.length || !servicos.length) throw new Error('Faltam profissionais ou serviços')

  // ─── Pacientes demo ───────────────────────────────────────────────────────

  const nomes = [
    'Carlos Eduardo', 'Rafael Oliveira', 'Bruno Mendes',
    'Lucas Ferreira', 'Mateus Costa', 'Gabriel Santos',
    'Pedro Alves', 'Joao Victor', 'Andre Lima',
    'Felipe Rocha', 'Thiago Nunes', 'Diego Martins',
  ]

  for (let i = pacientes.length; i < 12; i++) {
    await prisma.paciente.upsert({
      where: { id: `cliente-demo-barb-${i}` },
      update: {},
      create: {
        id: `cliente-demo-barb-${i}`,
        tenantId: TENANT,
        nome: nomes[i] ?? `Cliente Demo ${i}`,
        telefone: `859999${String(i).padStart(5, '0')}`,
        dataNascimento: new Date(1985 + (i % 15), i % 12, (i % 28) + 1),
      },
    })
  }

  pacientes = await prisma.paciente.findMany({ where: { tenantId: TENANT } })
  const cl = pacientes.slice(0, 12)

  const p0 = profs[0]
  const p1 = profs[1] ?? profs[0]
  const p2 = profs[2] ?? profs[0]
  const s0 = servicos[0]
  const s1 = servicos[1] ?? servicos[0]
  const s2 = servicos[2] ?? servicos[0]
  const dur = s0.duracao ?? 30

  // ─── Agendamentos ─────────────────────────────────────────────────────────

  const ags = [
    { prof: p0, serv: s2, cl: cl[0],  offset: 0,  hora: 9,  st: 'confirmado' },
    { prof: p0, serv: s0, cl: cl[1],  offset: 0,  hora: 10, st: 'confirmado' },
    { prof: p1, serv: s1, cl: cl[2],  offset: 0,  hora: 9,  st: 'em_atendimento' },
    { prof: p1, serv: s2, cl: cl[3],  offset: 0,  hora: 11, st: 'pendente' },
    { prof: p2, serv: s0, cl: cl[4],  offset: 0,  hora: 10, st: 'done' },
    { prof: p2, serv: s1, cl: cl[5],  offset: 0,  hora: 14, st: 'pendente' },
    { prof: p0, serv: s0, cl: cl[6],  offset: 1,  hora: 9,  st: 'pendente' },
    { prof: p0, serv: s2, cl: cl[7],  offset: 1,  hora: 10, st: 'confirmado' },
    { prof: p1, serv: s1, cl: cl[8],  offset: 1,  hora: 11, st: 'pendente' },
    { prof: p2, serv: s0, cl: cl[9],  offset: 1,  hora: 14, st: 'confirmado' },
    { prof: p0, serv: s2, cl: cl[10], offset: 2,  hora: 9,  st: 'pendente' },
    { prof: p1, serv: s0, cl: cl[11], offset: 2,  hora: 10, st: 'confirmado' },
    { prof: p0, serv: s0, cl: cl[0],  offset: -1, hora: 9,  st: 'done' },
    { prof: p0, serv: s2, cl: cl[1],  offset: -1, hora: 11, st: 'done' },
    { prof: p1, serv: s1, cl: cl[2],  offset: -1, hora: 14, st: 'done' },
    { prof: p2, serv: s0, cl: cl[3],  offset: -1, hora: 10, st: 'cancelado' },
    { prof: p0, serv: s2, cl: cl[4],  offset: -2, hora: 9,  st: 'done' },
    { prof: p1, serv: s0, cl: cl[5],  offset: -2, hora: 11, st: 'done' },
    { prof: p2, serv: s2, cl: cl[6],  offset: -3, hora: 10, st: 'done' },
    { prof: p0, serv: s1, cl: cl[7],  offset: -3, hora: 14, st: 'cancelado' },
    { prof: p1, serv: s0, cl: cl[8],  offset: -5, hora: 9,  st: 'done' },
    { prof: p2, serv: s2, cl: cl[9],  offset: -7, hora: 11, st: 'done' },
  ]

  for (let i = 0; i < ags.length; i++) {
    const ag = ags[i]
    const inicio = dataHora(ag.offset, ag.hora)
    const fim = new Date(inicio.getTime() + dur * 60000)
    await prisma.agendamento.upsert({
      where: { eventoId: `demo-ag-barb-${i}` },
      update: { status: ag.st as any },
      create: {
        eventoId: `demo-ag-barb-${i}`,
        tenantId: TENANT,
        pacienteId: ag.cl.id,
        profissionalId: ag.prof.id,
        servicoId: ag.serv.id,
        dataHora: inicio,
        fimDataHora: fim,
        durationMinutes: dur,
        status: ag.st as any,
        origemAgendamento: 'recepcao',
      },
    })
  }
  console.log(`✅ ${ags.length} agendamentos`)

  // ─── Financeiro ───────────────────────────────────────────────────────────

  const transacoes = [
    { desc: 'Corte + Barba — Leonardo',   valor: 75,   tipo: 'income',  dias: -1, status: 'paid' },
    { desc: 'Corte Masculino — Rodrigo',  valor: 45,   tipo: 'income',  dias: -1, status: 'paid' },
    { desc: 'Barba — Thiago',             valor: 35,   tipo: 'income',  dias: -1, status: 'paid' },
    { desc: 'Corte + Barba — Leonardo',   valor: 75,   tipo: 'income',  dias: -2, status: 'paid' },
    { desc: 'Corte Masculino — Rodrigo',  valor: 45,   tipo: 'income',  dias: -2, status: 'paid' },
    { desc: 'Corte + Barba — Thiago',     valor: 75,   tipo: 'income',  dias: -3, status: 'paid' },
    { desc: 'Barba — Leonardo',           valor: 35,   tipo: 'income',  dias: -3, status: 'paid' },
    { desc: 'Corte Masculino — Rodrigo',  valor: 45,   tipo: 'income',  dias: -5, status: 'paid' },
    { desc: 'Corte + Barba — Thiago',     valor: 75,   tipo: 'income',  dias: -5, status: 'paid' },
    { desc: 'Corte Masculino — Leonardo', valor: 45,   tipo: 'income',  dias: -7, status: 'paid' },
    { desc: 'Produtos e insumos',         valor: 180,  tipo: 'expense', dias: -7, status: 'paid' },
    { desc: 'Aluguel — abril',            valor: 1500, tipo: 'expense', dias: -5, status: 'paid' },
    { desc: 'Energia eletrica',           valor: 220,  tipo: 'expense', dias: -3, status: 'paid' },
    { desc: 'Atendimentos pendentes',     valor: 230,  tipo: 'income',  dias: 1,  status: 'pending' },
  ]

  for (let i = 0; i < transacoes.length; i++) {
    const t = transacoes[i]
    const dt = new Date(); dt.setDate(dt.getDate() + t.dias)
    await prisma.transacaoFinanceira.upsert({
      where: { id: `demo-fin-barb-${i}` },
      update: {},
      create: {
        id: `demo-fin-barb-${i}`,
        tenantId: TENANT,
        descricao: t.desc,
        valor: t.valor,
        tipo: t.tipo,
        status: t.status,
        dataPagamento: t.status === 'paid' ? dt : null,
        dataVencimento: dt,
        categoria: t.tipo === 'income' ? 'servicos' : 'operacional',
      },
    })
  }
  console.log(`✅ ${transacoes.length} transações`)

  // ─── Vitrine ──────────────────────────────────────────────────────────────

  const cats = [
    { id: 'cat-barb-1', nome: 'Pomadas e Finalizadores' },
    { id: 'cat-barb-2', nome: 'Cuidados com a Barba' },
    { id: 'cat-barb-3', nome: 'Shampoos' },
  ]
  for (const cat of cats) {
    await prisma.categoriaProduto.upsert({
      where: { id: cat.id },
      update: {},
      create: { id: cat.id, tenantId: TENANT, nome: cat.nome },
    })
  }

  const produtos = [
    { id: 'prod-barb-1', nome: 'Pomada Matte Black',     descricao: 'Fixacao forte, efeito seco e natural',   preco: 35.90, categoriaId: 'cat-barb-1', estoque: 15, tags: ['destaque'] },
    { id: 'prod-barb-2', nome: 'Pomada Modeladora Gold', descricao: 'Brilho intenso, fixacao media',           preco: 32.90, categoriaId: 'cat-barb-1', estoque: 10, tags: [] },
    { id: 'prod-barb-3', nome: 'Oleo para Barba Premium',descricao: 'Hidrata e amacia, aroma amadeirado',      preco: 28.90, categoriaId: 'cat-barb-2', estoque: 20, tags: ['destaque'] },
    { id: 'prod-barb-4', nome: 'Balm para Barba',        descricao: 'Condiciona e modela a barba',             preco: 24.90, categoriaId: 'cat-barb-2', estoque: 12, tags: [] },
    { id: 'prod-barb-5', nome: 'Shampoo Anticaspa Men',  descricao: 'Limpeza profunda, controle de caspa',     preco: 22.90, categoriaId: 'cat-barb-3', estoque: 8,  tags: [] },
    { id: 'prod-barb-6', nome: 'Combo Cuidado Total',    descricao: 'Pomada + Oleo + Balm com desconto',       preco: 79.90, categoriaId: 'cat-barb-1', estoque: 5,  tags: ['destaque', 'combo'] },
  ]
  for (const p of produtos) {
    await prisma.produto.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, tenantId: TENANT, status: 'active' },
    })
  }
  console.log(`✅ ${produtos.length} produtos`)

  // ─── Planos de assinatura ─────────────────────────────────────────────────

  await prisma.planoAssinatura.upsert({
    where: { id: 'plano-barb-1' },
    update: {},
    create: {
      id: 'plano-barb-1',
      empresaId: TENANT,
      tenantId: TENANT,
      nome: 'Plano Mensal Corte',
      descricao: '4 cortes por mes com prioridade',
      valor: 99.90,
      periodicidade: 'mensal',
      ativo: true,
      servicos: [{ servicoId: s0.id, nomeServico: s0.nome, tipo: 'limitado', quantidade: 4 }],
      agendamentoPrioritario: true,
    },
  })

  await prisma.planoAssinatura.upsert({
    where: { id: 'plano-barb-2' },
    update: {},
    create: {
      id: 'plano-barb-2',
      empresaId: TENANT,
      tenantId: TENANT,
      nome: 'Plano VIP Corte + Barba',
      descricao: 'Cortes ilimitados + 4 barbas',
      valor: 159.90,
      periodicidade: 'mensal',
      ativo: true,
      servicos: [
        { servicoId: s0.id, nomeServico: s0.nome, tipo: 'ilimitado', quantidade: null },
        { servicoId: s1.id, nomeServico: s1.nome, tipo: 'limitado',  quantidade: 4 },
      ],
      agendamentoPrioritario: true,
      descontoServicosExtras: 10,
    },
  })

  // Assinar 2 clientes
  const fimMes = new Date(); fimMes.setMonth(fimMes.getMonth() + 1)
  await prisma.assinaturaCliente.upsert({
    where: { id: 'assin-barb-1' },
    update: {},
    create: {
      id: 'assin-barb-1',
      tenantId: TENANT,
      pacienteId: cl[0].id,
      planoId: 'plano-barb-2',
      status: 'ativo',
      valorPago: 159.90,
      periodoInicio: new Date(),
      periodoFim: fimMes,
      contadorUso: { [s0.id]: { usado: 2, limite: null }, [s1.id]: { usado: 1, limite: 4 } },
    },
  })
  await prisma.assinaturaCliente.upsert({
    where: { id: 'assin-barb-2' },
    update: {},
    create: {
      id: 'assin-barb-2',
      tenantId: TENANT,
      pacienteId: cl[1].id,
      planoId: 'plano-barb-1',
      status: 'ativo',
      valorPago: 99.90,
      periodoInicio: new Date(),
      periodoFim: fimMes,
      contadorUso: { [s0.id]: { usado: 1, limite: 4 } },
    },
  })

  console.log('✅ Planos e assinaturas')
  console.log('\n✅ Seed barbearia demo completo!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
