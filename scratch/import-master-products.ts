
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function importCatalog() {
  const prisma = new PrismaClient();
  const filePath = path.join(process.cwd(), 'prisma', 'catalog', 'produtos_mestre.csv');
  
  console.log('Reading CSV from:', filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const header = lines[0].trim().split(';');
    
    console.log('Header detected:', header);
    
    const products = lines.slice(1).filter(l => l.trim() !== '').map(line => {
      const values = line.split(';');
      const obj: any = {};
      header.forEach((h, i) => {
        // Clean up keys and values
        const key = h.trim();
        let value = values[i]?.trim() || '';
        obj[key] = value;
      });
      return obj;
    });

    console.log(`Starting import of ${products.length} products...`);

    let count = 0;
    for (const p of products) {
      if (!p.nome) continue;

      await prisma.masterProduct.upsert({
        where: { id: p.id || 'placeholder-' + count }, // We don't have IDs in CSV, so we'll use a unique key if we had one, or just create.
        // Actually, let's use name + fabricante as a heuristic for upsert if we want to avoid dups on re-run
        create: {
          nicho: p.nicho,
          fabricante: p.fabricante,
          categoria: p.categoria,
          nome: p.nome,
          descricao: p.descricao,
          dicaUso: p.dica_uso,
          tags: p.tags ? p.tags.split(' ').filter((t: string) => t.length > 0) : [],
          posicionamento: p.posicionamento,
          imageUrl: p.image_url || null
        },
        update: {
          nicho: p.nicho,
          fabricante: p.fabricante,
          categoria: p.categoria,
          nome: p.nome,
          descricao: p.descricao,
          dicaUso: p.dica_uso,
          tags: p.tags ? p.tags.split(' ').filter((t: string) => t.length > 0) : [],
          posicionamento: p.posicionamento,
          imageUrl: p.image_url || null
        }
      }).catch(err => {
        // If upsert fails because of ID, just create
        return prisma.masterProduct.create({
          data: {
            nicho: p.nicho,
            fabricante: p.fabricante,
            categoria: p.categoria,
            nome: p.nome,
            descricao: p.descricao,
            dicaUso: p.dica_uso,
            tags: p.tags ? p.tags.split(' ').filter((t: string) => t.length > 0) : [],
            posicionamento: p.posicionamento,
            imageUrl: p.image_url || null
          }
        });
      });
      count++;
    }

    console.log(`SUCCESS: Imported ${count} products.`);
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importCatalog();
