"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import { PLANOS, PlanoInfo } from "@/lib/planos-synka";

interface IntegrationConfig {
  id: string;
  provider: string;
  isActive: boolean;
  hasCredentials: boolean;
  nomeExibicao?: string;
}

interface MeResponse {
  planStatus: string;
  plano: string;
  trialFim?: string;
  diasRestantesTrial?: number;
}

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  
  // Modals state
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [isHandlingCheckout, setIsHandlingCheckout] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [integrationsRes, meRes] = await Promise.all([
        fetchWithAuth("/api/integrations"),
        fetchWithAuth("/api/auth/me")
      ]);
      const ints = await integrationsRes.json();
      const meData = await meRes.json();
      setIntegrations(Array.isArray(ints) ? ints : []);
      setMe(meData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleCheckout = async (planoId: string) => {
    setIsHandlingCheckout(planoId);
    try {
      const res = await fetchWithAuth("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plano: planoId })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Erro ao gerar checkout");
    } catch {
      alert("Erro ao processar assinatura");
    } finally {
      setIsHandlingCheckout(null);
    }
  };

  const Gateways = [
    { provider: "mercadopago", name: "Mercado Pago", color: "bg-blue-600", desc: "Aceite PIX e Cartões via Mercado Pago diretamente na plataforma." },
    { provider: "stripe", name: "Stripe", color: "bg-indigo-600", desc: "A infraestrutura de pagamentos mais robusta do mundo." },
    { provider: "pagseguro", name: "PagSeguro", color: "bg-green-600", desc: "Pagamentos confiáveis para seus pacientes." },
    { provider: "cielo", name: "Cielo", color: "bg-sky-500", desc: "Reconhecimento e alcance em maquininhas e e-commerce." }
  ];

  return (
    <div className="space-y-8 animate-in fade-in pb-10">
      
      {/* SEÇÃO ASSINATURA SYNKA */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            🏷️ Sua Assinatura Synka
          </h3>
          <p className="text-sm text-gray-400">Gerencie seu plano atual e acesse novas funcionalidades.</p>
        </div>

        {loading ? (
           <div className="h-40 bg-white/5 animate-pulse rounded-2xl" />
        ) : me && (
          <div className="bg-[#0a0a20]/60 border border-white/5 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between md:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-2xl font-black text-white capitalize">{PLANOS[me.plano]?.nome || me.plano}</h4>
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-lg border ${
                    me.planStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    me.planStatus === 'trial' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {me.planStatus}
                  </span>
                </div>
                {me.planStatus === 'trial' && (
                  <p className="text-sm text-gray-300">Você tem <strong className="text-amber-400">{me.diasRestantesTrial} dias restantes</strong> no seu período de testes.</p>
                )}
                {me.planStatus === 'expired' && (
                  <p className="text-sm text-red-400 font-bold">Seu período de trial expirou. Renove para continuar usando.</p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {me.planStatus === 'active' ? (
                  <button onClick={() => window.open(process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL, '_blank')} className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/5 transition-colors">
                    Acessar Portal do Assinante
                  </button>
                ) : (
                  <button onClick={() => window.scrollTo({ top: 500, behavior: 'smooth'})} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20">
                    Fazer Upgrade Agora
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PLANOS UPSell */}
        {(!loading && me?.planStatus !== 'active') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {['starter', 'pro', 'enterprise'].map((pId) => {
              const plano = PLANOS[pId] as PlanoInfo;
              return (
                <div key={pId} className="relative bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-6 hover:bg-white/5 transition-colors flex flex-col">
                  {pId === 'pro' && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl">MAIS ESCOLHIDO</div>}
                  <h5 className="text-lg font-bold text-white mb-1">{plano.nome}</h5>
                  <p className="text-xs text-gray-400 mb-4 h-8">{plano.descricao}</p>
                  <div className="mb-6">
                    <span className="text-3xl font-black text-white">R$ {plano.precoBRL.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 font-medium">/mês</span>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plano.features.map((f, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span> <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button 
                    disabled={isHandlingCheckout === pId} 
                    onClick={() => handleCheckout(pId)} 
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${pId === 'pro' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
                  >
                    {isHandlingCheckout === pId ? 'Gerando checkout...' : 'Assinar ' + plano.nome}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full h-px bg-white/5 my-8" />

      {/* SEÇÃO GATEWAYS DE PAGAMENTO */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            💳 Gateways de Pagamento
          </h3>
          <p className="text-sm text-gray-400">Conecte a conta do seu banco para receber online dos seus pacientes (PIX e Cartões).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Gateways.map((g) => {
            const config = integrations.find(i => i.provider === g.provider && i.isActive);
            const isConnected = !!config?.hasCredentials;

            return (
              <div key={g.provider} className="bg-[#0a0a20]/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center font-black text-white shadow-lg" style={{ background: g.provider === 'mercadopago' ? '#009EE3' : g.provider === 'stripe' ? '#635BFF' : g.provider === 'pagseguro' ? '#1ABB5D' : '#00AEEF' }}>
                    {g.name.charAt(0)}
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    {g.name}
                    {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Conectado" />}
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed mb-5">{g.desc}</p>
                </div>
                <button 
                  onClick={() => setEditingProvider(g.provider)}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-colors ${isConnected ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'}`}
                >
                  {isConnected ? '⚙️ Configurar' : '+ Conectar'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <ConfigModal 
        provider={editingProvider} 
        onClose={() => setEditingProvider(null)} 
        onDone={loadData} 
        isConnected={!!integrations.find(i => i.provider === editingProvider && i.isActive)?.hasCredentials}
      />
    </div>
  );
}

// Modal Rápido de Configuração (AES Secure)
function ConfigModal({ provider, onClose, onDone, isConnected }: { provider: string | null; onClose: () => void; onDone: () => void; isConnected: boolean }) {
  const [keys, setKeys] = useState("");
  const [keys2, setKeys2] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (provider) { setKeys(""); setKeys2(""); }
  }, [provider]);

  if (!provider) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      let credentials: any = {};
      if (provider === 'mercadopago') credentials = { accessToken: keys };
      if (provider === 'stripe') credentials = { secretKey: keys };
      if (provider === 'pagseguro') credentials = { token: keys };
      if (provider === 'cielo') credentials = { merchantId: keys, merchantKey: keys2 };

      await fetchWithAuth("/api/integrations", {
        method: "POST",
        body: JSON.stringify({ provider, credentials })
      });
      onDone();
      onClose();
    } catch {
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza? Suas cobranças usarão o método manual.')) return;
    setSaving(true);
    try {
      await fetchWithAuth(`/api/integrations/${provider}/desconectar`, { method: "POST" });
      onDone();
      onClose();
    } catch {
      alert("Erro");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-white/5">
          <h3 className="font-bold text-white capitalize">Configurar {provider}</h3>
          <p className="text-[11px] text-gray-400 mt-1">Insira suas chaves de API secretas com segurança.</p>
        </div>
        
        <div className="p-5 space-y-4 bg-black/20">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">
              {provider === 'cielo' ? 'Merchant ID' : provider === 'mercadopago' ? 'Access Token' : 'Chave Secreta/Token'}
            </label>
            <input 
              type="password" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" 
              placeholder="Ex: APP_USR-..." 
              value={keys} 
              onChange={e => setKeys(e.target.value)} 
            />
          </div>
          {provider === 'cielo' && (
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Merchant Key</label>
              <input type="password" placeholder="Chave da Cielo..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" value={keys2} onChange={e => setKeys2(e.target.value)} />
            </div>
          )}
        </div>

        <div className="p-5 flex gap-2">
          {isConnected && (
            <button onClick={handleDisconnect} disabled={saving} className="px-3 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-colors">
              Desconectar
            </button>
          )}
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 ml-auto text-sm border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 transition-colors">Cancelar</button>
          <button disabled={saving || !keys} onClick={handleSave} className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? "Salvando…" : "Salvar Seguro"}
          </button>
        </div>
      </div>
    </div>
  );
}
