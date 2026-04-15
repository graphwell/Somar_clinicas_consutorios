import prisma from '@/lib/prisma';
import { autenticarApiKey } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/fila-espera/entrar
 * Aceita: token n8n (body.tenantId) ou sessão autenticada (header x-tenant-id)
 */
export async function POST(request: Request) {
  let tenantId: string | null = null;

  // Tentativa 1: sessão autenticada (dashboard/link público)
  try {
    const session = await getSessionInfo();
    if (session?.tenantId) tenantId = session.tenantId;
  } catch { /* não autenticado via JWT — tudo bem */ }

  // Tentativa 2: API key n8n
  if (!tenantId) {
    if (!autenticarApiKey(request)) {
      return n8nError('Não autorizado', 'UNAUTHORIZED', 401);
    }
  }

  let body: any;
  try { body = await request.json(); } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  if (!tenantId) tenantId = body.tenantId ?? null;
  if (!tenantId) return n8nError('tenantId obrigatório', 'MISSING_PARAM');

  const { pacienteId, servicoId, profissionalId, dataDesejada, horarioDesejado, preferencia = 'qualquer' } = body;

  if (!pacienteId || !servicoId || !dataDesejada) {
    return n8nError('pacienteId, servicoId e dataDesejada são obrigatórios', 'MISSING_PARAM');
  }

  try {
    const dataObj = new Date(dataDesejada);

    // Verificar limite de 5 por slot
    const totalNaFila = await prisma.filaEspera.count({
      where: {
        tenantId,
        servicoId,
        dataDesejada: dataObj,
        status: 'aguardando',
        ...(profissionalId ? { profissionalId } : {}),
        ...(horarioDesejado ? { horarioDesejado } : {}),
      },
    });

    if (totalNaFila >= 5) {
      return n8nSuccess({
        entrou: false,
        motivo: 'fila_cheia',
        msgBot: 'A fila de espera para este horario ja esta cheia (maximo 5 pessoas).\nGostaria de escolher outro horario?',
      });
    }

    // Verificar se já está na fila
    const jaEsta = await prisma.filaEspera.findFirst({
      where: {
        tenantId,
        pacienteId,
        servicoId,
        dataDesejada: dataObj,
        status: 'aguardando',
      },
    });

    if (jaEsta) {
      return n8nSuccess({
        entrou: false,
        motivo: 'ja_na_fila',
        posicao: jaEsta.posicao,
        msgBot: `Voce ja esta na fila de espera (posicao ${jaEsta.posicao}).\nTe avisarei assim que abrir um horario!`,
      });
    }

    // Verificar prioridade (assinante = 1)
    const assinatura = await prisma.assinaturaCliente.findFirst({
      where: { pacienteId, tenantId, status: 'ativo' },
    });
    const prioridade = assinatura ? 1 : 0;

    // Calcular posição
    const ultimaPosicao = await prisma.filaEspera.findFirst({
      where: {
        tenantId,
        servicoId,
        dataDesejada: dataObj,
        status: 'aguardando',
        ...(profissionalId ? { profissionalId } : {}),
      },
      orderBy: { posicao: 'desc' },
      select: { posicao: true },
    });

    let posicao = (ultimaPosicao?.posicao ?? 0) + 1;

    // Assinantes entram na frente dos normais
    if (prioridade === 1) {
      const primeiroNormal = await prisma.filaEspera.findFirst({
        where: {
          tenantId,
          servicoId,
          dataDesejada: dataObj,
          status: 'aguardando',
          prioridade: 0,
          ...(profissionalId ? { profissionalId } : {}),
        },
        orderBy: { posicao: 'asc' },
        select: { posicao: true },
      });
      if (primeiroNormal) posicao = primeiroNormal.posicao;
    }

    const entrada = await prisma.filaEspera.create({
      data: {
        tenantId,
        pacienteId,
        servicoId,
        profissionalId: profissionalId ?? null,
        dataDesejada: dataObj,
        horarioDesejado: horarioDesejado ?? null,
        preferencia,
        prioridade,
        posicao,
      },
    });

    const msgPrioridade = prioridade === 1 ? 'Como assinante, voce tem prioridade na fila!\n\n' : '';

    return n8nSuccess({
      entrou: true,
      filaId: entrada.id,
      posicao,
      msgBot:
        `Pronto! Voce esta na fila de espera (posicao ${posicao}).\n\n` +
        `Assim que abrir um horario, vou te avisar pelo WhatsApp. ` +
        `Voce tera 30 minutos para confirmar.\n\n` +
        msgPrioridade +
        `Para sair da fila responda: SAIR DA FILA`,
    });
  } catch (err) {
    console.error('[fila-espera/entrar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
