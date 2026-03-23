"use client";
import React, { useState, useEffect } from 'react';

export default function CampaignsPage() {
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = () => {
    setLoading(true);
    fetch('/api/campaigns?tenantId=clinica_id_default')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCampanhas(data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCampaigns(); }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">📢 Avisos e Lembretes</h2>
          <p className="text-gray-400 text-sm mt-1">Acione seus pacientes inativos ou envie lembretes de consultas.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all">
            + Lembrete Padrão
          </button>
          <button className="px-5 py-2.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(74,74,226,0.35)] transition-all">
            + Nova Campanha
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a20]/40 border border-[#4a4ae2]/30 rounded-2xl p-5 flex flex-col items-start gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#4a4ae2] opacity-10 blur-xl rounded-full" />
          <span className="text-2xl bg-[#4a4ae2]/20 p-2 rounded-xl border border-[#4a4ae2]/20">🤖</span>
          <p className="font-bold text-white mt-2">Lembrete Automático</p>
          <p className="text-xs text-gray-400">Envia WhatsApp 24h antes da consulta para pedir confirmação. Reduz faltas em até 38%.</p>
          <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#a0a0ff] bg-[#4a4ae2]/10 px-2 py-1 rounded">✔ Ativo</span>
        </div>
        
        <div className="bg-[#0a0a20]/40 border border-emerald-500/30 rounded-2xl p-5 flex flex-col items-start gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-10 blur-xl rounded-full" />
          <span className="text-2xl bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/20">♻️</span>
          <p className="font-bold text-white mt-2">Reativação (90d)</p>
          <p className="text-xs text-gray-400">Dispara "Saudades" para quem não vem há 3 meses.</p>
          <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">✔ Ativar</span>
        </div>

        <div className="bg-[#0a0a20]/40 border border-orange-500/30 rounded-2xl p-5 flex flex-col items-start gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500 opacity-10 blur-xl rounded-full" />
          <span className="text-2xl bg-orange-500/20 p-2 rounded-xl border border-orange-500/20">🎯</span>
          <p className="font-bold text-white mt-2">Campanha Manual</p>
          <p className="text-xs text-gray-400">Ex: Promoção de Natal. Filtre por serviço/convênio.</p>
        </div>
      </div>

      <div className="bg-[#0a0a20]/50 border border-white/5 rounded-2xl mt-8">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-bold text-lg">Histórico de Envios</h3>
        </div>
        {loading ? (
          <p className="p-8 text-center text-gray-500">Carregando...</p>
        ) : campanhas.length === 0 ? (
          <div className="text-center p-12 py-16">
            <span className="text-4xl text-white/20">✉️</span>
            <p className="font-bold text-gray-400 mt-4">Nenhuma campanha registrada</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Data de Envio</th>
                <th className="px-6 py-4">Nome da Campanha</th>
                <th className="px-6 py-4">Filtros</th>
                <th className="px-6 py-4">Envios</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campanhas.map((c: any) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 text-gray-400">{c.dataEnvio ? new Date(c.dataEnvio).toLocaleString('pt-BR') : 'Sem data'}</td>
                  <td className="px-6 py-4 font-medium text-white">{c.titulo}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">{c.segmentoFiltrosJson || 'Todos'}</td>
                  <td className="px-6 py-4 font-bold">{c.totalEnviado}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${c.status === 'enviado' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
