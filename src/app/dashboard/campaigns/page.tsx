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
      alert('🚀 Combo ativado! O Robô já pode oferecê-lo via WhatsApp.');
      window.location.reload();
    }
  };

  const handleAddService = async () => {
    if (!newServiceName) return;
    const res = await fetch('/api/services', {
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
    <div className="max-w-7xl mx-auto space-y-10 pb-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--foreground)]">
            Central de Marketing 2.0
          </h2>
          <p className="text-[var(--text-muted)] mt-1 font-medium italic">Aumente seu faturamento com avisos inteligentes e combos de {labels.servico}s.</p>
        </div>
        <div className="flex gap-2 p-1.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-[1.5rem]">
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'campaigns' ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
          >
            📢 Campanhas
          </button>
          <button 
            onClick={() => setActiveTab('combos')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'combos' ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
          >
            🚀 Combo Builder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-[2.5rem] hover:border-[var(--accent)]/40 transition-all group shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner">⏰</div>
                  <h3 className="font-black text-lg text-[var(--foreground)] tracking-tight">Lembrete de {labels.servico}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-2 font-medium leading-relaxed">Envio automático 24h antes para confirmação. Reduz faltas em até 40%.</p>
                  <button className="mt-6 text-[10px] font-black text-[var(--accent)] uppercase tracking-widest hover:underline">Configurar Automação →</button>
                </div>
                <div className="bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-[2.5rem] hover:border-emerald-500/40 transition-all group shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner">♻️</div>
                  <h3 className="font-black text-lg text-[var(--foreground)] tracking-tight">Reativação de {labels.cliente}s</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-2 font-medium leading-relaxed">Identifica quem não volta há mais de 30 dias e envia um convite especial.</p>
                  <button className="mt-6 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline">Ver Público Alvo →</button>
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--foreground)]/[0.01]">
                  <h3 className="font-black text-[var(--foreground)] uppercase tracking-tighter">Histórico de Campanhas</h3>
                  <button className="px-4 py-2 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sincronizar</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--foreground)]/[0.02] text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Nome</th>
                        <th className="px-8 py-5">Público</th>
                        <th className="px-8 py-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {campaigns.length === 0 ? (
                        <tr><td colSpan={3} className="px-8 py-16 text-center text-[var(--text-muted)] font-black uppercase tracking-widest text-xs opacity-50">Nenhuma campanha enviada recentemente.</td></tr>
                      ) : (
                        campaigns.map(c => (
                          <tr key={c.id} className="hover:bg-[var(--foreground)]/5 transition-colors">
                            <td className="px-8 py-5 font-black text-[var(--foreground)]">{c.titulo}</td>
                            <td className="px-8 py-5 text-[var(--text-muted)] font-medium text-xs">{c.segmentoFiltrosJson || 'Todos'}</td>
                            <td className="px-8 py-5"><span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-inner">{c.totalEnviado || 0} envios</span></td>
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
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-10 space-y-10 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent)]/5 blur-[120px] pointer-events-none" />
              
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${step >= 1 ? 'bg-[var(--accent)] text-white shadow-lg' : 'bg-[var(--foreground)]/5 text-[var(--text-muted)]'}`}>1</div>
                <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${step >= 2 ? 'bg-[var(--accent)] text-white shadow-lg' : 'bg-[var(--foreground)]/5 text-[var(--text-muted)]'}`}>2</div>
                <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${step >= 3 ? 'bg-emerald-500 text-white shadow-lg' : 'bg-[var(--foreground)]/5 text-[var(--text-muted)]'}`}>3</div>
              </div>

              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Serviço Principal</h3>
                      <p className="text-[var(--text-muted)] text-sm font-medium">O robô oferecerá o combo quando este item for agendado.</p>
                    </div>
                    <button 
                      onClick={() => setShowNewServiceModal(true)}
                      className="px-6 py-3 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      + Cadastrar Item
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {services.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => { setSelectedMain(s.id); setStep(2); }}
                        className={`p-6 border rounded-[1.5rem] text-left transition-all ${selectedMain === s.id ? 'border-[var(--accent)] bg-[var(--accent)]/[0.03] ring-4 ring-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--foreground)]/[0.02]'}`}
                      >
                        <p className="font-black text-[var(--foreground)] text-sm">{s.nome}</p>
                        <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest mt-1">R$ {s.preco.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-[var(--foreground)] tracking-tight">O que oferecer de Upsell?</h3>
                      <p className="text-[var(--text-muted)] text-sm font-medium italic">Selecione o complemento perfeito para o combo.</p>
                    </div>
                    <button onClick={() => setStep(1)} className="text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--foreground)] uppercase tracking-widest">← Voltar</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {services.filter(s => s.id !== selectedMain).map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => { setSelectedUpsell(s.id); setStep(3); }}
                        className={`p-6 border rounded-[1.5rem] text-left transition-all ${selectedUpsell === s.id ? 'border-[var(--accent)] bg-[var(--accent)]/[0.03]' : 'border-[var(--border)] hover:border-[var(--accent)]/40'}`}
                      >
                        <p className="font-black text-[var(--foreground)] text-sm">{s.nome}</p>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">R$ {s.preco.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight">Prévia da Oferta Especial</h3>
                    <button onClick={() => setStep(2)} className="text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--foreground)] uppercase tracking-widest">← Voltar</button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-10 items-center justify-center">
                    {/* The Visual Preview Card */}
                    <div className="w-full max-w-sm bg-[var(--sidebar-bg)] border border-[var(--accent)]/30 rounded-[3rem] p-10 shadow-2xl relative group hover:-rotate-1 transition-all">
                      <div className="absolute -top-4 -right-4 bg-yellow-400 text-black font-black px-5 py-2.5 rounded-2xl text-[10px] rotate-12 shadow-xl uppercase tracking-widest">
                        -{discount}% OFF
                      </div>
                      <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-24 h-24 bg-gradient-to-tr from-[var(--accent)] to-[var(--accent)]/60 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-[var(--accent)]/40">✨</div>
                        <h4 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--foreground)]">Super Combo</h4>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-[var(--text-muted)] line-through opacity-50">De R$ {totalPrice.toFixed(2)}</p>
                          <p className="text-5xl font-black text-[var(--foreground)] tracking-tighter">R$ {finalPrice.toFixed(2)}</p>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Economize R$ {savings.toFixed(2)}</p>
                        </div>
                        <div className="w-full pt-6 space-y-3">
                           <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--foreground)]/5 p-3 rounded-2xl border border-[var(--border)]">
                              <span className="text-[var(--accent)]">✔</span> {mainService?.nome}
                           </div>
                           <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--foreground)]/5 p-3 rounded-2xl border border-[var(--border)]">
                              <span className="text-[var(--accent)]">✔</span> {upsellService?.nome}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Margem de Desconto 2º item</label>
                        <input 
                          type="range" min="5" max="50" step="5" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                          className="w-full accent-[var(--accent)]"
                        />
                        <div className="flex justify-between text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-50">
                          <span>Econômico (5%)</span>
                          <span>Agressivo (50%)</span>
                        </div>
                      </div>

                      <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-[1.5rem] p-6">
                        <p className="text-[11px] text-[var(--accent)] font-medium leading-relaxed italic">
                          "O combo <strong>{mainService?.nome} + {upsellService?.nome}</strong> tem um ticket médio alto. {discount}% é perfeito para converter no WhatsApp!"
                        </p>
                      </div>

                      <button 
                        onClick={handleSaveCombo}
                        className="w-full py-5 bg-[var(--accent)] hover:opacity-90 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-[var(--accent)]/20 active:scale-95"
                      >
                        🚀 Ativar Combo no Robô
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
          <div className="bg-gradient-to-br from-[var(--sidebar-bg)] to-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--accent)]/10 rounded-full blur-[60px]" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-3xl shadow-xl shadow-[var(--accent)]/30 animate-in zoom-in duration-500">🤖</div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest text-[var(--foreground)]">Consultor Synka IA</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                  <p className="text-[9px] text-emerald-500 font-black tracking-widest uppercase">Analisando Dados</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[var(--foreground)]/5 p-5 rounded-[1.5rem] text-[11px] text-[var(--text-muted)] border border-[var(--border)] italic leading-relaxed font-medium">
                "Analisando o comportamento dos seus <strong>{labels.cliente}s</strong>. Sugiro um combo de <strong>{services[0]?.nome || 'Novos Serviços'}</strong> com desconto agressivo para esta semana!"
              </div>
              
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest px-1 opacity-50">Sugestões Rápidas:</p>
                {services.length > 1 ? (
                  <>
                    <button onClick={() => { setSelectedMain(services[0].id); setSelectedUpsell(services[1].id); setStep(3); setActiveTab('combos'); }} className="w-full p-4 bg-[var(--foreground)]/5 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/30 text-left rounded-2xl text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all border border-[var(--border)] font-black uppercase tracking-widest">
                      ⚡ Combo Expresso
                    </button>
                    <button className="w-full p-4 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-left rounded-2xl text-[10px] text-[var(--text-muted)] transition-all border border-[var(--border)] font-black uppercase tracking-widest">
                      📩 Reativar {labels.cliente.toLowerCase()}s
                    </button>
                  </>
                ) : (
                  <button onClick={() => setActiveTab('combos')} className="w-full p-4 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl text-[10px] font-black uppercase tracking-widest border border-[var(--accent)]/20">
                    ✨ Criar primeiro Combo
                  </button>
                )}
                <button 
                  onClick={() => setShowIAPanel(true)}
                  className="w-full p-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-[var(--accent)]/20 hover:scale-[1.02] active:scale-95 text-center mt-2"
                >
                  💬 Consultar Estratégia
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-sm">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-6 pl-1 opacity-70">Métricas do Mês</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--foreground)]/5 rounded-2xl text-center shadow-inner">
                <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Upsells</p>
                <p className="text-2xl font-black text-[var(--accent)] mt-1 tracking-tighter">12</p>
              </div>
              <div className="p-4 bg-[var(--foreground)]/5 rounded-2xl text-center shadow-inner">
                <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Retorno</p>
                <p className="text-2xl font-black text-emerald-500 mt-1 tracking-tighter">R$ 450</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Service Modal */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNewServiceModal(false)} />
          <div className="relative w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-8 text-[var(--foreground)] tracking-tight italic uppercase">Novo {labels.servico}</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome do Item</label>
                <input 
                  value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                  className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-[var(--accent)] transition-all font-medium" placeholder="Ex: Hidratação profunda" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Preço Base (R$)</label>
                <input 
                  type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)}
                  className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-[var(--accent)] transition-all font-medium" 
                />
              </div>
              <button 
                onClick={handleAddService}
                className="w-full py-5 bg-[var(--accent)] hover:opacity-90 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mt-4 shadow-xl shadow-[var(--accent)]/20"
              >
                CADASTRAR E VOLTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showIAPanel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowIAPanel(false)} />
          <div className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 border-b border-[var(--border)] bg-[var(--accent)]/[0.03] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-2xl shadow-lg">🤖</div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-tight text-[var(--foreground)]">Consultor Synka IA</h4>
                    <p className="text-[9px] text-emerald-500 font-black tracking-widest uppercase">Estratégia Ativa</p>
                  </div>
                </div>
                <button onClick={() => setShowIAPanel(false)} className="text-[var(--text-muted)] p-3 hover:bg-[var(--foreground)]/5 rounded-2xl transition-all font-black">✕</button>
             </div>
             <div className="p-10 h-96 flex flex-col justify-end space-y-6">
                <div className="bg-[var(--foreground)]/5 p-6 rounded-[2rem] rounded-bl-none max-w-[90%] text-xs text-[var(--text-muted)] border border-[var(--border)] font-medium leading-relaxed">
                  "Detectamos que 42 clientes de {labels.servico.toLowerCase()}s estão inativos há 30 dias. Recomendo uma campanha de reativação com cupom de R$ 20. Deseja que eu gere o texto agora?"
                </div>
                <div className="flex gap-3">
                  <input className="flex-1 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-[1.5rem] px-6 text-sm focus:outline-none focus:border-[var(--accent)] font-medium shadow-inner" placeholder="Digite sua dúvida..." />
                  <button className="w-14 h-14 bg-[var(--accent)] rounded-[1.5rem] text-white shadow-xl shadow-[var(--accent)]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-xl">➤</button>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
