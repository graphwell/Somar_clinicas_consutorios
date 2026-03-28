import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDias(escalas: { diaSemana: number }[]): string {
  const nomes = Array.from(new Set(escalas.map(e => e.diaSemana))).sort().map(d => DIAS[d]);
  if (nomes.length === 0) return 'Não definido';
  if (nomes.length === 1) return nomes[0];
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || searchParams.get('empresa_id');
  const servicoId = searchParams.get('servicoId');

  if (!tenantId || !servicoId) {
    return NextResponse.json({ error: 'Faltam parâmetros: tenantId e servicoId são obrigatórios' }, { status: 400 });
  }

  try {
    const servico = await prisma.servico.findUnique({
      where: { id: servicoId, tenantId },
      include: {
        profissionais: {
          where: { ativo: true },
          include: { escalas: { where: { ativo: true } } }
        }
      }
    });

    if (!servico) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    const profissionais = servico.profissionais.map(p => ({
      id: p.id,
      nome: p.nome,
      crm: p.registroProfissional || null,
      especialidade: p.especialidade,
      dias_atendimento: formatDias(p.escalas)
    }));

    return NextResponse.json({
      success: true,
      empresa_id: tenantId,
      servico_id: servico.id,
      servico_nome: servico.nome,
      profissionais
    });

  } catch (error) {
    console.error('Erro ao buscar profissionais por serviço:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
