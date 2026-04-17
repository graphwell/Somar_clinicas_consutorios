import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Mapeamento: parte do nome do produto → URL da imagem
 * Tolerante a case e espaços extras
 */
const MAP: Array<{ match: string; url: string }> = [
  // Bandido
  { match: 'army gum',        url: '/produtos/bandido/bandido_armygumeffect.png' },
  { match: 'armygum',         url: '/produtos/bandido/bandido_armygumeffect.png' },
  { match: 'fiberwax',        url: '/produtos/bandido/bandido_fiberwax7.png' },
  { match: 'fiber wax',       url: '/produtos/bandido/bandido_fiberwax7.png' },
  // Barba Forte
  { match: 'killer',          url: '/produtos/barba-forte/barbaforte_killer_hidrtacao.png' },
  // Bioage
  { match: 'hyalu',           url: '/produtos/bioage/bioage_yalu_serum.png' },
  { match: 'yalu',            url: '/produtos/bioage/bioage_yalu_serum.png' },
  // Carrelli
  { match: 'blidagem',        url: '/produtos/carrelli/carreli_blidagemdeverniz 120ml.png' },
  { match: 'verniz',          url: '/produtos/carrelli/carreli_blidagemdeverniz 120ml.png' },
  // Don Alcides
  { match: 'barba negra',     url: '/produtos/don-alcides/don_alcides_barba_negra.png' },
  // Fox - Black (Efeito Preto)
  { match: 'black',           url: '/produtos/fox/fox_black.png' },
  { match: 'efeito preto',    url: '/produtos/fox/fox_black.png' },
  // Fox - Caramelo
  { match: 'caramelo',        url: '/produtos/fox/fox_caramelo.png' },
  { match: 'dourado',         url: '/produtos/fox/fox_caramelo.png' },
  // Fox - Matte Clay / Stronghold
  { match: 'matte clay',      url: '/produtos/fox/fox_matteclay.png' },
  { match: 'stronghold',      url: '/produtos/fox/foto_stronghold.png' },
  { match: 'strong hold',     url: '/produtos/fox/foto_stronghold.png' },
  // Fox - Water Soluble
  { match: 'water',           url: '/produtos/fox/foto_watersoluble.png' },
  { match: 'aquoso',          url: '/produtos/fox/foto_watersoluble.png' },
  // Fox - Web Wax / Fio
  { match: 'web wax',         url: '/produtos/fox/foto_web wax.png' },
  { match: 'fio',             url: '/produtos/fox/foto_web wax.png' },
  // Wella Fusion
  { match: 'fusion',          url: '/produtos/wella/well_fusiospsd.png' },
  // Knuckst
  { match: 'knuckst',         url: '/produtos/knuckst/knuckst_matte high hold.png' },
  { match: 'matte high',      url: '/produtos/knuckst/knuckst_matte high hold.png' },
  // Laborene
  { match: 'esfoliante',      url: '/produtos/laborene/laborene_esfoliante-corporal.png' },
  // Truss
  { match: 'truss',           url: '/produtos/truss/truss_250ml.png' },
  { match: '250ml',           url: '/produtos/truss/truss_250ml.png' },
  // Adcos
  { match: 'vitamina c',      url: '/produtos/adcos/adcos_vitamina c20.png' },
  // Fox Silver
  { match: 'silver',          url: '/produtos/fox/fotoSilver.png' },
  { match: 'prata',           url: '/produtos/fox/fotoSilver.png' },
  // Youman
  { match: 'control black',   url: '/produtos/youman/youman_control_black.png' },
  { match: 'control brown',   url: '/produtos/youman/youman_control_brown.png' },
  { match: 'control',         url: '/produtos/youman/youman_control_black.png' },
  // Pomadas genéricas - Gold/Modeladora
  { match: 'gold',            url: '/produtos/fox/fox_caramelo.png' },
  { match: 'modeladora',      url: '/produtos/fox/fox_matteclay.png' },
  // Oleo para barba
  { match: 'oleo',            url: '/produtos/don-alcides/don_alcides_barba_negra.png' },
  { match: 'óleo',            url: '/produtos/don-alcides/don_alcides_barba_negra.png' },
  // Balm para barba
  { match: 'balm',            url: '/produtos/barba-forte/barbaforte_killer_hidrtacao.png' },
  // Shampoo
  { match: 'shampoo',         url: '/produtos/laborene/laborene_esfoliante-corporal.png' },
  // Pomada Matte
  { match: 'pomada matte',    url: '/produtos/fox/fox_matteclay.png' },
  // Combo
  { match: 'combo',           url: '/produtos/youman/youman_control_black.png' },
];

async function main() {
  const produtos = await prisma.produto.findMany({ select: { id: true, nome: true, imageUrl: true } });
  console.log(`\n📦 ${produtos.length} produtos encontrados\n`);

  let updated = 0;
  let skipped = 0;

  for (const p of produtos) {
    const nomeLower = p.nome.toLowerCase();
    const match = MAP.find(m => nomeLower.includes(m.match.toLowerCase()));

    if (!match) {
      console.log(`⚠  Sem match: "${p.nome}"`);
      skipped++;
      continue;
    }

    if (p.imageUrl === match.url) {
      console.log(`✓  Já correto: "${p.nome}"`);
      skipped++;
      continue;
    }

    await prisma.produto.update({ where: { id: p.id }, data: { imageUrl: match.url } });
    console.log(`✅ "${p.nome}"\n   → ${match.url}\n`);
    updated++;
  }

  console.log('─────────────────────────────────────');
  console.log(`✅ Atualizados: ${updated} | ⏭ Já ok: ${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
