import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-geral',
    nome: 'Consulta Clínica Geral',
    especialidade: null,
    isGlobal: true,
    campos: {
      queixaPrincipal: 'Paciente relata ',
      evolucao: 'Paciente em acompanhamento. ',
      conduta: 'Orientações: ',
    },
  },
  {
    id: 'tpl-retorno',
    nome: 'Retorno / Acompanhamento',
    especialidade: null,
    isGlobal: true,
    campos: {
      queixaPrincipal: 'Retorno para acompanhamento. ',
      evolucao: 'Paciente refere melhora de ',
      conduta: 'Manter conduta anterior. ',
    },
  },
  {
    id: 'tpl-primeira',
    nome: 'Primeira Consulta (Anamnese)',
    especialidade: null,
    isGlobal: true,
    campos: {
      queixaPrincipal: '',
      historiaMolestia: 'Início dos sintomas: \nCaracterísticas: \nFatores de melhora/piora: ',
      historicoMedico: 'Antecedentes pessoais: \nAntecedentes familiares: \nCirurgias anteriores: ',
      evolucao: '',
      conduta: '',
    },
  },
  {
    id: 'tpl-urgencia',
    nome: 'Consulta de Urgência',
    especialidade: null,
    isGlobal: true,
    campos: {
      queixaPrincipal: 'Urgência: ',
      evolucao: 'Paciente apresenta-se em ',
      conduta: 'Conduta de urgência: ',
    },
  },
];

export async function GET() {
  try {
    const { tenantId, profissionalId } = await getSessionInfo();

    const personalizados = await prisma.prontuarioTemplate.findMany({
      where: {
        tenantId,
        OR: [
          { profissionalId: profissionalId || undefined },
          { isGlobal: false, profissionalId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json([...DEFAULT_TEMPLATES, ...personalizados]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, profissionalId } = await getSessionInfo();
    const { nome, especialidade, campos } = await req.json();

    if (!nome || !campos) return NextResponse.json({ error: 'nome e campos obrigatórios' }, { status: 400 });

    const template = await prisma.prontuarioTemplate.create({
      data: { tenantId, profissionalId: profissionalId || null, nome, especialidade, campos },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
