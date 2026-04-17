import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/dias-bloqueados/verificar?tenantId=xxx&slug=xxx&data=2026-04-21
 *
 * Verifica se uma data está bloqueada para o tenant.
 * Pode ser chamada sem autenticação (usada pelo link público e pelo bot N8N).
 * Retorna: { bloqueado: boolean, mensagem?: string, titulo?: string }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let tenantId = searchParams.get('tenantId');
    const slug = searchParams.get('slug');
    const dataParam = searchParams.get('data'); // YYYY-MM-DD ou ISO

    // Resolver tenantId via slug se não veio direto
    if (!tenantId && slug) {
      const clinica = await prisma.clinica.findUnique({
        where: { slug },
        select: { tenantId: true },
      });
      if (!clinica) return NextResponse.json({ bloqueado: false });
      tenantId = clinica.tenantId;
    }

    if (!tenantId) return NextResponse.json({ bloqueado: false });

    // Data a verificar (padrão = hoje no fuso Brasília)
    const dataRef = dataParam
      ? new Date(dataParam)
      : new Date(new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }));

    const inicioDia = new Date(
      Date.UTC(dataRef.getFullYear(), dataRef.getMonth(), dataRef.getDate(), 0, 0, 0)
    );
    const fimDia = new Date(
      Date.UTC(dataRef.getFullYear(), dataRef.getMonth(), dataRef.getDate(), 23, 59, 59)
    );

    const diaBloqueado = await prisma.diaBloqueado.findFirst({
      where: {
        tenantId,
        ativo: true,
        data: { gte: inicioDia, lte: fimDia },
      },
    });

    if (!diaBloqueado) {
      return NextResponse.json({ bloqueado: false });
    }

    return NextResponse.json({
      bloqueado: true,
      titulo: diaBloqueado.titulo,
      mensagem: diaBloqueado.mensagem,
      retornoData: diaBloqueado.retornoData
        ? diaBloqueado.retornoData.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : null,
      retornoHora: diaBloqueado.retornoHora,
    });
  } catch (err: any) {
    console.error('[dias-bloqueados/verificar]', err);
    return NextResponse.json({ bloqueado: false });
  }
}
