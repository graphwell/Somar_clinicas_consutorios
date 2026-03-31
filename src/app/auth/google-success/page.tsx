"use client";
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { setAuthSession } from '@/lib/api-utils';

// Página de transição após Google OAuth — salva token e redireciona
function GoogleSuccessContent() {
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const redirectTo = params.get('redirect') || '/dashboard';

    if (token) {
      // Decodificar payload do JWT (sem verificar assinatura — só para extrair user info)
      try {
        const [, payload] = token.split('.');
        const decoded = JSON.parse(atob(payload));
        setAuthSession(token, {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          tenantId: decoded.tenantId,
          profissionalId: decoded.profissionalId || null,
        });
      } catch {
        setAuthSession(token, {});
      }
      window.location.href = redirectTo;
    } else {
      window.location.href = '/auth/login?error=google_sem_token';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-sage-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm">Entrando com Google...</p>
      </div>
    </div>
  );
}

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <div className="w-10 h-10 border-4 border-sage-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GoogleSuccessContent />
    </Suspense>
  );
}
