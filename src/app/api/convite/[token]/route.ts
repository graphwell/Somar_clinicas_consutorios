import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/convite/[token]
 * Verifica se o convite é válido e retorna dados para exibir na página.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const convite = await prisma.convite.findUnique({
    where: { token: params.token },
    include: {
      clinica: { select: { nome: true, configBranding: true } },
    },
  });

  if (!convite || convite.status !== 'pendente' || convite.expirarEm < new Date()) {
    return Response.json({ error: 'Convite inválido ou expirado' }, { status: 404 });
  }

  const branding = convite.clinica.configBranding as any;

  return Response.json({
    nome: convite.nome,
    role: convite.role,
    clinica: {
      nome: convite.clinica.nome,
      logoUrl: branding?.logoUrl ?? null,
    },
  });
}

/**
 * POST /api/convite/[token]
 * Aceita o convite: cria usuário com a senha definida.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const convite = await prisma.convite.findUnique({
    where: { token: params.token },
  });

  if (!convite || convite.status !== 'pendente' || convite.expirarEm < new Date()) {
    return Response.json({ error: 'Convite inválido ou expirado' }, { status: 404 });
  }

  const { senha } = await req.json();
  if (!senha || senha.length < 6) {
    return Response.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 });
  }

  // email é @unique global — gerar interno se não tiver
  const emailFinal = convite.email ?? `convite-${convite.id}@synka.internal`;

  const existente = await prisma.usuario.findUnique({ where: { email: emailFinal } });
  if (existente) {
    return Response.json({ error: 'Já existe uma conta com esse email' }, { status: 400 });
  }

  const senhaHash = await hashPassword(senha);

  await prisma.$transaction([
    prisma.usuario.create({
      data: {
        tenantId: convite.tenantId,
        nome: convite.nome,
        email: emailFinal,
        telefone: convite.telefone ?? null,
        role: convite.role,
        senhaHash,
        profissionalId: convite.profissionalId ?? null,
        ativo: true,
        emailVerificado: true,
      },
    }),
    prisma.convite.update({
      where: { token: params.token },
      data: { status: 'aceito', aceitoEm: new Date() },
    }),
  ]);

  return Response.json({ ok: true });
}
