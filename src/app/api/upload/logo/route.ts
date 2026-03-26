import { NextResponse } from 'next/server';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma, getMasterPrisma } from '@/lib/prisma';

// Upload logo — saves as base64 inside Clinica.configBranding (works on Vercel, no filesystem)
export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório.' }, { status: 400 });
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use PNG, JPG, SVG ou WebP.' }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 2MB.' }, { status: 400 });
    }

    console.log('[UPLOAD_DEBUG] Recebido arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size);

    // Convert to base64 data URL
    let logoUrl = '';
    try {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(new Uint8Array(bytes)).toString('base64');
      logoUrl = `data:${file.type};base64,${base64}`;
      console.log('[UPLOAD_DEBUG] Base64 gerado com sucesso. Length:', logoUrl.length);
    } catch (err: any) {
      console.error('[UPLOAD_DEBUG] Erro ao converter para base64:', err.message);
      return NextResponse.json({ error: 'Erro ao processar imagem.' }, { status: 500 });
    }

    // Upsert into Clinica.configBranding
    try {
      const masterPrisma = getMasterPrisma();
      const existing = await masterPrisma.clinica.findUnique({ where: { tenantId } });
      if (!existing) {
         console.error('[UPLOAD_DEBUG] Clínica não encontrada para tenantId:', tenantId);
         return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });
      }

      const branding = (existing.configBranding as Record<string, string>) || {};
      await masterPrisma.clinica.update({
        where: { tenantId },
        data: { configBranding: { ...branding, logoUrl } },
      });
      console.log('[UPLOAD_DEBUG] ConfigBranding atualizado no banco.');
    } catch (err: any) {
      console.error('[UPLOAD_DEBUG] Erro ao salvar no banco:', err.message);
      return NextResponse.json({ error: 'Erro ao salvar no banco de dados.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, logoUrl });
  } catch (error: any) {
    console.error('[UPLOAD_LOGO_TOTAL_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Erro interno fatal.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

// Read the saved logo for a tenant
export async function GET() {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();

    const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
    
    if (!clinica) {
      console.error('[GET_LOGO_DEBUG] Clínica não encontrada para tenantId:', tenantId);
      return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });
    }

    // Secure extraction of JSON branding
    let branding: any = {};
    if (typeof clinica.configBranding === 'string') {
      try { branding = JSON.parse(clinica.configBranding); } catch (e) { branding = {}; }
    } else {
      branding = clinica.configBranding || {};
    }

    console.log('[GET_LOGO_DEBUG] Branding carregado:', !!branding.logoUrl, 'Length:', branding.logoUrl?.length || 0);

    return NextResponse.json({ 
      logoUrl: branding.logoUrl || null, 
      nome: clinica?.nome || clinica?.razaoSocial || 'Minha Unidade',
      nicho: clinica?.nicho || null,
      onboardingCompleted: clinica?.onboardingCompleted || false
    });
  } catch (error: any) {
    console.error('[GET_LOGO_DEBUG] Erro fatal:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
