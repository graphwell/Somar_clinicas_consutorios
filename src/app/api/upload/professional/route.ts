import { NextResponse } from 'next/server';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

/**
 * POST /api/upload/professional
 * Processa a imagem enviada (geralmente vinda do AvatarEditor) 
 * e retorna em Base64 otimizado para ser salvo no banco como fotoUrl.
 */
export async function POST(request: Request) {
  try {
    // Apenas valida se o usuário está logado no tenant
    await getAuthorizedTenantId();
    
    const formData = await request.formData();
    const file = formData.get('avatar') as File; // AvatarEditor envia como 'avatar' por padrão

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório.' }, { status: 400 });
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use PNG, JPG ou WebP.' }, { status: 400 });
    }

    // Como o AvatarEditor já corta e gera um JPEG de 256x256, o tamanho deve ser bem pequeno
    // Mas vamos colocar um limite de 2MB por segurança
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 2MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(new Uint8Array(bytes)).toString('base64');
    const fotoUrl = `data:${file.type};base64,${base64}`;

    // Apenas retorna a URL, o salvamento acontece no PUT/POST do time
    return NextResponse.json({ success: true, avatarUrl: fotoUrl });
  } catch (error: any) {
    console.error('Erro no upload de foto profissional:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
