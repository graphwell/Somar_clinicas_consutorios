import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { PERMISSOES_PADRAO } from '@/lib/permissoes-padrao';

// GET — retorna permissões do role do usuário logado
export async function GET() {
  try {
    const { tenantId, role } = await getSessionInfo();

    // Admin tem acesso total — não precisa consultar DB
    if (role === 'admin' || role === 'synka_admin') {
      return NextResponse.json({ permissoes: [], isAdmin: true });
    }

    let permissoes = await prisma.permissaoRole.findMany({
      where: { tenantId, role, ativo: true },
      select: { recurso: true, acao: true, ativo: true },
    });

    // Se não houver permissões customizadas, usar as padrão
    if (permissoes.length === 0) {
      const padrao = PERMISSOES_PADRAO[role] || [];
      permissoes = padrao.map((p) => ({ ...p, ativo: true }));
    }

    return NextResponse.json({ permissoes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — admin atualiza permissões de um role
export async function PATCH(req: Request) {
  try {
    const { tenantId, role: userRole } = await getSessionInfo();

    if (userRole !== 'admin' && userRole !== 'synka_admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { role, permissoes } = await req.json();
    // permissoes: [{ recurso, acao, ativo }]

    // Upsert cada permissão
    const ops = permissoes.map((p: { recurso: string; acao: string; ativo: boolean }) =>
      prisma.permissaoRole.upsert({
        where: { tenantId_role_recurso_acao: { tenantId, role, recurso: p.recurso, acao: p.acao } },
        update: { ativo: p.ativo },
        create: { tenantId, role, recurso: p.recurso, acao: p.acao, ativo: p.ativo },
      })
    );

    await prisma.$transaction(ops);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET all — admin lista permissões de todos os roles
export async function POST(req: Request) {
  try {
    const { tenantId, role: userRole } = await getSessionInfo();

    if (userRole !== 'admin' && userRole !== 'synka_admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { targetRole } = await req.json();

    let permissoes = await prisma.permissaoRole.findMany({
      where: { tenantId, role: targetRole },
    });

    // Se não houver, retornar padrão
    if (permissoes.length === 0) {
      const padrao = PERMISSOES_PADRAO[targetRole] || [];
      return NextResponse.json({
        permissoes: padrao.map((p) => ({
          ...p,
          ativo: true,
          tenantId,
          role: targetRole,
        })),
        isPadrao: true,
      });
    }

    return NextResponse.json({ permissoes, isPadrao: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
