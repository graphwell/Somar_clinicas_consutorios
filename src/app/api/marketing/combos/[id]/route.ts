import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { processarTemplate, TEMPLATE_COMBO_PADRAO } from '@/lib/marketing-utils';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id } = await params;
    const body = await req.json();

    const combo = await prisma.marketingCombo.findFirst({ where: { id, tenantId } });
    if (!combo) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });

    const updated = await prisma.marketingCombo.update({
      where: { id },
      data: {
        nome: body.nome ?? combo.nome,
        descricao: body.descricao !== undefined ? body.descricao : combo.descricao,
        servicos: body.servicos ?? combo.servicos,
        gatilhoServico: body.gatilhoServico !== undefined ? body.gatilhoServico : combo.gatilhoServico,
        precoOriginal: body.precoOriginal !== undefined ? Number(body.precoOriginal) : combo.precoOriginal,
        precoCombo: body.precoCombo !== undefined ? Number(body.precoCombo) : combo.precoCombo,
        descontoPct: body.descontoPct !== undefined ? Number(body.descontoPct) : combo.descontoPct,
        validadeDias: body.validadeDias !== undefined ? Number(body.validadeDias) : combo.validadeDias,
        templateWhatsapp: body.templateWhatsapp !== undefined ? body.templateWhatsapp : combo.templateWhatsapp,
        ativo: body.ativo !== undefined ? body.ativo : combo.ativo,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id } = await params;
    await prisma.marketingCombo.deleteMany({ where: { id, tenantId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/marketing/combos/[id] com body { pacienteId } → envia combo para o paciente */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id } = await params;
    const { pacienteId } = await req.json();
    if (!pacienteId) return NextResponse.json({ error: 'pacienteId obrigatório' }, { status: 400 });

    const [combo, paciente, clinica, config] = await Promise.all([
      prisma.marketingCombo.findFirst({ where: { id, tenantId, ativo: true } }),
      prisma.paciente.findFirst({ where: { id: pacienteId, tenantId } }),
      prisma.clinica.findUnique({ where: { tenantId } }),
      prisma.marketingConfig.findUnique({ where: { tenantId } }),
    ]);

    if (!combo) return NextResponse.json({ error: 'Combo não encontrado ou inativo' }, { status: 404 });
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    if (!paciente.telefone) return NextResponse.json({ error: 'Paciente sem telefone' }, { status: 422 });

    const template = combo.templateWhatsapp || TEMPLATE_COMBO_PADRAO;
    const nomeClinica = config?.nomeClinica || clinica?.nome || 'Clínica';

    const mensagem = processarTemplate(template, {
      nome: paciente.nome.split(' ')[0],
      combo_nome: combo.nome,
      combo_descricao: combo.descricao ?? '',
      preco_original: combo.precoOriginal ? Number(combo.precoOriginal).toFixed(2) : '',
      preco_combo: Number(combo.precoCombo).toFixed(2),
      desconto: String(combo.descontoPct ?? 0),
      validade: String(combo.validadeDias),
      clinica: nomeClinica,
    });

    const result = await sendAndLog({
      tenantId,
      tipo: 'combo',
      clienteNome: paciente.nome,
      clienteTelefone: paciente.telefone,
      mensagemEnviada: mensagem,
      comboId: id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
