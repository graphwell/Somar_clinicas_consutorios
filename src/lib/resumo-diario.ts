import prisma from '@/lib/prisma'
import { sendWhatsAppMessage, getWasenderConfig } from '@/lib/wasender'
import { GoogleGenerativeAI } from '@google/generative-ai'

const BRT_OFFSET = -3 * 60 // minutos

function hojeEmBRT() {
  const agora = new Date()
  const brt = new Date(agora.getTime() + BRT_OFFSET * 60000)
  return brt.toISOString().slice(0, 10)
}

function janelaDia(dataStr: string) {
  const inicio = new Date(`${dataStr}T00:00:00-03:00`)
  const fim = new Date(`${dataStr}T23:59:59-03:00`)
  return { inicio, fim }
}

function janelaSemana() {
  const hoje = new Date(new Date().getTime() + BRT_OFFSET * 60000)
  const diaSemana = hoje.getDay()
  const seg = new Date(hoje)
  seg.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
  const inicio = new Date(`${seg.toISOString().slice(0, 10)}T00:00:00-03:00`)
  const fim = new Date()
  return { inicio, fim }
}

async function gerarInsightIA(resumoTexto: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return ''
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' })
    const result = await model.generateContent(
      `Você é um consultor de negócios para clínicas e salões de beleza. Com base nos dados abaixo, dê 2-3 insights práticos e objetivos (máx 3 linhas cada) em português:\n\n${resumoTexto}`
    )
    return result.response.text().trim()
  } catch {
    return ''
  }
}

async function getClinicaWhatsAppConfig(tenantId: string) {
  const integracao = await prisma.clinicIntegration.findFirst({
    where: { tenantId, provider: 'wasender', isActive: true },
    select: { encryptedCredentials: true },
  })
  return integracao?.encryptedCredentials ?? null
}

export async function montarEEnviarResumo(tenantId: string) {
  const config = await prisma.resumoConfig.findUnique({ where: { tenantId } })
  if (!config || !config.ativo) return

  const assinatura = await prisma.assinatura.findUnique({ where: { tenantId } })
  const plano = assinatura?.plano ?? 'trial'
  const usaWhatsApp = ['solo', 'pro', 'business', 'trial'].includes(plano)

  const clinica = await prisma.clinica.findUnique({
    where: { tenantId },
    select: { nome: true, adminPhone: true },
  })
  if (!clinica) return

  const periodoLabel = config.frequencia === 'semanal' ? 'Semanal' : 'Diário'
  const { inicio, fim } = config.frequencia === 'semanal' ? janelaSemana() : janelaDia(hojeEmBRT())

  const linhas: string[] = [`📊 *Resumo ${periodoLabel} — ${clinica.nome}*\n`]

  // ── Agenda ──────────────────────────────────────────────────────────────────
  if (config.secaoAgenda) {
    const total = await prisma.agendamento.count({ where: { tenantId, inicio: { gte: inicio, lte: fim } } })
    const confirmados = await prisma.agendamento.count({ where: { tenantId, inicio: { gte: inicio, lte: fim }, status: 'confirmado' } })
    const cancelados = await prisma.agendamento.count({ where: { tenantId, inicio: { gte: inicio, lte: fim }, status: 'cancelado' } })
    linhas.push(`📅 *Agenda*\nTotal: ${total} | Confirmados: ${confirmados} | Cancelados: ${cancelados}`)
  }

  // ── Ocupação ─────────────────────────────────────────────────────────────────
  if (config.secaoOcupacao) {
    const profissionais = await prisma.profissional.count({ where: { tenantId, ativo: true } })
    if (profissionais > 0) {
      const agendPorProf = await prisma.agendamento.groupBy({
        by: ['profissionalId'],
        where: { tenantId, inicio: { gte: inicio, lte: fim } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 3,
      })
      const top = await Promise.all(
        agendPorProf.map(async (a) => {
          const p = await prisma.profissional.findUnique({ where: { id: a.profissionalId! }, select: { nome: true } })
          return `  • ${p?.nome ?? '?'}: ${a._count.id} ag.`
        })
      )
      linhas.push(`👤 *Ocupação* (top ${top.length})\n${top.join('\n')}`)
    }
  }

  // ── Financeiro ───────────────────────────────────────────────────────────────
  if (config.secaoFinanceiro) {
    const transacoes = await prisma.transacaoFinanceira.aggregate({
      where: { tenantId, data: { gte: inicio, lte: fim }, tipo: 'income' },
      _sum: { valor: true },
      _count: { id: true },
    })
    const despesas = await prisma.transacaoFinanceira.aggregate({
      where: { tenantId, data: { gte: inicio, lte: fim }, tipo: 'expense' },
      _sum: { valor: true },
    })
    const receita = transacoes._sum.valor ?? 0
    const despesa = despesas._sum.valor ?? 0
    linhas.push(
      `💰 *Financeiro*\nReceita: R$ ${receita.toFixed(2)} | Despesas: R$ ${despesa.toFixed(2)} | Saldo: R$ ${(receita - despesa).toFixed(2)}`
    )
  }

  // ── Estoque ───────────────────────────────────────────────────────────────────
  if (config.secaoEstoque) {
    const baixoEstoque = await prisma.produto.findMany({
      where: { tenantId, estoque: { lte: config.estoqueMinimo }, status: 'active' },
      select: { nome: true, estoque: true },
      take: 5,
    })
    if (baixoEstoque.length > 0) {
      const items = baixoEstoque.map((p) => `  • ${p.nome}: ${p.estoque} un.`).join('\n')
      linhas.push(`⚠️ *Estoque baixo* (≤${config.estoqueMinimo} un.)\n${items}`)
    }
  }

  // ── Fila de Espera ───────────────────────────────────────────────────────────
  if (config.secaoFilaEspera) {
    const naFila = await prisma.filaEspera.count({
      where: { tenantId, status: { in: ['aguardando', 'notificado'] } },
    })
    if (naFila > 0) {
      linhas.push(`⏳ *Fila de Espera*\n${naFila} cliente(s) aguardando vaga`)
    }
  }

  const textoBase = linhas.join('\n\n')

  // ── Insights IA ──────────────────────────────────────────────────────────────
  let textoFinal = textoBase
  if (config.secaoInsightsIA) {
    const insight = await gerarInsightIA(textoBase)
    if (insight) {
      textoFinal += `\n\n🤖 *Insights IA*\n${insight}`
    }
  }

  textoFinal += '\n\n_Synka — synka.somar.ia.br_'

  // ── Buscar destinatários ─────────────────────────────────────────────────────
  const roles: string[] = []
  if (config.recebeAdmin) roles.push('admin')
  if (config.recebeRecepcao) roles.push('recepcao')
  if (config.recebeProfissional) roles.push('profissional')

  if (roles.length === 0) return

  const usuarios = await prisma.usuario.findMany({
    where: { tenantId, role: { in: roles }, ativo: true },
    select: { id: true, telefone: true, role: true },
  })

  const apiKey = await getClinicaWhatsAppConfig(tenantId)
  const wasenderCfg = getWasenderConfig(apiKey)

  for (const usuario of usuarios) {
    const temTelefone = !!usuario.telefone?.replace(/\D/g, '')

    if (usaWhatsApp && temTelefone) {
      try {
        const telefone = usuario.telefone!.replace(/\D/g, '')
        const numero = telefone.startsWith('55') ? telefone : `55${telefone}`
        if (wasenderCfg.ultraMsg) {
          await sendWhatsAppMessage('ULTRAMSG', wasenderCfg.ultraMsg.instanceId, wasenderCfg.ultraMsg.token, numero, textoFinal)
        } else {
          await sendWhatsAppMessage('WASENDER', '', wasenderCfg.apiKey, numero, textoFinal)
        }
      } catch (err) {
        console.error(`[resumo] erro WhatsApp para usuario ${usuario.id}:`, err)
      }
    } else {
      // Notificação interna
      await prisma.notificacaoInterna.create({
        data: {
          tenantId,
          usuarioId: usuario.id,
          tipo: 'resumo',
          titulo: `Resumo ${periodoLabel}`,
          conteudo: textoFinal,
        },
      })
    }
  }
}
