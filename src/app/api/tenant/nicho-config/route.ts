import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { nicho: true }
    });

    if (!clinica) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    const config = await prisma.nichoConfig.findUnique({
      where: { nomeNicho: clinica.nicho }
    });

    if (!config) {
      // Fallback
      return NextResponse.json({
        nicho: clinica.nicho,
        labels: { cliente: 'Cliente', servico: 'Serviço', profissional: 'Profissional' }
      });
    }

    return NextResponse.json({
      nicho: clinica.nicho,
      labels: {
        cliente: config.labelCliente,
        servico: config.labelServico,
        profissional: config.labelProfissional
      }
    });

  } catch (error) {
    console.error('Erro ao buscar nicho-config', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
