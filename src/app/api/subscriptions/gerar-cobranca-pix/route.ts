import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { gerarPixBRCode } from '@/lib/pix-brcode';

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const { assinaturaClienteId } = await request.json() as { assinaturaClienteId?: string };
    if (!assinaturaClienteId) {
      return NextResponse.json({ error: 'assinaturaClienteId obrigatório.' }, { status: 400 });
    }

    const prisma = getTenantPrisma();

    const [assinatura, pixConfig] = await Promise.all([
      prisma.assinaturaCliente.findFirst({
        where: { id: assinaturaClienteId, tenantId },
        include: {
          plano:    { select: { nome: true } },
          paciente: { select: { nome: true } },
        },
      }),
      prisma.pixConfig.findUnique({ where: { tenantId } }),
    ]);

    if (!assinatura) {
      return NextResponse.json({ error: 'Assinatura não encontrada.' }, { status: 404 });
    }
    if (!pixConfig?.ativo || !pixConfig.chave) {
      return NextResponse.json({ error: 'PIX_NAO_CONFIGURADO' }, { status: 400 });
    }

    const agora    = new Date();
    const mesAno   = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const planoNome = (assinatura.plano as { nome: string }).nome;
    const descricao = `Plano ${planoNome} — ${mesAno}`;
    const favorecido = pixConfig.nomeFavorecido?.trim() || 'BARBEARIA';
    const brCode = gerarPixBRCode(pixConfig.chave, favorecido, assinatura.valorPago);

    // Registrar cobrança pendente
    const transacao = await prisma.transacaoFinanceira.create({
      data: {
        tenantId,
        tipo:          'cobranca_assinatura',
        status:        'pending',
        valor:         assinatura.valorPago,
        descricao,
        formaPagamento: 'pix',
        categoria:     'Assinatura',
        metadata: {
          assinaturaClienteId,
          planoId: assinatura.planoId,
          pacienteNome: (assinatura.paciente as { nome: string }).nome,
        },
      },
    });

    return NextResponse.json({
      copiaCola:    brCode,
      transacaoId:  transacao.id,
      valor:        assinatura.valorPago,
      descricao,
      favorecido,
    });
  } catch (err) {
    console.error('[gerar-cobranca-pix]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
