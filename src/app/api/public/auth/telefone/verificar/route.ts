import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { gerarTokenPublico } from '@/lib/public-session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { telefone?: string; codigo?: string; slug?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

  const telefone = (body.telefone ?? '').replace(/\D/g, '');
  const codigo   = (body.codigo   ?? '').trim();
  const slug     = body.slug ?? '';

  if (!telefone || !codigo || !slug) {
    return NextResponse.json({ error: 'CODIGO_INVALIDO' }, { status: 400 });
  }

  const clinica = await prisma.clinica.findUnique({
    where:  { slug },
    select: { tenantId: true },
  });
  if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
  const { tenantId } = clinica;

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar verificação ativa
      const verificacao = await tx.verificacaoTelefone.findFirst({
        where: { telefone, tenantId, usado: false, expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
      });
      if (!verificacao) throw new Error('CODIGO_INVALIDO');

      // 2. Verificar limite de tentativas
      if (verificacao.tentativas >= 5) throw new Error('CODIGO_INVALIDO');

      // 3. Incrementar tentativas
      await tx.verificacaoTelefone.update({
        where: { id: verificacao.id },
        data:  { tentativas: { increment: 1 } },
      });

      // 4. Comparar código
      if (verificacao.codigo !== codigo) throw new Error('CODIGO_INVALIDO');

      // 5. Marcar como usado
      await tx.verificacaoTelefone.update({
        where: { id: verificacao.id },
        data:  { usado: true },
      });

      // 6. Buscar ou criar Paciente
      let paciente = await tx.paciente.findFirst({
        where: { tenantId, telefone: { contains: telefone.slice(-8) } },
        select: { id: true, nome: true },
      });
      const isNovoCliente = !paciente;

      if (!paciente) {
        paciente = await tx.paciente.create({
          data: { nome: 'Cliente', telefone, tenantId, tipoAtendimento: 'particular' },
          select: { id: true, nome: true },
        });
      }

      // 7. Gerar token público
      const token = await gerarTokenPublico({ pacienteId: paciente.id, tenantId, slug });

      return { token, pacienteId: paciente.id, nome: paciente.nome, isNovoCliente };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'CODIGO_INVALIDO';
    if (msg === 'CODIGO_INVALIDO') {
      return NextResponse.json({ error: 'CODIGO_INVALIDO' }, { status: 400 });
    }
    console.error('[OTP verificar]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
