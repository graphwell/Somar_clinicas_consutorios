import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatorio' }, { status: 400 });

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId }
    });
    return NextResponse.json({ success: true, clinica });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { tenantId, razaoSocial, cnpj, endereco, adminPhone, nicho, botActive } = data;

    if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatorio' }, { status: 400 });

    const clinica = await prisma.clinica.update({
      where: { tenantId },
      data: {
        razaoSocial,
        cnpj,
        endereco,
        adminPhone,
        nicho,
        botActive
      }
    });

    return NextResponse.json({ success: true, clinica });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
