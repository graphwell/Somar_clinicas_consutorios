'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  recepcao: 'Recepção',
  profissional: 'Profissional',
  temporario: 'Colaborador Temporário',
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #EEE9DF',
  borderRadius: '10px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#F8F6F1',
  color: '#1B2B3A',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#8A9BB0',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  display: 'block',
  marginBottom: '6px',
};

export default function AceitarConvite() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [convite, setConvite] = useState<{
    nome: string;
    role: string;
    clinica: { nome: string; logoUrl?: string | null };
  } | null>(null);
  const [erroCarregar, setErroCarregar] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    fetch(`/api/convite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setErroCarregar(data.error);
        else setConvite(data);
      })
      .catch(() => setErroCarregar('Erro ao carregar convite.'));
  }, [token]);

  async function aceitar() {
    setErroForm('');
    if (senha.length < 6) { setErroForm('Senha deve ter no mínimo 6 caracteres'); return; }
    if (senha !== confirmar) { setErroForm('As senhas não conferem'); return; }

    setSalvando(true);
    try {
      const res = await fetch(`/api/convite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      });
      const data = await res.json();
      if (data.ok) {
        setSucesso(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setErroForm(data.error || 'Erro ao criar conta.');
      }
    } catch {
      setErroForm('Erro de conexão. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  /* ── Tela de erro de convite ── */
  if (erroCarregar) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F6F1', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px 32px', textAlign: 'center', maxWidth: '400px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</p>
          <p style={{ fontSize: '16px', color: '#1B2B3A', fontWeight: '600', marginBottom: '8px' }}>{erroCarregar}</p>
          <p style={{ fontSize: '13px', color: '#8A9BB0' }}>Solicite um novo convite ao administrador.</p>
        </div>
      </div>
    );
  }

  /* ── Tela de sucesso ── */
  if (sucesso) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F6F1', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px 32px', textAlign: 'center', maxWidth: '400px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px' }}>
            ✓
          </div>
          <p style={{ fontSize: '20px', fontWeight: '700', color: '#1B2B3A', marginBottom: '8px' }}>Conta criada!</p>
          <p style={{ fontSize: '14px', color: '#8A9BB0' }}>Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (!convite) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F6F1' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #40916C', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Formulário ── */
  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F6F1', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '36px 28px', maxWidth: '420px', width: '100%', boxShadow: '0 4px 32px rgba(0,0,0,0.10)' }}>

        {/* Header — logo / nome da clínica */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {convite.clinica.logoUrl ? (
            <img
              src={convite.clinica.logoUrl}
              alt={convite.clinica.nome}
              style={{ height: '56px', objectFit: 'contain', marginBottom: '14px', borderRadius: '12px' }}
            />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#40916C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700', color: 'white', margin: '0 auto 14px' }}>
              {convite.clinica.nome.charAt(0)}
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#8A9BB0', margin: '0 0 4px' }}>Você foi convidado para</p>
          <p style={{ fontSize: '20px', fontWeight: '700', color: '#1B2B3A', margin: '0 0 10px' }}>{convite.clinica.nome}</p>
          <span style={{ background: '#F0FAF4', color: '#2D6A4F', fontSize: '12px', fontWeight: '600', padding: '4px 14px', borderRadius: '20px' }}>
            {ROLE_LABEL[convite.role] ?? convite.role}
          </span>
        </div>

        <p style={{ fontSize: '15px', color: '#1B2B3A', fontWeight: '500', textAlign: 'center', marginBottom: '24px' }}>
          Olá, {convite.nome.split(' ')[0]}! Crie sua senha de acesso:
        </p>

        {/* Senha */}
        <div style={{ marginBottom: '14px' }}>
          <label style={LABEL_STYLE}>Sua senha</label>
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            style={INPUT_STYLE}
            onFocus={e => { e.target.style.borderColor = '#40916C'; e.target.style.background = 'white'; }}
            onBlur={e => { e.target.style.borderColor = '#EEE9DF'; e.target.style.background = '#F8F6F1'; }}
          />
        </div>

        {/* Confirmar */}
        <div style={{ marginBottom: '24px' }}>
          <label style={LABEL_STYLE}>Confirmar senha</label>
          <input
            type="password"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            placeholder="Repita a senha"
            style={INPUT_STYLE}
            onKeyDown={e => e.key === 'Enter' && aceitar()}
            onFocus={e => { e.target.style.borderColor = '#40916C'; e.target.style.background = 'white'; }}
            onBlur={e => { e.target.style.borderColor = '#EEE9DF'; e.target.style.background = '#F8F6F1'; }}
          />
        </div>

        {erroForm && (
          <p style={{ color: '#DC2626', fontSize: '13px', textAlign: 'center', marginBottom: '14px' }}>{erroForm}</p>
        )}

        <button
          onClick={aceitar}
          disabled={salvando}
          style={{ width: '100%', background: '#40916C', color: 'white', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '600', cursor: salvando ? 'wait' : 'pointer', opacity: salvando ? 0.7 : 1 }}
        >
          {salvando ? 'Criando conta...' : 'Criar minha conta →'}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
