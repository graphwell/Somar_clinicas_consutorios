import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — buscar ficha completa
export async function GET(
  _req: Request,
  { params }: { params: { pacienteId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = params;

    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, tenantId },
      select: {
        id: true,
        nome: true,
        telefone: true,
        dataNascimento: true,
        totalGasto: true,
        ultimaVisita: true,
        contagemVisitas: true,
        createdAt: true,
        fichaCliente: {
          include: {
            fotos: { where: { deletado: false }, orderBy: { createdAt: 'desc' } },
            visitas: { orderBy: { createdAt: 'desc' }, take: 50 },
          },
        },
        assinaturas: {
          where: { ativo: true },
          include: { plano: { select: { nome: true } } },
          take: 1,
        },
      },
    });

    if (!paciente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    // Últimos agendamentos
    const agendamentos = await prisma.agendamento.findMany({
      where: { pacienteId, tenantId, status: { not: 'cancelado' } },
      include: {
        profissional: { select: { nome: true } },
        servico: { select: { nome: true, preco: true } },
      },
      orderBy: { dataHora: 'desc' },
      take: 10,
    });

    return NextResponse.json({ paciente, agendamentos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — criar ficha (upsert)
export async function POST(
  req: Request,
  { params }: { params: { pacienteId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = params;

    const clinica = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { nicho: true },
    });

    const ficha = await prisma.fichaCliente.upsert({
      where: { pacienteId },
      create: { pacienteId, tenantId, nicho: clinica?.nicho ?? 'BARBEARIA' },
      update: {},
    });

    return NextResponse.json(ficha);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — atualizar campos
export async function PATCH(
  req: Request,
  { params }: { params: { pacienteId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = params;
    const body = await req.json();

    // Campos permitidos
    const CAMPOS_PERMITIDOS = [
      'profissionalPreferidoId', 'observacoesGerais', 'alertas', 'produtosFavoritos',
      'estiloPreferido', 'maquinaNumero', 'barbaEstilo', 'produtoBarba',
      'tipoCabelo', 'porosidade', 'coloracaoAtual', 'historicoColoracao',
      'ultimaQuimica', 'tipoQuimica', 'produtosUsados', 'reacoesProdutos',
      'tipoPele', 'fitzpatrick', 'patologiasPele', 'medicamentosUso',
      'alergiasSubstancias', 'protocolosRealizados', 'resultadosEvolucao',
      'ultimaLimpezaPele',
    ];

    const data: Record<string, any> = {};
    for (const campo of CAMPOS_PERMITIDOS) {
      if (campo in body) data[campo] = body[campo] || null;
    }

    const ficha = await prisma.fichaCliente.update({
      where: { pacienteId },
      data,
    });

    return NextResponse.json(ficha);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
