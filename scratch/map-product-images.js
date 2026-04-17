const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Mapeamento: arquivo na pasta → produto existente no banco
 * Formato: { produtoId, imageUrl }
 * 
 * Produtos existentes com imageUrl já correto → não precisam de update
 * Novos arquivos → vamos criar ou atualizar
 */

// Novos arquivos identificados e seus produtos correspondentes
const updates = [
  // Adcos — novos arquivos ainda sem produto vinculado
  {
    nome: 'Hyalu 6+ Sérum Facial',
    fabricante: 'Adcos',
    imageUrl: '/produtos/adcos/AdcosHyalu6+SérumFacial.png',
  },
  {
    nome: 'Sérum Clareador Profissional',
    fabricante: 'Adcos',
    imageUrl: '/produtos/adcos/AdcosSérumClareadorProfissional.png',
  },
  {
    nome: 'Kit Sérum + Protetor Solar',
    fabricante: 'Adcos',
    imageUrl: '/produtos/adcos/Kit Adcos Sérum + Protetor Solar.png',
  },
  {
    nome: 'Protetor Solar Fluid FPS 99',
    fabricante: 'Adcos',
    imageUrl: '/produtos/adcos/Protetor Solar Adcos Fluid FPS 99.png',
  },
  {
    nome: 'Sérum Vitamina C 15 + Ácido Hialurônico 15ml',
    fabricante: 'Adcos',
    imageUrl: '/produtos/adcos/SérumAdcosVitaminaC15ÁcidoHialurônico15ml.png',
  },
  // Bandido
  {
    nome: 'Army Gum Effect',
    fabricante: 'Bandido',
    imageUrl: '/produtos/bandido/bandido_armygumeffect.png',
  },
  {
    nome: 'Fiber Wax 7',
    fabricante: 'Bandido',
    imageUrl: '/produtos/bandido/bandido_fiberwax7.png',
  },
  // Barba Forte
  {
    nome: 'Killer Hidratação',
    fabricante: 'Barba Forte',
    imageUrl: '/produtos/barba-forte/barbaforte_killer_hidrtacao.png',
  },
  // Bioage
  {
    nome: 'Sérum Vitamina C',
    fabricante: 'Bioage',
    imageUrl: '/produtos/bioage/SérumBioageVitaminaC.png',
  },
  // Carrelli
  {
    nome: 'Blindagem de Verniz 120ml',
    fabricante: 'Carrelli',
    imageUrl: '/produtos/carrelli/carreli_blidagemdeverniz 120ml.png',
  },
  // Fox
  {
    nome: 'Strong Hold',
    fabricante: 'Fox For Men',
    imageUrl: '/produtos/fox/foto_stronghold.png',
  },
  {
    nome: 'Water Soluble',
    fabricante: 'Fox For Men',
    imageUrl: '/produtos/fox/foto_watersoluble.png',
  },
  {
    nome: 'Web Wax',
    fabricante: 'Fox For Men',
    imageUrl: '/produtos/fox/foto_web wax.png',
  },
  {
    nome: 'Silver',
    fabricante: 'Fox For Men',
    imageUrl: '/produtos/fox/fotoSilver.png',
  },
  {
    nome: 'Matte Clay',
    fabricante: 'Fox For Men',
    imageUrl: '/produtos/fox/fox_matteclay.png',
  },
  // Knuckst
  {
    nome: 'Matte High Hold',
    fabricante: 'Knuckst',
    imageUrl: '/produtos/knuckst/knuckst_matte high hold.png',
  },
  // La Roche-Posay
  {
    nome: 'Hyalu B5 Repair Sérum',
    fabricante: 'La Roche-Posay',
    imageUrl: '/produtos/La Roche-Posay/HyaluB5RepairSérumLaRoche-Posay.png',
  },
  {
    nome: 'Effaclar Sérum Ultra Concentrado',
    fabricante: 'La Roche-Posay',
    imageUrl: '/produtos/La Roche-Posay/La Roche-PosayEffaclarSérumUltraConcentrado.png',
  },
  {
    nome: 'Pure Vitamin C 10 - 30ml',
    fabricante: 'La Roche-Posay',
    imageUrl: '/produtos/La Roche-Posay/LaRoche-PosayPureVitaminC10-30ml.png',
  },
  {
    nome: 'Protetor Solar Anthelios FPS 60',
    fabricante: 'La Roche-Posay',
    imageUrl: '/produtos/La Roche-Posay/ProtetorSolarLa Roche-PosayAntheliosFPS60.png',
  },
  // Laborene
  {
    nome: 'Esfoliante Corporal',
    fabricante: 'Laborene',
    imageUrl: '/produtos/laborene/laborene_esfoliante-corporal.png',
  },
  // Truss
  {
    nome: 'Truss 250ml',
    fabricante: 'Truss',
    imageUrl: '/produtos/truss/truss_250ml.png',
  },
  // Youman
  {
    nome: 'Control Black',
    fabricante: 'Youman',
    imageUrl: '/produtos/youman/youman_control_black.png',
  },
  {
    nome: 'Control Brown',
    fabricante: 'Youman',
    imageUrl: '/produtos/youman/youman_control_brown.png',
  },
];

async function main() {
  // Buscar todos os produtos para fazer match pelo nome+fabricante
  const produtos = await prisma.produto.findMany({
    select: { id: true, nome: true, fabricante: true, imageUrl: true },
  });

  console.log('\n=== Produtos existentes no banco ===');
  produtos.forEach(p => console.log(`  [${p.fabricante || 'sem fabricante'}] ${p.nome} → ${p.imageUrl || 'SEM IMAGEM'}`));

  console.log('\n=== Verificando mapeamento ===');

  for (const u of updates) {
    // Tenta encontrar produto pelo nome e fabricante
    const match = produtos.find(p => 
      p.nome.toLowerCase().includes(u.nome.toLowerCase().slice(0, 10)) ||
      u.nome.toLowerCase().includes(p.nome.toLowerCase().slice(0, 10))
    );

    if (match && !match.imageUrl) {
      // Atualiza imageUrl se está vazio
      await prisma.produto.update({ where: { id: match.id }, data: { imageUrl: u.imageUrl, fabricante: u.fabricante } });
      console.log(`✅ ATUALIZADO: "${match.nome}" → ${u.imageUrl}`);
    } else if (match && match.imageUrl) {
      console.log(`⏩ JÁ TEM IMAGEM: "${match.nome}" (${match.imageUrl})`);
    } else {
      console.log(`🆕 SEM PRODUTO: "${u.nome}" (${u.fabricante}) → apenas arquivo disponível: ${u.imageUrl}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
