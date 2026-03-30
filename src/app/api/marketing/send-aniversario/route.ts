import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { sendAndLog, applyTemplate, DEFAULT_ANIVERSARIO_TEMPLATE } from '@/lib/marketing-helpers';

export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = await req.json();
    if (!pacienteId) return NextResponse.json({ error: 'pacienteId obrigatório' }, { status: 400 });

    const [paciente, config, clinica] = await Promise.all([
      prisma.paciente.findFirst({ where: { id: pacienteId, tenantId } }),
      prisma.marketingConfig.findUnique({ where: { tenantId } }),
      prisma.clinica.findUnique({ where: { tenantId } }),
    ]);

    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    if (!paciente.telefone) return NextResponse.json({ error: 'Paciente sem telefone' }, { status: 422 });

    const desconto = config?.aniversarioDesconto ?? 15;
    const template = config?.aniversarioTemplate || DEFAULT_ANIVERSARIO_TEMPLATE;

    const mensagem = applyTemplate(template, {
      nome: paciente.nome.split(' ')[0],
      desconto: String(desconto),
      clinica: clinica?.nome ?? 'Clínica',
    });

    const result = await sendAndLog({
      tenantId,
      tipo: 'aniversario',
      pacienteId,
      pacienteNome: paciente.nome,
      pacienteTelefone: paciente.telefone,
      mensagem,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
