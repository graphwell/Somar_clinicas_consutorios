import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

    const ext = file.name.split('.').pop() || 'png';
    const filename = `logo-${tenantId}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(join(uploadDir, filename), buffer);

    const logoUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, logoUrl });
  } catch (error) {
    console.error('[UPLOAD_LOGO_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao fazer upload.' }, { status: 500 });
  }
}
