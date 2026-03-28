import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant, wasenderGet } from '@/lib/wasender';

export async function GET(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const instancia = await prisma.whatsappInstance.findFirst({
    where: { empresaId: tenant.tenantId },
    select: { id: true, bearerToken: true, sessionId: true, status: true, numeroWa: true },
  });

  if (!instancia) {
    return NextResponse.json({ success: true, conectado: false, instancia: null });
  }

  const { ok, data } = await wasenderGet(instancia.bearerToken, '/session/status');

  const conectado = ok ? (data.connected ?? data.status === 'connected') : false;
  const numero = data.number ?? data.phoneNumber ?? instancia.numeroWa ?? null;

  await prisma.whatsappInstance.update({
    where: { id: instancia.id },
    data: { ultimoPing: new Date() },
  });

  return NextResponse.json({ success: true, conectado, numero, status: instancia.status });
}
