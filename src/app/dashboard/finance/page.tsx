"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';

const TENANT_ID = 'clinica_id_default';

interface Transaction {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  categoria?: string;
  data: string;
}

const CATEGORIES = ['Aluguel', 'Salários', 'Limpeza', 'Marketing', 'Materiais', 'Impostos', 'Outros'];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');
  const [categoria, setCategoria] = useState(CATEGORIES[0]);
  const [saving, setSaving] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/transactions?tenantId=${TENANT_ID}`);
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch {
      setTransactions([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
       await fetch('/api/reports/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: TENANT_ID, descricao, valor, tipo, categoria })
       });
       fetchTransactions();
       setShowModal(false);
       setDescricao(''); setValor('');
    } catch { alert('Erro ao salvar transação'); }
    finally { setSaving(false); }
  };

  const totals = useMemo(() => {
    const entries = transactions.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0);
    const exits = transactions.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0);
    return { entries, exits, balance: entries - exits };
  }, [transactions]);

  if (loading && transactions.length === 0) return <div className="p-20 text-center font-black uppercase tracking-widest opacity-20">Carregando Fluxo...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-40">
      
      {/* Header */}
      <div className="flex justify-between items-end">
         <div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">🏦 Gestão <span className="text-[var(--accent)]">Financeira</span></h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-2 opacity-60">Controle real de caixa e fluxo operacional</p>
         </div>
         <button onClick={() => setShowModal(true)} className="px-8 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 active:scale-95 transition-all">➕ Novo Lançamento</button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 flex flex-col justify-between h-56 border-l-emerald-500/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-5xl opacity-5 grayscale group-hover:grayscale-0 transition-all">📈</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Total Receitas</p>
            <p className="text-4xl font-black text-[var(--foreground)] tracking-tighter italic">R$ {totals.entries.toLocaleString('pt-BR')}</p>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Entradas acumuladas este mês</p>
         </div>
         <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 flex flex-col justify-between h-56 border-l-red-500/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-5xl opacity-5 grayscale group-hover:grayscale-0 transition-all">📉</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Total Despesas</p>
            <p className="text-4xl font-black text-[var(--foreground)] tracking-tighter italic">R$ {totals.exits.toLocaleString('pt-BR')}</p>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Saídas e custos operacionais</p>
         </div>
         <div className={`bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 flex flex-col justify-between h-56 relative overflow-hidden group shadow-2xl ${totals.balance >= 0 ? 'border-l-[var(--accent)]' : 'border-l-red-600'}`}>
            <div className="absolute top-0 right-0 p-8 text-5xl opacity-10 grayscale group-hover:grayscale-0 transition-all">💰</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Saldo Operacional</p>
            <p className={`text-4xl font-black tracking-tighter italic ${totals.balance >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {totals.balance.toLocaleString('pt-BR')}</p>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Resultado líquido da clínica</p>
         </div>
      </div>

      {/* Transaction List */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] overflow-hidden shadow-sm">
         <div className="p-8 border-b border-[var(--border)] bg-white/[0.01]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]">Extrato de Lançamentos</h3>
         </div>
         <div className="divide-y divide-[var(--border)]">
            {transactions.map(t => (
               <div key={t.id} className="p-6 md:px-10 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-6">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${t.tipo === 'entrada' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {t.tipo === 'entrada' ? '↑' : '↓'}
                     </div>
                     <div>
                        <p className="text-sm font-black text-[var(--foreground)] uppercase tracking-tight">{t.descricao}</p>
                        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
                           {t.categoria} • {new Date(t.data).toLocaleDateString('pt-BR')}
                        </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className={`text-lg font-black tracking-tighter ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.tipo === 'entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR')}
                     </p>
                     <button className="text-[8px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all mt-1">Excluir</button>
                  </div>
               </div>
            ))}
            {transactions.length === 0 && <p className="p-20 text-center text-[10px] font-black uppercase opacity-20">Nenhuma transação encontrada</p>}
         </div>
      </div>

      {/* Modal */}
      {showModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4" onClick={() => setShowModal(false)}>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 w-full max-w-lg shadow-2xl scale-in-center" onClick={e => e.stopPropagation()}>
               <div className="mb-10">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">📝 Novo Lançamento</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Insira os detalhes da movimentação</p>
               </div>
               <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">O que é isso?</label>
                     <input required value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento Aluguel" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[var(--accent)] outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Valor (R$)</label>
                        <input type="number" step="0.01" required value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[var(--accent)] outline-none" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tipo</label>
                        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 h-[54px]">
                           <button type="button" onClick={() => setTipo('entrada')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${tipo === 'entrada' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500'}`}>Entrada</button>
                           <button type="button" onClick={() => setTipo('saida')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${tipo === 'saida' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500'}`}>Saída</button>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Categoria</label>
                     <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[var(--accent)] outline-none appearance-none">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="Atendimento">Atendimento (Receita)</option>
                     </select>
                  </div>
                  <div className="flex gap-4 pt-6">
                     <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10 transition-all">Cancelar</button>
                     <button type="submit" className={`flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase shadow-xl transition-all active:scale-95 ${saving ? 'opacity-50' : ''}`}>
                        {saving ? 'Gravando...' : 'Confirmar Lançamento'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
