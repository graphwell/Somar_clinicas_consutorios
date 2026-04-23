import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

export async function GET(request: Request) {
  const secret =
    request.headers.get('x-admin-secret') ??
    new URL(request.url).searchParams.get('secret') ?? '';

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const emailFiltro = searchParams.get('email') ?? '';
  const resultadoFiltro = searchParams.get('resultado') ?? '';

  const where: any = {};
  if (emailFiltro) where.email = { contains: emailFiltro, mode: 'insensitive' };
  if (resultadoFiltro && resultadoFiltro !== 'todos') where.resultado = resultadoFiltro;

  const [logs, total, hoje] = await Promise.all([
    prisma.loginLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.loginLog.count({ where }),
    prisma.loginLog.count({
      where: {
        ...where,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  // Top e-mails com falhas
  const falhas = await prisma.loginLog.groupBy({
    by: ['email'],
    where: { resultado: { not: 'sucesso' } },
    _count: { email: true },
    orderBy: { _count: { email: 'desc' } },
    take: 10,
  });

  // Taxa de sucesso
  const totalGeral = await prisma.loginLog.count();
  const totalSucesso = await prisma.loginLog.count({ where: { resultado: 'sucesso' } });

  return NextResponse.json({
    logs,
    meta: {
      total,
      hoje,
      taxaSucesso: totalGeral > 0 ? Math.round((totalSucesso / totalGeral) * 100) : 0,
      topFalhas: falhas.map(f => ({ email: f.email, tentativas: f._count.email })),
    },
  });
}
