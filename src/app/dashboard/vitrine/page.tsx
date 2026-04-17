"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';
import { IconVitrine } from '@/components/icons/NavIcons';

/* ─── Tipos ─────────────────────────────────────────────────── */
interface Categoria { id: string; nome: string; _count?: { produtos: number } }
interface Produto {
  id: string; nome: string; descricao?: string; dicaDeUso?: string;
  preco: number; imageUrl?: string | null; estoque: number; status: string;
  tags: string[]; categoriaId?: string | null; categoria?: { id: string; nome: string } | null;
}
interface ComboItem { produto: { id: string; nome: string; preco: number; imageUrl?: string | null } }
interface Combo {
  id: string; nome: string; preco: number; desconto: number; status: string;
  itens: ComboItem[];
}
interface Servico { id: string; nome: string }
interface SugestaoServico {
  id: string; servicoId: string;
  produto: { id: string; nome: string; preco: number; imageUrl?: string | null };
  servico: { id: string; nome: string };
}

type Tab = 'produtos' | 'categorias' | 'combos' | 'sugestoes';

/* ─── Helpers ─────────────────────────────────────────────────── */
function formatPreco(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

function comprimirImagem(file: File, maxPx = 300, maxKb = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let quality = 0.88;
      const tryEncode = (): string => {
        const data = canvas.toDataURL('image/jpeg', quality);
        const kb = Math.round((data.length * 3) / 4 / 1024);
        if (kb > maxKb && quality > 0.3) { quality -= 0.1; return tryEncode(); }
        return data;
      };
      resolve(tryEncode());
    };
    img.onerror = reject;
    img.src = url;
  });
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function ProdutoImagem({ url, nome, size = 48 }: { url?: string | null; nome: string; size?: number }) {
  if (url) return <img src={url} alt={nome} style={{ width: size, height: size, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #E2E8F0' }}>
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/>
        <circle cx="8.5" cy="11.5" r="1.5"/><polyline points="21 15 16 10 5 21" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ─── Modal de produto manual ─────────────────────────────────────────── */
function ModalProduto({
  produto, categorias, onClose, onSave,
}: { produto: Partial<Produto> | null; categorias: Categoria[]; onClose: () => void; onSave: (p: Produto) => void }) {
  const [form, setForm] = useState<{
    nome: string; descricao: string; dicaDeUso: string; preco: string;
    estoque: string; status: string; tags: string; categoriaId: string; imageUrl: string;
  }>({
    nome: produto?.nome ?? '', descricao: produto?.descricao ?? '', dicaDeUso: produto?.dicaDeUso ?? '',
    preco: produto?.preco?.toString() ?? '0', estoque: produto?.estoque?.toString() ?? '0',
    status: produto?.status ?? 'active', tags: produto?.tags?.join(', ') ?? '',
    categoriaId: produto?.categoriaId ?? '', imageUrl: produto?.imageUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await comprimirImagem(file, 300, 150);
      setForm(f => ({ ...f, imageUrl: b64 }));
    } catch { setErr('Erro ao processar imagem'); }
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { setErr('Nome obrigatório'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        ...(produto?.id ? { id: produto.id } : {}),
        nome: form.nome.trim(), descricao: form.descricao.trim() || null,
        dicaDeUso: form.dicaDeUso.trim() || null,
        preco: parseFloat(form.preco) || 0, estoque: parseInt(form.estoque) || 0,
        status: form.status, categoriaId: form.categoriaId || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        imageUrl: form.imageUrl || null,
      };
      const res = await fetchWithAuth('/api/vitrine/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Erro ao salvar'); return; }
      onSave(data);
    } catch { setErr('Erro de conexão'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/40 backdrop-blur-sm shadow-2xl">
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-text-main">{produto?.id ? 'Editar Registro' : 'Novo Produto Manual'}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informações técnicas e estoque</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {/* Imagem */}
          <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div
              className="w-24 h-24 rounded-3xl overflow-hidden cursor-pointer border-2 border-dashed border-slate-200 hover:border-emerald-400 transition-colors flex items-center justify-center bg-white shadow-inner"
              onClick={() => fileRef.current?.click()}
            >
              {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" /> : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16"/>
                </svg>
              )}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">
                {form.imageUrl ? 'Alterar Fotografia' : 'Incluir Imagem'}
              </button>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">JPEG/PNG • Máx 150KB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagem} />
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Título do Produto *</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full h-12 px-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-sm font-bold outline-none focus:border-primary/20 shadow-inner" placeholder="Ex: Pomada Modeladora Premium" />
          </div>

          {/* Preço + Estoque */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Preço (R$)</label>
              <input type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} className="w-full h-12 px-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-sm font-black italic outline-none focus:border-primary/20 shadow-inner" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Estoque</label>
              <input type="number" min="0" value={form.estoque} onChange={e => setForm(f => ({ ...f, estoque: e.target.value }))} className="w-full h-12 px-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-sm font-black italic outline-none focus:border-primary/20 shadow-inner" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoria</label>
              <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))} className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-slate-50 text-xs font-black uppercase tracking-tight text-slate-800 outline-none focus:border-primary/20">
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-slate-50 text-xs font-black uppercase tracking-tight text-slate-800 outline-none focus:border-primary/20">
                <option value="active">Disponível</option>
                <option value="inactive">Indisponível</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Resumo de Venda</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50 text-sm font-medium outline-none focus:border-primary/20 resize-none shadow-inner" placeholder="Descrição visível na vitrine..." />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Dica Operacional</label>
            <textarea value={form.dicaDeUso} onChange={e => setForm(f => ({ ...f, dicaDeUso: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded-2xl border-2 border-slate-50 bg-slate-50 text-sm font-medium outline-none focus:border-primary/20 resize-none shadow-inner" placeholder="Como o usuário deve utilizar..." />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Tags <span className="normal-case text-slate-400 opacity-60">(separe por vírgula)</span></label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full h-12 px-4 rounded-2xl border-2 border-slate-100 text-sm font-medium outline-none focus:border-emerald-400" placeholder="ex: barba, forte, madeira" />
          </div>

          {err && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50 p-4 rounded-2xl">{err}</p>}
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-4 shrink-0 bg-white">
          <button onClick={onClose} className="flex-1 h-14 rounded-[1.5rem] bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-500">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-2 flex-1 h-14 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-60" style={{ background: '#40916C' }}>
            {saving ? 'Gravando…' : 'Finalizar Registro'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal de Catálogo Mestre ─────────────────────────────────────── */
function ModalCatalogo({
  onClose, onActivate,
}: { onClose: () => void; onActivate: (p: Produto) => void }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'search' | 'price'>('search');
  const [selected, setSelected] = useState<any | null>(null);
  
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('0');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async (v: string) => {
    setSearch(v);
    if (v.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/vitrine/catalog?q=${encodeURIComponent(v)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch { } finally { setLoading(false); }
  }, []);

  const handleActivate = async () => {
    if (!selected) return;
    setActivating(true); setError('');
    try {
      const res = await fetchWithAuth('/api/vitrine/catalog/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterProductId: selected.id, preco, estoque })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao ativar'); return; }
      onActivate(data.product);
    } catch { setError('Erro de conexão'); }
    finally { setActivating(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4 shadow-2xl">
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-text-main">
              {step === 'search' ? 'Catálogo Somar' : 'Definir Preço'}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {step === 'search' ? 'Pesquise por marca ou produto' : 'Finalizar ativação'}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {step === 'search' ? (
            <div className="space-y-6">
              <div className="relative">
                <input
                  autoFocus
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Ex: Wella, Shampoo, Bioage..."
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-base font-bold outline-none focus:border-primary/30 transition-all shadow-inner"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </div>

              <div className="space-y-3">
                {loading && <div className="text-center py-12 animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando base de inteligência...</div>}
                
                {!loading && results.length > 0 && results.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelected(r); setStep('price'); setPreco(''); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-primary-soft transition-all text-left group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white overflow-hidden shadow-inner">
                      {r.imageUrl ? <img src={r.imageUrl} className="w-full h-full object-cover" /> : <IconVitrine />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">{r.fabricante}</p>
                      <p className="text-sm font-black text-slate-800 tracking-tight truncate uppercase">{r.nome}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{r.categoria} • {r.posicionamento}</p>
                    </div>
                    <svg className="text-slate-300 group-hover:text-primary transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                ))}

                {!loading && search.length >= 2 && results.length === 0 && (
                  <div className="text-center py-12 px-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200 text-xl font-black italic">!</div>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest leading-loose">Nenhum produto encontrado no catálogo oficial.</p>
                    <button onClick={onClose} className="mt-6 text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-0.5">Cadastrar manualmente agora →</button>
                  </div>
                )}
                
                {search.length < 2 && (
                  <div className="text-center py-16 opacity-30">
                     <IconVitrine />
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-2">Pronto para pesquisar</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                   {selected?.imageUrl ? <img src={selected.imageUrl} className="w-full h-full object-cover" /> : <IconVitrine />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">{selected?.fabricante}</p>
                  <p className="text-lg font-black text-slate-800 tracking-tighter uppercase leading-tight italic">{selected?.nome}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">{selected?.categoria}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Preço de Venda (R$)</label>
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    value={preco}
                    onChange={e => setPreco(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-14 px-5 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 text-xl font-black italic outline-none focus:border-primary/40 shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Estoque Inicial</label>
                  <input
                    type="number"
                    value={estoque}
                    onChange={e => setEstoque(e.target.value)}
                    className="w-full h-14 px-5 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 text-xl font-black italic outline-none focus:border-primary/40 shadow-inner"
                  />
                </div>
              </div>

              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1 opacity-70">Posicionamento Sugerido</p>
                <p className="text-xs font-black text-emerald-800 uppercase tracking-tighter">{selected?.posicionamento || 'Standard'}</p>
              </div>

              {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50 p-4 rounded-2xl">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex gap-4 shrink-0 bg-white">
          {step === 'search' ? (
            <button onClick={onClose} className="flex-1 h-14 rounded-[1.5rem] bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-500">Voltar à Vitrine</button>
          ) : (
            <>
              <button onClick={() => setStep('search')} className="w-14 h-14 rounded-[1.5rem] bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>
              <button
                onClick={handleActivate}
                disabled={activating || !preco}
                className="flex-1 h-14 rounded-[1.5rem] bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
              >
                {activating ? 'Ativando...' : 'Confirmar e Publicar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Produtos ─────────────────────────────────────────────── */
function TabProdutos({ categorias }: { categorias: Categoria[] }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [editando, setEditando] = useState<Partial<Produto> | null | false>(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroCategoria) params.set('categoriaId', filtroCategoria);
      const res = await fetchWithAuth(`/api/vitrine/products?${params}`);
      const data = await res.json();
      setProdutos(Array.isArray(data) ? data : []);
    } catch { /* silenciar */ }
    finally { setLoading(false); }
  }, [filtroStatus, filtroCategoria]);

  useEffect(() => { carregar(); }, [carregar]);

  const toggleStatus = async (p: Produto) => {
    try {
      const res = await fetchWithAuth(`/api/vitrine/products/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: p.status === 'active' ? 'inactive' : 'active' }),
      });
      if (res.ok) { setProdutos(prev => prev.map(x => x.id === p.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x)); showToast('Status atualizado'); }
    } catch { /* */ }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir este produto?')) return;
    try {
      const res = await fetchWithAuth(`/api/vitrine/products/${id}`, { method: 'DELETE' });
      if (res.ok) { setProdutos(prev => prev.filter(p => p.id !== id)); showToast('Produto excluído'); }
    } catch { /* */ }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho: filtros + ações */}
      <div className="flex flex-col gap-3">
        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="shrink-0 h-10 px-3 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white shadow-sm outline-none focus:border-sage-400"
          >
            <option value="">Todas categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="shrink-0 h-10 px-3 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white shadow-sm outline-none focus:border-sage-400"
          >
            <option value="">Todos status</option>
            <option value="active">Disponíveis</option>
            <option value="inactive">Indisponíveis</option>
          </select>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowCatalog(true)}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:border-sage-400 hover:text-sage-600 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v8M8 12h8"/></svg>
            Catálogo Oficial
          </button>
          <button
            onClick={() => setEditando({})}
            className="flex-1 h-10 rounded-xl text-[11px] font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            style={{ background: '#40916C' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M12 4v16M4 12h16"/></svg>
            Novo Manual
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-32 bg-white border border-card-border rounded-[4rem] shadow-inner px-12">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100 opacity-20">
             <IconVitrine />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">Sua vitrine está vazia</p>
          <p className="text-[10px] font-medium text-slate-400 mt-2 italic">Comece importando produtos de marcas parceiras ou crie os seus.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <button onClick={() => setShowCatalog(true)} className="px-10 py-5 bg-primary text-white rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 animate-pulse">Explorar Catálogo Somar</button>
            <button onClick={() => setEditando({})} className="px-10 py-5 bg-slate-50 text-slate-400 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest border border-slate-100">Configurar Manualmente</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {produtos.map(p => (
            <div
              key={p.id}
              onClick={() => setEditando(p)}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-sage-200 hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Imagem */}
              <div className="shrink-0">
                <ProdutoImagem url={p.imageUrl} nome={p.nome} size={56} />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-800 truncate leading-tight group-hover:text-sage-700 transition-colors">
                  {p.nome}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <StatusBadge status={p.status} />
                  <span className="text-[12px] font-bold text-sage-600">{formatPreco(p.preco)}</span>
                  {p.categoria?.nome && (
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                      {p.categoria.nome}
                    </span>
                  )}
                </div>
              </div>

              {/* Ações — sempre visíveis no mobile, hover no desktop */}
              <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); setEditando(p); }}
                  className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); excluir(p.id); }}
                  className="w-9 h-9 rounded-xl hover:bg-red-50 flex items-center justify-center text-red-300 hover:text-red-500 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando !== false && (
        <ModalProduto
          produto={editando}
          categorias={categorias}
          onClose={() => setEditando(false)}
          onSave={p => { carregar(); setEditando(false); showToast('Unidade de estoque atualizada!'); }}
        />
      )}

      {showCatalog && (
        <ModalCatalogo
          onClose={() => setShowCatalog(false)}
          onActivate={() => { carregar(); setShowCatalog(false); showToast('Produto ativado no seu estoque!'); }}
        />
      )}

      {toast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-800/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom duration-500">{toast}</div>}
    </div>
  );
}

/* ─── Tab Categorias ─────────────────────────────────────────────── */
function TabCategorias({ onRefresh }: { onRefresh: () => void }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/vitrine/categories');
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      const payload = editId ? { id: editId, nome } : { nome };
      const res = await fetchWithAuth('/api/vitrine/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setNome(''); setEditId(''); carregar(); onRefresh(); showToast(editId ? 'Organizador atualizado' : 'Novo agrupador criado'); }
    } finally { setSaving(false); }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir esta categoria? Os produtos não serão excluídos.')) return;
    const res = await fetchWithAuth(`/api/vitrine/categories?id=${id}`, { method: 'DELETE' });
    if (res.ok) { carregar(); onRefresh(); showToast('Organizador removido'); }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 p-6 md:p-10 mb-8 shadow-sm">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">{editId ? 'Refinar Descritor' : 'Configurar Agrupamento de Produtos'}</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && salvar()} placeholder="Ex: Higienização, Manutenção..." className="flex-1 h-14 px-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 text-sm font-black outline-none focus:border-primary/20 transition-all shadow-inner" style={{ fontSize: '16px' }} />
          <div className="flex gap-3">
            <button onClick={salvar} disabled={saving || !nome.trim()} className="flex-1 sm:flex-none h-14 px-8 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-white disabled:opacity-50 transition-all shadow-xl shadow-primary/20" style={{ background: '#40916C' }}>
              {saving ? '…' : editId ? 'Atualizar' : 'Criar Seção'}
            </button>
            {editId && <button onClick={() => { setEditId(''); setNome(''); }} className="h-14 px-5 rounded-[1.5rem] bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">✕</button>}
          </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categorias.map(c => (
            <div key={c.id} className="flex items-center justify-between p-5 bg-white rounded-[2rem] border border-slate-100 hover:border-primary/10 transition-all shadow-sm">
              <div className="min-w-0 pr-4">
                <p className="text-[13px] font-black text-slate-800 uppercase tracking-tighter italic">{c.nome}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{c._count?.produtos ?? 0} produtos ativos nesta seção</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setEditId(c.id); setNome(c.nome); }} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onClick={() => excluir(c.id)} className="w-10 h-10 rounded-xl hover:bg-red-50 flex items-center justify-center text-red-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M4 7h16"/></svg>
                </button>
              </div>
            </div>
          ))}
          {categorias.length === 0 && <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center py-16 col-span-full italic">Ainda não há seções configuradas em sua vitrine.</p>}
        </div>
      )}
    </div>
  );
}

/* ─── Tab Combos ─────────────────────────────────────────────────── */
function TabCombos({ produtos }: { produtos: Produto[] }) {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', preco: '', desconto: '0', status: 'active', produtoIds: [] as string[] });
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const carregar = async () => {
    setLoading(true);
    try { const res = await fetchWithAuth('/api/vitrine/combos'); const d = await res.json(); setCombos(Array.isArray(d) ? d : []); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const toggleProduto = (id: string) => setForm(f => ({
    ...f, produtoIds: f.produtoIds.includes(id) ? f.produtoIds.filter(p => p !== id) : [...f.produtoIds, id],
  }));

  const salvar = async () => {
    if (!form.nome.trim() || !form.preco) return;
    setSaving(true);
    try {
      const payload = { ...(editId ? { id: editId } : {}), nome: form.nome, preco: parseFloat(form.preco), desconto: parseFloat(form.desconto) || 0, status: form.status, produtoIds: form.produtoIds };
      const res = await fetchWithAuth('/api/vitrine/combos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setForm({ nome: '', preco: '', desconto: '0', status: 'active', produtoIds: [] }); setEditId(''); carregar(); showToast(editId ? 'Configuração de Combo Atualizada' : 'Combo Promocional Ativado'); }
    } finally { setSaving(false); }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir combo?')) return;
    const res = await fetchWithAuth(`/api/vitrine/combos/${id}`, { method: 'DELETE' });
    if (res.ok) { carregar(); showToast('Combo encerrado!'); }
  };

  const editarCombo = (c: Combo) => {
    setEditId(c.id); setForm({ nome: c.nome, preco: String(c.preco), desconto: String(c.desconto), status: c.status, produtoIds: c.itens.map(i => i.produto.id) });
  };

  const somaOriginal = form.produtoIds.reduce((acc, id) => acc + (produtos.find(p => p.id === id)?.preco ?? 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10">
      {/* Formulário */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 p-6 md:p-10 space-y-8 shadow-sm h-fit">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{editId ? 'Refinar Engenharia de Preço' : 'Novo Combo de Alto Valor'}</h4>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Título do Agrupamento</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Kit Recuperação Intensiva" className="w-full h-14 px-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 text-sm font-black outline-none focus:border-primary/20 shadow-inner" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Valor de Venda (R$)</label>
              <input type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} className="w-full h-14 px-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 text-xl font-black italic outline-none focus:border-primary/20 shadow-inner" placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Tag de Desconto (%)</label>
              <input type="number" min="0" max="100" value={form.desconto} onChange={e => setForm(f => ({ ...f, desconto: e.target.value }))} className="w-full h-14 px-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 text-xl font-black italic outline-none focus:border-primary/20 shadow-inner" />
            </div>
          </div>
          {somaOriginal > 0 && (
            <div className="bg-emerald-50 p-6 rounded-[1.8rem] border border-emerald-100 shadow-inner">
               <div className="flex justify-between items-center mb-1 pb-1 border-b border-emerald-100/50">
                  <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Preço Individual Somado:</span>
                  <span className="text-[10px] text-emerald-600 font-black">{formatPreco(somaOriginal)}</span>
               </div>
               <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">Vantagem ao Paciente:</span>
                  <span className="text-sm text-emerald-800 font-black italic">{formatPreco(somaOriginal - (parseFloat(form.preco) || 0))} de OFF</span>
               </div>
            </div>
          )}
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Selecione os Componentes do Kit</label>
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {produtos.filter(p => p.status === 'active').map(p => (
                <label key={p.id} className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all cursor-pointer ${form.produtoIds.includes(p.id) ? 'border-primary/20 bg-primary-soft shadow-inner' : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:shadow-sm'}`}>
                  <input type="checkbox" checked={form.produtoIds.includes(p.id)} onChange={() => toggleProduto(p.id)} className="w-6 h-6 accent-primary rounded-xl" />
                  <ProdutoImagem url={p.imageUrl} nome={p.nome} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-700 truncate uppercase tracking-tighter italic leading-tight">{p.nome}</p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">{formatPreco(p.preco)} • Unidade</p>
                  </div>
                </label>
              ))}
              {produtos.filter(p => p.status === 'active').length === 0 && <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] py-12 text-center italic">Você precisa ter produtos ativos para montar combos.</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-6 border-t border-slate-50">
            <button onClick={salvar} disabled={saving || !form.nome.trim() || !form.preco} className="flex-1 h-16 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest text-white shadow-2xl shadow-primary/30 disabled:opacity-50 transition-all active:scale-95" style={{ background: '#40916C' }}>{saving ? 'Gravando...' : editId ? 'Salvar Configuração' : 'Publicar Nova Oferta'}</button>
            {editId && <button onClick={() => { setEditId(''); setForm({ nome: '', preco: '', desconto: '0', status: 'active', produtoIds: [] }); }} className="w-16 h-16 rounded-[1.8rem] border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all">✕</button>}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {loading ? <div className="flex justify-center py-24"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="grid grid-cols-1 gap-6">
            {combos.map(c => (
              <div key={c.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-lg hover:border-primary/10 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full translate-x-12 -translate-y-12 blur-2xl group-hover:bg-primary/20 transition-all opacity-0 group-hover:opacity-100" />
                <div className="flex items-start justify-between mb-6 relative">
                  <div>
                    <h5 className="text-[18px] font-black text-slate-800 uppercase tracking-tighter italic mb-1 group-hover:text-primary transition-colors underline decoration-primary/5 underline-offset-4">{c.nome}</h5>
                    <div className="flex items-center gap-2">
                       <p className="text-[15px] font-black text-primary italic tracking-tight">{formatPreco(c.preco)}</p>
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">• {c.itens.length} produtos inclusos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={c.status} />
                    <button onClick={() => editarCombo(c)} className="w-11 h-11 rounded-2xl hover:bg-slate-50 flex items-center justify-center text-slate-400 ml-1 transition-all">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onClick={() => excluir(c.id)} className="w-11 h-11 rounded-2xl hover:bg-red-50 flex items-center justify-center text-red-300 transition-all">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap pt-6 border-t border-slate-50">
                  {c.itens.map(i => (
                    <div key={i.produto.id} className="flex items-center gap-3 bg-slate-50/50 rounded-2xl px-4 py-2 border border-slate-100 shadow-inner">
                      <ProdutoImagem url={i.produto.imageUrl} nome={i.produto.nome} size={24} />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter truncate max-w-[120px]">{i.produto.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {combos.length === 0 && <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest text-center py-32 italic opacity-60">Você ainda não criou nenhum combo de ofertas.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab Sugestões por Serviço ────────────────────────────────────── */
function TabSugestoes({ produtos }: { produtos: Produto[] }) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [sugestoes, setSugestoes] = useState<SugestaoServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicoSelecionado, setServicoSelecionado] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/services').then(r => r.json()),
      fetchWithAuth('/api/vitrine/suggestions').then(r => r.json()),
    ]).then(([s, sug]) => {
      setServicos(Array.isArray(s) ? s : []);
      setSugestoes(Array.isArray(sug) ? sug : []);
    }).finally(() => setLoading(false));
  }, []);

  const sugestoesDoServico = sugestoes.filter(s => s.servicoId === servicoSelecionado);
  const produtosSugeridos = new Set(sugestoesDoServico.map(s => s.produto.id));

  const toggleSugestao = async (produtoId: string) => {
    if (produtosSugeridos.has(produtoId)) {
      const sug = sugestoesDoServico.find(s => s.produto.id === produtoId);
      if (!sug) return;
      const res = await fetchWithAuth(`/api/vitrine/suggestions?id=${sug.id}`, { method: 'DELETE' });
      if (res.ok) { setSugestoes(prev => prev.filter(s => s.id !== sug.id)); showToast('Ancoragem removida'); }
    } else {
      const res = await fetchWithAuth('/api/vitrine/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servicoId: servicoSelecionado, produtoId }) });
      if (res.ok) { const data = await res.json(); setSugestoes(prev => [...prev, data]); showToast('Produto vinculado ao serviço!'); }
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-10">
      {/* Lista de serviços */}
      <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm h-fit">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo de Atendimento</p>
        </div>
        <div className="overflow-y-auto max-h-[560px] custom-scrollbar">
          {servicos.map(s => {
            const qtd = sugestoes.filter(sg => sg.servicoId === s.id).length;
            const active = servicoSelecionado === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setServicoSelecionado(s.id)}
                className={`w-full flex items-center justify-between px-6 py-5 text-left border-b border-slate-50/50 transition-all ${active ? 'bg-primary-soft text-primary font-black shadow-inner' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-[11px] font-black uppercase tracking-tighter truncate italic">{s.nome}</span>
                {qtd > 0 && <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${active ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>{qtd}</span>}
              </button>
            );
          })}
          {servicos.length === 0 && <p className="text-[11px] font-black text-slate-300 py-20 text-center uppercase tracking-widest italic opacity-60 px-8">Nenhum serviço disponível para ancorar produtos.</p>}
        </div>
      </div>

      {/* Produtos para vincular */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 p-5 md:p-10 shadow-sm relative">
        {!servicoSelecionado ? (
          <div className="flex flex-col items-center justify-center h-[520px] text-center px-16">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 italic font-black text-4xl border border-slate-100 shadow-inner opacity-40">?</div>
            <p className="text-[12px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
              Selecione à esquerda um procedimento para configurar o <span className="text-primary italic">upsell estratégico</span> no agendamento.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-10 border-b border-slate-100 pb-8">
               <h4 className="text-[16px] font-black text-slate-800 uppercase tracking-tighter italic">Inteligência Cross-Sell</h4>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-loose">
                 Os <span className="text-primary font-black">3 primeiros</span> habilitados serão destacados no menu de agendamento online para aumentar seu ticket médio.
               </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {produtos.filter(p => p.status === 'active').map(p => {
                const checked = produtosSugeridos.has(p.id);
                return (
                  <label key={p.id} className={`flex items-center gap-5 p-5 rounded-[2rem] border cursor-pointer transition-all ${checked ? 'border-primary/40 bg-primary-soft shadow-inner' : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:shadow-md'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSugestao(p.id)} className="w-7 h-7 accent-primary rounded-2xl" />
                    <ProdutoImagem url={p.imageUrl} nome={p.nome} size={48} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-slate-800 truncate uppercase tracking-tighter leading-tight group-hover:text-primary">{p.nome}</p>
                      <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 italic">{formatPreco(p.preco)}</p>
                    </div>
                  </label>
                );
              })}
              {produtos.filter(p => p.status === 'active').length === 0 && <p className="text-center py-40 text-[11px] font-black text-slate-300 uppercase tracking-widest italic col-span-full opacity-60">Nenhum produto cadastrado com estoque para sugerir.</p>}
            </div>
          </>
        )}
      </div>
      {toast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-800/90 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-widest px-10 py-5 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom duration-500">{toast}</div>}
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function VitrinePage() {
  const [tab, setTab] = useState<Tab>('produtos');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const carregarBase = useCallback(async () => {
    try {
      const [rCats, rProds] = await Promise.all([
        fetchWithAuth('/api/vitrine/categories').then(r => r.json()),
        fetchWithAuth('/api/vitrine/products?status=active').then(r => r.json()),
      ]);
      setCategorias(Array.isArray(rCats) ? rCats : []);
      setProdutos(Array.isArray(rProds) ? rProds : []);
    } catch { /* silenciar */ }
  }, []);

  useEffect(() => { carregarBase(); }, [carregarBase]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'produtos', label: 'Estoque' },
    { id: 'categorias', label: 'Seções' },
    { id: 'combos', label: 'Kits & Promoções' },
    { id: 'sugestoes', label: 'Estratégia de Venda' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header Premium V4.0 */}
      <div className="bg-white border border-card-border p-5 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 mb-8 md:mb-12">
        <div className="flex items-center gap-4 md:gap-6 w-full md:text-left">
           <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.4rem] md:rounded-[1.8rem] bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/30 font-black italic text-2xl md:text-4xl shrink-0">V</div>
           <div>
              <h1 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-text-main leading-tight underline decoration-primary/10 underline-offset-8">Inteligência de <span className="text-primary">Vitrine</span></h1>
              <p className="text-[10px] md:text-[11px] font-black text-text-placeholder uppercase tracking-[0.2em] mt-1 opacity-70">Sincronize estoque com o catálogo Somar.</p>
           </div>
        </div>
      </div>

      {/* Tabs Estilizadas para Mobile e Desktop */}
      <div className="flex gap-2 mb-12 overflow-x-auto pb-6 custom-scrollbar scroll-smooth no-scrollbar">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-10 py-5 rounded-[1.6rem] text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${tab === t.id ? 'bg-primary text-white border-primary shadow-2xl shadow-primary/30 translate-y-[-4px]' : 'bg-white text-slate-400 border-slate-50 hover:border-primary/20 hover:text-primary active:scale-95 shadow-sm'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo com Transição Suave */}
      <div className="animate-in fade-in zoom-in-95 duration-700">
        {tab === 'produtos' && <TabProdutos categorias={categorias} />}
        {tab === 'categorias' && <TabCategorias onRefresh={carregarBase} />}
        {tab === 'combos' && <TabCombos produtos={produtos} />}
        {tab === 'sugestoes' && <TabSugestoes produtos={produtos} />}
      </div>
    </div>
  );
}
