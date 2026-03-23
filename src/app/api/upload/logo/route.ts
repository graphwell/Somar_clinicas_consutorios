import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Upload logo — saves as base64 inside Clinica.configBranding (works on Vercel, no filesystem)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const tenantId = formData.get('tenantId') as string;

    if (!file || !tenantId) {
      return NextResponse.json({ error: 'Arquivo e tenantId são obrigatórios.' }, { status: 400 });
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use PNG, JPG, SVG ou WebP.' }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 2MB.' }, { status: 400 });
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const logoUrl = `data:${file.type};base64,${base64}`;

    // Upsert into Clinica.configBranding
    const existing = await prisma.clinica.findUnique({ where: { tenantId } });
    if (existing) {
      const branding = (existing.configBranding as Record<string, string>) || {};
      await prisma.clinica.update({
        where: { tenantId },
        data: { configBranding: { ...branding, logoUrl } },
      });
    }
    // If clinica doesn't exist yet, just return the logoUrl so it can be previewed
    return NextResponse.json({ success: true, logoUrl });
  } catch (error) {
    console.error('[UPLOAD_LOGO_ERROR]', error);
    return NextResponse.json({ error: 'Erro interno ao fazer upload.' }, { status: 500 });
  }
}

// Read the saved logo for a tenant
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ logoUrl: null });

  const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
  const branding = (clinica?.configBranding as Record<string, string>) || {};
  return NextResponse.json({ 
    logoUrl: branding.logoUrl || null, 
    nome: clinica?.nome || null,
    nicho: clinica?.nicho || null,
    onboardingCompleted: clinica?.onboardingCompleted || false
  });
}
