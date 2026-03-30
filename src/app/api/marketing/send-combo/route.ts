import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { sendAndLog, applyTemplate, DEFAULT_COMBO_TEMPLATE } from '@/lib/marketing-helpers';

export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId, comboId } = await req.json();
    if (!pacienteId || !comboId) return NextResponse.json({ error: 'pacienteId e comboId obrigatórios' }, { status: 400 });

    const [paciente, combo, clinica] = await Promise.all([
      prisma.paciente.findFirst({ where: { id: pacienteId, tenantId } }),
      prisma.comboUpsell.findFirst({
        where: { idItem: comboId, tenantId },
        include: { gatilho: true, oferta: true },
      }),
      prisma.clinica.findUnique({ where: { tenantId } }),
    ]);

    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    if (!combo) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    if (!paciente.telefone) return NextResponse.json({ error: 'Paciente sem telefone' }, { status: 422 });

    const precoOriginal = combo.gatilho.preco + combo.oferta.preco;
    const precoCombo = precoOriginal * (1 - combo.desconto / 100);

    const mensagem = applyTemplate(DEFAULT_COMBO_TEMPLATE, {
      nome: paciente.nome.split(' ')[0],
      combo_nome: `${combo.gatilho.nome} + ${combo.oferta.nome}`,
      combo_descricao: combo.descricaoOferta,
      preco_original: precoOriginal.toFixed(2),
      preco_combo: precoCombo.toFixed(2),
      desconto: String(Math.round(combo.desconto)),
      clinica: clinica?.nome ?? 'Clínica',
    });

    const result = await sendAndLog({
      tenantId,
      tipo: 'combo',
      pacienteId,
      pacienteNome: paciente.nome,
      pacienteTelefone: paciente.telefone,
      mensagem,
      comboId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
