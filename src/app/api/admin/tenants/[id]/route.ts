import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== '13201320') return NextResponse.json({ error: 'Unauthorized '}, { status: 401 });

  const body = await request.json();
  const { statusBot, nicho } = body;

  try {
    const clinica = await prisma.clinica.update({
      where: { tenantId: id },
      data: {
        ...(statusBot !== undefined && { botActive: statusBot === 'ativo' }),
        ...(nicho && { nicho })
      }
    });
    return NextResponse.json({ success: true, clinica });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
