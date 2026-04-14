import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionInfo } from '@/lib/auth-helpers'
import { gerarTermoTexto, gerarHashTermo, TERMO_VERSAO } from '@/lib/termo-imagem'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getSessionInfo()
    const body = await request.json()
    const { pacienteId, profissionalId, procedimento, tipoAssinatura, assinaturaImg } = body

    if (!pacienteId || !profissionalId || !procedimento || !tipoAssinatura) {
      return NextResponse.json({ error: 'Campos obrigatorios ausentes' }, { status: 400 })
    }

    const [paciente, profissional, clinica] = await Promise.all([
      prisma.paciente.findFirst({ where: { id: pacienteId, tenantId }, select: { nome: true, cpf: true } }),
      prisma.profissional.findFirst({ where: { id: profissionalId, tenantId }, select: { nome: true } }),
      prisma.clinica.findFirst({ where: { tenantId }, select: { nome: true } }),
    ])

    if (!paciente || !profissional || !clinica) {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
    }

    const dataHoje = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date())

    const textoTermo = gerarTermoTexto({
      nomeCliente: paciente.nome,
      nomeClinica: clinica.nome,
      nomeProfissional: profissional.nome,
      procedimento,
      data: dataHoje,
    })
    const termoHash = gerarHashTermo(textoTermo)

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
    const userAgent = request.headers.get('user-agent') ?? undefined

    const consentimento = await prisma.consentimentoImagem.create({
      data: {
        tenantId,
        pacienteId,
        profissionalId,
        nomeCliente: paciente.nome,
        cpfCliente: paciente.cpf ?? null,
        termoVersao: TERMO_VERSAO,
        termoHash,
        ipDispositivo: ip,
        userAgent,
        tipoAssinatura,
        assinaturaImg: assinaturaImg ?? null,
        aceito: true,
        aceitoEm: new Date(),
      },
    })

    return NextResponse.json({ consentimentoId: consentimento.id, termoHash, aceito: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
