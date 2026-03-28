import { NextResponse } from 'next/server';
import os from 'os';
import { getMasterPrisma } from '@/lib/prisma';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const masterPrisma = getMasterPrisma();
    
    // 1. Servidor Metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    const startTime = Date.now();
    await masterPrisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    // 2. n8n Mock (Em produção, chamar API do n8n)
    const n8nStats = {
      activeWorkflows: 12,
      executions24h: 847,
      failures24h: 2,
      queueSize: 0
    };

    // 3. WhatsApp — dados reais do pool
    const [waTotal, waLivre, waEmUso, waDemo, waOffline, waAguardando] = await Promise.all([
      prisma.whatsappInstance.count(),
      prisma.whatsappInstance.count({ where: { status: 'LIVRE' } }),
      prisma.whatsappInstance.count({ where: { status: 'EM_USO' } }),
      prisma.whatsappInstance.count({ where: { status: 'DEMO' } }),
      prisma.whatsappInstance.count({ where: { status: 'OFFLINE' } }),
      prisma.whatsappInstance.count({ where: { status: 'AGUARDANDO' } }),
    ]);
    const waStats = {
      activeInstances: waEmUso,
      totalInstances: waTotal,
      freeInstances: waLivre,
      demoInstances: waDemo,
      offlineInstances: waOffline,
      waitingInstances: waAguardando,
      alertaEstoque: waLivre <= 2,
    };

    // 4. Payment & Storage
    const payStats = {
      pixStatus: 'online',
      latency: 67,
      txToday: 34,
      successRate: 100
    };

    const storageStats = {
      used: 4.2, // GB
      total: 50,
      cdnStatus: 'active'
    };

    // 5. Uptime History Mock (24h)
    const uptimeHistory = Array.from({ length: 48 }, () => Math.random() > 0.95 ? 'error' : 'ok');

    return NextResponse.json({
      server: {
        cpuUsage: 18, // Mock as real CPU usage requires child process or more logic on Vercel
        memUsage: Math.round(memUsage),
        diskUsage: 32,
        uptime: '14d 6h',
        apiLatency: 42
      },
      masterDb: {
        status: 'connected',
        activeConns: 8,
        latency: dbLatency,
        lastWrite: new Date().toISOString()
      },
      n8n: n8nStats,
      whatsapp: waStats,
      payment: payStats,
      storage: storageStats,
      uptimeHistory
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
