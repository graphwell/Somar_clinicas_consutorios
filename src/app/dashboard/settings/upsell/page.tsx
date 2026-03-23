"use client";
import React, { useState, useEffect } from 'react';

const TENANT_ID = 'clinica_id_default';

export default function UpsellSettingsPage() {
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCombos = () => {
    setLoading(true);
    fetch(`/api/settings/upsell?tenantId=${TENANT_ID}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCombos(data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCombos(); }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">🚀 Upsell Automático (WhatsApp)</h2>
        <p className="text-gray-400 text-sm mt-1">Configure ofertas inteligentes enviadas se o cliente agendar um serviço gatilho.</p>
      </div>

      <div className="bg-[#0a0a20]/50 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold">Combos Ativos</h3>
          <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-semibold transition-colors">
            + Criar Combo
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Carregando...</p>
        ) : combos.length === 0 ? (
          <div className="text-center p-12 border border-white/5 border-dashed rounded-xl bg-white/3">
            <span className="text-4xl text-indigo-400/50">🛒</span>
            <p className="font-bold text-white mt-4">Nenhum upsell configurado</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Sempre que um cliente agendar "Corte Masculino", o robô pode perguntar "Vai fazer a barba também?". Construa suas regras.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {combos.map((combo) => (
              <div key={combo.id} className="p-4 border border-white/10 bg-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm">
                    Se agendar <strong className="text-indigo-400">{combo.gatilho?.nome || '???'}</strong>
                  </p>
                  <p className="text-sm">
                    ➔ Oferecer <strong className="text-green-400">{combo.oferta?.nome || '???'}</strong>
                  </p>
                  <p className="text-xs text-gray-400 mt-2 italic">"{combo.descricaoOferta}"</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${combo.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {combo.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <p className="text-xs text-yellow-500 font-bold mt-2">-{combo.desconto}% OFF</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
