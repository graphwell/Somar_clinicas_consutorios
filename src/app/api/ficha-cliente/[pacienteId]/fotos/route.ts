import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST — upload de foto (base64, max 10MB)
export async function POST(
  req: Request,
  { params }: { params: { pacienteId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = params;

    const formData = await req.formData();
    const arquivo = formData.get('arquivo') as File | null;
    const tipo = (formData.get('tipo') as string) || 'evolucao';
    const descricao = formData.get('descricao') as string | null;
    const servicoNome = formData.get('servicoNome') as string | null;
    const profissionalNome = formData.get('profissionalNome') as string | null;
    const temporaria = formData.get('temporaria') === 'true';

    if (!arquivo) {
      return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 });
    }

    const TIPOS_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'];
    if (!TIPOS_VALIDOS.includes(arquivo.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use JPG, PNG ou WebP.' }, { status: 400 });
    }
    if (arquivo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 });
    }

    // Verificar/criar ficha
    let ficha = await prisma.fichaCliente.findUnique({ where: { pacienteId } });
    if (!ficha) {
      const clinica = await prisma.clinica.findUnique({ where: { tenantId }, select: { nicho: true } });
      ficha = await prisma.fichaCliente.create({
        data: { pacienteId, tenantId, nicho: clinica?.nicho ?? 'BARBEARIA' },
      });
    }

    // Converter para base64
    const bytes = await arquivo.arrayBuffer();
    const base64 = Buffer.from(new Uint8Array(bytes)).toString('base64');
    const urlArquivo = `data:${arquivo.type};base64,${base64}`;

    const foto = await prisma.fotoCliente.create({
      data: {
        fichaId: ficha.id,
        tenantId,
        pacienteId,
        tipo,
        urlArquivo,
        descricao: descricao || null,
        servicoNome: servicoNome || null,
        profissionalNome: profissionalNome || null,
        deletarEm: temporaria ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null,
      },
    });

    return NextResponse.json({ foto: { ...foto, urlArquivo: foto.urlArquivo } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
