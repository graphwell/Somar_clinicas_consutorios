const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

const tenantId = 'demo-barbearia';

// Produtos a copiar do demo-estetica, com preços adequados para barbearia
const produtosBarbearia = [
  // FOX FOR MEN
  { nome: 'Black (Efeito Preto)',  fabricante: 'Fox For Men', imageUrl: '/produtos/fox/fox_black.png',          preco: 52.90, desc: 'Pomada modeladora efeito preto intenso. Fixação forte, acabamento brilhante.' },
  { nome: 'Caramelo',              fabricante: 'Fox For Men', imageUrl: '/produtos/fox/fox_caramelo.png',      preco: 49.90, desc: 'Pomada modeladora tom caramelo. Hidrata e define com naturalidade.' },
  { nome: 'Strong Hold',          fabricante: 'Fox For Men', imageUrl: '/produtos/fox/foto_stronghold.png',    preco: 54.90, desc: 'Máxima fixação para penteados que duram o dia todo.' },
  { nome: 'Water Soluble',        fabricante: 'Fox For Men', imageUrl: '/produtos/fox/foto_watersoluble.png', preco: 47.90, desc: 'Pomada solúvel em água, fácil de lavar, acabamento natural.' },
  { nome: 'Web Wax',              fabricante: 'Fox For Men', imageUrl: '/produtos/fox/foto_web wax.png',      preco: 49.90, desc: 'Textura de teia para volume e definição com efeito matte.' },
  { nome: 'Silver',               fabricante: 'Fox For Men', imageUrl: '/produtos/fox/fotoSilver.png',        preco: 52.90, desc: 'Pomada platinada para homens modernos. Efeito prata único.' },
  { nome: 'Matte Clay',           fabricante: 'Fox For Men', imageUrl: '/produtos/fox/fox_matteclay.png',     preco: 51.90, desc: 'Argila modeladora com acabamento fosco e fixação média-forte.' },
  // BANDIDO
  { nome: 'Army Gum Effect',      fabricante: 'Bandido',     imageUrl: '/produtos/bandido/bandido_armygumeffect.png', preco: 44.90, desc: 'Gel com efeito goma para penteados estruturados e duradouros.' },
  { nome: 'Fiber Wax 7',          fabricante: 'Bandido',     imageUrl: '/produtos/bandido/bandido_fiberwax7.png',     preco: 42.90, desc: 'Cera com fibras para textura e definição natural dos fios.' },
  // BARBA FORTE
  { nome: 'Killer Hidratação',    fabricante: 'Barba Forte', imageUrl: '/produtos/barba-forte/barbaforte_killer_hidrtacao.png', preco: 38.90, desc: 'Creme hidratante para barba seca e ressecada. Amaciante e nutritivo.' },
  // DON ALCIDES
  { nome: 'Barba Negra 30ml',     fabricante: 'Don Alcides', imageUrl: '/produtos/don-alcides/don_alcides_barba_negra.png', preco: 34.90, desc: 'Óleo escurecedor para barba. Cobre fios brancos com naturalidade.' },
  // KNUCKST
  { nome: 'Matte High Hold',      fabricante: 'Knuckst',     imageUrl: '/produtos/knuckst/knuckst_matte high hold.png', preco: 48.90, desc: 'Alta fixação com acabamento matte. Para quem não abre mão do estilo.' },
  // YOUMAN
  { nome: 'Control Black',        fabricante: 'Youman',      imageUrl: '/produtos/youman/youman_control_black.png', preco: 55.90, desc: 'Linha masculina premium preta. Fixação forte e perfume sofisticado.' },
  { nome: 'Control Brown',        fabricante: 'Youman',      imageUrl: '/produtos/youman/youman_control_brown.png', preco: 55.90, desc: 'Linha masculina premium marrom. Fragrância amadeirada exclusiva.' },
  // CARRELLI
  { nome: 'Blindagem de Verniz 120ml', fabricante: 'Carrelli', imageUrl: '/produtos/carrelli/carreli_blidagemdeverniz 120ml.png', preco: 89.90, desc: 'Tratamento profissional de blindagem para cabelos com danos químicos.' },
  // LABORENE
  { nome: 'Esfoliante Corporal',  fabricante: 'Laborene',    imageUrl: '/produtos/laborene/laborene_esfoliante-corporal.png', preco: 45.90, desc: 'Esfoliante de uso masculino. Remove células mortas e nutre a pele.' },
  // TRUSS
  { nome: 'Fusion Intense Repair 250ml', fabricante: 'Truss', imageUrl: '/produtos/truss/truss_250ml.png', preco: 79.90, desc: 'Máscara de tratamento intensivo. Recupera cabelos danificados.' },
  // WELLA
  { nome: 'Fusion Intense Repair 250ml', fabricante: 'Wella', imageUrl: '/produtos/wella/well_fusiospsd.png', preco: 84.90, desc: 'Máscara profissional de reconstrução Wella Fusion. Para salões.' },
];

async function main() {
  console.log(`📦 Inserindo ${produtosBarbearia.length} produtos na barbearia demo...\n`);

  let criados = 0;
  let atualizados = 0;

  for (const p of produtosBarbearia) {
    // Verifica se já existe produto com mesmo nome neste tenant
    const existe = await prisma.produto.findFirst({
      where: { tenantId, nome: p.nome },
    });

    if (existe) {
      // Atualiza dados faltantes
      await prisma.produto.update({
        where: { id: existe.id },
        data: {
          fabricante: p.fabricante,
          imageUrl: p.imageUrl,
          preco: p.preco,
          descricao: p.desc,
          status: 'active',
        },
      });
      console.log(`🔄 ATUALIZADO: [${p.fabricante}] ${p.nome}`);
      atualizados++;
    } else {
      await prisma.produto.create({
        data: {
          tenantId,
          nome: p.nome,
          descricao: p.desc,
          fabricante: p.fabricante,
          imageUrl: p.imageUrl,
          preco: p.preco,
          custoUnitario: 0,
          tipo: 'venda',
          unidade: 'un',
          estoque: Math.floor(Math.random() * 20) + 5, // 5-25 unidades
          estoqueMinimo: 3,
          status: 'active',
          tags: [],
        },
      });
      console.log(`✅ CRIADO: [${p.fabricante}] ${p.nome} → R$ ${p.preco}`);
      criados++;
    }
  }

  // Atualizar produtos demo antigos com fabricante e descrição melhor
  const produtosAntigos = [
    { id: 'prod-barb-1', nome: 'Pomada Matte Black', fabricante: 'Fox For Men', preco: 52.90, desc: 'Pomada premium efeito preto intenso. Fixação forte o dia todo.' },
    { id: 'prod-barb-2', nome: 'Pomada Modeladora Gold', fabricante: 'Fox For Men', preco: 49.90, desc: 'Pomada modeladora dourada com perfume exclusivo.' },
    { id: 'prod-barb-3', nome: 'Oleo para Barba Premium', fabricante: 'Don Alcides', preco: 34.90, desc: 'Óleo hidratante premium para barba bem cuidada.' },
    { id: 'prod-barb-4', nome: 'Balm para Barba', fabricante: 'Barba Forte', preco: 38.90, desc: 'Balm modelador que amacia e organiza os fios da barba.' },
    { id: 'prod-barb-5', nome: 'Shampoo Anticaspa Men', fabricante: 'Laborene', preco: 32.90, desc: 'Shampoo masculino anticaspa com ativos antifúngicos.' },
    { id: 'prod-barb-6', nome: 'Combo Cuidado Total', fabricante: 'Youman', preco: 119.90, desc: 'Kit completo Youman com pomada + shampoo + condicionador.' },
  ];

  for (const p of produtosAntigos) {
    await prisma.produto.update({
      where: { id: p.id },
      data: { fabricante: p.fabricante, preco: p.preco, descricao: p.desc, tipo: 'venda' },
    });
    console.log(`🔄 ATUALIZADO (antigo): ${p.nome}`);
    atualizados++;
  }

  const total = await prisma.produto.count({ where: { tenantId } });
  console.log(`\n🎉 Concluído! ${criados} criados, ${atualizados} atualizados.`);
  console.log(`📊 Total de produtos na barbearia demo: ${total}`);

  await prisma.$disconnect();
}

main().catch(console.error);
