import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { processarTemplate, TEMPLATE_COMBO_PADRAO } from '@/lib/marketing-utils';

/**
 * POST /api/marketing/send-combo
 * Body: { pacienteId, comboId }
 *
 * Envia mensagem WhatsApp de combo do modelo ComboUpsell (legacy).
 * Para combos do MarketingCombo (novo), use POST /api/marketing/combos/[id].
 */
export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId, comboId } = await req.json();
    if (!pacienteId || !comboId) {
      return NextResponse.json({ error: 'pacienteId e comboId obrigatórios' }, { status: 400 });
    }

    const [paciente, combo, clinica, config] = await Promise.all([
      prisma.paciente.findFirst({ where: { id: pacienteId, tenantId } }),
      prisma.comboUpsell.findFirst({
        where: { idItem: comboId, tenantId },
        include: { gatilho: true, oferta: true },
      }),
      prisma.clinica.findUnique({ where: { tenantId } }),
      prisma.marketingConfig.findUnique({ where: { tenantId } }),
    ]);

    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    if (!combo) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    if (!paciente.telefone) return NextResponse.json({ error: 'Paciente sem telefone' }, { status: 422 });

    const precoOriginal = combo.gatilho.preco + combo.oferta.preco;
    const precoCombo = precoOriginal * (1 - combo.desconto / 100);
    const nomeClinica = config?.nomeClinica || clinica?.nome || 'Clínica';

    const mensagem = processarTemplate(TEMPLATE_COMBO_PADRAO, {
      nome: paciente.nome.split(' ')[0],
      combo_nome: `${combo.gatilho.nome} + ${combo.oferta.nome}`,
      combo_descricao: combo.descricaoOferta,
      preco_original: precoOriginal.toFixed(2),
      preco_combo: precoCombo.toFixed(2),
      desconto: String(Math.round(combo.desconto)),
      validade: '30',
      clinica: nomeClinica,
    });

    const result = await sendAndLog({
      tenantId,
      tipo: 'combo',
      clienteNome: paciente.nome,
      clienteTelefone: paciente.telefone,
      mensagemEnviada: mensagem,
      comboId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
