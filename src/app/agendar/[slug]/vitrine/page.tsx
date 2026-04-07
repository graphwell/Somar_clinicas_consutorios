"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ─── Tipos ─────────────────────────────────────────────────── */
interface Categoria { id: string; nome: string }
interface Produto {
  id: string; nome: string; descricao?: string; dicaDeUso?: string;
  preco: number; imageUrl?: string | null; estoque: number; tags: string[];
  categoriaId?: string | null; categoria?: { id: string; nome: string } | null;
}
interface ComboItem { produto: { id: string; nome: string; preco: number; imageUrl?: string | null } }
interface Combo { id: string; nome: string; preco: number; desconto: number; itens: ComboItem[] }
interface ItemCarrinho { tipo: 'produto' | 'combo'; id: string; nome: string; preco: number; imageUrl?: string | null; quantidade: number }

/* ─── Helpers ────────────────────────────────────────────────── */
function formatPreco(v: number) { return `R$ ${v.toFixed(2).replace('.', ',')}` }

function ProdutoImagem({ url, nome, size = 64 }: { url?: string | null; nome: string; size?: number }) {
  if (url) return <img src={url} alt={nome} style={{ width: size, height: size, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/>
        <circle cx="8.5" cy="11.5" r="1.5"/><polyline points="21 15 16 10 5 21" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ─── Mini Carrinho fixo ─────────────────────────────────────── */
function MiniCarrinho({ itens, cor, onVer }: { itens: ItemCarrinho[]; cor: string; onVer: () => void }) {
  const total = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
  if (itens.length === 0) return null;
  return (
    <button
      onClick={onVer}
      className="fixed bottom-5 right-4 z-40 flex items-center gap-3 rounded-2xl shadow-xl px-4 py-3 text-white"
      style={{ background: cor, minWidth: 180 }}
    >
      <div className="relative">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/>
          <path strokeLinecap="round" d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center" style={{ color: cor }}>{itens.reduce((s, i) => s + i.quantidade, 0)}</span>
      </div>
      <div className="text-left">
        <p className="text-xs opacity-80 leading-none">Reservados</p>
        <p className="text-sm font-bold leading-tight">{formatPreco(total)}</p>
      </div>
    </button>
  );
}

/* ─── Modal carrinho ─────────────────────────────────────────── */
function ModalCarrinho({
  itens, cor, agendamentoId, slug,
  onClose, onRemover, onAlterarQtd,
}: {
  itens: ItemCarrinho[]; cor: string; agendamentoId?: string; slug: string;
  onClose: () => void; onRemover: (id: string) => void; onAlterarQtd: (id: string, q: number) => void;
}) {
  const total = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Sua reserva</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {itens.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <ProdutoImagem url={item.imageUrl} nome={item.nome} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{item.nome}</p>
                <p className="text-xs text-slate-400">{formatPreco(item.preco)} × {item.quantidade}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onAlterarQtd(item.id, item.quantidade - 1)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-bold">−</button>
                <span className="text-sm font-semibold w-4 text-center">{item.quantidade}</span>
                <button onClick={() => onAlterarQtd(item.id, item.quantidade + 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: cor }}>+</button>
              </div>
              <button onClick={() => onRemover(item.id)} className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
            <p className="text-sm font-semibold text-slate-700">Total reservado</p>
            <p className="text-lg font-bold" style={{ color: cor }}>{formatPreco(total)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-medium">💡 Reservar não cobra nada agora. Você pode pagar no dia ou online ao finalizar o agendamento.</p>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 space-y-2">
          {agendamentoId ? (
            <Link href={`/agendar/${slug}?agendamento_id=${agendamentoId}`} className="block w-full h-12 rounded-xl text-white text-sm font-semibold flex items-center justify-center" style={{ background: cor }}>
              Confirmar e voltar ao agendamento →
            </Link>
          ) : (
            <Link href={`/agendar/${slug}`} className="block w-full h-12 rounded-xl text-white text-sm font-semibold flex items-center justify-center" style={{ background: cor }}>
              Agendar e usar esses produtos →
            </Link>
          )}
          <button onClick={onClose} className="w-full h-11 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Continuar navegando
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Card Produto ───────────────────────────────────────────── */
function CardProduto({ produto, cor, onReservar, jaReservado }: {
  produto: Produto; cor: string; onReservar: (p: Produto) => void; jaReservado: boolean;
}) {
  const semEstoque = produto.estoque === 0;
  const ultimasUnidades = produto.estoque > 0 && produto.estoque <= 3;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        <ProdutoImagem url={produto.imageUrl} nome={produto.nome} size={0} />
        <div style={{ aspectRatio: '1', background: '#F8FAFC', position: 'relative' }}>
          {produto.imageUrl ? (
            <img src={produto.imageUrl} alt={produto.nome} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/>
                <circle cx="8.5" cy="11.5" r="1.5"/><polyline points="21 15 16 10 5 21" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        {ultimasUnidades && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Últimas unidades
          </div>
        )}
        {produto.tags.includes('Mais vendido') && (
          <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ⭐ Mais vendido
          </div>
        )}
        {produto.tags.includes('Recomendado') && (
          <div className="absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cor }}>
            ✦ Recomendado
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-sm font-semibold text-slate-800 leading-snug mb-1">{produto.nome}</p>
        {produto.descricao && <p className="text-xs text-slate-400 mb-auto line-clamp-2">{produto.descricao}</p>}
        {produto.dicaDeUso && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 mt-2">💡 {produto.dicaDeUso}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="text-base font-bold" style={{ color: cor }}>{formatPreco(produto.preco)}</p>
          {semEstoque ? (
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">Indisponível</span>
          ) : jaReservado ? (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-semibold">✓ Reservado</span>
          ) : (
            <button
              onClick={() => onReservar(produto)}
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
              style={{ background: cor }}
            >
              Reservar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Card Combo ─────────────────────────────────────────────── */
function CardCombo({ combo, cor, onReservar, jaReservado }: {
  combo: Combo; cor: string; onReservar: (c: Combo) => void; jaReservado: boolean;
}) {
  const somaOriginal = combo.itens.reduce((s, i) => s + i.produto.preco, 0);
  const economia = somaOriginal - combo.preco;

  return (
    <div className="bg-white rounded-3xl border-2 overflow-hidden shadow-sm" style={{ borderColor: cor + '40' }}>
      <div className="px-4 py-2 text-xs font-bold text-white flex items-center gap-1.5" style={{ background: cor }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/></svg>
        COMBO ESPECIAL
      </div>
      <div className="p-4">
        <p className="text-sm font-bold text-slate-800 mb-2">{combo.nome}</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {combo.itens.map(i => (
            <div key={i.produto.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1">
              <ProdutoImagem url={i.produto.imageUrl} nome={i.produto.nome} size={20} />
              <span className="text-xs text-slate-600">{i.produto.nome}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            {somaOriginal > combo.preco && (
              <p className="text-xs text-slate-400 line-through">{formatPreco(somaOriginal)}</p>
            )}
            <p className="text-base font-bold" style={{ color: cor }}>{formatPreco(combo.preco)}</p>
            {economia > 0 && <p className="text-[10px] text-emerald-600 font-semibold">Economize {formatPreco(economia)}</p>}
          </div>
          {jaReservado ? (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-semibold">✓ Reservado</span>
          ) : (
            <button
              onClick={() => onReservar(combo)}
              className="text-xs font-semibold text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: cor }}
            >
              Reservar combo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────── */
export default function VitrinePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [agendamentoId, setAgendamentoId] = useState<string | undefined>();
  const [clinicaNome, setClinicaNome] = useState('');
  const [cor, setCor] = useState('#40916C');

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [modalCarrinho, setModalCarrinho] = useState(false);

  useEffect(() => {
    params.then(p => setSlug(p.slug));
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      setAgendamentoId(sp.get('appointment_id') || undefined);
    }
  }, [params]);

  const carregar = useCallback(async () => {
    if (!slug) return;
    setCarregando(true);
    try {
      const [clinRes, vitrineRes] = await Promise.all([
        fetch(`/api/public/clinic/${slug}`).then(r => r.json()),
        fetch(`/api/public/clinic/${slug}/vitrine`).then(r => r.json()),
      ]);
      if (clinRes.nome) setClinicaNome(clinRes.nome);
      if (clinRes.branding?.primaryColor) setCor(clinRes.branding.primaryColor);
      if (vitrineRes.categorias) setCategorias(vitrineRes.categorias);
      if (vitrineRes.produtos) setProdutos(vitrineRes.produtos);
      if (vitrineRes.combos) setCombos(vitrineRes.combos);
    } catch { /* silenciar */ }
    finally { setCarregando(false); }
  }, [slug]);

  useEffect(() => { carregar(); }, [carregar]);

  const produtosFiltrados = categoriaSelecionada
    ? produtos.filter(p => p.categoriaId === categoriaSelecionada)
    : produtos;

  const reservarProduto = (p: Produto) => {
    setCarrinho(prev => {
      const ex = prev.find(i => i.tipo === 'produto' && i.id === p.id);
      if (ex) return prev.map(i => i.tipo === 'produto' && i.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { tipo: 'produto', id: p.id, nome: p.nome, preco: p.preco, imageUrl: p.imageUrl, quantidade: 1 }];
    });
  };

  const reservarCombo = (c: Combo) => {
    setCarrinho(prev => {
      if (prev.find(i => i.tipo === 'combo' && i.id === c.id)) return prev;
      return [...prev, { tipo: 'combo', id: c.id, nome: c.nome, preco: c.preco, imageUrl: null, quantidade: 1 }];
    });
  };

  const removerDoCarrinho = (id: string) => setCarrinho(prev => prev.filter(i => i.id !== id));
  const alterarQtd = (id: string, q: number) => {
    if (q <= 0) removerDoCarrinho(id);
    else setCarrinho(prev => prev.map(i => i.id === id ? { ...i, quantidade: q } : i));
  };

  const jaReservadoProduto = (id: string) => carrinho.some(i => i.tipo === 'produto' && i.id === id);
  const jaReservadoCombo = (id: string) => carrinho.some(i => i.tipo === 'combo' && i.id === id);

  return (
    <div className="min-h-[100svh]" style={{ background: '#F5F0E8' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-sm" style={{ background: cor }}>
        <div className="flex items-center gap-3">
          <Link href={`/agendar/${slug}`} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <p className="text-white font-semibold text-sm">{clinicaNome || 'Vitrine'}</p>
        </div>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M3 9h18M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9"/>
            <path strokeLinecap="round" d="M9 13h6M12 10v6"/>
          </svg>
          <p className="text-white/90 text-sm font-medium">Vitrine</p>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px', maxWidth: 640, margin: '0 auto' }}>
        {agendamentoId && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-emerald-700 font-medium">🛍️ Reserve produtos para o seu atendimento</p>
            <p className="text-xs text-emerald-600 mt-0.5">Serão vinculados ao seu agendamento. Pagamento só no dia ou online ao confirmar.</p>
          </div>
        )}

        {/* Filtro de categorias */}
        {categorias.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
            <button
              onClick={() => setCategoriaSelecionada('')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${!categoriaSelecionada ? 'text-white shadow-sm' : 'text-slate-600 bg-white'}`}
              style={!categoriaSelecionada ? { background: cor } : {}}
            >Todos</button>
            {categorias.map(c => (
              <button
                key={c.id}
                onClick={() => setCategoriaSelecionada(c.id === categoriaSelecionada ? '' : c.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${categoriaSelecionada === c.id ? 'text-white shadow-sm' : 'text-slate-600 bg-white'}`}
                style={categoriaSelecionada === c.id ? { background: cor } : {}}
              >{c.nome}</button>
            ))}
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: cor + '40', borderTopColor: cor }} />
          </div>
        ) : (
          <>
            {/* Combos em destaque */}
            {combos.length > 0 && !categoriaSelecionada && (
              <div className="mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Combos especiais</h2>
                <div className="space-y-3">
                  {combos.map(c => (
                    <CardCombo key={c.id} combo={c} cor={cor} onReservar={reservarCombo} jaReservado={jaReservadoCombo(c.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Grade de produtos */}
            {produtosFiltrados.length > 0 ? (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">
                  {categoriaSelecionada ? categorias.find(c => c.id === categoriaSelecionada)?.nome : 'Todos os produtos'}
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">{produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'produto' : 'produtos'}</span>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {produtosFiltrados.map(p => (
                    <CardProduto key={p.id} produto={p} cor={cor} onReservar={reservarProduto} jaReservado={jaReservadoProduto(p.id)} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mx-auto mb-3 opacity-30">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M3 9h18M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9"/>
                </svg>
                <p className="text-sm">Nenhum produto disponível</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mini carrinho fixo */}
      <MiniCarrinho itens={carrinho} cor={cor} onVer={() => setModalCarrinho(true)} />

      {/* Modal carrinho */}
      {modalCarrinho && (
        <ModalCarrinho
          itens={carrinho}
          cor={cor}
          agendamentoId={agendamentoId}
          slug={slug}
          onClose={() => setModalCarrinho(false)}
          onRemover={removerDoCarrinho}
          onAlterarQtd={alterarQtd}
        />
      )}
    </div>
  );
}
