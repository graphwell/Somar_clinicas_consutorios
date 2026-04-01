import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();

    const tx = await prisma.transacaoFinanceira.findFirst({
      where: { id: params.id, tenantId },
      include: {
        profissional: { select: { nome: true } },
        agendamento: {
          include: {
            paciente: { select: { nome: true, telefone: true } },
            servico: { select: { nome: true } },
          },
        },
        clinica: { select: { nome: true, cnpj: true, endereco: true, adminPhone: true } },
      },
    });

    if (!tx) return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });

    const dataFmt = (tx.dataPagamento || tx.createdAt).toLocaleDateString('pt-BR');
    const valorFmt = tx.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Recibo ${tx.numeroRecibo}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
  .header { border-bottom: 2px solid #40916C; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { color: #40916C; font-size: 24px; font-weight: 900; }
  .recibo-num { color: #666; font-size: 12px; margin-top: 4px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
  .label { color: #888; font-size: 12px; text-transform: uppercase; }
  .value { font-weight: 600; font-size: 13px; }
  .total { background: #f8fffe; border: 1px solid #40916C; border-radius: 8px; padding: 16px; margin-top: 24px; }
  .total-label { color: #40916C; font-size: 12px; text-transform: uppercase; font-weight: 700; }
  .total-value { font-size: 28px; font-weight: 900; color: #2D6A4F; }
  .footer { margin-top: 40px; color: #aaa; font-size: 11px; text-align: center; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">${tx.clinica?.nome || 'Synka'}</div>
  <div class="recibo-num">RECIBO Nº ${tx.numeroRecibo || tx.id.slice(-8).toUpperCase()}</div>
  ${tx.clinica?.cnpj ? `<div style="color:#888;font-size:11px">CNPJ: ${tx.clinica.cnpj}</div>` : ''}
</div>

<div class="row"><span class="label">Descrição</span><span class="value">${tx.descricao || '—'}</span></div>
${tx.agendamento?.paciente ? `<div class="row"><span class="label">Paciente</span><span class="value">${tx.agendamento.paciente.nome}</span></div>` : ''}
${tx.agendamento?.servico ? `<div class="row"><span class="label">Serviço</span><span class="value">${tx.agendamento.servico.nome}</span></div>` : ''}
${tx.profissional ? `<div class="row"><span class="label">Profissional</span><span class="value">${tx.profissional.nome}</span></div>` : ''}
<div class="row"><span class="label">Data</span><span class="value">${dataFmt}</span></div>
${tx.formaPagamento ? `<div class="row"><span class="label">Forma de Pagamento</span><span class="value">${tx.formaPagamento.replace(/_/g, ' ').toUpperCase()}</span></div>` : ''}
${tx.numeroRecibo ? `<div class="row"><span class="label">Nº Recibo</span><span class="value">${tx.numeroRecibo}</span></div>` : ''}

<div class="total">
  <div class="total-label">Valor Recebido</div>
  <div class="total-value">${valorFmt}</div>
</div>

<div class="footer">
  <p>${tx.clinica?.endereco || ''}</p>
  <p>${tx.clinica?.adminPhone || ''}</p>
  <p>Documento gerado por Synka em ${new Date().toLocaleDateString('pt-BR')}</p>
</div>

<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
