/**
 * Script de correção para garantir que o link público de agendamento
 * funciona end-to-end com dados reais de teste.
 * 
 * Execução: npx ts-node --project tsconfig.json prisma/fix-demo-public.ts
 * (ou via: npx tsx prisma/fix-demo-public.ts)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Iniciando correções do link público de agendamento...')

  // ─── 1. Garantir slugs corretos nas clínicas demo ─────────────────────────
  console.log('\n📌 1. Atualizando slugs das clínicas demo...')

  await prisma.clinica.update({
    where: { tenantId: 'demo-barbearia' },
    data: {
      slug: 'barbearia-demo-synka',
      descricao: 'Barbearia demonstração Synka — corte, barba e estilo masculino',
      configBranding: {
        primaryColor: '#2D4A6A',
        logoUrl: null,
      },
      aceitaPagamento: false,
      openingTime: '09:00',
      closingTime: '20:00',
      workingDays: '1,2,3,4,5,6',
    },
  })
  console.log('  ✅ barbearia-demo-synka')

  await prisma.clinica.update({
    where: { tenantId: 'demo-synka-master' },
    data: {
      slug: 'clinica-demo-synka',
      descricao: 'Clínica demonstração Synka — medicina, odontologia, psicologia e nutrição',
      configBranding: {
        primaryColor: '#40916C',
        logoUrl: null,
      },
      aceitaPagamento: false,
    },
  })
  console.log('  ✅ clinica-demo-synka')

  // ─── 2. Garantir schedules para os profissionais da barbearia ─────────────
  console.log('\n📅 2. Verificando schedules dos profissionais da barbearia...')

  const profBarbearia = await prisma.profissional.findMany({
    where: { tenantId: 'demo-barbearia', ativo: true },
    include: { escalas: true },
  })

  for (const prof of profBarbearia) {
    console.log(`  → ${prof.nome}: ${prof.escalas.length} escalas já cadastradas`)
    if (prof.escalas.length > 0) continue // já tem escalas, pular

    // Rodrigo e Leo: seg-sab; Thiago: ter-sab
    const dias = prof.nome.toLowerCase().includes('thiago')
      ? [2, 3, 4, 5, 6]
      : [1, 2, 3, 4, 5, 6]

    for (const dia of dias) {
      const isSabado = dia === 6
      await prisma.professionalSchedule.upsert({
        where: { profissionalId_diaSemana: { profissionalId: prof.id, diaSemana: dia } },
        update: {},
        create: {
          profissionalId: prof.id,
          diaSemana: dia,
          horaInicio: '09:00',
          horaFim: isSabado ? '16:00' : '20:00',
          lunchStart: isSabado ? null : '13:00',
          lunchEnd: isSabado ? null : '14:00',
          ativo: true,
        },
      })
    }
    console.log(`  ✅ Escalas criadas para ${prof.nome}`)
  }

  // ─── 3. Garantir serviços da barbearia existem ────────────────────────────
  console.log('\n💈 3. Verificando serviços da barbearia...')

  const servicosDef = [
    { id: 'servico-barb-corte-masculino-demo',       nome: 'Corte Masculino',   dur: 30, buf: 5,  preco: 45, color: '#1B2B3A' },
    { id: 'servico-barb-barba-demo',                  nome: 'Barba',             dur: 20, buf: 5,  preco: 30, color: '#2D4A6A' },
    { id: 'servico-barb-corte---barba-demo',          nome: 'Corte + Barba',     dur: 45, buf: 10, preco: 65, color: '#40916C' },
    { id: 'servico-barb-design-sobrancelha-demo',     nome: 'Design Sobrancelha',dur: 15, buf: 5,  preco: 20, color: '#8A9BB0' },
  ]

  const servicosCriados: string[] = []
  for (const s of servicosDef) {
    await prisma.servico.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        nome: s.nome,
        duracaoMinutos: s.dur,
        bufferTimeMinutes: s.buf,
        preco: s.preco,
        color: s.color,
        ativo: true,
        tenantId: 'demo-barbearia',
      },
    })
    servicosCriados.push(s.id)
    console.log(`  ✅ ${s.nome}`)
  }

  // ─── 4. Vincular profissionais ↔ serviços ────────────────────────────────
  console.log('\n🔗 4. Vinculando profissionais ↔ serviços da barbearia...')

  const profissionaisBarbearia = await prisma.profissional.findMany({
    where: { tenantId: 'demo-barbearia', ativo: true },
    include: { servicos: { select: { id: true } } },
  })

  const servicosBarbearia = await prisma.servico.findMany({
    where: { tenantId: 'demo-barbearia', ativo: true },
    select: { id: true, nome: true },
  })

  for (const prof of profissionaisBarbearia) {
    const jaVinculados = prof.servicos.map(s => s.id)
    const faltando = servicosBarbearia.filter(s => !jaVinculados.includes(s.id))
    
    if (faltando.length === 0) {
      console.log(`  ✓ ${prof.nome} já vinculado a todos os serviços`)
      continue
    }

    await prisma.profissional.update({
      where: { id: prof.id },
      data: {
        servicos: {
          connect: faltando.map(s => ({ id: s.id })),
        },
      },
    })
    console.log(`  ✅ ${prof.nome} vinculado a ${faltando.length} novo(s) serviço(s)`)
  }

  // ─── 5. Verificação final ─────────────────────────────────────────────────
  console.log('\n🔍 5. Verificação final...')

  const clinicaBarb = await prisma.clinica.findUnique({
    where: { tenantId: 'demo-barbearia' },
    select: { nome: true, slug: true },
  })

  const profComEscalas = await prisma.profissional.findMany({
    where: { tenantId: 'demo-barbearia', ativo: true },
    include: {
      escalas: true,
      servicos: { select: { nome: true } },
    },
  })

  console.log(`\n  Clínica: ${clinicaBarb?.nome} → slug: ${clinicaBarb?.slug}`)
  for (const p of profComEscalas) {
    console.log(`  ${p.nome}: ${p.escalas.length} dia(s) de trabalho, ${p.servicos.length} serviço(s)`)
    p.servicos.forEach(s => console.log(`    - ${s.nome}`))
  }

  console.log('\n✅ Tudo corrigido! Teste agora:')
  console.log('  GET /api/public/clinic/barbearia-demo-synka')
  console.log('  GET /api/public/clinic/barbearia-demo-synka/services')
  console.log('  Página: /agendar/barbearia-demo-synka')
}

main()
  .catch(e => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
