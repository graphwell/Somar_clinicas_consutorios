import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { montarEEnviarResumo } from '@/lib/resumo-diario'

export const dynamic = 'force-dynamic'

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3,
  quinta: 4, sexta: 5, sabado: 6,
}

function horaAtualBRT(): string {
  const agora = new Date()
  const brt = new Date(agora.getTime() - 3 * 60 * 60000)
  return brt.toISOString().slice(11, 16) // "HH:MM"
}

function diaSemanaBRT(): number {
  const agora = new Date()
  const brt = new Date(agora.getTime() - 3 * 60 * 60000)
  return brt.getDay()
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const horaAgora = horaAtualBRT()
  const diaAgora = diaSemanaBRT()

  const configs = await prisma.resumoConfig.findMany({
    where: { ativo: true },
    select: {
      tenantId: true, frequencia: true,
      horaDiario: true, diaSemana: true, horaSemanal: true,
    },
  })

  const pendentes = configs.filter((c) => {
    if (c.frequencia === 'diario') {
      return c.horaDiario === horaAgora
    }
    if (c.frequencia === 'semanal') {
      const diaAlvo = DIAS_SEMANA[c.diaSemana] ?? 1
      return diaAgora === diaAlvo && c.horaSemanal === horaAgora
    }
    return false
  })

  let enviados = 0
  for (const cfg of pendentes) {
    try {
      await montarEEnviarResumo(cfg.tenantId)
      enviados++
    } catch (err) {
      console.error(`[cron/resumo-diario] erro tenant ${cfg.tenantId}:`, err)
    }
  }

  return NextResponse.json({ ok: true, verificados: configs.length, enviados })
}
