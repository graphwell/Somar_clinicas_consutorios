import prisma from '../src/lib/prisma'

const SERVICOS_POR_NICHO: Record<string, Array<{
  nome: string; descricao: string; duracaoMinutos: number;
  preco: number; categoria: string; imagemUrl: string;
}>> = {

  BARBEARIA: [
    { nome: 'Corte Masculino', descricao: 'Corte personalizado com acabamento profissional.', duracaoMinutos: 30, preco: 45.00, categoria: 'Corte', imagemUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80' },
    { nome: 'Barba', descricao: 'Modelagem e aparagem da barba com toalha quente.', duracaoMinutos: 30, preco: 35.00, categoria: 'Barba', imagemUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80' },
    { nome: 'Corte + Barba', descricao: 'Combo completo corte e barba.', duracaoMinutos: 60, preco: 70.00, categoria: 'Combo', imagemUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80' },
    { nome: 'Degradê', descricao: 'Corte degradê com acabamento preciso.', duracaoMinutos: 40, preco: 55.00, categoria: 'Corte', imagemUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=80' },
    { nome: 'Pezinho', descricao: 'Acabamento na nuca e laterais.', duracaoMinutos: 15, preco: 20.00, categoria: 'Acabamento', imagemUrl: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&q=80' },
    { nome: 'Sobrancelha', descricao: 'Design e modelagem de sobrancelha masculina.', duracaoMinutos: 15, preco: 15.00, categoria: 'Estética', imagemUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80' },
    { nome: 'Hidratação Capilar', descricao: 'Tratamento hidratante para cabelos ressecados.', duracaoMinutos: 30, preco: 40.00, categoria: 'Tratamento', imagemUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=400&q=80' },
    { nome: 'Coloração', descricao: 'Coloração e tingimento capilar.', duracaoMinutos: 60, preco: 80.00, categoria: 'Coloração', imagemUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' },
  ],

  SALAO_BELEZA: [
    { nome: 'Corte Feminino', descricao: 'Corte personalizado para todos os tipos de cabelo.', duracaoMinutos: 60, preco: 80.00, categoria: 'Corte', imagemUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&q=80' },
    { nome: 'Escova', descricao: 'Escova modeladora com brilho e volume.', duracaoMinutos: 60, preco: 70.00, categoria: 'Tratamento', imagemUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' },
    { nome: 'Progressiva', descricao: 'Alisamento progressivo duradouro.', duracaoMinutos: 180, preco: 250.00, categoria: 'Química', imagemUrl: 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=400&q=80' },
    { nome: 'Coloração', descricao: 'Coloração completa com produtos profissionais.', duracaoMinutos: 120, preco: 150.00, categoria: 'Coloração', imagemUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' },
    { nome: 'Mechas', descricao: 'Mechas e luzes personalizadas.', duracaoMinutos: 180, preco: 200.00, categoria: 'Coloração', imagemUrl: 'https://images.unsplash.com/photo-1519735777090-ec97162dc266?w=400&q=80' },
    { nome: 'Manicure', descricao: 'Manicure completa com esmaltação.', duracaoMinutos: 60, preco: 45.00, categoria: 'Unhas', imagemUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' },
    { nome: 'Pedicure', descricao: 'Pedicure completa com esmaltação.', duracaoMinutos: 60, preco: 55.00, categoria: 'Unhas', imagemUrl: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=400&q=80' },
    { nome: 'Design de Sobrancelha', descricao: 'Modelagem e design profissional de sobrancelhas.', duracaoMinutos: 30, preco: 35.00, categoria: 'Estética', imagemUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80' },
    { nome: 'Depilação', descricao: 'Depilação com cera quente ou fria.', duracaoMinutos: 30, preco: 40.00, categoria: 'Depilação', imagemUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80' },
  ],

  CLINICA_ESTETICA: [
    { nome: 'Limpeza de Pele', descricao: 'Limpeza profunda com extração e hidratação.', duracaoMinutos: 60, preco: 120.00, categoria: 'Facial', imagemUrl: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&q=80' },
    { nome: 'Drenagem Linfática', descricao: 'Massagem drenante para redução de inchaço.', duracaoMinutos: 60, preco: 100.00, categoria: 'Corporal', imagemUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80' },
    { nome: 'Hidratação Facial', descricao: 'Tratamento hidratante profundo para a pele.', duracaoMinutos: 60, preco: 110.00, categoria: 'Facial', imagemUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80' },
    { nome: 'Peeling Químico', descricao: 'Renovação celular com peeling profissional.', duracaoMinutos: 45, preco: 150.00, categoria: 'Facial', imagemUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80' },
    { nome: 'Massagem Relaxante', descricao: 'Massagem corporal para alívio de tensões.', duracaoMinutos: 60, preco: 120.00, categoria: 'Corporal', imagemUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80' },
    { nome: 'Design de Sobrancelha', descricao: 'Modelagem profissional com henna ou linha.', duracaoMinutos: 30, preco: 50.00, categoria: 'Estética', imagemUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80' },
    { nome: 'Micropigmentação', descricao: 'Micropigmentação de sobrancelhas fio a fio.', duracaoMinutos: 120, preco: 400.00, categoria: 'Procedimento', imagemUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' },
    { nome: 'Radiofrequência', descricao: 'Tratamento para firmeza e rejuvenescimento.', duracaoMinutos: 60, preco: 180.00, categoria: 'Procedimento', imagemUrl: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&q=80' },
  ],

  CLINICA_MEDICA: [],
  CLINICA_MULTI: [],
  FISIOTERAPIA: [],
  ODONTOLOGIA: [],
  NUTRICAO: [],
  OUTRO: [],
}

async function main() {
  const clinicas = await prisma.clinica.findMany({
    select: { tenantId: true, nome: true, nicho: true },
  })

  console.log(`\nCadastro de serviços para ${clinicas.length} clínicas\n`)

  for (const clinica of clinicas) {
    const nicho = clinica.nicho as string
    const servicos = SERVICOS_POR_NICHO[nicho] ?? []

    if (servicos.length === 0) {
      console.log(`⏭  ${clinica.nome} (${nicho}) — sem serviços padrão definidos`)
      continue
    }

    const existentes = await prisma.servico.count({ where: { tenantId: clinica.tenantId } })

    if (existentes > 0) {
      console.log(`⏭  ${clinica.nome} — já tem ${existentes} serviços, pulando`)
      continue
    }

    let criados = 0
    for (const s of servicos) {
      await prisma.servico.create({
        data: {
          tenantId: clinica.tenantId,
          nome: s.nome,
          descricao: s.descricao,
          duracaoMinutos: s.duracaoMinutos,
          preco: s.preco,
          categoria: s.categoria,
          imagemUrl: s.imagemUrl,
          ativo: true,
        },
      })
      criados++
    }

    console.log(`✅ ${clinica.nome} (${nicho}) — ${criados} serviços criados`)
  }

  console.log('\nConcluído!')
}

main().finally(() => prisma.$disconnect())
