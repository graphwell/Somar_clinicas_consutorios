import { NextResponse } from 'next/server';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenantId = await getAuthorizedTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const prisma = getTenantPrisma();
    
    // Fazendo as queries em paralelo para máxima eficiência
    const [clinica, countProf, countServ] = await Promise.all([
      prisma.clinica.findUnique({ where: { tenantId }, select: { botActive: true } }),
      prisma.profissional.count({ where: { tenantId } }),
      prisma.servico.count({ where: { tenantId } }),
    ]);

    return NextResponse.json({ 
      success: true, 
      hasTeam: countProf > 0,
      hasServices: countServ > 0,
      hasBot: clinica?.botActive ?? false
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
