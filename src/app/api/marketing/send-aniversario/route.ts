import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { processarTemplate, TEMPLATE_ANIVERSARIO_PADRAO } from '@/lib/marketing-utils';

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

    const desconto = config?.aniversarioDescontoPct ?? 15;
    const nomeClinica = config?.nomeClinica || clinica?.nome || 'Clínica';
    const template = config?.aniversarioTemplate || TEMPLATE_ANIVERSARIO_PADRAO;

    const mensagem = processarTemplate(template, {
      nome: paciente.nome.split(' ')[0],
      desconto: String(desconto),
      clinica: nomeClinica,
    });

    const result = await sendAndLog({
      tenantId,
      tipo: 'aniversario',
      clienteNome: paciente.nome,
      clienteTelefone: paciente.telefone,
      mensagemEnviada: mensagem,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
