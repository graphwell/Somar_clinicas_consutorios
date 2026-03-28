import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== '13201320') return NextResponse.json({ error: 'Unauthorized '}, { status: 401 });

  try {
    const clinicas = await prisma.clinica.findMany({
      include: {
        _count: {
          select: { agendamentos: true, profissionais: true, pacientes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ success: true, clinicas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
