import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();

    // Consultamos o banco MASTER para metadados da clínica
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { nicho: true }
    });

    if (!clinica) {
      return NextResponse.json({ error: 'Empresa não identificada no Master DB' }, { status: 404 });
    }

    // O NichoConfig também reside no Master para padronização global
    const config = await prisma.nichoConfig.findUnique({
      where: { nomeNicho: clinica.nicho }
    });

    if (!config) {
      // Fallback inteligente para nichos básicos
      let labels = { cliente: 'Cliente', servico: 'Serviço', profissional: 'Profissional' };
      
      if (clinica.nicho === 'Nutricionista') {
        labels = { cliente: 'Paciente', servico: 'Consulta', profissional: 'Nutricionista' };
      } else if (clinica.nicho === 'Psicólogo') {
        labels = { cliente: 'Paciente', servico: 'Sessão', profissional: 'Psicólogo' };
      }

      return NextResponse.json({
        nicho: clinica.nicho,
        labels
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
    console.error('Erro ao buscar nicho-config:', error);
    return NextResponse.json({ error: 'Erro de Autorização' }, { status: 401 });
  }
}
