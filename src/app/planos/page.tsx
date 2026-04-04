"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api-utils';

/* ─────────────────────────────────────────────
   TIPOS & DADOS
───────────────────────────────────────────── */

type PlanoId = 'start' | 'solo' | 'pro' | 'business';
type Periodo = 'mensal' | 'anual';

interface PlanoConfig {
  id: PlanoId;
  nome: string;
  descricao: string;
  preco: number;
  destaque?: boolean;
  features: Array<{ texto: string; incluso: boolean; emBreve?: boolean }>;
  botaoLabel: string;
}

const PLANOS: PlanoConfig[] = [
  {
    id: 'start',
    nome: 'Start',
    descricao: 'Para começar com o pé direito',
    preco: 37.90,
    botaoLabel: 'Assinar Start',
    features: [
      { texto: '1 profissional', incluso: true },
      { texto: 'Link de agendamento público', incluso: true },
      { texto: 'Lembrete WhatsApp automático', incluso: true },
      { texto: 'Confirmação de presença', incluso: true },
      { texto: 'Instância WhatsApp central', incluso: true },
      { texto: 'WhatsApp próprio', incluso: false },
      { texto: 'Prontuário', incluso: false },
      { texto: 'Financeiro', incluso: false },
      { texto: 'Marketing e campanhas', incluso: false },
    ],
  },
  {
    id: 'solo',
    nome: 'Solo',
    descricao: 'Para profissionais autônomos',
    preco: 79.00,
    botaoLabel: 'Assinar Solo',
    features: [
      { texto: 'Até 2 profissionais', incluso: true },
      { texto: 'Link de agendamento público', incluso: true },
      { texto: 'Lembrete WhatsApp automático', incluso: true },
      { texto: 'WhatsApp próprio conectado', incluso: true },
      { texto: 'Prontuário eletrônico', incluso: true },
      { texto: 'Financeiro básico', incluso: true },
      { texto: 'Convênios', incluso: true },
      { texto: 'Prontuário com IA', incluso: false },
      { texto: 'Marketing e campanhas', incluso: false },
      { texto: 'Planos de assinatura', incluso: false },
    ],
  },
  {
    id: 'pro',
    nome: 'Pro',
    descricao: 'Para clínicas em crescimento',
    preco: 127.00,
    destaque: true,
    botaoLabel: 'Assinar Pro',
    features: [
      { texto: 'Até 5 profissionais', incluso: true },
      { texto: 'Link de agendamento público', incluso: true },
      { texto: 'Lembrete WhatsApp automático', incluso: true },
      { texto: 'WhatsApp próprio conectado', incluso: true },
      { texto: 'Prontuário eletrônico', incluso: true },
      { texto: 'Financeiro completo', incluso: true },
      { texto: 'Convênios', incluso: true },
      { texto: 'Marketing e campanhas', incluso: true },
      { texto: 'Combos e upsell', incluso: true },
      { texto: 'Planos de assinatura', incluso: true },
      { texto: 'Relatórios completos', incluso: true },
      { texto: 'Prontuário com IA e voz', incluso: false },
      { texto: 'Suporte prioritário', incluso: false },
    ],
  },
  {
    id: 'business',
    nome: 'Business',
    descricao: 'Para clínicas e redes estabelecidas',
    preco: 197.00,
    botaoLabel: 'Assinar Business',
    features: [
      { texto: 'Até 10 profissionais', incluso: true },
      { texto: 'Link de agendamento público', incluso: true },
      { texto: 'Lembrete WhatsApp automático', incluso: true },
      { texto: 'WhatsApp próprio conectado', incluso: true },
      { texto: 'Prontuário com IA e voz', incluso: true },
      { texto: 'Financeiro completo', incluso: true },
      { texto: 'Convênios', incluso: true },
      { texto: 'Marketing e campanhas', incluso: true },
      { texto: 'Combos e upsell', incluso: true },
      { texto: 'Planos de assinatura', incluso: true },
      { texto: 'Relatórios completos', incluso: true },
      { texto: 'Suporte prioritário', incluso: true },
      { texto: 'API de integração', incluso: true },
      { texto: 'Multi-unidades', incluso: true, emBreve: true },
    ],
  },
];

const FAQ = [
  {
    q: 'Preciso de cartão de crédito para o trial?',
    a: 'Não. O trial de 15 dias é completamente grátis e sem necessidade de cartão. Você só informa o pagamento quando decidir assinar um plano.',
  },
  {
    q: 'Posso mudar de plano depois?',
    a: 'Sim, a qualquer momento. Ao fazer upgrade, o valor é calculado proporcionalmente. Ao fazer downgrade, o novo valor vale no próximo ciclo.',
  },
  {
    q: 'O que é a instância central de WhatsApp?',
    a: 'No plano Start, os lembretes são enviados pela instância central do Synka, em nome da sua clínica. Nos planos superiores você pode conectar seu próprio número de WhatsApp.',
  },
  {
    q: 'Funciona para qualquer tipo de negócio?',
    a: 'Sim. O Synka funciona para clínicas médicas, odontológicas, psicológicas, nutricionistas, salões de beleza, barbearias, estúdios de estética e qualquer negócio com agenda.',
  },
  {
    q: 'Como funciona o cancelamento?',
    a: 'Sem multa, sem burocracia. Cancele quando quiser pelo próprio painel. Você mantém o acesso até o fim do período pago.',
  },
];

const TABELA_GRUPOS = [
  {
    grupo: 'Agendamento',
    linhas: [
      { feature: 'Link público de agendamento', start: true, solo: true, pro: true, business: true },
      { feature: 'Lembrete WhatsApp automático', start: true, solo: true, pro: true, business: true },
      { feature: 'WhatsApp central (Synka)', start: true, solo: true, pro: true, business: true },
      { feature: 'WhatsApp próprio conectado', start: false, solo: true, pro: true, business: true },
    ],
  },
  {
    grupo: 'Operação',
    linhas: [
      { feature: 'Prontuário eletrônico', start: false, solo: true, pro: true, business: true },
      { feature: 'Prontuário IA + voz', start: false, solo: false, pro: false, business: true },
      { feature: 'Financeiro', start: false, solo: true, pro: true, business: true },
      { feature: 'Convênios', start: false, solo: true, pro: true, business: true },
    ],
  },
  {
    grupo: 'Marketing',
    linhas: [
      { feature: 'Campanhas WhatsApp', start: false, solo: false, pro: true, business: true },
      { feature: 'Combos e upsell', start: false, solo: false, pro: true, business: true },
      { feature: 'Planos de assinatura', start: false, solo: false, pro: true, business: true },
    ],
  },
  {
    grupo: 'Relatórios',
    linhas: [
      { feature: 'Básico', start: false, solo: true, pro: true, business: true },
      { feature: 'Completo', start: false, solo: false, pro: true, business: true },
    ],
  },
  {
    grupo: 'Suporte',
    linhas: [
      { feature: 'Suporte por email', start: true, solo: true, pro: true, business: true },
      { feature: 'Suporte prioritário', start: false, solo: false, pro: false, business: true },
      { feature: 'API de integração', start: false, solo: false, pro: false, business: true },
    ],
  },
  {
    grupo: 'Limites',
    linhas: [
      { feature: 'Profissionais', start: '1', solo: '2', pro: '5', business: '10' },
      { feature: 'Pacientes', start: '200', solo: '500', pro: '2.000', business: '∞' },
    ],
  },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function calcPreco(preco: number, periodo: Periodo) {
  const v = periodo === 'anual' ? preco * 0.8 : preco;
  const [inteiro, dec] = v.toFixed(2).split('.');
  return { inteiro, dec };
}

function economiaAnual(preco: number) {
  return Math.round(preco * 12 * 0.2);
}

/* ─────────────────────────────────────────────
   COMPONENTES INTERNOS
───────────────────────────────────────────── */

function CheckIcon({ incluso }: { incluso: boolean }) {
  if (incluso) {
    return (
      <span
        className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{ background: '#D8F3DC', color: '#2D6A4F' }}
      >
        ✓
      </span>
    );
  }
  return (
    <span
      className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
      style={{ background: '#F8F6F1', color: '#8A9BB0' }}
    >
      ✕
    </span>
  );
}

function TableCheck({ val }: { val: boolean | string }) {
  if (typeof val === 'string') {
    return <span className="text-[13px] font-medium" style={{ color: '#1B2B3A' }}>{val}</span>;
  }
  if (val) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
        style={{ background: '#D8F3DC', color: '#2D6A4F' }}
      >
        ✓
      </span>
    );
  }
  return <span className="text-[18px] leading-none" style={{ color: '#EEE9DF' }}>—</span>;
}

/* ─────────────────────────────────────────────
   PÁGINA PRINCIPAL
───────────────────────────────────────────── */

export default function PlanosPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>('mensal');
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoId | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tabelaAberta, setTabelaAberta] = useState(false);
  const [faqAberto, setFaqAberto] = useState<number | null>(null);

  const planoAtual = PLANOS.find(p => p.id === planoSelecionado);

  async function handleAssinar(planoId: PlanoId) {
    setPlanoSelecionado(planoId);

    const token = getAuthToken();
    if (!token) {
      router.push(`/auth/register?plano=${planoId}`);
      return;
    }
    // Usuário logado: vai pro checkout diretamente via sidebar/bottom-sheet
  }

  async function handleFinalizar() {
    if (!planoSelecionado) return;
    setIsProcessing(true);

    const token = getAuthToken();
    if (!token) {
      router.push(`/auth/register?plano=${planoSelecionado}`);
      return;
    }

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plano: planoSelecionado }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erro ao criar sessão de pagamento.');
        setIsProcessing(false);
      }
    } catch {
      alert('Erro inesperado. Tente novamente.');
      setIsProcessing(false);
    }
  }

  const precoPlanoSelecionado = planoAtual
    ? calcPreco(planoAtual.preco, periodo)
    : null;

  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: '#F8F6F1' }}
    >
      {/* ══════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════ */}
      <nav
        className="sticky top-0 z-50 w-full"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #EEE9DF', height: '60px' }}
      >
        <div className="max-w-[1100px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/">
            <img src="/synka-logo.png" alt="Synka" style={{ height: '28px', objectFit: 'contain' }} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-[14px] font-medium transition-colors"
              style={{ color: '#4A6480' }}
            >
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 rounded-lg text-[14px] font-medium text-white transition-colors"
              style={{ background: '#40916C' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2D6A4F')}
              onMouseLeave={e => (e.currentTarget.style.background = '#40916C')}
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section
        className="text-center px-6 pt-20 pb-14"
        style={{ background: 'linear-gradient(180deg, #F0FAF4 0%, #F8F6F1 100%)' }}
      >
        {/* Badge trial */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-medium mb-6" style={{ background: '#D8F3DC', color: '#2D6A4F' }}>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#40916C', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
          />
          Trial de 15 dias grátis
        </div>

        <h1 className="font-display text-[42px] leading-tight mb-3" style={{ color: '#1B2B3A', fontSize: 'clamp(28px, 5vw, 42px)' }}>
          Escolha o plano ideal
        </h1>
        <p className="text-[16px] mb-10" style={{ color: '#4A6480' }}>
          Para clínicas, consultórios, salões e barbearias
        </p>

        {/* Switcher Mensal / Anual */}
        <div className="inline-flex items-center rounded-full p-1 gap-1" style={{ background: '#EEE9DF' }}>
          <button
            onClick={() => setPeriodo('mensal')}
            className="px-5 py-2 rounded-full text-[13px] font-medium transition-all"
            style={periodo === 'mensal'
              ? { background: '#FFFFFF', color: '#1B2B3A', boxShadow: '0 1px 4px rgba(27,43,58,0.12)' }
              : { background: 'transparent', color: '#4A6480' }
            }
          >
            Mensal
          </button>
          <button
            onClick={() => setPeriodo('anual')}
            className="px-5 py-2 rounded-full text-[13px] font-medium transition-all flex items-center gap-2"
            style={periodo === 'anual'
              ? { background: '#FFFFFF', color: '#1B2B3A', boxShadow: '0 1px 4px rgba(27,43,58,0.12)' }
              : { background: 'transparent', color: '#4A6480' }
            }
          >
            Anual
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: '#F5E6C8', color: '#C4973A' }}
            >
              -20%
            </span>
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BANNER TRIAL
      ══════════════════════════════════════ */}
      <div className="max-w-[800px] mx-auto px-6 mb-12">
        <div
          className="flex items-center justify-between gap-4 rounded-2xl px-7 py-5"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #D8F3DC',
            flexWrap: 'wrap',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
              style={{ background: '#F0FAF4' }}
            >
              🎁
            </div>
            <div>
              <p className="text-[15px] font-medium" style={{ color: '#1B2B3A' }}>
                Teste grátis por 15 dias
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: '#8A9BB0' }}>
                Acesso completo ao plano Business. Sem cartão de crédito.
              </p>
            </div>
          </div>
          <Link
            href="/auth/register"
            className="px-5 py-2.5 rounded-lg text-[14px] font-medium text-white transition-colors shrink-0"
            style={{ background: '#40916C' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2D6A4F')}
            onMouseLeave={e => (e.currentTarget.style.background = '#40916C')}
          >
            Começar grátis →
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CARDS DE PLANOS + RESUMO LATERAL
      ══════════════════════════════════════ */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <div className={`grid gap-6 transition-all duration-300 ${planoSelecionado ? 'lg:grid-cols-[1fr_304px]' : 'lg:grid-cols-1'}`}>

          {/* Grid de cards */}
          <div className={`grid gap-4 ${planoSelecionado ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
            {PLANOS.map(plano => {
              const { inteiro, dec } = calcPreco(plano.preco, periodo);
              const economia = economiaAnual(plano.preco);
              const isDestaque = plano.destaque;

              return (
                <div
                  key={plano.id}
                  className="relative flex flex-col rounded-[20px] p-7 transition-all"
                  style={{
                    background: '#FFFFFF',
                    border: isDestaque ? '2px solid #40916C' : '1px solid #EEE9DF',
                    boxShadow: isDestaque ? '0 8px 32px rgba(64,145,108,0.15)' : undefined,
                    transform: isDestaque ? undefined : undefined,
                  }}
                >
                  {/* Badge MAIS ESCOLHIDO */}
                  {isDestaque && (
                    <div
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-semibold tracking-[0.8px] uppercase text-white whitespace-nowrap"
                      style={{ background: '#40916C' }}
                    >
                      MAIS ESCOLHIDO
                    </div>
                  )}

                  {/* Topo */}
                  <p
                    className="text-[13px] font-medium uppercase tracking-[0.8px]"
                    style={{ color: '#8A9BB0' }}
                  >
                    {plano.nome}
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: '#8A9BB0' }}>
                    {plano.descricao}
                  </p>

                  {/* Preço */}
                  <div className="mt-5 mb-1 flex items-end gap-0.5">
                    <span
                      className="font-display leading-none"
                      style={{ fontSize: isDestaque ? '44px' : '40px', color: isDestaque ? '#2D6A4F' : '#1B2B3A' }}
                    >
                      R$ {inteiro}
                    </span>
                    <span
                      className="font-display pb-1"
                      style={{ fontSize: isDestaque ? '22px' : '20px', color: isDestaque ? '#52B788' : '#8A9BB0' }}
                    >
                      ,{dec}
                    </span>
                    <span className="text-[13px] pb-1.5 ml-0.5" style={{ color: '#8A9BB0' }}>/mês</span>
                  </div>

                  {/* Badge economia anual */}
                  {periodo === 'anual' && (
                    <div
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-1 w-fit"
                      style={{ background: '#F5E6C8', color: '#C4973A' }}
                    >
                      ECONOMIZE R${economia}/ano
                    </div>
                  )}

                  {/* Separador */}
                  <div className="my-4" style={{ borderTop: '1px solid #EEE9DF' }} />

                  {/* Features */}
                  <ul className="flex-1 space-y-2.5 mb-6">
                    {plano.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <CheckIcon incluso={f.incluso} />
                        <span
                          className="text-[13px] leading-snug"
                          style={{
                            color: f.incluso ? '#1B2B3A' : '#8A9BB0',
                            textDecoration: f.incluso ? 'none' : 'line-through',
                          }}
                        >
                          {f.texto}
                          {f.emBreve && (
                            <span
                              className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ background: '#F5E6C8', color: '#C4973A' }}
                            >
                              em breve
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Botão */}
                  <button
                    onClick={() => handleAssinar(plano.id)}
                    className="w-full rounded-[10px] text-[14px] font-medium transition-all"
                    style={isDestaque
                      ? {
                          background: '#40916C',
                          color: '#FFFFFF',
                          height: '48px',
                          border: 'none',
                          boxShadow: '0 3px 12px rgba(64,145,108,0.3)',
                        }
                      : {
                          background: 'transparent',
                          color: '#40916C',
                          height: '44px',
                          border: '1.5px solid #40916C',
                        }
                    }
                    onMouseEnter={e => {
                      if (isDestaque) {
                        (e.currentTarget as HTMLButtonElement).style.background = '#2D6A4F';
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.background = '#F0FAF4';
                      }
                    }}
                    onMouseLeave={e => {
                      if (isDestaque) {
                        (e.currentTarget as HTMLButtonElement).style.background = '#40916C';
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }
                    }}
                  >
                    {plano.botaoLabel}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Resumo lateral (desktop) */}
          {planoSelecionado && planoAtual && precoPlanoSelecionado && (
            <div className="hidden lg:block">
              <div
                className="rounded-2xl p-6 sticky top-20"
                style={{ background: '#FFFFFF', border: '1px solid #EEE9DF' }}
              >
                <p className="text-[15px] font-medium mb-5" style={{ color: '#1B2B3A' }}>
                  Resumo do pedido
                </p>

                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-[14px] font-medium" style={{ color: '#1B2B3A' }}>
                      Plano {planoAtual.nome}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: '#8A9BB0' }}>
                      Cobrança {periodo}
                    </p>
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: '#2D6A4F' }}>
                    R$ {precoPlanoSelecionado.inteiro},{precoPlanoSelecionado.dec}
                  </p>
                </div>

                {periodo === 'anual' && (
                  <p className="text-[11px] mb-4" style={{ color: '#C4973A' }}>
                    Economia de R${economiaAnual(planoAtual.preco)}/ano incluída
                  </p>
                )}

                <div className="my-4" style={{ borderTop: '1px solid #EEE9DF' }} />

                <div className="flex items-end justify-between mb-6">
                  <p className="text-[13px]" style={{ color: '#4A6480' }}>Total {periodo}</p>
                  <div className="text-right">
                    <p
                      className="font-display leading-none"
                      style={{ fontSize: '28px', color: '#2D6A4F' }}
                    >
                      R$ {precoPlanoSelecionado.inteiro},{precoPlanoSelecionado.dec}
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: '#8A9BB0' }}>/mês</p>
                  </div>
                </div>

                <button
                  onClick={handleFinalizar}
                  disabled={isProcessing}
                  className="w-full rounded-[10px] text-[14px] font-medium text-white transition-colors disabled:opacity-60"
                  style={{ background: '#40916C', height: '48px' }}
                  onMouseEnter={e => { if (!isProcessing) (e.currentTarget as HTMLButtonElement).style.background = '#2D6A4F'; }}
                  onMouseLeave={e => { if (!isProcessing) (e.currentTarget as HTMLButtonElement).style.background = '#40916C'; }}
                >
                  {isProcessing ? 'Aguarde...' : 'Finalizar assinatura →'}
                </button>

                <button
                  onClick={() => setPlanoSelecionado(null)}
                  className="w-full mt-2 text-[12px] py-2"
                  style={{ color: '#8A9BB0' }}
                >
                  Cancelar
                </button>

                <div className="mt-4 text-center space-y-1">
                  <p className="text-[11px]" style={{ color: '#8A9BB0' }}>
                    🔒 Pagamento seguro via Stripe
                  </p>
                  <p className="text-[11px]" style={{ color: '#8A9BB0' }}>
                    Garantia de 7 dias · Cancele quando quiser
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════
          TABELA COMPARATIVA
      ══════════════════════════════════════ */}
      <section className="max-w-[900px] mx-auto px-6 mb-16">
        <button
          onClick={() => setTabelaAberta(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-3 text-[15px] font-medium transition-colors rounded-xl"
          style={{ color: '#40916C', background: '#F0FAF4' }}
        >
          Ver comparação completa
          <span
            className="text-[18px] transition-transform duration-200"
            style={{ transform: tabelaAberta ? 'rotate(180deg)' : 'none' }}
          >
            ▾
          </span>
        </button>

        {tabelaAberta && (
          <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: '1px solid #EEE9DF' }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr style={{ background: '#F0FAF4' }}>
                    <th className="text-left px-5 py-3 text-[12px] font-medium uppercase tracking-[0.8px]" style={{ color: '#40916C', width: '40%' }}>
                      Recurso
                    </th>
                    {['Start', 'Solo', 'Pro', 'Business'].map(nome => (
                      <th
                        key={nome}
                        className="px-4 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.8px]"
                        style={{
                          color: nome === 'Pro' ? '#40916C' : '#4A6480',
                          background: nome === 'Pro' ? 'rgba(240,250,244,0.8)' : undefined,
                        }}
                      >
                        {nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABELA_GRUPOS.map((grupo, gi) => (
                    <React.Fragment key={gi}>
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[1px]"
                          style={{ color: '#8A9BB0', background: '#FAFAF9' }}
                        >
                          {grupo.grupo}
                        </td>
                      </tr>
                      {grupo.linhas.map((linha, li) => (
                        <tr
                          key={li}
                          style={{ background: li % 2 === 0 ? '#FFFFFF' : '#F8F6F1' }}
                        >
                          <td className="px-5 py-3 text-[13px]" style={{ color: '#4A6480' }}>
                            {linha.feature}
                          </td>
                          {(['start', 'solo', 'pro', 'business'] as const).map(col => (
                            <td
                              key={col}
                              className="px-4 py-3 text-center"
                              style={col === 'pro' ? { background: 'rgba(240,250,244,0.5)' } : undefined}
                            >
                              <div className="flex justify-center">
                                <TableCheck val={(linha as any)[col]} />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════
          FAQ
      ══════════════════════════════════════ */}
      <section className="max-w-[700px] mx-auto px-6 mb-20">
        <h2 className="font-display text-[24px] mb-8 text-center" style={{ color: '#1B2B3A' }}>
          Perguntas frequentes
        </h2>
        <div>
          {FAQ.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid #EEE9DF' }}>
              <button
                onClick={() => setFaqAberto(faqAberto === i ? null : i)}
                className="w-full flex items-center justify-between py-[18px] text-left"
              >
                <span className="text-[15px] font-medium pr-4" style={{ color: '#1B2B3A' }}>
                  {item.q}
                </span>
                <span
                  className="text-[20px] shrink-0 transition-transform duration-200 font-light"
                  style={{
                    color: '#40916C',
                    transform: faqAberto === i ? 'rotate(45deg)' : 'none',
                  }}
                >
                  +
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: faqAberto === i ? '200px' : '0px' }}
              >
                <p
                  className="pb-5 text-[14px] leading-relaxed"
                  style={{ color: '#4A6480' }}
                >
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════ */}
      <section className="px-6 mb-16">
        <div
          className="max-w-[900px] mx-auto rounded-3xl px-10 py-16 text-center"
          style={{ background: '#2D6A4F' }}
        >
          <h2 className="font-display text-[32px] text-white mb-3" style={{ fontSize: 'clamp(24px, 4vw, 32px)' }}>
            Comece grátis hoje
          </h2>
          <p className="text-[16px] mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
            15 dias de acesso completo. Sem cartão de crédito.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="px-8 py-3.5 rounded-[10px] text-[15px] font-semibold transition-colors"
              style={{ background: '#FFFFFF', color: '#2D6A4F' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F0FAF4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
            >
              Começar trial grátis →
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3.5 rounded-[10px] text-[15px] font-medium transition-colors"
              style={{ color: '#FFFFFF', border: '1.5px solid rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Ver demonstração
            </Link>
          </div>

          <p className="mt-6 text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            ✓ Sem cartão&nbsp;&nbsp; ✓ Cancele quando quiser&nbsp;&nbsp; ✓ Suporte em português
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BOTTOM SHEET MOBILE (resumo)
      ══════════════════════════════════════ */}
      {planoSelecionado && planoAtual && precoPlanoSelecionado && (
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-5 pb-6 pt-5 rounded-t-[20px]"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 -4px 32px rgba(0,0,0,0.10)',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium" style={{ color: '#1B2B3A' }}>
                {planoAtual.nome} — R$ {precoPlanoSelecionado.inteiro},{precoPlanoSelecionado.dec}/mês
              </p>
              <p className="text-[12px]" style={{ color: '#8A9BB0' }}>
                Cobrança {periodo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlanoSelecionado(null)}
                className="px-3 py-2 text-[13px] rounded-lg"
                style={{ color: '#8A9BB0', border: '1px solid #EEE9DF' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizar}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-[10px] text-[14px] font-medium text-white disabled:opacity-60"
                style={{ background: '#40916C', minHeight: '44px' }}
              >
                {isProcessing ? 'Aguarde...' : 'Assinar →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Espaço para bottom sheet no mobile */}
      {planoSelecionado && <div className="lg:hidden h-24" />}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
