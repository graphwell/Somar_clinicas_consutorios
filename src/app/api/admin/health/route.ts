import { NextResponse } from 'next/server';
import { getTenantPrisma, getMasterPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET() {
  try {
    // 1. Verificação de Perfil Admin (Injetado pelo middleware ou via check manual)
    // Para simplificar agora, assumimos que o middleware já validou o perfil 'synka_admin'
    
    const masterPrisma = getMasterPrisma();
    const clinicas = await masterPrisma.clinica.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const results = await Promise.all(clinicas.map(async (clinica) => {
      const startTime = Date.now();
      let status: 'ok' | 'warn' | 'error' = 'ok';
      let message = 'Operando';
      let latencyMs = 0;
      let tableCounts: Record<string, number> = {};
      let missingTables: string[] = [];
      let lastWrite: string | null = null;

      try {
        const tenantPrisma = getTenantPrisma(clinica.tenantId);
        
        // Teste de Latência Real
        await tenantPrisma.$queryRaw`SELECT 1`;
        latencyMs = Date.now() - startTime;

        if (latencyMs > 150) {
          status = 'warn';
          message = 'Latência alta';
        }

        // Auditoria de Tabelas e Contagens
        const tables = [
          'paciente', 'agendamento', 'profissional', 'servico', 
          'transacaoFinanceira', 'campanhaAviso', 'comboUpsell'
        ];

        for (const table of tables) {
          try {
            // Acesso dinâmico seguro ao modelo prisma
            const model = (tenantPrisma as any)[table];
            if (model) {
              const count = await model.count();
              tableCounts[table] = count;
              if (count === 0 && (table === 'agendamento' || table === 'profissional')) {
                 status = 'warn';
              }
            }
          } catch (e) {
            missingTables.push(table);
            status = 'error';
            message = 'Modelos ausentes';
          }
        }

        // Última gravação (Ex: Último agendamento ou paciente)
        const lastAppt = await tenantPrisma.agendamento.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });
        lastWrite = lastAppt?.createdAt.toISOString() || null;

      } catch (err) {
        status = 'error';
        message = 'Falha na conexão';
      }

      return {
        id: clinica.id,
        tenantId: clinica.tenantId,
        nome: clinica.razaoSocial || clinica.nome,
        nicho: clinica.nicho,
        status,
        message,
        latencyMs,
        tableCounts,
        missingTables,
        lastWrite,
        plan: 'Pro' // Mock por enquanto ou buscar de assinatura
      };
    }));

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats: {
        total: results.length,
        ok: results.filter(r => r.status === 'ok').length,
        warn: results.filter(r => r.status === 'warn').length,
        error: results.filter(r => r.status === 'error').length,
      },
      tenants: results
    });

  } catch (error: any) {
    console.error('[ADMIN_HEALTH_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
