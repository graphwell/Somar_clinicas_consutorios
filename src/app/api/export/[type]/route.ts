import { NextResponse } from 'next/server';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET(request: Request, props: { params: Promise<{ type: string }> }) {
  const params = await props.params;
  const { type } = params;

  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    let data: any[] = [];
    let csvHeader = '';
    let csvRows: string[] = [];

    if (type === 'clientes') {
      data = await prisma.paciente.findMany({ where: { tenantId }, orderBy: { nome: 'asc' } });
      csvHeader = 'ID,Nome,Telefone,Convenio,Tipo de Atendimento,Data Cadastro\n';
      csvRows = data.map(c => `"${c.id}","${c.nome}","${c.telefone}","${c.convenio || ''}","${c.tipoAtendimento}",${c.createdAt.toISOString()}`);
    } 
    else if (type === 'agendamentos') {
      data = await prisma.agendamento.findMany({ 
        where: { tenantId }, 
        include: { paciente: true, profissional: true },
        orderBy: { dataHora: 'desc' } 
      });
      csvHeader = 'ID,Data Hora,Status,Paciente,Telefone,Profissional,Convenio,Tipo de Atendimento\n';
      csvRows = data.map(a => `"${a.id}","${a.dataHora.toISOString()}","${a.status}","${a.paciente?.nome}","${a.paciente?.telefone}","${a.profissional?.nome || ''}","${a.convenio || ''}","${a.tipoAtendimento}"`);
    }
    else if (type === 'convenios') {
      data = await prisma.convenioEmpresa.findMany({ where: { tenantId } });
      csvHeader = 'ID,Nome do Convenio,Status\n';
      csvRows = data.map(c => `"${c.id}","${c.nomeConvenio}","${c.ativo ? 'Ativo' : 'Inativo'}"`);
    }
    else if (type === 'backup') {
        const [pacientes, agendamentos, profissionais, servicos, transacoes] = await Promise.all([
            prisma.paciente.findMany({ where: { tenantId } }),
            prisma.agendamento.findMany({ where: { tenantId } }),
            prisma.profissional.findMany({ where: { tenantId } }),
            prisma.servico.findMany({ where: { tenantId } }),
            prisma.transacaoFinanceira.findMany({ where: { tenantId } })
        ]);
        return NextResponse.json({
            backupAt: new Date().toISOString(),
            tenantId,
            data: { pacientes, agendamentos, profissionais, servicos, transacoes }
        }, {
            headers: {
                'Content-Disposition': `attachment; filename="synka_full_backup_${new Date().getTime()}.json"`
            }
        });
    }
    else {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const csvContent = csvHeader + csvRows.join('\n');
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="synka_export_${type}_${new Date().getTime()}.csv"`
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao gerar exportação' }, { status: 500 });
  }
}
