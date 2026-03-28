"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

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

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');
  const [categoria, setCategoria] = useState(CATEGORIES[0]);
  const [saving, setSaving] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/reports/transactions');
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch { setTransactions([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
       await fetchWithAuth('/api/reports/transactions', {
          method: 'POST',
          body: JSON.stringify({ descricao, valor: Number(valor), tipo, categoria })
       });
       fetchTransactions(); setShowModal(false); setDescricao(''); setValor('');
    } catch { } finally { setSaving(false); }
  };

  const totals = useMemo(() => {
    const entries = transactions.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0);
    const exits = transactions.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0);
    return { entries, exits, balance: entries - exits };
  }, [transactions]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-premium">
      
      {/* Header Premium V2.2 */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20 italic font-black">B</div>
           <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Gestão de <span className="text-primary">Caixa</span></h2>
              <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.25em] mt-1 opacity-60">Fluxo Financeiro Corporativo</p>
           </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center justify-center gap-3">
           <span className="text-lg">➕</span> Registrar Movimento
        </button>
      </div>

      {/* KPI Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
         <div className="premium-card p-10 flex flex-col justify-between h-72 border-r-[12px] border-r-status-success/30 shadow-md">
            <div>
               <p className="text-[11px] font-black uppercase tracking-widest text-status-success mb-2">Entradas Brutas</p>
               <p className="text-5xl font-black text-text-main tracking-tighter italic">R$ {totals.entries.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <p className="text-[10px] font-black uppercase text-text-placeholder tracking-[0.2em] leading-relaxed opacity-40">Receita total captada por agendamentos e vendas.</p>
         </div>

         <div className="premium-card p-10 flex flex-col justify-between h-72 border-r-[12px] border-r-status-error/30 shadow-md">
            <div>
               <p className="text-[11px] font-black uppercase tracking-widest text-status-error mb-2">Saídas Operacionais</p>
               <p className="text-5xl font-black text-text-main tracking-tighter italic">R$ {totals.exits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <p className="text-[10px] font-black uppercase text-text-placeholder tracking-[0.2em] leading-relaxed opacity-40">Custos fixos, insumos e despesas de pessoal.</p>
         </div>

         <div className={`premium-card p-10 flex flex-col justify-between h-72 shadow-2xl relative overflow-hidden group ${totals.balance >= 0 ? 'bg-text-main text-white' : 'bg-status-error text-white'}`}>
            <div className="relative z-10">
               <p className="text-[11px] font-black uppercase tracking-widest mb-2 opacity-50">EBITDA / Lucro Real</p>
               <p className="text-5xl font-black tracking-tighter italic">R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-6 leading-relaxed opacity-30 italic">Saldo líquido disponível em conta hoje.</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
         </div>
      </div>

      {/* Extrato Consolidado */}
      <div className="bg-white border border-card-border rounded-[3.5rem] shadow-sm overflow-hidden animate-premium">
         <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/10">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-main italic">Extrato de Movimentação</h3>
            <span className="text-[10px] font-black bg-white border border-card-border px-5 py-2.5 rounded-full text-text-placeholder uppercase tracking-widest shadow-sm">Março de 2025</span>
         </div>
         <div className="divide-y divide-slate-50 overflow-x-auto no-scrollbar">
            {transactions.map(t => (
               <div key={t.id} className="p-10 md:px-14 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                  <div className="flex items-center gap-10">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${t.tipo === 'entrada' ? 'bg-status-success-bg text-status-success border border-status-success/10' : 'bg-status-error-bg text-status-error border border-status-error/10'}`}>
                        {t.tipo === 'entrada' ? '↑' : '↓'}
                     </div>
                     <div>
                        <p className="text-lg font-black text-text-main uppercase tracking-tighter italic group-hover:text-primary transition-colors">{t.descricao}</p>
                        <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest mt-1.5 flex items-center gap-3">
                           <span className="text-primary bg-primary-soft px-3 py-1 rounded-lg">{t.categoria}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-200" />
                           <span>{new Date(t.data).toLocaleDateString('pt-BR')}</span>
                        </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className={`text-2xl font-black tracking-tighter italic ${t.tipo === 'entrada' ? 'text-status-success' : 'text-status-error'}`}>
                        {t.tipo === 'entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                     </p>
                     <button className="text-[9px] font-black uppercase tracking-widest text-status-error hover:underline decoration-2 underline-offset-4 opacity-0 group-hover:opacity-100 transition-all mt-2">Remover Registro</button>
                  </div>
               </div>
            ))}
            {transactions.length === 0 && (
               <div className="p-40 text-center">
                  <p className="text-5xl mb-6 grayscale opacity-20">📂</p>
                  <p className="font-black text-text-placeholder text-[11px] uppercase tracking-[0.5em]">Nenhum lançamento registrado</p>
               </div>
            )}
         </div>
      </div>

      {/* Modal Lançamento V2.2 */}
      {showModal && (
         <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in" onClick={() => setShowModal(false)}>
            <div className="bg-white border border-card-border rounded-[3.5rem] p-12 w-full max-w-lg shadow-2xl scale-in" onClick={e => e.stopPropagation()}>
               <div className="mb-12 border-b border-slate-50 pb-8">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">📌 Lançamento Manual</h3>
                  <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest mt-1 opacity-60">Registre receitas e despesas da empresa</p>
               </div>
               <form onSubmit={handleSave} className="space-y-8">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder ml-2">Título do Registro</label>
                     <input required value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento Fornecedor" className="input-premium w-full py-4 text-base" />
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder ml-2">Valor (BRL)</label>
                        <input type="number" step="0.01" required value={valor} onChange={e => setValor(e.target.value)} className="input-premium w-full text-base font-black italic" placeholder="0,00" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder ml-2">Natureza Fluxo</label>
                        <div className="flex p-1.5 bg-slate-50 rounded-2xl border border-card-border h-[60px]">
                           <button type="button" onClick={() => setTipo('entrada')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${tipo === 'entrada' ? 'bg-status-success text-white shadow-xl' : 'text-text-placeholder hover:text-text-main'}`}>Receita</button>
                           <button type="button" onClick={() => setTipo('saida')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${tipo === 'saida' ? 'bg-status-error text-white shadow-xl' : 'text-text-placeholder hover:text-text-main'}`}>Gasto</button>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder ml-2">Categoria Corporativa</label>
                     <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input-premium w-full appearance-none cursor-pointer">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                  </div>
                  <div className="flex gap-4 pt-10">
                     <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-black">Descartar</button>
                     <button type="submit" disabled={saving} className="btn-primary flex-2 py-5 text-[10px]">
                        {saving ? 'Gravando Dados...' : 'Confirmar e Lançar'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
