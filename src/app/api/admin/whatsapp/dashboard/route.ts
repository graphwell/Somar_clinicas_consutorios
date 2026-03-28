import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin } from '@/lib/wasender';

export async function GET(request: Request) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const [total, livre, emUso, demo, offline, aguardando] = await Promise.all([
    prisma.whatsappInstance.count(),
    prisma.whatsappInstance.count({ where: { status: 'LIVRE' } }),
    prisma.whatsappInstance.count({ where: { status: 'EM_USO' } }),
    prisma.whatsappInstance.count({ where: { status: 'DEMO' } }),
    prisma.whatsappInstance.count({ where: { status: 'OFFLINE' } }),
    prisma.whatsappInstance.count({ where: { status: 'AGUARDANDO' } }),
  ]);

  return NextResponse.json({
    success: true,
    kpis: {
      total,
      livre,
      emUso,
      demo,
      offline,
      aguardando,
      alertaEstoque: livre <= 2,
    },
  });
}
