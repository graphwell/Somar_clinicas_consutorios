import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function verificarAdminSecret(request: Request): boolean {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return false;

  const { searchParams } = new URL(request.url);
  const secretFromQuery = searchParams.get('secret');
  const secretFromHeader = request.headers.get('x-admin-secret');

  return (secretFromHeader === ADMIN_SECRET) || (secretFromQuery === ADMIN_SECRET);
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!verificarAdminSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { acao, nicho, nome, adminPhone, motivoSuspensao, plano, statusAssinatura, diasTrial } = body;

  try {
    // ── Clinica ──────────────────────────────────────────────────────────────
    const clinicaData: any = {};
    if (nome) clinicaData.nome = nome;
    if (nicho) clinicaData.nicho = nicho;
    if (adminPhone !== undefined) clinicaData.adminPhone = adminPhone;

    if (acao === 'suspender_manual') {
      clinicaData.botActive = false;
      clinicaData.configBranding = { motivoSuspensao: motivoSuspensao ?? 'Suspenso manualmente' };
    } else if (acao === 'suspender_inadimplencia') {
      clinicaData.botActive = false;
      clinicaData.configBranding = { motivoSuspensao: 'Inadimplência' };
    } else if (acao === 'reativar') {
      clinicaData.botActive = true;
      clinicaData.configBranding = { motivoSuspensao: null };
    } else if (acao !== undefined) {
      // ação desconhecida — ignora
    } else {
      // PUT genérico legado
      if (body.statusBot !== undefined) clinicaData.botActive = body.statusBot === 'ativo';
    }

    if (Object.keys(clinicaData).length > 0) {
      await prisma.clinica.update({ where: { tenantId: id }, data: clinicaData });
    }

    // ── Assinatura ────────────────────────────────────────────────────────────
    const assinaturaData: any = {};
    if (plano) assinaturaData.plano = plano;
    if (statusAssinatura) assinaturaData.status = statusAssinatura;

    if (diasTrial && Number(diasTrial) > 0) {
      // Estende trial: soma os dias a partir de hoje
      assinaturaData.status = 'trial';
      // Guarda data fim do trial no campo updatedAt como referência (campo extra via configBranding na clinica)
    }

    if (Object.keys(assinaturaData).length > 0) {
      await prisma.assinatura.upsert({
        where: { tenantId: id },
        create: { tenantId: id, ...assinaturaData },
        update: assinaturaData,
      });
    }

    // Se deu trial days, salva a data no configBranding da clinica
    if (diasTrial && Number(diasTrial) > 0) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + Number(diasTrial));
      const clinica = await prisma.clinica.findUnique({ where: { tenantId: id }, select: { configBranding: true } });
      const branding = (clinica?.configBranding as any) ?? {};
      await prisma.clinica.update({
        where: { tenantId: id },
        data: { configBranding: { ...branding, trialEndsAt: trialEndsAt.toISOString() } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!verificarAdminSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // ── Limpeza Profunda (Transaction) ───────────────────────────────────────
    // Deletar em ordem inversa de dependência para evitar erros de FK
    await prisma.$transaction([
      // 1. Marketing de Alertas e Combos
      prisma.marketingEnvio.deleteMany({ where: { tenantId: id } }),
      prisma.marketingCampanha.deleteMany({ where: { tenantId: id } }),
      prisma.marketingCombo.deleteMany({ where: { tenantId: id } }),

      // 2. Sub-sub-relações (sem tenantId direto ou dependentes de nível 3)
      prisma.professionalSchedule.deleteMany({ where: { profissional: { tenantId: id } } }),
      prisma.medidaCorporal.deleteMany({ where: { prontuario: { tenantId: id } } }),
      prisma.cidSugerido.deleteMany({ where: { prontuario: { tenantId: id } } }),
      prisma.prontuarioArquivo.deleteMany({ where: { tenantId: id } }),
      prisma.fotoCliente.deleteMany({ where: { tenantId: id } }),
      prisma.visitaCliente.deleteMany({ where: { tenantId: id } }),
      prisma.odontogramaItem.deleteMany({ where: { tenantId: id } }),
      prisma.odontogramaHistorico.deleteMany({ where: { tenantId: id } }),

      // 3. Vitrine e Produtos (Ligações)
      prisma.comboItemVitrine.deleteMany({ where: { combo: { tenantId: id } } }),
      prisma.servicoSugestao.deleteMany({ where: { tenantId: id } }),

      // 4. Relacionamentos Muitos-para-Muitos e Tabelas de Ligação
      prisma.profissionalConvenio.deleteMany({ where: { tenantId: id } }),
      prisma.convenioTabelaPreco.deleteMany({ where: { tenantId: id } }),
      prisma.pacienteAlergia.deleteMany({ where: { tenantId: id } }),
      prisma.pacienteMedicamento.deleteMany({ where: { tenantId: id } }),

      // 5. Financeiro e Logs
      prisma.transacaoFinanceira.deleteMany({ where: { tenantId: id } }),
      prisma.repasseProfissional.deleteMany({ where: { tenantId: id } }),
      prisma.whatsappMigrationLog.deleteMany({ where: { tenantId: id } }),

      // 6. Atendimento e Clínico
      prisma.agendamento.deleteMany({ where: { tenantId: id } }),
      prisma.prontuarioRegistro.deleteMany({ where: { tenantId: id } }),
      prisma.prontuarioTemplate.deleteMany({ where: { tenantId: id } }),
      prisma.fichaCliente.deleteMany({ where: { tenantId: id } }),

      // 7. Produtos e Pedidos (Vitrine)
      prisma.pedidoItem.deleteMany({ where: { tenantId: id } }),
      prisma.comboProduto.deleteMany({ where: { tenantId: id } }),
      prisma.produto.deleteMany({ where: { tenantId: id } }),
      prisma.categoriaProduto.deleteMany({ where: { tenantId: id } }),

      // 8. Configurações e Instâncias
      prisma.whatsappInstance.deleteMany({ where: { empresaId: id } }),
      prisma.clinicIntegration.deleteMany({ where: { tenantId: id } }),
      prisma.assinatura.deleteMany({ where: { tenantId: id } }),
      prisma.assinaturaCliente.deleteMany({ where: { tenantId: id } }),
      prisma.planoAssinatura.deleteMany({ where: { tenantId: id } }),
      prisma.permissaoRole.deleteMany({ where: { tenantId: id } }),
      prisma.notificacao.deleteMany({ where: { tenantId: id } }),
      prisma.comboUpsell.deleteMany({ where: { tenantId: id } }),
      prisma.campanhaAviso.deleteMany({ where: { tenantId: id } }),

      // 9. Entidades Principais (Nível 2)
      prisma.paciente.deleteMany({ where: { tenantId: id } }),
      prisma.profissional.deleteMany({ where: { tenantId: id } }),
      prisma.servico.deleteMany({ where: { tenantId: id } }),
      prisma.convenioEmpresa.deleteMany({ where: { tenantId: id } }),

      // 10. Usuários
      prisma.usuario.deleteMany({ where: { tenantId: id } }),

      // 11. A Clínica (O Grand Finale)
      prisma.clinica.delete({ where: { tenantId: id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar clinica:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
