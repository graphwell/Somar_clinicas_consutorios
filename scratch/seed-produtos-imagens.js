const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Busca o primeiro tenantId disponível (clínica/salão) para associar os produtos
async function main() {
  const clinica = await prisma.clinica.findFirst({ select: { tenantId: true } });
  if (!clinica) { console.error('Nenhuma clínica encontrada'); return; }
  const tenantId = clinica.tenantId;
  console.log('TenantId:', tenantId);

  const produtos = [
    // ADCOS
    { nome: 'Hyalu 6+ Sérum Facial', fabricante: 'Adcos', imageUrl: '/produtos/adcos/AdcosHyalu6+SérumFacial.png' },
    { nome: 'Sérum Clareador Profissional', fabricante: 'Adcos', imageUrl: '/produtos/adcos/AdcosSérumClareadorProfissional.png' },
    { nome: 'Kit Sérum + Protetor Solar', fabricante: 'Adcos', imageUrl: '/produtos/adcos/Kit Adcos Sérum + Protetor Solar.png' },
    { nome: 'Protetor Solar Fluid FPS 99', fabricante: 'Adcos', imageUrl: '/produtos/adcos/Protetor Solar Adcos Fluid FPS 99.png' },
    { nome: 'Sérum Vitamina C 15 + Ácido Hialurônico 15ml', fabricante: 'Adcos', imageUrl: '/produtos/adcos/SérumAdcosVitaminaC15ÁcidoHialurônico15ml.png' },
    // BANDIDO
    { nome: 'Army Gum Effect', fabricante: 'Bandido', imageUrl: '/produtos/bandido/bandido_armygumeffect.png' },
    { nome: 'Fiber Wax 7', fabricante: 'Bandido', imageUrl: '/produtos/bandido/bandido_fiberwax7.png' },
    // BARBA FORTE
    { nome: 'Killer Hidratação', fabricante: 'Barba Forte', imageUrl: '/produtos/barba-forte/barbaforte_killer_hidrtacao.png' },
    // BIOAGE
    { nome: 'Sérum Vitamina C', fabricante: 'Bioage', imageUrl: '/produtos/bioage/SérumBioageVitaminaC.png' },
    // CARRELLI
    { nome: 'Blindagem de Verniz 120ml', fabricante: 'Carrelli', imageUrl: '/produtos/carrelli/carreli_blidagemdeverniz 120ml.png' },
    // FOX FOR MEN
    { nome: 'Strong Hold', fabricante: 'Fox For Men', imageUrl: '/produtos/fox/foto_stronghold.png' },
    { nome: 'Water Soluble', fabricante: 'Fox For Men', imageUrl: '/produtos/fox/foto_watersoluble.png' },
    { nome: 'Web Wax', fabricante: 'Fox For Men', imageUrl: '/produtos/fox/foto_web wax.png' },
    { nome: 'Silver', fabricante: 'Fox For Men', imageUrl: '/produtos/fox/fotoSilver.png' },
    { nome: 'Matte Clay', fabricante: 'Fox For Men', imageUrl: '/produtos/fox/fox_matteclay.png' },
    // KNUCKST
    { nome: 'Matte High Hold', fabricante: 'Knuckst', imageUrl: '/produtos/knuckst/knuckst_matte high hold.png' },
    // LA ROCHE-POSAY
    { nome: 'Hyalu B5 Repair Sérum', fabricante: 'La Roche-Posay', imageUrl: '/produtos/La Roche-Posay/HyaluB5RepairSérumLaRoche-Posay.png' },
    { nome: 'Effaclar Sérum Ultra Concentrado', fabricante: 'La Roche-Posay', imageUrl: '/produtos/La Roche-Posay/La Roche-PosayEffaclarSérumUltraConcentrado.png' },
    { nome: 'Pure Vitamin C 10 - 30ml', fabricante: 'La Roche-Posay', imageUrl: '/produtos/La Roche-Posay/LaRoche-PosayPureVitaminC10-30ml.png' },
    { nome: 'Protetor Solar Anthelios FPS 60', fabricante: 'La Roche-Posay', imageUrl: '/produtos/La Roche-Posay/ProtetorSolarLa Roche-PosayAntheliosFPS60.png' },
    // LABORENE
    { nome: 'Esfoliante Corporal', fabricante: 'Laborene', imageUrl: '/produtos/laborene/laborene_esfoliante-corporal.png' },
    // TRUSS
    { nome: 'Truss Fusion Intense Repair 250ml', fabricante: 'Truss', imageUrl: '/produtos/truss/truss_250ml.png' },
    // YOUMAN
    { nome: 'Control Black', fabricante: 'Youman', imageUrl: '/produtos/youman/youman_control_black.png' },
    { nome: 'Control Brown', fabricante: 'Youman', imageUrl: '/produtos/youman/youman_control_brown.png' },
  ];

  let criados = 0;
  for (const p of produtos) {
    // Verifica se já existe para evitar duplicata
    const existe = await prisma.produto.findFirst({ where: { tenantId, nome: p.nome } });
    if (existe) {
      // Atualiza a imagem se ainda não tem
      if (!existe.imageUrl) {
        await prisma.produto.update({ where: { id: existe.id }, data: { imageUrl: p.imageUrl, fabricante: p.fabricante } });
        console.log(`🔄 ATUALIZADO: ${p.nome}`);
      } else {
        console.log(`⏩ JÁ EXISTE: ${p.nome}`);
      }
      continue;
    }

    await prisma.produto.create({
      data: {
        tenantId,
        nome: p.nome,
        fabricante: p.fabricante,
        imageUrl: p.imageUrl,
        tipo: 'venda',
        unidade: 'un',
        estoque: 0,
        estoqueMinimo: 0,
        preco: 0,
        custoUnitario: 0,
        status: 'active',
        tags: [],
      },
    });
    console.log(`✅ CRIADO: [${p.fabricante}] ${p.nome}`);
    criados++;
  }

  console.log(`\n📦 ${criados} produto(s) criado(s).`);
  await prisma.$disconnect();
}

main().catch(console.error);
