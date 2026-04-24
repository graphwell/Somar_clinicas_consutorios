import prisma from '../src/lib/prisma'

// Produtos mapeados das pastas public/produtos/{fabricante}/
const CATALOGO: Array<{
  fabricante: string      // nome da categoria / pasta
  nome: string
  descricao: string
  preco: number
  estoque: number
  tags: string[]
  arquivo: string         // nome exato do arquivo na pasta
}> = [
  // ── La Roche-Posay ─────────────────────────────────────────────
  { fabricante: 'La Roche-Posay', nome: 'Hyalu B5 Repair Sérum', descricao: 'Sérum reparador com ácido hialurônico B5 para hidratação profunda.', preco: 149.90, estoque: 10, tags: ['Recomendado'], arquivo: 'HyaluB5RepairSérumLaRoche-Posay.png' },
  { fabricante: 'La Roche-Posay', nome: 'Effaclar Sérum Ultra Concentrado', descricao: 'Sérum anti-imperfeições de alta concentração.', preco: 139.90, estoque: 8, tags: [], arquivo: 'La Roche-PosayEffaclarSérumUltraConcentrado.png' },
  { fabricante: 'La Roche-Posay', nome: 'Pure Vitamin C10 30ml', descricao: 'Vitamina C pura para iluminação e uniformização do tom.', preco: 129.90, estoque: 12, tags: ['Mais vendido'], arquivo: 'LaRoche-PosayPureVitaminC10-30ml.png' },
  { fabricante: 'La Roche-Posay', nome: 'Anthelios Protetor Solar FPS60', descricao: 'Proteção solar diária de alta eficácia.', preco: 119.90, estoque: 15, tags: ['Mais vendido'], arquivo: 'ProtetorSolarLa Roche-PosayAntheliosFPS60.png' },

  // ── Adcos ──────────────────────────────────────────────────────
  { fabricante: 'Adcos', nome: 'Hyalu 6+ Sérum Facial', descricao: 'Sérum facial com 6 tipos de ácido hialurônico.', preco: 89.90, estoque: 10, tags: [], arquivo: 'AdcosHyalu6+SérumFacial.png' },
  { fabricante: 'Adcos', nome: 'Sérum Clareador Profissional', descricao: 'Clareamento e uniformização do tom da pele.', preco: 99.90, estoque: 8, tags: ['Recomendado'], arquivo: 'AdcosSérumClareadorProfissional.png' },
  { fabricante: 'Adcos', nome: 'Kit Sérum + Protetor Solar', descricao: 'Combo completo de tratamento e proteção diária.', preco: 169.90, estoque: 5, tags: ['Mais vendido'], arquivo: 'Kit Adcos Sérum + Protetor Solar.png' },
  { fabricante: 'Adcos', nome: 'Protetor Solar Fluid FPS 99', descricao: 'Proteção máxima com textura fluida e toque seco.', preco: 89.90, estoque: 14, tags: [], arquivo: 'Protetor Solar Adcos Fluid FPS 99.png' },
  { fabricante: 'Adcos', nome: 'Sérum Vitamina C15 + Ácido Hialurônico 15ml', descricao: 'Dupla ação antioxidante e hidratante.', preco: 94.90, estoque: 9, tags: [], arquivo: 'SérumAdcosVitaminaC15ÁcidoHialurônico15ml.png' },
  { fabricante: 'Adcos', nome: 'Vitamina C20', descricao: 'Alta concentração de vitamina C para máxima eficácia.', preco: 109.90, estoque: 7, tags: [], arquivo: 'adcos_vitamina c20.png' },

  // ── Bandido ────────────────────────────────────────────────────
  { fabricante: 'Bandido', nome: 'Army Gum Effect', descricao: 'Pomada modeladora com efeito goma e fixação média.', preco: 39.90, estoque: 20, tags: [], arquivo: 'bandido_armygumeffect.png' },
  { fabricante: 'Bandido', nome: 'Fiber Wax 7', descricao: 'Cera de fibra com fixação forte e acabamento natural.', preco: 34.90, estoque: 18, tags: ['Mais vendido'], arquivo: 'bandido_fiberwax7.png' },

  // ── Barba Forte ────────────────────────────────────────────────
  { fabricante: 'Barba Forte', nome: 'Killer Hidratação', descricao: 'Creme hidratante para barba com fragrância marcante.', preco: 45.90, estoque: 16, tags: ['Recomendado'], arquivo: 'barbaforte_killer_hidrtacao.png' },

  // ── Bioage ─────────────────────────────────────────────────────
  { fabricante: 'Bioage', nome: 'Sérum Vitamina C', descricao: 'Antioxidante potente para pele radiante e uniforme.', preco: 79.90, estoque: 11, tags: [], arquivo: 'SérumBioageVitaminaC.png' },
  { fabricante: 'Bioage', nome: 'Yalu Sérum', descricao: 'Sérum hialurônico para hidratação e preenchimento.', preco: 84.90, estoque: 9, tags: [], arquivo: 'bioage_yalu_serum.png' },

  // ── Carrelli ───────────────────────────────────────────────────
  { fabricante: 'Carrelli', nome: 'Blindagem de Verniz 120ml', descricao: 'Blindagem protetora para unhas com acabamento brilhante.', preco: 49.90, estoque: 12, tags: [], arquivo: 'carreli_blidagemdeverniz 120ml.png' },

  // ── Don Alcides ────────────────────────────────────────────────
  { fabricante: 'Don Alcides', nome: 'Barba Negra', descricao: 'Óleo tonalizante para barba com cobertura natural.', preco: 39.90, estoque: 15, tags: ['Mais vendido'], arquivo: 'don_alcides_barba_negra.png' },

  // ── Fox ────────────────────────────────────────────────────────
  { fabricante: 'Fox', nome: 'Silver', descricao: 'Pomada modeladora com acabamento matte e fixação forte.', preco: 34.90, estoque: 22, tags: [], arquivo: 'fotoSilver.png' },
  { fabricante: 'Fox', nome: 'Strong Hold', descricao: 'Fixação extrema para estilos definidos o dia todo.', preco: 32.90, estoque: 20, tags: ['Mais vendido'], arquivo: 'foto_stronghold.png' },
  { fabricante: 'Fox', nome: 'Water Soluble', descricao: 'Pomada solúvel em água para fácil remoção.', preco: 32.90, estoque: 18, tags: [], arquivo: 'foto_watersoluble.png' },
  { fabricante: 'Fox', nome: 'Web Wax', descricao: 'Cera em teia para textura e movimento natural.', preco: 34.90, estoque: 17, tags: [], arquivo: 'foto_web wax.png' },
  { fabricante: 'Fox', nome: 'Fox Black', descricao: 'Linha black com fixação intensa e brilho controlado.', preco: 36.90, estoque: 14, tags: [], arquivo: 'fox_black.png' },
  { fabricante: 'Fox', nome: 'Fox Caramelo', descricao: 'Pomada perfumada com fixação média e acabamento acetinado.', preco: 34.90, estoque: 16, tags: [], arquivo: 'fox_caramelo.png' },
  { fabricante: 'Fox', nome: 'Matte Clay', descricao: 'Argila matte para estilos modernos sem brilho.', preco: 34.90, estoque: 15, tags: ['Recomendado'], arquivo: 'fox_matteclay.png' },

  // ── Knuckst ────────────────────────────────────────────────────
  { fabricante: 'Knuckst', nome: 'Matte High Hold', descricao: 'Alta fixação com acabamento 100% matte.', preco: 42.90, estoque: 12, tags: [], arquivo: 'knuckst_matte high hold.png' },

  // ── Laborene ───────────────────────────────────────────────────
  { fabricante: 'Laborene', nome: 'Esfoliante Corporal', descricao: 'Esfoliante suave para pele renovada e macia.', preco: 54.90, estoque: 10, tags: [], arquivo: 'laborene_esfoliante-corporal.png' },

  // ── Truss ──────────────────────────────────────────────────────
  { fabricante: 'Truss', nome: 'Truss Hair 250ml', descricao: 'Tratamento capilar profissional para cabelos danificados.', preco: 59.90, estoque: 8, tags: ['Recomendado'], arquivo: 'truss_250ml.png' },

  // ── Wella ──────────────────────────────────────────────────────
  { fabricante: 'Wella', nome: 'Fusio Pearl Shader', descricao: 'Coloração semipermanente com pigmentos pérola.', preco: 79.90, estoque: 6, tags: [], arquivo: 'well_fusiospsd.png' },

  // ── Youman ─────────────────────────────────────────────────────
  { fabricante: 'Youman', nome: 'Control Black', descricao: 'Pomada preta modeladora com fixação duradoura.', preco: 38.90, estoque: 14, tags: [], arquivo: 'youman_control_black.png' },
  { fabricante: 'Youman', nome: 'Control Brown', descricao: 'Pomada marrom modeladora com fixação duradoura.', preco: 38.90, estoque: 13, tags: [], arquivo: 'youman_control_brown.png' },
]

// Mapa pasta real → nome de exibição
const PASTA_FABRICANTE: Record<string, string> = {
  'La Roche-Posay': 'La Roche-Posay',
  'Adcos':          'Adcos',
  'Bandido':        'Bandido',
  'Barba Forte':    'Barba Forte',
  'Bioage':         'Bioage',
  'Carrelli':       'Carrelli',
  'Don Alcides':    'Don Alcides',
  'Fox':            'Fox',
  'Knuckst':        'Knuckst',
  'Laborene':       'Laborene',
  'Truss':          'Truss',
  'Wella':          'Wella',
  'Youman':         'Youman',
}

// Pasta real no filesystem (igual ao nome da pasta em public/produtos/)
const PASTA_FS: Record<string, string> = {
  'La Roche-Posay': 'La Roche-Posay',
  'Adcos':          'adcos',
  'Bandido':        'bandido',
  'Barba Forte':    'barba-forte',
  'Bioage':         'bioage',
  'Carrelli':       'carrelli',
  'Don Alcides':    'don-alcides',
  'Fox':            'fox',
  'Knuckst':        'knuckst',
  'Laborene':       'laborene',
  'Truss':          'truss',
  'Wella':          'wella',
  'Youman':         'youman',
}

async function seedParaTenant(tenantId: string, nome: string) {
  console.log(`\n── ${nome} (${tenantId}) ──`)

  // Criar categorias por fabricante (se não existir)
  const catMap: Record<string, string> = {}
  const fabricantes = [...new Set(CATALOGO.map(p => p.fabricante))]

  for (const fab of fabricantes) {
    const existing = await prisma.categoriaProduto.findFirst({
      where: { tenantId, nome: fab },
    })
    if (existing) {
      catMap[fab] = existing.id
    } else {
      const cat = await prisma.categoriaProduto.create({
        data: { tenantId, nome: fab },
      })
      catMap[fab] = cat.id
    }
  }
  console.log(`  ${fabricantes.length} categorias prontas`)

  // Criar produtos
  let criados = 0
  let pulados = 0
  for (const prod of CATALOGO) {
    const existing = await prisma.produto.findFirst({
      where: { tenantId, nome: prod.nome },
    })
    if (existing) { pulados++; continue }

    const pasta = PASTA_FS[prod.fabricante]
    const imageUrl = `/produtos/${pasta}/${prod.arquivo}`

    await prisma.produto.create({
      data: {
        tenantId,
        categoriaId: catMap[prod.fabricante],
        nome: prod.nome,
        descricao: prod.descricao,
        preco: prod.preco,
        estoque: prod.estoque,
        estoqueMinimo: 3,
        tags: prod.tags,
        imageUrl,
        status: 'active',
        tipo: 'venda',
        unidade: 'un',
      },
    })
    criados++
  }

  console.log(`  ✅ ${criados} produtos criados | ${pulados} já existiam`)
}

async function main() {
  const clinicas = await prisma.clinica.findMany({
    select: { tenantId: true, nome: true },
  })

  console.log(`\nSeed de produtos para ${clinicas.length} clínicas demo\n`)

  for (const c of clinicas) {
    await seedParaTenant(c.tenantId, c.nome)
  }

  console.log('\n✅ Seed concluído!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
