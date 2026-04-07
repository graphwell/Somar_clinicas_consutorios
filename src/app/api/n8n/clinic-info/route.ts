import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/n8n/clinic-info
 * Query: ?slug=barbearia-demo-synka
 * Retorna info completa da clínica formatada para o bot.
 */
export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const slug = req.nextUrl.searchParams.get('slug');
  const tenantIdParam = req.nextUrl.searchParams.get('tenantId');
  if (!slug && !tenantIdParam) return n8nError('Parâmetro slug ou tenantId obrigatório', 'MISSING_PARAM');

  try {
    const clinica = await prisma.clinica.findFirst({
      where: slug ? { slug } : { tenantId: tenantIdParam! },
      select: {
        id: true,
        tenantId: true,
        nome: true,
        slug: true,
        nicho: true,
        openingTime: true,
        closingTime: true,
        workingDays: true,
        adminPhone: true,
      },
    });

    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synka.somar.ia.br';
    const linkAgendamento = `${appUrl}/agendar/${clinica.slug}`;

    const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diasTexto = Array.isArray(clinica.workingDays)
      ? (clinica.workingDays as number[]).map(d => diasNomes[d] ?? d).join(', ')
      : 'Não definido';

    const horarioTexto =
      clinica.openingTime && clinica.closingTime
        ? `${diasTexto} ${clinica.openingTime}–${clinica.closingTime}`
        : diasTexto;

    const waInstance = await prisma.whatsappInstance.findFirst({
      where: { empresaId: clinica.tenantId, status: 'EM_USO' },
      select: { bearerToken: true },
    });

    return n8nSuccess({
      id: clinica.id,
      tenantId: clinica.tenantId,
      nome: clinica.nome,
      slug: clinica.slug,
      nicho: clinica.nicho,
      linkAgendamento,
      horarioFuncionamento: horarioTexto,
      msgBoasVindas: `Olá! Bem-vindo à ${clinica.nome}. Para agendar acesse: ${linkAgendamento}`,
      whatsappInstanceKey: waInstance?.bearerToken ?? null,
    });
  } catch (err) {
    console.error('[n8n/clinic-info]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
