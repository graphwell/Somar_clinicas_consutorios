import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey } from '@/lib/n8n-auth';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDias(escalas: { diaSemana: number }[]): string {
  const nomes = Array.from(new Set(escalas.map(e => e.diaSemana))).sort().map(d => DIAS[d]);
  if (nomes.length === 0) return 'Não definido';
  if (nomes.length === 1) return nomes[0];
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
}

export async function GET(request: Request) {
  if (!autenticarApiKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || searchParams.get('empresa_id');
  const tipo = searchParams.get('tipo') || 'all';

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId é obrigatório' }, { status: 400 });
  }

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId },
      include: {
        servicos: { where: { ativo: true } },
        profissionais: {
          where: { ativo: true },
          include: {
            escalas: { where: { ativo: true } },
            servicos: { where: { ativo: true } }
          }
        },
        convenios: { where: { ativo: true } }
      }
    });

    if (!clinica) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    // Agrupar profissionais por especialidade
    const especialidadesMap = new Map<string, any[]>();
    clinica.profissionais.forEach(p => {
      const esp = p.especialidade || 'Geral';
      if (!especialidadesMap.has(esp)) especialidadesMap.set(esp, []);
      especialidadesMap.get(esp)!.push({
        id: p.id,
        nome: p.nome,
        crm: p.registroProfissional || null,
        dias_atendimento: formatDias(p.escalas),
        servicos: p.servicos.map(s => s.nome)
      });
    });

    const especialidades = Array.from(especialidadesMap.entries()).map(([nome, profs]) => ({
      id: nome.toLowerCase().replace(/\s+/g, '_'),
      nome,
      profissionais: profs
    }));

    if (tipo === 'especialidades') {
      return NextResponse.json({
        empresa_id: tenantId,
        tipo: 'especialidades',
        items: especialidades
      });
    }

    if (tipo === 'servicos') {
      return NextResponse.json({
        empresa_id: tenantId,
        tipo: 'servicos',
        instrucao: 'Use o campo servicoId (nao o numero da lista) ao chamar outras ferramentas',
        items: clinica.servicos.map((s, i) => ({
          numero: i + 1,
          servicoId: s.id,
          nome: s.nome,
          preco: s.preco,
          duracao: s.duracaoMinutos
        }))
      });
    }

    if (tipo === 'profissionais') {
      return NextResponse.json({
        empresa_id: tenantId,
        tipo: 'profissionais',
        instrucao: 'Use o campo profissionalId (nao o numero da lista) ao chamar outras ferramentas',
        items: clinica.profissionais.map((p, i) => ({
          numero: i + 1,
          profissionalId: p.id,
          nome: p.nome,
          crm: p.registroProfissional || null,
          especialidade: p.especialidade,
          dias_atendimento: formatDias(p.escalas),
          servicos: p.servicos.map(s => s.nome)
        }))
      });
    }

    // Fallback: retorna tudo (retrocompatibilidade)
    return NextResponse.json({
      success: true,
      empresa_id: tenantId,
      nicho: clinica.nicho,
      especialidades,
      servicos: clinica.servicos.map(s => ({
        id: s.id,
        nome: s.nome,
        preco: s.preco,
        duracao: s.duracaoMinutos
      })),
      profissionais: clinica.profissionais.map(p => ({
        id: p.id,
        nome: p.nome,
        especialidade: p.especialidade,
        crm: p.registroProfissional || null,
        dias_atendimento: formatDias(p.escalas),
        servicos: p.servicos.map(s => s.nome)
      })),
      convenios: clinica.convenios.map(c => c.nomeConvenio)
    });

  } catch (error) {
    console.error('Erro ao listar metadata n8n:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
