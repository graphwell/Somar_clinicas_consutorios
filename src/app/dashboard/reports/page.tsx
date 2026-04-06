"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

type Stats = {
  totalFaturado: number;
  totalAgendamentos: number;
  confirmadosCount: number;
  taxaConfirmacao: number;
  totalPacientes: number;
  topServicos: { nome: string; count: number; faturamento: number }[];
};

type ConvenioStat = {
  id: string;
  nome: string;
  atendimentos: number;
  faturamento: number;
};

type Periodo = 'Esta semana' | 'Este mês' | 'Último mês' | 'Este ano';
type TabId = 'geral' | 'servicos' | 'clientes' | 'convenios' | 'exportar';

const NICHOS_BELEZA = ['SALAO_BELEZA', 'BARBEARIA', 'CLINICA_ESTETICA'];
const PERIODOS: Periodo[] = ['Esta semana', 'Este mês', 'Último mês', 'Este ano'];

/* ─── BarChart SVG ───────────────────────────────────────────────── */
function BarChart({ data }: { data: ConvenioStat[] }) {
  const maxAt = Math.max(...data.map((d) => d.atendimentos), 1);
  const maxFat = Math.max(...data.map((d) => d.faturamento), 1);
  const W = 540;
  const H = 180;
  const barW = Math.max(20, Math.floor((W - 40) / data.length) - 8);
  const gap = Math.floor((W - 40) / data.length);
  const colors = ['#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7'];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 60}`} className="w-full min-w-[400px]" style={{ maxHeight: 260 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={30} y1={H - t * H + 8} x2={W} y2={H - t * H + 8} stroke="#EEE9DF" strokeWidth={0.8} />
        ))}
        {data.map((item, i) => {
          const x = 30 + i * gap;
          const hAt = (item.atendimentos / maxAt) * (H - 16);
          const hFat = (item.faturamento / maxFat) * (H - 16);
          const color = colors[i % colors.length];
          return (
            <g key={item.id + item.nome}>
              <rect x={x + barW * 0.55} y={H - hFat + 8} width={barW * 0.45} height={hFat} fill={color} opacity={0.3} rx={3} />
              <rect x={x} y={H - hAt + 8} width={barW * 0.5} height={hAt} fill={color} rx={3} />
              {item.atendimentos > 0 && (
                <text x={x + barW * 0.25} y={H - hAt + 4} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">
                  {item.atendimentos}
                </text>
              )}
              <text x={x + barW * 0.5} y={H + 24} textAnchor="middle" fontSize={9} fill="#8A9BB0" fontWeight="700">
                {item.nome.length > 10 ? item.nome.slice(0, 9) + '…' : item.nome}
              </text>
            </g>
          );
        })}
        <rect x={30} y={H + 42} width={10} height={10} fill="#40916C" rx={2} />
        <text x={44} y={H + 51} fontSize={9} fill="#8A9BB0" fontWeight="600">Atendimentos</text>
        <rect x={140} y={H + 42} width={10} height={10} fill="#40916C" opacity={0.3} rx={2} />
        <text x={154} y={H + 51} fontSize={9} fill="#8A9BB0" fontWeight="600">Faturamento</text>
      </svg>
    </div>
  );
}

/* ─── Aba Convênios (apenas para saúde) ──────────────────────────── */
function TabConvenios() {
  const [data, setData] = useState<ConvenioStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/reports/convenios')
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalAt = data.reduce((s, d) => s + d.atendimentos, 0);
  const totalFat = data.reduce((s, d) => s + d.faturamento, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div style={{ width: 20, height: 20, border: '2px solid #40916C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-20">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mx-auto mb-3" style={{ opacity: 0.2 }}>
          <path d="M4 26V14L14 4l10 10V26H4z" stroke="#1B2B3A" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9.5 26V19h9v7" stroke="#1B2B3A" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <p style={{ fontSize: 11, color: '#8A9BB0', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}>
          Nenhum dado de convênio ainda
        </p>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Planos distintos', value: String(data.filter(d => d.id !== '__particular__').length), cor: '#40916C' },
    { label: 'Total Atendimentos', value: String(totalAt), cor: '#378ADD' },
    { label: 'Total Faturado', value: `R$ ${totalFat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cor: '#F4A261' },
  ];

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summaryCards.map((card, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.cor, borderRadius: '3px 3px 0 0' }} />
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, color: '#8A9BB0', marginBottom: 8, marginTop: 4 }}>
              {card.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1B2B3A', lineHeight: 1 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: '#1B2B3A', marginBottom: 20 }}>
          Atendimentos por convênio
        </h3>
        <BarChart data={data} />
      </div>

      {/* Tabela */}
      <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #EEE9DF' }}>
              {['Convênio', 'Atendimentos', 'Faturamento', '% do total'].map((h, i) => (
                <th key={h} style={{ padding: '12px 20px', fontSize: 10, fontWeight: 700, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 0 ? 'left' : 'right' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.id + item.nome + i} style={{ borderBottom: '1px solid #F8F6F1' }}>
                <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500, color: '#1B2B3A' }}>{item.nome}</td>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#4A6480', textAlign: 'right' }}>{item.atendimentos}</td>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#40916C', fontWeight: 500, textAlign: 'right' }}>
                  {item.faturamento > 0 ? `R$ ${item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <div style={{ width: 64, height: 6, background: '#EEE9DF', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${totalAt > 0 ? (item.atendimentos / totalAt) * 100 : 0}%`, background: '#40916C', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#8A9BB0', width: 32, textAlign: 'right' }}>
                      {totalAt > 0 ? ((item.atendimentos / totalAt) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Ícone download ────────────────────────────── */
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/* ─── Página principal ───────────────────────────────────────────── */
export default function ReportsPage() {
  const { nicho, labels } = useNicho();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('geral');
  const [periodo, setPeriodo] = useState<Periodo>('Este mês');

  const isBeleza = NICHOS_BELEZA.includes(nicho);

  const abas: { id: TabId; label: string }[] = isBeleza
    ? [
        { id: 'geral', label: 'Visão Geral' },
        { id: 'servicos', label: 'Serviços' },
        { id: 'clientes', label: 'Clientes' },
        { id: 'exportar', label: 'Exportar' },
      ]
    : [
        { id: 'geral', label: 'Visão Geral' },
        { id: 'servicos', label: 'Serviços' },
        { id: 'clientes', label: 'Clientes' },
        { id: 'convenios', label: 'Convênios' },
        { id: 'exportar', label: 'Exportar' },
      ];

  useEffect(() => {
    fetchWithAuth('/api/reports/stats')
      .then(res => res.json())
      .then(data => { if (!data.error) setStats(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    {
      label: 'Faturamento do Mês',
      value: stats ? `R$ ${stats.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
      sublabel: 'Total recebido',
      cor: '#40916C',
    },
    {
      label: 'Taxa de Confirmação',
      value: stats ? `${stats.taxaConfirmacao.toFixed(1)}%` : '0%',
      sublabel: 'Dos agendamentos',
      cor: '#378ADD',
    },
    {
      label: isBeleza ? 'Clientes Atendidos' : 'Pacientes Atendidos',
      value: stats ? String(stats.totalPacientes) : '0',
      sublabel: 'No período selecionado',
      cor: '#9B72CF',
    },
  ];

  const exportacoesBeleza = [
    { tipo: 'clientes', label: 'Relatório de Clientes', descricao: 'Lista completa com visitas', api: '/api/export/clientes' },
    { tipo: 'historico', label: 'Histórico Mensal', descricao: 'Atendimentos do período', api: '/api/export/agendamentos' },
    { tipo: 'servicos', label: 'Serviços Populares', descricao: 'Ranking por faturamento', api: '/api/export/servicos' },
    { tipo: 'financeiro', label: 'Exportação Financeira', descricao: 'Receitas e pagamentos', api: '/api/export/financeiro' },
  ];

  const exportacoesSaude = [
    { tipo: 'pacientes', label: 'Relatório de Pacientes', descricao: 'Lista completa com consultas', api: '/api/export/clientes' },
    { tipo: 'historico', label: 'Histórico Mensal', descricao: 'Atendimentos do período', api: '/api/export/agendamentos' },
    { tipo: 'convenios', label: 'Ranking de Convênios', descricao: 'Faturamento por plano', api: '/api/export/convenios' },
    { tipo: 'financeiro', label: 'Exportação Financeira', descricao: 'Receitas e pagamentos', api: '/api/export/financeiro' },
  ];

  const exportacoes = isBeleza ? exportacoesBeleza : exportacoesSaude;

  const maxFaturamento = stats ? Math.max(...stats.topServicos.map(s => s.faturamento), 1) : 1;

  const insightTexto = stats
    ? stats.taxaConfirmacao < 50
      ? `Sua taxa de confirmação está em ${stats.taxaConfirmacao.toFixed(1)}%. Considere ativar os lembretes de WhatsApp para reduzir as faltas.`
      : `Ótimo desempenho! Sua base chegou a ${stats.totalPacientes} ${labels.termoPaciente}${stats.totalPacientes !== 1 ? 's' : ''}. Que tal campanhas de upsell para os mais ativos?`
    : 'Carregando análise do período...';

  const proximaData = (() => {
    const d = new Date();
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return next.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  /* ── Blocos reutilizáveis ── */
  const CardInsight = () => (
    <div style={{ background: '#F0FAF4', border: '1.5px solid #D8F3DC', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D8F3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
            <circle cx="9" cy="16" r="1" fill="#2D6A4F" stroke="none" />
            <circle cx="15" cy="16" r="1" fill="#2D6A4F" stroke="none" />
            <path d="M10 19h4" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1B4332' }}>Insight da Synka IA</p>
          <p style={{ fontSize: 11, color: '#40916C' }}>Análise do período</p>
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#2D6A4F', lineHeight: 1.6, fontStyle: 'italic' }}>
        "{insightTexto}"
      </p>
      <p style={{ fontSize: 10, color: '#8A9BB0', marginTop: 12, paddingTop: 12, borderTop: '1px solid #D8F3DC' }}>
        * Gerado por IA — pode conter erros. Verifique os dados.
      </p>
    </div>
  );

  const CardProximaExportacao = () => (
    <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 20, textAlign: 'center' }}>
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A9BB0', marginBottom: 8 }}>
        Próxima exportação automática
      </p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: '#1B2B3A', marginBottom: 16 }}>
        {proximaData}
      </p>
      <button style={{ width: '100%', height: 40, border: '1.5px solid #40916C', borderRadius: 8, background: 'transparent', color: '#40916C', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
        Agendar exportação
      </button>
    </div>
  );

  const CardExportacoes = () => (
    <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 24 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: '#1B2B3A', marginBottom: 4 }}>
        Exportar Relatórios
      </h3>
      <p style={{ fontSize: 12, color: '#8A9BB0', marginBottom: 20 }}>Baixe os dados em CSV ou PDF</p>
      <div className="grid grid-cols-2 gap-2.5">
        {exportacoes.map(exp => (
          <a
            key={exp.tipo}
            href={exp.api}
            style={{ background: '#F8F6F1', border: '1px solid #EEE9DF', borderRadius: 10, padding: 14, textDecoration: 'none', display: 'block' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <IconDownload />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#40916C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {exp.label}
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#8A9BB0' }}>{exp.descricao}</p>
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: '#1B2B3A' }}>
          Crescimento & Inteligência
        </h1>
        <p style={{ fontSize: 14, color: '#8A9BB0', marginTop: 4 }}>
          Dados reais consolidando faturamento e performance
        </p>
      </div>

      {/* Seletor de período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {PERIODOS.map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: periodo === p ? 'none' : '1px solid #EEE9DF',
              background: periodo === p ? '#40916C' : 'white',
              color: periodo === p ? 'white' : '#4A6480',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Abas por nicho */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid #EEE9DF', flexWrap: 'wrap' }}>
        {abas.map(a => (
          <button
            key={a.id}
            onClick={() => setTab(a.id)}
            style={{
              padding: '8px 18px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: 'none',
              borderBottom: tab === a.id ? '2px solid #40916C' : '2px solid transparent',
              background: 'transparent',
              color: tab === a.id ? '#40916C' : '#8A9BB0',
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'color 150ms',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* ── ABA VISÃO GERAL ── */}
      {tab === 'geral' && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {loading
              ? [0, 1, 2].map(i => (
                  <div key={i} style={{ height: 100, background: 'white', border: '1px solid #EEE9DF', borderRadius: 16 }} className="animate-pulse" />
                ))
              : kpis.map((k, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.cor, borderRadius: '3px 3px 0 0' }} />
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, color: '#8A9BB0', marginBottom: 8, marginTop: 4 }}>
                      {k.label}
                    </p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, color: '#1B2B3A', lineHeight: 1 }}>
                      {k.value}
                    </p>
                    <p style={{ fontSize: 11, color: '#8A9BB0', marginTop: 6 }}>{k.sublabel}</p>
                  </div>
                ))
            }
          </div>

          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
            {/* Coluna principal */}
            <div className="space-y-4">
              {/* Faturamento por Serviço */}
              <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, color: '#1B2B3A', marginBottom: 20 }}>
                  Faturamento por {labels.termoServico}
                </h3>
                {loading ? (
                  <div className="space-y-3">
                    {[80, 60, 45].map((w, i) => (
                      <div key={i} style={{ height: 12, background: '#F8F6F1', borderRadius: 6, width: `${w}%` }} className="animate-pulse" />
                    ))}
                  </div>
                ) : !stats?.topServicos.length ? (
                  <p style={{ fontSize: 13, color: '#8A9BB0', fontStyle: 'italic' }}>Nenhum dado para este período.</p>
                ) : (
                  stats.topServicos.map((s, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: '#1B2B3A' }}>{s.nome}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#40916C' }}>
                          R$ {s.faturamento.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#EEE9DF', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(s.faturamento / maxFaturamento) * 100}%`, background: '#40916C', borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                      <p style={{ fontSize: 11, color: '#8A9BB0', textAlign: 'right', marginTop: 4 }}>{s.count} agendamentos</p>
                    </div>
                  ))
                )}
              </div>

              {/* Exportações */}
              <CardExportacoes />
            </div>

            {/* Coluna lateral */}
            <div className="space-y-4">
              <CardInsight />
              <CardProximaExportacao />
            </div>
          </div>
        </div>
      )}

      {/* ── ABA SERVIÇOS ── */}
      {tab === 'servicos' && (
        <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, color: '#1B2B3A', marginBottom: 20 }}>
            Desempenho por {labels.termoServico}
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[80, 60, 45].map((w, i) => (
                <div key={i} style={{ height: 12, background: '#F8F6F1', borderRadius: 6, width: `${w}%` }} className="animate-pulse" />
              ))}
            </div>
          ) : !stats?.topServicos.length ? (
            <p style={{ fontSize: 13, color: '#8A9BB0', fontStyle: 'italic' }}>Nenhum dado para este período.</p>
          ) : (
            stats.topServicos.map((s, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#1B2B3A', fontWeight: 500 }}>{s.nome}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#40916C' }}>R$ {s.faturamento.toFixed(2)}</span>
                </div>
                <div style={{ height: 6, background: '#EEE9DF', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(s.faturamento / maxFaturamento) * 100}%`, background: '#40916C', borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#8A9BB0' }}>{s.count} agendamentos</span>
                  {stats.totalFaturado > 0 && (
                    <span style={{ fontSize: 11, color: '#8A9BB0' }}>
                      {((s.faturamento / stats.totalFaturado) * 100).toFixed(0)}% do total
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ABA CLIENTES ── */}
      {tab === 'clientes' && (
        <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EEE9DF" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            <circle cx="17" cy="7" r="2" />
            <path d="M23 21v-2a2 2 0 00-2-2h-2" />
          </svg>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#1B2B3A', marginBottom: 8 }}>
            Análise de {labels.termoPaciente}s
          </p>
          <p style={{ fontSize: 12, color: '#8A9BB0', marginBottom: 20 }}>
            Em breve: retenção, LTV e frequência de visitas.
          </p>
          <a
            href="/dashboard/patients"
            style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 8, background: '#40916C', color: 'white', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}
          >
            Ver {labels.termoPaciente}s →
          </a>
        </div>
      )}

      {/* ── ABA CONVÊNIOS (saúde apenas) ── */}
      {tab === 'convenios' && !isBeleza && <TabConvenios />}

      {/* ── ABA EXPORTAR ── */}
      {tab === 'exportar' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
          <CardExportacoes />
          <CardProximaExportacao />
        </div>
      )}

    </div>
  );
}
