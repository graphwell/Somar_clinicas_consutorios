import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();

    // Consultamos o banco MASTER para metadados da clínica
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { nicho: true, onboardingCompleted: true }
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
      let labels = { 
        cliente: 'Cliente', 
        servico: 'Serviço', 
        profissional: 'Profissional',
        atendimento: 'Atendimento',
        prontuario: 'Ficha'
      };
      
      if (clinica.nicho.includes('Médica')) {
        labels = { cliente: 'Paciente', servico: 'Consulta', profissional: 'Médico', atendimento: 'Consulta', prontuario: 'Prontuário' };
      } else if (clinica.nicho === 'Nutricionista') {
        labels = { cliente: 'Paciente', servico: 'Consulta', profissional: 'Nutricionista', atendimento: 'Consulta', prontuario: 'Prontuário' };
      } else if (clinica.nicho === 'Psicólogo') {
        labels = { cliente: 'Paciente', servico: 'Sessão', profissional: 'Psicólogo', atendimento: 'Sessão', prontuario: 'Prontuário' };
      } else if (clinica.nicho === 'Barbearia' || clinica.nicho === 'Salão de Beleza') {
        labels = { cliente: 'Cliente', servico: 'Corte/Serviço', profissional: 'Barbeiro/Profissional', atendimento: 'Atendimento', prontuario: 'Histórico' };
      }

      return NextResponse.json({
        nicho: clinica.nicho,
        onboardingCompleted: clinica.onboardingCompleted,
        labels
      });
    }

      return NextResponse.json({
        nicho: clinica.nicho,
        onboardingCompleted: clinica.onboardingCompleted,
        labels: {
          cliente: config.labelCliente,
          servico: config.labelServico,
          profissional: config.labelProfissional,
          atendimento: (config as any).labelAtendimento || 'Atendimento',
          prontuario: (config as any).labelProntuario || 'Prontuário'
        }
      });

  } catch (error) {
    console.error('Erro ao buscar nicho-config:', error);
    return NextResponse.json({ error: 'Erro de Autorização' }, { status: 401 });
  }
}
