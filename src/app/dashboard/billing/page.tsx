"use client";
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

/* ─────────────────────────────────────────────
   ÍCONES SVG INLINE
───────────────────────────────────────────── */

const IcoCheck = ({ color = '#40916C', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M11.667 3.5L5.25 9.917 2.333 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IcoX = ({ color = '#E24B4A', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IcoCal = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="#2D6A4F" strokeWidth="1.5"/>
    <path d="M2.5 8h15M7 2v3M13 2v3" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IcoStar = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1l1.236 2.505L10 4.045 8 6l.472 2.764L6 7.5l-2.472 1.264L4 6 2 4.045l2.764-.54L6 1z"
          stroke="#92400E" strokeWidth="1" strokeLinejoin="round"/>
  </svg>
);

const IcoAlert = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M7 1.167L12.833 11.667H1.167L7 1.167z" stroke="#92400E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 5.25v2.333M7 9.333h.008" stroke="#92400E" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

/* ─────────────────────────────────────────────
   DADOS DOS PLANOS
───────────────────────────────────────────── */

const PLANOS = [
  {
    id: 'start',
    nome: 'Start',
    desc: 'Ideal para autônomos e profissionais solo',
    precoInt: '37',
    precoDec: ',90',
    incluso: [
      '1 profissional',
      'Link de agendamento público',
      'Lembrete automático WhatsApp',
      'Confirmação de presença',
      'WhatsApp via instância Synka',
    ],
    naoIncluso: [
      'WhatsApp próprio',
      'Prontuário eletrônico',
      'Controle financeiro',
      'Marketing e campanhas',
      'Relatórios de desempenho',
    ],
    botao: 'Assinar Start',
  },
  {
    id: 'solo',
    nome: 'Solo',
    desc: 'Para pequenas equipes e consultórios',
    precoInt: '79',
    precoDec: ',00',
    tagEco: 'Inclui prontuário e financeiro — gerencie tudo em um lugar',
    incluso: [
      'Até 2 profissionais',
      'Link de agendamento público',
      'Lembrete automático WhatsApp',
      'WhatsApp próprio conectado',
      'Prontuário eletrônico',
      'Controle financeiro básico',
      'Gestão de convênios',
    ],
    naoIncluso: [
      'Prontuário com IA e voz',
      'Marketing e campanhas',
      'Combos e upsell',
      'Planos de assinatura clientes',
      'Relatórios avançados',
    ],
    botao: 'Assinar Solo',
  },
  {
    id: 'pro',
    nome: 'Pro',
    desc: 'Para clínicas e salões em crescimento',
    precoInt: '127',
    precoDec: ',00',
    destaque: true,
    incluso: [
      { text: 'Até 5 profissionais', novo: false },
      { text: 'Marketing e campanhas WhatsApp', novo: true },
      { text: 'Combos e upsell automático', novo: true },
      { text: 'Planos de assinatura para clientes', novo: true },
      { text: 'Relatórios completos', novo: false },
      { text: 'Controle financeiro completo', novo: false },
    ],
    naoIncluso: [
      'Prontuário com IA e voz',
      'Suporte prioritário',
      'API de integração',
    ],
    botao: 'Assinar Pro',
  },
  {
    id: 'business',
    nome: 'Business',
    desc: 'Para clínicas estabelecidas e redes',
    precoInt: '197',
    precoDec: ',00',
    tagPremium: 'Prontuário com IA + voz incluído',
    incluso: [
      'Até 10 profissionais',
      'Tudo do Pro',
      'Prontuário com IA e transcrição por voz',
      'Suporte prioritário',
      'API de integração',
      'Em breve: Multi-unidades',
    ],
    naoIncluso: [],
    botao: 'Assinar Business',
  },
];

/* ─────────────────────────────────────────────
   TABELA COMPARATIVA
───────────────────────────────────────────── */

const TABELA = [
  {
    grupo: 'Limites',
    linhas: [
      { label: 'Profissionais', start: '1', solo: '2', pro: '5', business: '10' },
      { label: 'Pacientes', start: '200', solo: '500', pro: '2.000', business: '∞' },
    ],
  },
  {
    grupo: 'Agendamento',
    linhas: [
      { label: 'Link público', start: true, solo: true, pro: true, business: true },
      { label: 'Lembrete WhatsApp', start: true, solo: true, pro: true, business: true },
      { label: 'WhatsApp próprio', start: false, solo: true, pro: true, business: true },
    ],
  },
  {
    grupo: 'Operação',
    linhas: [
      { label: 'Prontuário', start: false, solo: true, pro: true, business: true },
      { label: 'Prontuário c/ IA', start: false, solo: false, pro: false, business: true },
      { label: 'Financeiro', start: false, solo: 'básico', pro: true, business: true },
      { label: 'Convênios', start: false, solo: true, pro: true, business: true },
    ],
  },
  {
    grupo: 'Marketing',
    linhas: [
      { label: 'Campanhas WhatsApp', start: false, solo: false, pro: true, business: true },
      { label: 'Combos e upsell', start: false, solo: false, pro: true, business: true },
      { label: 'Planos assinatura', start: false, solo: false, pro: true, business: true },
    ],
  },
  {
    grupo: 'Relatórios & Suporte',
    linhas: [
      { label: 'Relatórios', start: false, solo: 'básico', pro: true, business: true },
      { label: 'Suporte prioritário', start: false, solo: false, pro: false, business: true },
      { label: 'API de integração', start: false, solo: false, pro: false, business: true },
    ],
  },
];

function CelTabela({ val, isPro }: { val: boolean | string; isPro: boolean }) {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 8px',
    background: isPro ? 'rgba(240,250,244,0.6)' : undefined,
  };

  if (typeof val === 'string') {
    return (
      <td style={base}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1B2B3A' }}>{val}</span>
      </td>
    );
  }
  if (val) {
    return (
      <td style={base}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '20px', height: '20px', borderRadius: '50%',
          background: '#D8F3DC', fontSize: '11px', fontWeight: 700, color: '#2D6A4F',
        }}>✓</span>
      </td>
    );
  }
  return (
    <td style={base}>
      <span style={{ fontSize: '16px', color: '#EEE9DF', lineHeight: 1 }}>—</span>
    </td>
  );
}

/* ─────────────────────────────────────────────
   PÁGINA
───────────────────────────────────────────── */

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [assinatura, setAssinatura] = useState<any>(null);
  const [tabelaAberta, setTabelaAberta] = useState(false);

  useEffect(() => {
    fetchWithAuth('/api/billing/planos')
      .then(r => r.json())
      .then(data => { if (data?.assinatura) setAssinatura(data.assinatura); })
      .catch(() => {});
  }, []);

  const diasRestantes = assinatura?.trialFim
    ? Math.max(0, Math.ceil((new Date(assinatura.trialFim).getTime() - Date.now()) / 86400000))
    : 15;

  const planoAtual: string = assinatura?.plano ?? 'trial';
  const statusAtual: string = assinatura?.status ?? 'trial';

  const handleCheckout = async (planoId: string) => {
    setLoading(planoId);
    try {
      const res = await fetchWithAuth('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plano: planoId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetchWithAuth('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  };

  const isTrial = statusAtual === 'trial';
  const isActive = statusAtual === 'active';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1B2B3A', margin: 0 }}>
          Plano & Faturamento
        </h1>
        <p style={{ fontSize: '14px', color: '#4A6480', margin: '4px 0 0' }}>
          Gerencie sua assinatura e escolha o plano ideal para seu negócio.
        </p>
      </div>

      {/* ── Banner Trial ── */}
      {isTrial && (
        <div style={{
          background: '#F0FAF4',
          border: '1.5px solid #D8F3DC',
          borderRadius: '16px',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '40px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '260px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#D8F3DC', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IcoCal />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#1B4332', margin: 0 }}>
                Trial ativo — {diasRestantes} {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
              </p>
              <p style={{ fontSize: '13px', color: '#40916C', margin: '3px 0 8px' }}>
                Você tem acesso completo ao plano Business. Escolha seu plano antes de expirar.
              </p>
              <div style={{
                width: '100%', maxWidth: '280px', height: '4px',
                background: '#D8F3DC', borderRadius: '2px', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.min(100, ((15 - diasRestantes) / 15) * 100)}%`,
                  height: '100%', background: diasRestantes <= 3 ? '#EF4444' : '#40916C',
                  borderRadius: '2px', transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ fontSize: '11px', color: '#8A9BB0', marginTop: '4px' }}>
                {Math.max(0, 15 - diasRestantes)} de 15 dias usados
              </p>
            </div>
          </div>
          {diasRestantes <= 5 && (
            <div style={{
              background: '#FEF3C7', border: '1px solid #FCD34D',
              borderRadius: '8px', padding: '8px 12px',
              fontSize: '12px', color: '#92400E', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <IcoAlert /> Expira em breve — escolha agora
            </div>
          )}
        </div>
      )}

      {/* ── Assinatura ativa ── */}
      {isActive && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #EEE9DF',
          borderRadius: '16px',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '40px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#40916C', display: 'inline-block',
                boxShadow: '0 0 6px rgba(64,145,108,0.5)',
              }} />
              <p style={{ fontSize: '13px', color: '#8A9BB0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                Plano ativo
              </p>
            </div>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#1B2B3A', margin: 0 }}>
              {PLANOS.find(p => p.id === planoAtual)?.nome ?? planoAtual}
            </p>
            {assinatura?.proximoVencimento && (
              <p style={{ fontSize: '13px', color: '#4A6480', margin: '4px 0 0' }}>
                Próximo vencimento: {new Date(assinatura.proximoVencimento).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            style={{
              padding: '10px 20px', border: '1px solid #EEE9DF',
              borderRadius: '10px', background: 'white',
              fontSize: '13px', fontWeight: 500, color: '#4A6480',
              cursor: 'pointer',
            }}
          >
            {portalLoading ? 'Aguarde...' : 'Gerenciar assinatura →'}
          </button>
        </div>
      )}

      {/* ── Título seção planos ── */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1B2B3A', marginBottom: '20px' }}>
        {isTrial ? 'Escolha seu plano e continue após o trial' : 'Planos disponíveis'}
      </h2>

      {/* ── Grid de cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        alignItems: 'start',
        marginBottom: '40px',
      }}
        className="billing-grid"
      >
        {PLANOS.map(plano => {
          const isDestaque = !!plano.destaque;
          const isAtual = planoAtual === plano.id;

          return (
            <div
              key={plano.id}
              style={{
                background: '#FFFFFF',
                border: isDestaque ? '2px solid #40916C' : '1px solid #EEE9DF',
                borderRadius: '20px',
                padding: '28px 24px',
                position: 'relative',
                boxShadow: isDestaque ? '0 8px 32px rgba(64,145,108,0.15)' : undefined,
                transform: isDestaque ? 'scale(1.02)' : undefined,
              }}
            >
              {/* Badge MAIS ESCOLHIDO */}
              {isDestaque && (
                <div style={{
                  position: 'absolute', top: '-14px', left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#40916C', color: 'white',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                  padding: '5px 18px', borderRadius: '20px',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  Mais escolhido
                </div>
              )}

              {/* Badge atual */}
              {isAtual && isActive && (
                <div style={{
                  position: 'absolute', top: '-12px', right: '16px',
                  background: '#D8F3DC', color: '#2D6A4F',
                  fontSize: '10px', fontWeight: 700, padding: '3px 10px',
                  borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.6px',
                }}>
                  Seu plano
                </div>
              )}

              {/* Nome do plano */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: isDestaque ? '#40916C' : '#8A9BB0',
                }} />
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: isDestaque ? '#40916C' : '#8A9BB0',
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                }}>
                  {plano.nome}
                </span>
              </div>

              {/* Descrição */}
              <p style={{ fontSize: '13px', color: '#4A6480', marginBottom: '16px', lineHeight: 1.4 }}>
                {plano.desc}
              </p>

              {/* Preço */}
              <div style={{ marginBottom: '12px' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isDestaque ? '42px' : '36px',
                  fontWeight: 500,
                  color: isDestaque ? '#1B4332' : '#1B2B3A',
                  lineHeight: 1,
                }}>
                  R$ {plano.precoInt}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isDestaque ? '22px' : '20px',
                  color: isDestaque ? '#40916C' : '#4A6480',
                }}>
                  {plano.precoDec}
                </span>
                <span style={{ fontSize: '13px', color: '#8A9BB0', marginLeft: '4px' }}>/mês</span>
              </div>

              {/* Tag especial Pro */}
              {isDestaque && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: '#FEF3C7', border: '1px solid #FCD34D',
                  borderRadius: '6px', padding: '3px 10px',
                  fontSize: '11px', color: '#92400E', fontWeight: 500,
                  marginBottom: '16px',
                }}>
                  <IcoStar /> Melhor custo-benefício
                </div>
              )}

              {/* Tag economia Solo */}
              {plano.id === 'solo' && plano.tagEco && (
                <div style={{
                  background: '#F0FAF4', borderRadius: '8px',
                  padding: '8px 12px', marginBottom: '16px',
                  fontSize: '12px', color: '#2D6A4F', fontWeight: 500,
                  lineHeight: 1.4,
                }}>
                  {plano.tagEco}
                </div>
              )}

              {/* Tag premium Business */}
              {plano.id === 'business' && plano.tagPremium && (
                <div style={{
                  background: '#FEF3C7', border: '1px solid #FCD34D',
                  borderRadius: '8px', padding: '8px 12px', marginBottom: '16px',
                  fontSize: '12px', color: '#92400E', fontWeight: 500,
                }}>
                  ✦ {plano.tagPremium}
                </div>
              )}

              {/* Separador */}
              <div style={{ borderTop: isDestaque ? '1px solid #D8F3DC' : '1px solid #EEE9DF', margin: '0 0 16px' }} />

              {/* Incluído */}
              <p style={{
                fontSize: '11px', fontWeight: 600, color: '#8A9BB0',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px',
              }}>
                {isDestaque ? 'Tudo do Solo, mais:' : 'Incluído'}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                {(plano.incluso as any[]).map((f: any) => {
                  const texto = typeof f === 'string' ? f : f.text;
                  const novo = typeof f === 'object' && f.novo;
                  return (
                    <li key={texto} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      marginBottom: '8px', fontSize: '13px',
                      color: novo ? '#1B4332' : '#1B2B3A',
                      fontWeight: novo ? 500 : 400,
                    }}>
                      <IcoCheck />
                      {texto}
                      {novo && (
                        <span style={{
                          fontSize: '9px', background: '#D8F3DC', color: '#2D6A4F',
                          padding: '1px 6px', borderRadius: '10px', fontWeight: 600,
                          marginLeft: '2px', flexShrink: 0,
                        }}>
                          NOVO
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Não incluso */}
              {plano.naoIncluso.length > 0 && (
                <>
                  <p style={{
                    fontSize: '11px', fontWeight: 600,
                    color: isDestaque ? '#8A9BB0' : '#E24B4A',
                    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px',
                  }}>
                    {isDestaque ? 'Disponível no Business' : 'Não incluso'}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                    {plano.naoIncluso.map((f: string) => (
                      <li key={f} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginBottom: '7px', fontSize: '13px',
                        color: '#8A9BB0', textDecoration: 'line-through',
                      }}>
                        <IcoX color={isDestaque ? '#E4DDD2' : '#E24B4A'} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Botão */}
              <button
                onClick={() => !isAtual && handleCheckout(plano.id)}
                disabled={loading === plano.id || (isAtual && isActive)}
                style={isDestaque
                  ? {
                      width: '100%', height: '48px', border: 'none',
                      borderRadius: '10px', background: '#40916C', color: 'white',
                      fontSize: '15px', fontWeight: 500, cursor: 'pointer',
                      boxShadow: '0 3px 12px rgba(64,145,108,0.3)',
                      opacity: loading === plano.id ? 0.7 : 1,
                    }
                  : {
                      width: '100%', height: '44px',
                      border: isAtual ? '1.5px solid #D8F3DC' : '1.5px solid #40916C',
                      borderRadius: '10px', background: 'transparent',
                      color: isAtual ? '#8A9BB0' : '#40916C',
                      fontSize: '14px', fontWeight: 500, cursor: isAtual ? 'default' : 'pointer',
                      opacity: loading === plano.id ? 0.7 : 1,
                    }
                }
              >
                {loading === plano.id ? 'Aguarde...' : isAtual && isActive ? 'Plano atual' : plano.botao}
              </button>

              <p style={{
                fontSize: '11px', color: isDestaque ? '#4A6480' : '#8A9BB0',
                textAlign: 'center', marginTop: '10px',
                fontWeight: isDestaque ? 500 : 400,
              }}>
                {isDestaque ? 'Teste 15 dias grátis · Cancele quando quiser' : 'Cancele quando quiser'}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Tabela Comparativa ── */}
      <div style={{ marginBottom: '40px' }}>
        <button
          onClick={() => setTabelaAberta(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px',
            padding: '12px', borderRadius: '12px',
            background: '#F0FAF4', border: 'none',
            fontSize: '14px', fontWeight: 500, color: '#40916C',
            cursor: 'pointer',
          }}
        >
          Ver comparação completa
          <span style={{
            fontSize: '16px',
            transition: 'transform 0.2s',
            display: 'inline-block',
            transform: tabelaAberta ? 'rotate(180deg)' : 'none',
          }}>▾</span>
        </button>

        {tabelaAberta && (
          <div style={{ marginTop: '16px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #EEE9DF' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                <thead>
                  <tr style={{ background: '#F0FAF4' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#40916C', textTransform: 'uppercase', letterSpacing: '0.8px', width: '35%' }}>
                      Recurso
                    </th>
                    {['Start', 'Solo', 'Pro', 'Business'].map((n, i) => (
                      <th key={n} style={{
                        padding: '12px 8px', fontSize: '11px', fontWeight: 700,
                        color: i === 2 ? '#40916C' : '#8A9BB0',
                        textTransform: 'uppercase', letterSpacing: '0.8px',
                        textAlign: 'center',
                        background: i === 2 ? 'rgba(240,250,244,0.8)' : undefined,
                      }}>
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABELA.map((grupo, gi) => (
                    <React.Fragment key={gi}>
                      <tr>
                        <td colSpan={5} style={{
                          padding: '10px 16px 4px',
                          fontSize: '10px', fontWeight: 700, color: '#8A9BB0',
                          textTransform: 'uppercase', letterSpacing: '1px',
                          background: '#FAFAF9',
                        }}>
                          {grupo.grupo}
                        </td>
                      </tr>
                      {grupo.linhas.map((linha: any, li) => (
                        <tr key={li} style={{ background: li % 2 === 0 ? '#FFFFFF' : '#F8F6F1' }}>
                          <td style={{ padding: '10px 16px', fontSize: '13px', color: '#4A6480' }}>
                            {linha.label}
                          </td>
                          <CelTabela val={linha.start} isPro={false} />
                          <CelTabela val={linha.solo} isPro={false} />
                          <CelTabela val={linha.pro} isPro={true} />
                          <CelTabela val={linha.business} isPro={false} />
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Histórico de Faturas ── */}
      {isActive && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1B2B3A', marginBottom: '16px' }}>
            Histórico de Faturas
          </h3>
          <div style={{
            background: '#FFFFFF', border: '1px solid #EEE9DF',
            borderRadius: '16px', overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              padding: '10px 20px',
              fontSize: '11px', fontWeight: 600, color: '#8A9BB0',
              textTransform: 'uppercase', letterSpacing: '0.6px',
              borderBottom: '1px solid #EEE9DF',
            }}>
              <span>Fatura</span><span>Data</span><span>Valor</span><span>Status</span>
            </div>
            <div style={{ padding: '16px 20px', fontSize: '13px', color: '#8A9BB0', textAlign: 'center' }}>
              Nenhuma fatura disponível ainda.
            </div>
          </div>
        </div>
      )}

      {/* ── Responsive styles ── */}
      <style jsx global>{`
        @media (max-width: 1024px) {
          .billing-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .billing-grid > div[style*="scale(1.02)"] {
            transform: none !important;
          }
        }
        @media (max-width: 640px) {
          .billing-grid {
            grid-template-columns: 1fr !important;
          }
          .billing-grid > div[style*="scale(1.02)"] {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
