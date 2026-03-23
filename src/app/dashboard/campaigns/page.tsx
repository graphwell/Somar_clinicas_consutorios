"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';

const TENANT_ID = 'clinica_id_default';

type Service = { id: string; nome: string; preco: number };

export default function MarketingHubPage() {
  const { labels } = useNicho();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'combos'>('campaigns');
  const [services, setServices] = useState<Service[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for the Combo Builder
  const [step, setStep] = useState(1);
  const [selectedMain, setSelectedMain] = useState<string>('');
  const [selectedUpsell, setSelectedUpsell] = useState<string>('');
  const [discount, setDiscount] = useState(15);
  const [showIAPanel, setShowIAPanel] = useState(false);

  // States for New Service Modal
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('0');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/services?tenantId=${TENANT_ID}`).then(res => res.json()),
      fetch(`/api/campaigns?tenantId=${TENANT_ID}`).then(res => res.json()),
      fetch(`/api/settings/upsell?tenantId=${TENANT_ID}`).then(res => res.json())
    ]).then(([svcs, camps, cmbs]) => {
      if (Array.isArray(svcs)) setServices(svcs);
      if (Array.isArray(camps)) setCampaigns(camps);
      if (Array.isArray(cmbs)) setCombos(cmbs);
    }).finally(() => setLoading(false));
  }, []);

  const mainService = services.find(s => s.id === selectedMain);
  const upsellService = services.find(s => s.id === selectedUpsell);
  const totalPrice = (mainService?.preco || 0) + (upsellService?.preco || 0);
  const savings = (upsellService?.preco || 0) * (discount / 100);
  const finalPrice = totalPrice - savings;

  const handleSaveCombo = async () => {
    if (!selectedMain || !selectedUpsell) return;
    const res = await fetch('/api/settings/upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: TENANT_ID,
        servicoGatilhoId: selectedMain,
        servicoOferecidoId: selectedUpsell,
        descricaoOferta: `Aproveite! Adicione ${upsellService?.nome} por apenas R$ ${(upsellService!.preco - savings).toFixed(2)}`,
        desconto: discount,
        ativo: true
      })
    });
    if (res.ok) {
      alert('Combo criado com sucesso! O Robô passará a oferecê-lo via WhatsApp.');
      window.location.reload();
    }
  };

  const handleAddService = async () => {
    if (!newServiceName) return;
    const res = await fetch('/api/services', { // Usando a API que já criei, mas preciso adicionar o POST nela
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, nome: newServiceName, preco: Number(newServicePrice) })
    });
    if (res.ok) {
        const created = await res.json();
        setServices([...services, created]);
        setShowNewServiceModal(false);
        setNewServiceName('');
        setNewServicePrice('0');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Central de Marketing 2.0
          </h2>
          <p className="text-gray-400 mt-2">Aumente seu faturamento com avisos inteligentes e combos de {labels.servico}s.</p>
        </div>
        <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'campaigns' ? 'bg-[#4a4ae2] text-white shadow-lg shadow-[#4a4ae2]/20' : 'text-gray-400 hover:text-white'}`}
          >
            📢 Avisos e Campanhas
          </button>
          <button 
            onClick={() => setActiveTab('combos')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'combos' ? 'bg-[#4a4ae2] text-white shadow-lg shadow-[#4a4ae2]/20' : 'text-gray-400 hover:text-white'}`}
          >
            🚀 Editor de Combos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0a0a20]/60 border border-white/5 p-6 rounded-2xl hover:border-[#4a4ae2]/40 transition-colors group">
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">⏰</div>
                  <h3 className="font-bold text-lg">Lembrete de {labels.servico}</h3>
                  <p className="text-sm text-gray-400 mt-2">Envio automático 24h antes para confirmação. Reduz faltas em 38%.</p>
                  <button className="mt-4 text-xs font-bold text-[#4a4ae2] uppercase tracking-wider hover:underline">Configurar Regra →</button>
                </div>
                <div className="bg-[#0a0a20]/60 border border-white/5 p-6 rounded-2xl hover:border-emerald-500/40 transition-colors group">
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">♻️</div>
                  <h3 className="font-bold text-lg">Reativação de {labels.cliente}s</h3>
                  <p className="text-sm text-gray-400 mt-2">Identifica quem não volta há 30, 60 ou 90 dias e envia um convite.</p>
                  <button className="mt-4 text-xs font-bold text-emerald-400 uppercase tracking-wider hover:underline">Ver Segmentos →</button>
                </div>
              </div>

              <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-bold">Histórico de Campanhas</h3>
                  <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs">Atualizar</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/2 text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Público</th>
                        <th className="px-6 py-4">Resultados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {campaigns.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">Nenhuma campanha enviada recentemente.</td></tr>
                      ) : (
                        campaigns.map(c => (
                          <tr key={c.id} className="hover:bg-white/2">
                            <td className="px-6 py-4 font-medium">{c.titulo}</td>
                            <td className="px-6 py-4 text-gray-400 text-xs">{c.segmentoFiltrosJson || 'Todos'}</td>
                            <td className="px-6 py-4"><span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-mono">{c.totalEnviado || 0} envios</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'combos' && (
            <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-8 space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#4a4ae2]/10 blur-[100px] pointer-events-none" />
              
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? 'bg-[#4a4ae2] text-white' : 'bg-white/10 text-gray-500'}`}>1</div>
                <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-[#4a4ae2]' : 'bg-white/5'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? 'bg-[#4a4ae2] text-white' : 'bg-white/10 text-gray-500'}`}>2</div>
                <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-[#4a4ae2]' : 'bg-white/5'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 3 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-500'}`}>3</div>
              </div>

              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold">Qual o produto/serviço principal?</h3>
                      <p className="text-gray-400 text-sm">O robô vai oferecer o combo sempre que este item for agendado.</p>
                    </div>
                    <button 
                      onClick={() => setShowNewServiceModal(true)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-colors"
                    >
                      + Cadastrar Item
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {services.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => { setSelectedMain(s.id); setStep(2); }}
                        className={`p-4 border rounded-2xl text-left transition-all ${selectedMain === s.id ? 'border-[#4a4ae2] bg-[#4a4ae2]/10 ring-2 ring-[#4a4ae2]/20' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                      >
                        <p className="font-bold text-sm">{s.nome}</p>
                        <p className="text-xs text-[#a0a0ff]">R$ {s.preco.toFixed(2)}</p>
                      </button>
                    ))}
                    {services.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-gray-500 italic bg-white/2 rounded-2xl border border-dashed border-white/10">
                        Nenhum {labels.servico.toLowerCase()} cadastrado.<br/>
                        <button onClick={() => setShowNewServiceModal(true)} className="mt-2 text-[#4a4ae2] font-bold hover:underline">Cadastrar o primeiro agora</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">O que oferecer de Upsell?</h3>
                    <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-white">← Voltar</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {services.filter(s => s.id !== selectedMain).map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => { setSelectedUpsell(s.id); setStep(3); }}
                        className={`p-4 border rounded-2xl text-left transition-all ${selectedUpsell === s.id ? 'border-[#4a4ae2] bg-[#4a4ae2]/10' : 'border-white/10 hover:border-white/20'}`}
                      >
                        <p className="font-bold text-sm">{s.nome}</p>
                        <p className="text-xs text-emerald-400">R$ {s.preco.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Prévia da Oferta Especial</h3>
                    <button onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-white">← Voltar</button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                    {/* The Visual Preview Card */}
                    <div className="w-full max-w-sm bg-[#0a0a20] border border-[#4a4ae2]/40 rounded-[2.5rem] p-8 shadow-2xl shadow-[#4a4ae2]/10 relative group hover:-rotate-1 transition-transform">
                      <div className="absolute -top-4 -right-4 bg-yellow-400 text-black font-black px-4 py-2 rounded-2xl text-xs rotate-12 shadow-xl">
                        -{discount}% OFF
                      </div>
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-[#4a4ae2]/30">✨</div>
                        <h4 className="text-2xl font-black italic uppercase tracking-tighter">Super Combo</h4>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-300 line-through decoration-red-500/50">De R$ {totalPrice.toFixed(2)}</p>
                          <p className="text-4xl font-black text-white">R$ {finalPrice.toFixed(2)}</p>
                          <p className="text-xs font-bold text-emerald-400">Economize R$ {savings.toFixed(2)}</p>
                        </div>
                        <div className="w-full pt-4 space-y-2">
                           <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 p-2 rounded-xl">
                              <span>✔</span> {mainService?.nome}
                           </div>
                           <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 p-2 rounded-xl">
                              <span>✔</span> {upsellService?.nome}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400">Margem de Desconto no 2º item</label>
                        <input 
                          type="range" min="5" max="50" step="5" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                          className="w-full accent-[#4a4ae2]"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                          <span>Econômico (5%)</span>
                          <span>Agressivo (50%)</span>
                        </div>
                      </div>

                      <div className="bg-[#4a4ae2]/10 border border-[#4a4ae2]/20 rounded-2xl p-4">
                        <p className="text-xs text-[#a0a0ff] font-medium leading-relaxed">
                          Mensagem da IA: "Estou vendo que o combo <strong>{mainService?.nome} + {upsellService?.nome}</strong> tem um ticket médio alto. Aplicar {discount}% é uma ótima estratégia para fechar horários vagos!"
                        </p>
                      </div>

                      <button 
                        onClick={handleSaveCombo}
                        className="w-full py-4 bg-[#4a4ae2] hover:bg-[#3232c2] text-white rounded-2xl font-black text-lg transition-all shadow-[0_10px_30px_rgba(74,74,226,0.4)]"
                      >
                        ATIVAR COMBO NO BOT
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IA Sidekick Panel */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#1a1a40] to-[#0a0a20] border border-[#4a4ae2]/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#4a4ae2]/20 rounded-full blur-3xl" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#4a4ae2] flex items-center justify-center text-2xl shadow-lg ring-4 ring-white/5 animate-pulse">🤖</div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-wider">Expert de Marketing</h4>
                <p className="text-[10px] text-emerald-400 font-bold tracking-widest">ONLINE AGORA</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-2xl text-xs text-gray-300 border border-white/5 italic line-clamp-4">
                "Olá! Analisei seu nicho de <strong>{labels.cliente}s</strong>. Percebi que terças e quartas são dias mais parados. Que tal criarmos um combo agressivo (30% OFF) de <strong>{services[0]?.nome || 'Novos Serviços'}</strong> para esses dias?"
              </div>
              
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">Sugestões Rápidas:</p>
                <button className="w-full p-3 bg-white/5 hover:bg-white/10 text-left rounded-xl text-xs text-gray-400 transition-colors border border-white/5">
                  ✨ Criar combo "Pé + Mão"
                </button>
                <button className="w-full p-3 bg-white/5 hover:bg-white/10 text-left rounded-xl text-xs text-gray-400 transition-colors border border-white/5">
                  📩 Reativar 50 clientes do mês passado
                </button>
                <button 
                  onClick={() => setShowIAPanel(true)}
                  className="w-full p-3 bg-[#4a4ae2]/20 hover:bg-[#4a4ae2]/30 text-left rounded-xl text-xs text-[#a0a0ff] font-bold transition-all border border-[#4a4ae2]/30"
                >
                  💬 Abrir Chat com Consultor IA
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a20]/40 border border-white/5 rounded-3xl p-6">
            <h4 className="font-bold text-sm mb-4">Métricas do Mês</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-2xl text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Upsells</p>
                <p className="text-xl font-black text-[#4a4ae2]">12</p>
              </div>
              <div className="p-3 bg-white/5 rounded-2xl text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Retorno</p>
                <p className="text-xl font-black text-emerald-400">R$ 450</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* New Service Modal */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm shadow-xl" onClick={() => setShowNewServiceModal(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a20] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-6 italic uppercase tracking-tight">Novo {labels.servico}</h3>
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Nome do Item</label>
                <input 
                  value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="Ex: Hidratação profunda" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Preço Base (R$)</label>
                <input 
                  type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" 
                />
              </div>
              <button 
                onClick={handleAddService}
                className="w-full py-4 bg-[#4a4ae2] hover:bg-[#3232c2] text-white rounded-2xl font-black text-sm transition-all mt-4 shadow-xl shadow-[#4a4ae2]/20"
              >
                CADASTRAR E VOLTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal (Placeholder logic) */}
      {showIAPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowIAPanel(false)} />
          <div className="relative w-full max-w-lg bg-[#0a0a20] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-6 border-b border-white/5 bg-[#4a4ae2]/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#4a4ae2] flex items-center justify-center">🤖</div>
                  <h4 className="font-bold">Consultor Synka IA</h4>
                </div>
                <button onClick={() => setShowIAPanel(false)} className="text-gray-400 p-2 hover:bg-white/5 rounded-xl transition-colors">✕</button>
             </div>
             <div className="p-8 h-80 flex flex-col justify-end">
                <div className="bg-white/5 p-4 rounded-3xl rounded-bl-none max-w-[85%] text-sm mb-4 border border-white/5">
                  "Você tem 42 clientes inativos no último mês. Gostaria que eu redigisse uma campanha de reativação com um cupom de 10%?"
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm focus:outline-none focus:border-[#4a4ae2]" placeholder="Digite sua dúvida..." />
                  <button className="p-4 bg-[#4a4ae2] rounded-2xl text-white shadow-lg shadow-[#4a4ae2]/20 hover:scale-105 active:scale-95 transition-all">➤</button>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
