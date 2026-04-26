import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { gerarTokenPublico } from '@/lib/public-session';

export const dynamic = 'force-dynamic';

interface GoogleTokenInfo {
  aud: string;
  email: string;
  name: string;
  sub: string; // googleId
  email_verified?: string;
}

export async function POST(request: Request) {
  let body: { idToken?: string; slug?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

  const { idToken, slug } = body;
  if (!idToken || !slug) {
    return NextResponse.json({ error: 'idToken e slug obrigatórios' }, { status: 400 });
  }

  // 1. Verificar idToken com Google
  const tokenRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'TOKEN_INVALIDO' }, { status: 401 });
  }
  const info = await tokenRes.json() as GoogleTokenInfo;

  const expectedClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_PUBLIC ?? process.env.GOOGLE_CLIENT_ID ?? '';
  if (expectedClientId && info.aud !== expectedClientId) {
    return NextResponse.json({ error: 'TOKEN_INVALIDO' }, { status: 401 });
  }

  const { email, name, sub: googleId } = info;

  // 2. Buscar tenantId pelo slug
  const clinica = await prisma.clinica.findUnique({
    where:  { slug },
    select: { tenantId: true },
  });
  if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
  const { tenantId } = clinica;

  // 3. Buscar ou criar Paciente
  let paciente = await prisma.paciente.findFirst({
    where: { tenantId, googleId },
    select: { id: true, nome: true },
  });
  let isNovoCliente = false;

  if (!paciente && email) {
    paciente = await prisma.paciente.findFirst({
      where: { tenantId, email },
      select: { id: true, nome: true },
    });
    if (paciente) {
      // Vincular googleId ao paciente existente
      await prisma.paciente.update({
        where: { id: paciente.id },
        data:  { googleId },
      });
    }
  }

  if (!paciente) {
    isNovoCliente = true;
    paciente = await prisma.paciente.create({
      data: { nome: name ?? 'Cliente', email: email ?? null, googleId, tenantId, tipoAtendimento: 'particular', telefone: '' },
      select: { id: true, nome: true },
    });
  }

  const token = await gerarTokenPublico({ pacienteId: paciente.id, tenantId, slug });

  return NextResponse.json({ token, pacienteId: paciente.id, nome: paciente.nome, isNovoCliente });
}
