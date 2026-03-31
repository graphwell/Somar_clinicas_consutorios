import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// POST — salvar arquivo no prontuário
export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();

    const formData = await req.formData();
    const arquivo = formData.get('arquivo') as File | null;
    const evolutionId = formData.get('evolutionId') as string | null;
    const pacienteId = formData.get('pacienteId') as string | null;
    const tipo = (formData.get('tipo') as string) || 'DOCUMENTO';
    const iaResumo = formData.get('iaResumo') as string | null;
    const consentimento = formData.get('consentimento') === 'true';

    if (!evolutionId || !pacienteId) {
      return NextResponse.json(
        { error: 'evolutionId e pacienteId são obrigatórios' },
        { status: 400 },
      );
    }

    // Verificar que o prontuário pertence ao tenant
    const prontuario = await prisma.prontuarioRegistro.findFirst({
      where: { id: evolutionId, tenantId },
    });
    if (!prontuario) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 });
    }

    let url: string | null = null;
    let nome = 'documento';

    if (arquivo) {
      // Converter para base64 data URL
      const bytes = await arquivo.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      url = `data:${arquivo.type};base64,${base64}`;
      nome = arquivo.name || 'documento';
    }

    // Prazo LGPD: 48h após upload
    const deletarEm = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const arquivoSalvo = await (prisma.prontuarioArquivo.create as any)({
      data: {
        evolutionId,
        pacienteId,
        tenantId,
        nome,
        tipo,
        url: url ?? undefined,
        iaResumo: iaResumo || undefined,
        deletarEm,
        consentimento,
      },
    });

    return NextResponse.json({
      id: arquivoSalvo.id,
      nome: arquivoSalvo.nome,
      tipo: arquivoSalvo.tipo,
      deletarEm: arquivoSalvo.deletarEm ?? deletarEm,
      createdAt: arquivoSalvo.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — listar arquivos de um prontuário
export async function GET(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const evolutionId = searchParams.get('evolutionId');

    if (!evolutionId) {
      return NextResponse.json({ error: 'evolutionId obrigatório' }, { status: 400 });
    }

    const arquivos = await (prisma.prontuarioArquivo.findMany as any)({
      where: { evolutionId, tenantId, deletado: false },
      select: {
        id: true,
        nome: true,
        tipo: true,
        iaResumo: true,
        deletarEm: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(arquivos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remover arquivo manualmente
export async function DELETE(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    }

    const arquivo = await prisma.prontuarioArquivo.findFirst({
      where: { id, tenantId },
    });

    if (!arquivo) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    // Manter registro LGPD — apenas anular url e marcar deletado
    await (prisma.prontuarioArquivo.update as any)({
      where: { id },
      data: { url: undefined, deletado: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
