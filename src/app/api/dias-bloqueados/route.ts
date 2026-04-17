import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

// ─── GET /api/dias-bloqueados ───────────────────────────
// Lista os dias configurados (futuros + do mês atual)
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const apenasAtivos = searchParams.get('ativos') !== 'false';

    const dias = await prisma.diaBloqueado.findMany({
      where: {
        tenantId,
        ...(apenasAtivos ? { ativo: true } : {}),
      },
      orderBy: { data: 'asc' },
    });

    return NextResponse.json(dias);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/dias-bloqueados ──────────────────────────
// Cria um novo dia bloqueado
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { data, titulo, mensagem, retornoData, retornoHora } = await req.json();

    if (!data) return NextResponse.json({ error: 'data é obrigatória' }, { status: 400 });
    if (!mensagem?.trim()) return NextResponse.json({ error: 'mensagem é obrigatória' }, { status: 400 });

    // Gera mensagem automática se não enviada
    const dataFormatada = new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const retornoFormatado = retornoData
      ? new Date(retornoData).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : null;

    const mensagemFinal =
      mensagem ||
      `Olá! 👋 Hoje, dia ${dataFormatada}, não estaremos funcionando por conta ${titulo ? `do ${titulo}` : 'de feriado'}.` +
      (retornoFormatado ? ` Voltamos no dia ${retornoFormatado}${retornoHora ? ` às ${retornoHora}` : ''}. ` : ' ') +
      `Caso queira agendar para outra data, é só responder aqui! 😊`;

    const dia = await prisma.diaBloqueado.create({
      data: {
        tenantId,
        data: new Date(data),
        titulo: titulo || 'Feriado',
        mensagem: mensagemFinal,
        retornoData: retornoData ? new Date(retornoData) : null,
        retornoHora: retornoHora || null,
        ativo: true,
      },
    });

    return NextResponse.json(dia);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/dias-bloqueados ─────────────────────────
// Atualiza (toggle ativo, edita mensagem, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const dia = await prisma.diaBloqueado.updateMany({
      where: { id, tenantId },
      data: {
        ...(updates.ativo !== undefined ? { ativo: updates.ativo } : {}),
        ...(updates.mensagem ? { mensagem: updates.mensagem } : {}),
        ...(updates.titulo ? { titulo: updates.titulo } : {}),
        ...(updates.retornoHora !== undefined ? { retornoHora: updates.retornoHora } : {}),
        ...(updates.retornoData !== undefined ? { retornoData: updates.retornoData ? new Date(updates.retornoData) : null } : {}),
      },
    });

    return NextResponse.json({ ok: true, atualizado: dia.count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/dias-bloqueados?id=xxx ─────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    await prisma.diaBloqueado.deleteMany({ where: { id, tenantId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
