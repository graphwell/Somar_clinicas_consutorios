"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

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

/* ─── Status badge ─────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

/* ─── Placeholder de imagem ─────────────────────────────────────── */
function ProdutoImagem({ url, nome, size = 48 }: { url?: string | null; nome: string; size?: number }) {
  if (url) return <img src={url} alt={nome} style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/>
        <circle cx="8.5" cy="11.5" r="1.5"/><polyline points="21 15 16 10 5 21" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ─── Modal de produto ─────────────────────────────────────────── */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{produto?.id ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Imagem */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-slate-200 hover:border-emerald-400 transition-colors flex items-center justify-center bg-slate-50"
              onClick={() => fileRef.current?.click()}
            >
              {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" /> : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16"/>
                </svg>
              )}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} className="text-sm text-emerald-600 font-medium hover:underline">
                {form.imageUrl ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              <p className="text-xs text-slate-400 mt-0.5">Máx 300×300px · 150KB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagem} />
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Nome *</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50" placeholder="Ex: Pomada Modeladora" />
          </div>

          {/* Preço + Estoque */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Preço (R$)</label>
              <input type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Estoque</label>
              <input type="number" min="0" value={form.estoque} onChange={e => setForm(f => ({ ...f, estoque: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50" />
            </div>
          </div>

          {/* Categoria + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Categoria</label>
              <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 bg-white">
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 bg-white">
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Descrição curta</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 resize-none" placeholder="Descrição visível na vitrine..." />
          </div>

          {/* Dica de uso */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Dica de uso</label>
            <textarea value={form.dicaDeUso} onChange={e => setForm(f => ({ ...f, dicaDeUso: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 resize-none" placeholder="Como usar, aplicar ou aproveitar..." />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Tags <span className="normal-case text-slate-400">(separar por vírgula)</span></label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400" placeholder="ex: capilar, coloração, profissional" />
          </div>

          {err && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-2 flex-1 h-11 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60" style={{ background: '#40916C' }}>
            {saving ? 'Salvando…' : 'Salvar produto'}
          </button>
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
    <div>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-2">
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white outline-none focus:border-emerald-400">
            <option value="">Todas categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white outline-none focus:border-emerald-400">
            <option value="">Todos status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
        <button onClick={() => setEditando({})} className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-2" style={{ background: '#40916C' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M12 4v16M4 12h16"/></svg>
          Novo produto
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mx-auto mb-3 opacity-40"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/></svg>
          <p className="text-sm">Nenhum produto encontrado</p>
          <button onClick={() => setEditando({})} className="mt-3 text-sm text-emerald-600 font-medium hover:underline">Criar primeiro produto →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {produtos.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <ProdutoImagem url={p.imageUrl} nome={p.nome} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800 truncate">{p.nome}</p>
                  <StatusBadge status={p.status} />
                  {p.estoque <= 3 && p.estoque > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 font-semibold rounded-full">Últimas unidades</span>}
                  {p.estoque === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 font-semibold rounded-full">Sem estoque</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatPreco(p.preco)} · {p.estoque} un
                  {p.categoria ? ` · ${p.categoria.nome}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleStatus(p)} title={p.status === 'active' ? 'Desativar' : 'Ativar'} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                  {p.status === 'active' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  )}
                </button>
                <button onClick={() => setEditando(p)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onClick={() => excluir(p.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
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
          onSave={p => { carregar(); setEditando(false); showToast('Produto salvo!'); }}
        />
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap">{toast}</div>}
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
      if (res.ok) { setNome(''); setEditId(''); carregar(); onRefresh(); showToast(editId ? 'Categoria atualizada' : 'Categoria criada'); }
    } finally { setSaving(false); }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir esta categoria? Os produtos não serão excluídos.')) return;
    const res = await fetchWithAuth(`/api/vitrine/categories?id=${id}`, { method: 'DELETE' });
    if (res.ok) { carregar(); onRefresh(); showToast('Categoria excluída'); }
  };

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">{editId ? 'Editar categoria' : 'Nova categoria'}</h4>
        <div className="flex gap-2">
          <input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && salvar()} placeholder="Ex: Capilares, Skincare..." className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400" />
          <button onClick={salvar} disabled={saving || !nome.trim()} className="h-10 px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors" style={{ background: '#40916C' }}>
            {saving ? '…' : editId ? 'Salvar' : 'Criar'}
          </button>
          {editId && <button onClick={() => { setEditId(''); setNome(''); }} className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">✕</button>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="space-y-2">
          {categorias.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">{c.nome}</p>
                <p className="text-xs text-slate-400">{c._count?.produtos ?? 0} produtos</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditId(c.id); setNome(c.nome); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onClick={() => excluir(c.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          ))}
          {categorias.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Nenhuma categoria. Crie a primeira!</p>}
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg">{toast}</div>}
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
      if (res.ok) { setForm({ nome: '', preco: '', desconto: '0', status: 'active', produtoIds: [] }); setEditId(''); carregar(); showToast(editId ? 'Combo atualizado' : 'Combo criado'); }
    } finally { setSaving(false); }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir combo?')) return;
    const res = await fetchWithAuth(`/api/vitrine/combos/${id}`, { method: 'DELETE' });
    if (res.ok) { carregar(); showToast('Combo excluído'); }
  };

  const editarCombo = (c: Combo) => {
    setEditId(c.id); setForm({ nome: c.nome, preco: String(c.preco), desconto: String(c.desconto), status: c.status, produtoIds: c.itens.map(i => i.produto.id) });
  };

  const somaOriginal = form.produtoIds.reduce((acc, id) => acc + (produtos.find(p => p.id === id)?.preco ?? 0), 0);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Formulário */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-700">{editId ? 'Editar combo' : 'Novo combo'}</h4>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Nome</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Kit Barba Completa" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Preço combo</label>
            <input type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Desconto %</label>
            <input type="number" min="0" max="100" value={form.desconto} onChange={e => setForm(f => ({ ...f, desconto: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400" />
          </div>
        </div>
        {somaOriginal > 0 && <p className="text-xs text-slate-400">Soma dos produtos: {formatPreco(somaOriginal)} · Economia: {formatPreco(somaOriginal - (parseFloat(form.preco) || 0))}</p>}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Produtos do combo</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {produtos.filter(p => p.status === 'active').map(p => (
              <label key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={form.produtoIds.includes(p.id)} onChange={() => toggleProduto(p.id)} className="w-4 h-4 accent-emerald-600 rounded" />
                <ProdutoImagem url={p.imageUrl} nome={p.nome} size={28} />
                <span className="text-sm text-slate-700 flex-1 truncate">{p.nome}</span>
                <span className="text-xs text-slate-500">{formatPreco(p.preco)}</span>
              </label>
            ))}
            {produtos.filter(p => p.status === 'active').length === 0 && <p className="text-xs text-slate-400 py-4 text-center">Nenhum produto ativo</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={salvar} disabled={saving || !form.nome.trim() || !form.preco} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#40916C' }}>{saving ? 'Salvando…' : editId ? 'Salvar' : 'Criar combo'}</button>
          {editId && <button onClick={() => { setEditId(''); setForm({ nome: '', preco: '', desconto: '0', status: 'active', produtoIds: [] }); }} className="h-10 px-3 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">✕</button>}
        </div>
      </div>

      {/* Lista */}
      <div>
        {loading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="space-y-3">
            {combos.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatPreco(c.preco)} · {c.itens.length} produto(s)</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={c.status} />
                    <button onClick={() => editarCombo(c)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center ml-1">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onClick={() => excluir(c.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {c.itens.map(i => (
                    <div key={i.produto.id} className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1">
                      <ProdutoImagem url={i.produto.imageUrl} nome={i.produto.nome} size={18} />
                      <span className="text-xs text-slate-600">{i.produto.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {combos.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Nenhum combo. Crie o primeiro!</p>}
          </div>
        )}
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg">{toast}</div>}
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
      if (res.ok) { setSugestoes(prev => prev.filter(s => s.id !== sug.id)); showToast('Sugestão removida'); }
    } else {
      const res = await fetchWithAuth('/api/vitrine/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servicoId: servicoSelecionado, produtoId }) });
      if (res.ok) { const data = await res.json(); setSugestoes(prev => [...prev, data]); showToast('Sugestão adicionada'); }
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6">
      {/* Lista de serviços */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-3 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Serviços</p>
        </div>
        <div className="overflow-y-auto max-h-[480px]">
          {servicos.map(s => {
            const qtd = sugestoes.filter(sg => sg.servicoId === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setServicoSelecionado(s.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${servicoSelecionado === s.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <span className="truncate">{s.nome}</span>
                {qtd > 0 && <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{qtd}</span>}
              </button>
            );
          })}
          {servicos.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Sem serviços</p>}
        </div>
      </div>

      {/* Produtos para vincular */}
      <div>
        {!servicoSelecionado ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">← Selecione um serviço</div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-3">
              Marque os produtos que serão sugeridos no agendamento deste serviço.
              <span className="text-emerald-600 font-medium"> Os 3 primeiros</span> aparecerão no fluxo de agendamento.
            </p>
            <div className="space-y-2">
              {produtos.filter(p => p.status === 'active').map(p => {
                const checked = produtosSugeridos.has(p.id);
                return (
                  <label key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSugestao(p.id)} className="w-4 h-4 accent-emerald-600" />
                    <ProdutoImagem url={p.imageUrl} nome={p.nome} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{p.nome}</p>
                      <p className="text-xs text-slate-400">{formatPreco(p.preco)}{p.categoria ? ` · ${p.categoria.nome}` : ''}</p>
                    </div>
                    {checked && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </label>
                );
              })}
              {produtos.filter(p => p.status === 'active').length === 0 && <p className="text-sm text-slate-400 text-center py-8">Nenhum produto ativo. Crie produtos primeiro.</p>}
            </div>
          </>
        )}
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg">{toast}</div>}
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
    { id: 'produtos', label: 'Produtos' },
    { id: 'categorias', label: 'Categorias' },
    { id: 'combos', label: 'Combos' },
    { id: 'sugestoes', label: 'Sugestões por Serviço' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Vitrine</h1>
        <p className="text-sm text-text-secondary mt-1">Gerencie produtos, combos e sugestões para seus atendimentos.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === 'produtos' && <TabProdutos categorias={categorias} />}
      {tab === 'categorias' && <TabCategorias onRefresh={carregarBase} />}
      {tab === 'combos' && <TabCombos produtos={produtos} />}
      {tab === 'sugestoes' && <TabSugestoes produtos={produtos} />}
    </div>
  );
}
