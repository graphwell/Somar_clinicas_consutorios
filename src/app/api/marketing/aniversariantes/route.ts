import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

/** Aniversariantes de hoje que ainda não receberam mensagem */
export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const dia = hoje.getDate();

    const todos = await prisma.paciente.findMany({
      where: { tenantId, dataNascimento: { not: null }, deletedAt: null },
      select: { id: true, nome: true, telefone: true, dataNascimento: true },
    });

    const aniversariantes = todos.filter(p => {
      if (!p.dataNascimento) return false;
      const d = new Date(p.dataNascimento);
      return d.getMonth() + 1 === mes && d.getDate() === dia;
    });

    // Verificar quais já receberam mensagem hoje
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const jaEnviados = await prisma.marketingEnvio.findMany({
      where: { tenantId, tipo: 'aniversario', enviadoEm: { gte: inicioDia } },
      select: { clienteTelefone: true },
    });
    const telefonesJaEnviados = new Set(jaEnviados.map(e => e.clienteTelefone));

    const result = aniversariantes.map(p => ({
      ...p,
      mensagemEnviada: p.telefone ? telefonesJaEnviados.has(p.telefone) : false,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
