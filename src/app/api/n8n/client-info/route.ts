import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const whatsapp = searchParams.get('whatsapp');
  const tenantId = searchParams.get('tenantId') || searchParams.get('empresa_id');

  if (!whatsapp || !tenantId) {
    return NextResponse.json({ error: 'whatsapp e tenantId são obrigatórios' }, { status: 400 });
  }

  // Limpar o número para busca
  const cleanNumber = whatsapp.replace(/\D/g, '');

  try {
    const paciente = await prisma.paciente.findFirst({
      where: {
        tenantId,
        OR: [
          { telefone: cleanNumber },
          { telefone: whatsapp }
        ]
      },
      include: {
        assinaturas: { where: { status: 'ativo' }, take: 1 },
        agendamentos: { 
          where: { status: 'confirmado' },
          orderBy: { dataHora: 'desc' },
          take: 5,
          include: { profissional: true }
        }
      }
    });

    if (!paciente) {
      return NextResponse.json({ success: true, cadastrado: false });
    }

    // Identificar profissional preferido baseados no histórico recente
    const proHist = paciente.agendamentos
      .filter(a => a.profissionalId)
      .map(a => a.profissional);
    
    // Contagem de frequência por profissional
    const counts = new Map<string, { id: string, nome: string, count: number }>();
    proHist.forEach(p => {
      if (p) {
        const v = counts.get(p.id) || { id: p.id, nome: p.nome, count: 0 };
        v.count++;
        counts.set(p.id, v);
      }
    });

    const favPro = Array.from(counts.values()).sort((a, b) => b.count - a.count)[0] || null;

    return NextResponse.json({
      success: true,
      cadastrado: true,
      id: paciente.id,
      nome: paciente.nome,
      cpf: paciente.cpf,
      assinante: paciente.assinaturas.length > 0,
      profissionalPreferido: favPro ? {
        id: favPro.id,
        nome: favPro.nome
      } : null,
      historico_recente: paciente.agendamentos.map(a => ({
        data: a.dataHora,
        profissional: a.profissional?.nome,
        servico: a.categoria
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar info do cliente n8n:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
