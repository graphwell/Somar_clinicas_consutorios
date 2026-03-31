import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Cron job LGPD: deletar arquivos de prontuário após 48h
 * Protegido por CRON_SECRET (header Authorization: Bearer <secret>)
 * Configurar no Vercel Cron Jobs ou similar para rodar a cada hora.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Proteger rota — permitir apenas se secret configurado e correto
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agora = new Date();

    // Buscar arquivos vencidos (com url ainda presente)
    const arquivosParaDeletar = await (prisma.prontuarioArquivo.findMany as any)({
      where: {
        deletarEm: { lte: agora },
        deletado: false,
        url: { not: undefined },
      },
      select: { id: true, nome: true, tenantId: true },
    });

    if (arquivosParaDeletar.length === 0) {
      return NextResponse.json({ deletados: 0, mensagem: 'Nenhum arquivo para deletar' });
    }

    // Deletar em lote — manter registro LGPD (iaResumo fica)
    const ids = arquivosParaDeletar.map((a: any) => a.id);
    await (prisma.prontuarioArquivo.updateMany as any)({
      where: { id: { in: ids } },
      data: {
        url: undefined,
        deletado: true,
      },
    });

    console.log(
      `[LGPD Cron] ${ids.length} arquivo(s) deletados automaticamente em ${agora.toISOString()}`,
    );

    return NextResponse.json({
      deletados: ids.length,
      ids,
      executadoEm: agora.toISOString(),
    });
  } catch (error: any) {
    console.error('[LGPD Cron] Erro:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Suporte a POST para compatibilidade com alguns provedores de cron
export async function POST(req: Request) {
  return GET(req);
}
