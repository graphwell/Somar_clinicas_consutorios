'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

type Tela = 'metodo' | 'telefone-numero' | 'telefone-codigo' | 'email';

interface AuthDados {
  pacienteId:    string;
  nome:          string;
  isNovoCliente: boolean;
}

interface Props {
  isOpen:        boolean;
  slug:          string;
  nomeBarbearia: string;
  onClose:       () => void;
  onAuthSuccess: (token: string, dados: AuthDados) => void;
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  );
}

function BtnVoltar({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-1 mb-4 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Voltar
    </button>
  );
}

export default function BottomSheetAuth({ isOpen, slug, nomeBarbearia, onClose, onAuthSuccess }: Props) {
  const [tela,      setTela]      = useState<Tela>('metodo');
  const [erro,      setErro]      = useState('');
  const [loading,   setLoading]   = useState(false);

  // Telefone
  const [telefone,  setTelefone]  = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Código OTP — 6 dígitos separados
  const [codigo,    setCodigo]    = useState(['', '', '', '', '', '']);
  const codigoRefs  = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  // Reenviar — contador regressivo
  const [reenviarSeg, setReenviarSeg] = useState(0);

  // Email login
  const [emailVal,  setEmailVal]  = useState('');
  const [senhaVal,  setSenhaVal]  = useState('');

  // Google script
  const googleScriptRef = useRef(false);

  useEffect(() => {
    if (!isOpen) { setTela('metodo'); setErro(''); }
  }, [isOpen]);

  // Carregar Google Identity Services lazy
  useEffect(() => {
    if (!isOpen || googleScriptRef.current) return;
    googleScriptRef.current = true;
    const script = document.createElement('script');
    script.src   = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch { /* ok */ } };
  }, [isOpen]);

  // Contador regressivo de reenvio
  useEffect(() => {
    if (reenviarSeg <= 0) return;
    const timer = setTimeout(() => setReenviarSeg(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [reenviarSeg]);

  function formatarTelefone(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  }

  // ── Solicitar OTP ────────────────────────────────────────────────────────────
  const solicitarOTP = useCallback(async () => {
    const tel = telefone.replace(/\D/g, '');
    if (tel.length < 10) { setErro('Número inválido'); return; }
    setLoading(true); setErro('');
    try {
      const r = await fetch('/api/public/auth/telefone/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: tel, slug }),
      });
      const d = await r.json() as Record<string, unknown>;
      if (!r.ok) {
        if (d['error'] === 'MUITAS_TENTATIVAS') setErro(String(d['mensagem'] ?? 'Muitas tentativas. Aguarde 1 hora.'));
        else if (d['error'] === 'TELEFONE_INVALIDO') setErro('Número de telefone inválido.');
        else setErro('Erro ao enviar código.');
        return;
      }
      setExpiresAt(String(d['expiresAt'] ?? ''));
      setCodigo(['','','','','','']);
      setReenviarSeg(60);
      setTela('telefone-codigo');
    } catch { setErro('Erro de conexão. Tente novamente.'); }
    finally  { setLoading(false); }
  }, [telefone, slug]);

  // ── Verificar OTP ────────────────────────────────────────────────────────────
  const verificarCodigo = useCallback(async () => {
    const codigoStr = codigo.join('');
    if (codigoStr.length < 6) return;
    setLoading(true); setErro('');
    try {
      const r = await fetch('/api/public/auth/telefone/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefone.replace(/\D/g,''), codigo: codigoStr, slug }),
      });
      const d = await r.json() as Record<string, unknown>;
      if (!r.ok) { setErro('Código incorreto ou expirado.'); setCodigo(['','','','','','']); return; }
      onAuthSuccess(String(d['token']), {
        pacienteId:    String(d['pacienteId']),
        nome:          String(d['nome']),
        isNovoCliente: Boolean(d['isNovoCliente']),
      });
    } catch { setErro('Erro de conexão. Tente novamente.'); }
    finally  { setLoading(false); }
  }, [codigo, telefone, slug, onAuthSuccess]);

  // ── Login Email ──────────────────────────────────────────────────────────────
  const loginEmail = useCallback(async () => {
    setLoading(true); setErro('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, senha: senhaVal }),
      });
      const d = await r.json() as Record<string, unknown>;
      if (!r.ok) { setErro('Email ou senha incorretos.'); return; }
      // Validar que é um token com pacienteId (não token de dashboard)
      const token = String(d['token'] ?? '');
      try {
        const parts = token.split('.');
        const pay   = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
        if (!pay['pacienteId']) { setErro('Conta não encontrada.'); return; }
        onAuthSuccess(token, { pacienteId: String(pay['pacienteId']), nome: String(d['user'] ? (d['user'] as any)['nome'] : 'Cliente'), isNovoCliente: false });
      } catch { setErro('Conta não encontrada.'); }
    } catch { setErro('Erro de conexão.'); }
    finally  { setLoading(false); }
  }, [emailVal, senhaVal, onAuthSuccess]);

  // ── Google ───────────────────────────────────────────────────────────────────
  const handleGoogle = useCallback(() => {
    setErro('');
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      setErro('Google não disponível. Use telefone ou email.');
      return;
    }
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_PUBLIC ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        setLoading(true);
        try {
          const r = await fetch('/api/public/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential, slug }),
          });
          const d = await r.json() as Record<string, unknown>;
          if (!r.ok) { setErro('Não foi possível entrar com Google.'); return; }
          onAuthSuccess(String(d['token']), {
            pacienteId: String(d['pacienteId']), nome: String(d['nome']),
            isNovoCliente: Boolean(d['isNovoCliente']),
          });
        } catch { setErro('Erro de conexão com Google.'); }
        finally  { setLoading(false); }
      },
    });
    google.accounts.id.prompt();
  }, [slug, onAuthSuccess]);

  // ── Inputs OTP ───────────────────────────────────────────────────────────────
  function handleCodigoInput(i: number, v: string) {
    if (!/^[0-9]*$/.test(v)) return;
    const next = [...codigo];
    next[i] = v.slice(-1);
    setCodigo(next);
    if (v && i < 5) codigoRefs.current[i + 1]?.focus();
  }

  function handleCodigoKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !codigo[i] && i > 0) codigoRefs.current[i - 1]?.focus();
  }

  function handleCodigoPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (!text) return;
    e.preventDefault();
    const next = [...codigo];
    for (let i = 0; i < 6; i++) next[i] = text[i] ?? '';
    setCodigo(next);
    codigoRefs.current[Math.min(text.length, 5)]?.focus();
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-[20px] max-h-[90vh] overflow-y-auto transition-transform duration-300`}
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mt-3 mb-2" />

        <div className="px-6 pb-10">
          {/* ── TELA METODO ── */}
          {tela === 'metodo' && (
            <div className="space-y-4">
              <div className="mb-6 text-center">
                <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Quase lá!</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Confirme quem você é para finalizar<br/>o agendamento em <strong>{nomeBarbearia}</strong>
                </p>
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-medium"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </button>

              {/* Separador */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-xs text-zinc-400">ou</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              </div>

              {/* Telefone */}
              <button
                onClick={() => { setErro(''); setTela('telefone-numero'); }}
                className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                📱 Continuar com telefone
              </button>

              <p
                onClick={() => { setErro(''); setTela('email'); }}
                className="text-xs text-zinc-400 underline cursor-pointer text-center mt-2 hover:text-zinc-600 transition-colors"
              >
                Já tenho conta · entrar com email
              </p>

              {erro && <p className="text-xs text-red-500 text-center">{erro}</p>}

              <p className="text-xs text-zinc-400 text-center mt-4">
                🔒 Seus dados são usados apenas para confirmar o agendamento
              </p>
            </div>
          )}

          {/* ── TELA TELEFONE-NUMERO ── */}
          {tela === 'telefone-numero' && (
            <div>
              <BtnVoltar onClick={() => setTela('metodo')} />
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-1">Seu número de WhatsApp</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Enviaremos um código de confirmação</p>

              <input
                type="tel"
                value={telefone}
                onChange={e => setTelefone(formatarTelefone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
                autoFocus
              />

              {erro && <p className="text-xs text-red-500 mb-3">{erro}</p>}

              <button
                onClick={solicitarOTP}
                disabled={loading || telefone.replace(/\D/g,'').length < 10}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-700 transition-colors"
              >
                {loading ? <><Spinner /> Enviando...</> : 'Enviar código'}
              </button>
            </div>
          )}

          {/* ── TELA TELEFONE-CODIGO ── */}
          {tela === 'telefone-codigo' && (
            <div>
              <BtnVoltar onClick={() => setTela('telefone-numero')} />
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-1">Código enviado</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                Enviamos um código para {telefone}
              </p>

              {/* 6 inputs individuais */}
              <div className="flex gap-2 justify-center mb-5" onPaste={handleCodigoPaste}>
                {codigo.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { codigoRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleCodigoInput(i, e.target.value)}
                    onKeyDown={e => handleCodigoKeyDown(i, e)}
                    className="w-11 h-13 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-xl font-bold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ height: 52 }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {erro && <p className="text-xs text-red-500 text-center mb-3">{erro}</p>}

              <button
                onClick={verificarCodigo}
                disabled={loading || codigo.join('').length < 6}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-700 transition-colors mb-4"
              >
                {loading ? <><Spinner /> Verificando...</> : 'Verificar'}
              </button>

              {/* Reenviar */}
              {reenviarSeg > 0 ? (
                <p className="text-xs text-zinc-400 text-center">
                  Reenviar em {String(Math.floor(reenviarSeg/60)).padStart(2,'0')}:{String(reenviarSeg%60).padStart(2,'0')}
                </p>
              ) : (
                <button
                  onClick={solicitarOTP}
                  className="w-full text-xs text-emerald-600 hover:text-emerald-700 transition-colors text-center"
                >
                  Reenviar código
                </button>
              )}
            </div>
          )}

          {/* ── TELA EMAIL ── */}
          {tela === 'email' && (
            <div>
              <BtnVoltar onClick={() => setTela('metodo')} />
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-1">Entrar com email</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Use seu email e senha cadastrados</p>

              <input
                type="email"
                value={emailVal}
                onChange={e => setEmailVal(e.target.value)}
                placeholder="seu@email.com"
                className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
                autoFocus
              />
              <input
                type="password"
                value={senhaVal}
                onChange={e => setSenhaVal(e.target.value)}
                placeholder="Senha"
                className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              />

              {erro && <p className="text-xs text-red-500 mb-3">{erro}</p>}

              <button
                onClick={loginEmail}
                disabled={loading || !emailVal || !senhaVal}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-700 transition-colors"
              >
                {loading ? <><Spinner /> Entrando...</> : 'Entrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
