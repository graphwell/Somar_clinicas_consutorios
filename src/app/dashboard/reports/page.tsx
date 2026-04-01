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

/* ─── SVG Bar Chart ───────────────────────────────────────────── */
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
        {/* Eixo Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={30} y1={H - t * H + 8} x2={W} y2={H - t * H + 8} stroke="#f0ede8" strokeWidth={0.5} />
        ))}

        {data.map((item, i) => {
          const x = 30 + i * gap;
          const hAt = (item.atendimentos / maxAt) * (H - 16);
          const hFat = (item.faturamento / maxFat) * (H - 16);
          const color = colors[i % colors.length];

          return (
            <g key={item.id + item.nome}>
              {/* Barra faturamento (mais clara, atrás) */}
              <rect
                x={x + barW * 0.55}
                y={H - hFat + 8}
                width={barW * 0.45}
                height={hFat}
                fill={color}
                opacity={0.3}
                rx={3}
              />
              {/* Barra atendimentos (mais escura, frente) */}
              <rect
                x={x}
                y={H - hAt + 8}
                width={barW * 0.5}
                height={hAt}
                fill={color}
                rx={3}
              />
              {/* Valor atendimentos */}
              {item.atendimentos > 0 && (
                <text x={x + barW * 0.25} y={H - hAt + 4} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">
                  {item.atendimentos}
                </text>
              )}
              {/* Label nome */}
              <text
                x={x + barW * 0.5}
                y={H + 24}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
                fontWeight="700"
              >
                {item.nome.length > 10 ? item.nome.slice(0, 9) + '…' : item.nome}
              </text>
            </g>
          );
        })}

        {/* Legenda */}
        <rect x={30} y={H + 42} width={10} height={10} fill="#40916C" rx={2} />
        <text x={44} y={H + 51} fontSize={9} fill="#94a3b8" fontWeight="600">Atendimentos</text>
        <rect x={140} y={H + 42} width={10} height={10} fill="#40916C" opacity={0.3} rx={2} />
        <text x={154} y={H + 51} fontSize={9} fill="#94a3b8" fontWeight="600">Faturamento</text>
      </svg>
    </div>
  );
}

/* ─── Aba Convênios ───────────────────────────────────────────── */
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
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-2xl mb-3 grayscale opacity-20">🏥</p>
        <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Nenhum dado de convênio ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-xl">🏥</div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Planos distintos</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{data.filter((d) => d.id !== '__particular__').length}</p>
          </div>
        </div>
        <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-xl">📋</div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Atendimentos</p>
            <p className="text-2xl font-black text-indigo-400 mt-0.5">{totalAt}</p>
          </div>
        </div>
        <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-5 flex items-center gap-4 col-span-2 md:col-span-1">
          <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center text-xl">💰</div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Faturamento</p>
            <p className="text-xl font-black text-orange-400 mt-0.5">
              R$ {totalFat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-8">
        <h3 className="text-sm font-bold mb-6 flex items-center gap-2 text-white">
          📊 Atendimentos por convênio
        </h3>
        <BarChart data={data} />
      </div>

      {/* Tabela */}
      <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Convênio</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Atendimentos</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Faturamento</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">% do total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.id + item.nome + i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-3 font-bold text-gray-200 text-sm">{item.nome}</td>
                <td className="px-6 py-3 text-right text-gray-400 tabular-nums">{item.atendimentos}</td>
                <td className="px-6 py-3 text-right text-emerald-400 font-mono tabular-nums text-sm">
                  {item.faturamento > 0 ? `R$ ${item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${totalAt > 0 ? (item.atendimentos / totalAt) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums w-9 text-right">
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

/* ─── Página principal ────────────────────────────────────────── */
type Tab = 'geral' | 'convenios';

export default function ReportsPage() {
  const { labels } = useNicho();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('geral');

  useEffect(() => {
    fetchWithAuth('/api/reports/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    {
      label: 'Faturamento Mensal',
      value: stats ? `R$ ${stats.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
      icon: '💰',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Taxa de Confirmação',
      value: stats ? `${stats.taxaConfirmacao.toFixed(1)}%` : '0%',
      icon: '✅',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10'
    },
    {
      label: 'Base Coletada',
      value: stats ? `${stats.totalPacientes} ${labels.termoPaciente}s` : `0 ${labels.termoPaciente}s`,
      icon: '👥',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10'
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Gestão & Inteligência
          </h2>
          <p className="text-gray-400 mt-1">Dados reais do mês atual consolidando faturamento e performance.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/5 rounded-2xl p-1 w-fit">
        {([
          { key: 'geral', label: '📈 Visão Geral' },
          { key: 'convenios', label: '🏥 Convênios' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA VISÃO GERAL ── */}
      {tab === 'geral' && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 animate-pulse rounded-3xl" />)
            ) : (
              kpis.map((k, i) => (
                <div key={i} className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-6 flex items-center gap-5 hover:border-white/10 transition-colors">
                  <div className={`w-14 h-14 ${k.bg} ${k.color} rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
                    {k.icon}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{k.label}</p>
                    <p className={`text-2xl font-black ${k.color} mt-0.5`}>{k.value}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Top Services */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  🏆 Faturamento por {labels.termoServico}
                </h3>
                <div className="space-y-4">
                  {loading ? (
                    <div className="space-y-3">
                      <div className="h-4 bg-white/5 w-full rounded" />
                      <div className="h-4 bg-white/5 w-[80%] rounded" />
                    </div>
                  ) : stats?.topServicos.length === 0 ? (
                    <p className="text-sm text-gray-500 italic py-4">Nenhum dado financeiro para este mês.</p>
                  ) : (
                    stats?.topServicos.map((s, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-300">{s.nome}</span>
                          <span className="font-mono text-emerald-400">R$ {s.faturamento.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-1000"
                            style={{ width: `${(s.faturamento / stats.totalFaturado) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 text-right">{s.count} agendamentos</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-8">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">📂 Arquivos para Exportação</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Relatório de Clientes', desc: 'Base completa em CSV', api: '/api/export/clientes', color: 'bg-indigo-500/10 text-indigo-400' },
                    { label: 'Histórico Mensal', desc: 'Todos os horários e status', api: '/api/export/agendamentos', color: 'bg-emerald-500/10 text-emerald-400' },
                    { label: 'Ranking de Convênios', desc: 'Desempenho por plano', api: '/api/export/convenios', color: 'bg-orange-500/10 text-orange-400' },
                    { label: 'Exportação Financeira', desc: 'Totais faturados por dia', api: '/api/export/financeiro', color: 'bg-rose-500/10 text-rose-400' },
                  ].map((exp, i) => (
                    <a key={i} href={exp.api} className="p-4 border border-white/5 bg-white/2 rounded-2xl hover:bg-white/5 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${exp.color}`}>{exp.label}</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">⬇</span>
                      </div>
                      <p className="text-xs text-gray-500">{exp.desc}</p>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#1a1a40] to-[#0a0a20] border border-[#4a4ae2]/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#4a4ae2]/20 rounded-full blur-3xl" />
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🧠</div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider text-white">Insight da Synka</h4>
                    <p className="text-[10px] text-[#a0a0ff] font-bold tracking-widest">IA ANALYTICS</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl text-xs text-gray-300 border border-white/5 italic leading-relaxed">
                  {stats && stats.taxaConfirmacao < 50 ? (
                    `"Sua taxa de confirmação está em ${stats.taxaConfirmacao.toFixed(1)}%. Sugiro ativar os Lembretes de WhatsApp no Marketing Hub para reduzir as faltas."`
                  ) : (
                    `"Ótimo desempenho! Sua base cresceu para ${stats?.totalPacientes} ${labels.termoPaciente}s. Que tal disparar um combo de upsell para os mais ativos?"`
                  )}
                </div>
              </div>

              <div className="bg-[#0a0a20]/40 border border-white/5 rounded-3xl p-6 text-center">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Próxima Exportação Automática</p>
                <p className="text-xl font-bold text-white">01 / Abr / 2026</p>
                <button className="mt-4 w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/10">Agendar Novo Envio</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── ABA CONVÊNIOS ── */}
      {tab === 'convenios' && <TabConvenios />}
    </div>
  );
}
