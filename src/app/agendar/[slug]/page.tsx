"use client";
import React, { useState, useEffect, useRef } from 'react';

/* ─── Tipos ────────────────────────────────────────────── */
interface ClinicaPublica {
  nome: string;
  nicho: string;
  tenantId: string;
  branding: { logoUrl?: string; primaryColor?: string } | null;
  aceitaPagamento: boolean;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  bufferTimeMinutes: number;
  color?: string;
  descricao?: string;
  profissionais: Profissional[];
}

interface Profissional {
  id: string;
  nome: string;
  especialidade?: string;
  fotoUrl?: string;
  color?: string;
}

type Passo = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/* ─── Helpers ──────────────────────────────────────────── */
function iniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
function formatarTelefone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function diasSemanaAbrev(d: Date): string {
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
}
function formatarDataExibicao(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).format(d);
}
function gerarProximos14Dias(): string[] {
  const dias: string[] = [];
  const hoje = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    dias.push(d.toISOString().split('T')[0]);
  }
  return dias;
}
function gerarLinkCalendario(params: {
  titulo: string; data: string; horario: string; duracao: number;
}): string {
  const [h, m] = params.horario.split(':').map(Number);
  const start = new Date(params.data + 'T00:00:00');
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + params.duracao * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(params.titulo)}&dates=${fmt(start)}/${fmt(end)}`;
}

/* ─── Indicador de passos ──────────────────────────────── */
function IndicadorPassos({ passo, cor }: { passo: Passo; cor: string }) {
  const total = 6;
  const atual = Math.min(passo, total);
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              width: i + 1 === atual ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i + 1 <= atual ? cor : '#EEE9DF',
              transition: 'all 300ms ease',
            }}
          />
          {i < total - 1 && (
            <div style={{ height: 1, width: 20, background: i + 1 < atual ? cor : '#EEE9DF', transition: 'background 300ms' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Página principal ─────────────────────────────────── */
export default function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [clinica, setClinica] = useState<ClinicaPublica | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [passo, setPasso] = useState<Passo>(1);

  // Passo 1 — Identificação
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');

  // Passo 2 — Serviço
  const [servico, setServico] = useState<Servico | null>(null);

  // Passo 3 — Profissional
  const [profissional, setProfissional] = useState<{ id: string; nome: string } | null>(null);

  // Passo 4 — Data e horário
  const dias = gerarProximos14Dias();
  const [dataSelecionada, setDataSelecionada] = useState<string>('');
  const [slots, setSlots] = useState<string[]>([]);
  const [profEscolhido, setProfEscolhido] = useState<string | null>(null);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [horario, setHorario] = useState('');
  const calendarRef = useRef<HTMLDivElement>(null);

  // Passo 4b — Fila de espera e alternativas
  interface Alternativa { tipo: string; profissionalId: string; profissional: string; horario: string; data: string }
  const [alternativas, setAlternativas] = useState<Alternativa[]>([]);
  const [carregandoAlternativas, setCarregandoAlternativas] = useState(false);
  const [filaStatus, setFilaStatus] = useState<'idle' | 'entrando' | 'na_fila'>('idle');
  const [filaPosicao, setFilaPosicao] = useState(0);

  const buscarAlternativas = async (data: string, horarioOcupado: string) => {
    if (!servico || !slug) return;
    setCarregandoAlternativas(true);
    setAlternativas([]);
    try {
      const params = new URLSearchParams({ servicoId: servico.id, data });
      if (profissional?.id) params.set('profissionalId', profissional.id);
      if (horarioOcupado) params.set('horario', horarioOcupado);
      const res = await fetch(`/api/public/clinic/${slug}/alternativas?${params}`);
      const d = await res.json();
      setAlternativas(Array.isArray(d.alternativas) ? d.alternativas : []);
    } catch { setAlternativas([]); }
    finally { setCarregandoAlternativas(false); }
  };

  const entrarNaFila = async () => {
    if (!servico || !dataSelecionada || !clienteNome || !clienteTelefone) return;
    setFilaStatus('entrando');
    try {
      const res = await fetch(`/api/public/clinic/${clinica!.tenantId}/fila-espera/entrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: clinica!.tenantId,
          clienteNome: clienteNome.trim(),
          clienteTelefone: clienteTelefone.replace(/\D/g, ''),
          servicoId: servico.id,
          profissionalId: profissional?.id ?? null,
          dataDesejada: dataSelecionada,
          horarioDesejado: horario || null,
        }),
      });
      const d = await res.json();
      if (d.data?.entrou) {
        setFilaStatus('na_fila');
        setFilaPosicao(d.data.posicao ?? 1);
      } else {
        setFilaStatus('idle');
      }
    } catch {
      setFilaStatus('idle');
    }
  };

  // Passo 5 — Produtos sugeridos
  interface ProdutoSugestao { id: string; nome: string; preco: number; imageUrl?: string | null; estoque: number }
  interface ItemReservado { id: string; nome: string; preco: number; imageUrl?: string | null; quantidade: number }
  const [sugestoesProduto, setSugestoesProduto] = useState<ProdutoSugestao[]>([]);
  const [produtosReservados, setProdutosReservados] = useState<ItemReservado[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);

  // Passo 6 — Pagamento
  const [tipoPagamento, setTipoPagamento] = useState<'hora' | 'total' | 'sinal'>('hora');

  // Passo 7 — Sucesso
  const [confirmando, setConfirmando] = useState(false);
  const [protocolo, setProtocolo] = useState('');
  const [erroConfirm, setErroConfirm] = useState('');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`/api/public/clinic/${slug}`).then(r => r.json()),
      fetch(`/api/public/clinic/${slug}/services`).then(r => r.json()),
    ])
      .then(([c, s]) => {
        if (c.error) { setErro('Estabelecimento não encontrado.'); return; }
        setClinica({ ...c, aceitaPagamento: c.aceitaPagamento ?? false });
        setServicos(Array.isArray(s) ? s : []);
      })
      .catch(() => setErro('Erro ao carregar dados.'))
      .finally(() => setCarregando(false));
  }, [slug]);

  const cor = (clinica?.branding as any)?.primaryColor || '#40916C';

  const buscarSlots = async (data: string, horarioRef?: string) => {
    if (!servico) return;
    setCarregandoSlots(true);
    setSlots([]);
    setHorario('');
    setAlternativas([]);
    setFilaStatus('idle');
    const profId = profissional?.id || 'qualquer';
    try {
      const res = await fetch(
        `/api/public/clinic/${slug}/slots?data=${data}&servicoId=${servico.id}&profissionalId=${profId}`
      );
      const d = await res.json();
      const fetchedSlots: string[] = d.slots ?? [];
      setSlots(fetchedSlots);
      setProfEscolhido(d.profissionalEscolhidoId ?? null);
      // Quando não há slots, buscar alternativas automaticamente
      if (fetchedSlots.length === 0) {
        buscarAlternativas(data, horarioRef ?? '');
      }
    } catch { setSlots([]); }
    finally { setCarregandoSlots(false); }
  };

  const avancar = () => setPasso(p => (p < 7 ? (p + 1) as Passo : p));
  const voltar = () => setPasso(p => (p > 1 ? (p - 1) as Passo : p));

  // Carrega sugestões ao entrar no passo 5
  const carregarSugestoes = async (servicoId: string) => {
    if (!slug || !servicoId) return;
    setCarregandoSugestoes(true);
    try {
      const res = await fetch(`/api/public/clinic/${slug}/vitrine?servicoId=${servicoId}`);
      const data = await res.json();
      setSugestoesProduto(Array.isArray(data.sugestoes) ? data.sugestoes : []);
    } catch { setSugestoesProduto([]); }
    finally { setCarregandoSugestoes(false); }
  };

  const toggleProdutoReservado = (p: ProdutoSugestao) => {
    setProdutosReservados(prev => {
      const ex = prev.find(r => r.id === p.id);
      if (ex) return prev.filter(r => r.id !== p.id);
      return [...prev, { id: p.id, nome: p.nome, preco: p.preco, imageUrl: p.imageUrl, quantidade: 1 }];
    });
  };

  const totalProdutos = produtosReservados.reduce((s, r) => s + r.preco * r.quantidade, 0);

  const confirmar = async () => {
    if (!servico || !dataSelecionada || !horario) return;
    setConfirmando(true);
    setErroConfirm('');
    const profId = profEscolhido || profissional?.id || 'qualquer';
    try {
      const res = await fetch(`/api/public/clinic/${slug}/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicoId: servico.id,
          profissionalId: profId,
          data: dataSelecionada,
          horario,
          clienteNome: clienteNome.trim(),
          clienteTelefone: clienteTelefone.replace(/\D/g, ''),
          tipoPagamento,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErroConfirm(data.error || 'Erro ao confirmar.'); return; }
      setProtocolo(data.protocolo);
      // Registrar produtos reservados se houver
      if (produtosReservados.length > 0 && data.agendamentoId) {
        try {
          await fetch(`/api/public/clinic/${slug}/vitrine`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agendamentoId: data.agendamentoId,
              items: produtosReservados.map(r => ({ produtoId: r.id, quantidade: r.quantidade, precoUnitario: r.preco })),
            }),
          });
        } catch { /* não bloquear sucesso do agendamento */ }
      }
      setPasso(7);
    } catch { setErroConfirm('Erro de conexão. Tente novamente.'); }
    finally { setConfirmando(false); }
  };

  /* ── Loading / Erro ── */
  if (carregando) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <div className="w-8 h-8 rounded-full border-2 border-sage-300 border-t-sage-600 animate-spin" style={{ borderTopColor: '#40916C', borderColor: '#D8F3DC' }} />
      </div>
    );
  }
  if (erro || !clinica) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center px-6" style={{ background: '#F5F0E8' }}>
        <div className="text-center">
          <p className="text-slate-500 text-sm">{erro || 'Estabelecimento não encontrado.'}</p>
        </div>
      </div>
    );
  }

  const logoUrl = (clinica.branding as any)?.logoUrl;

  return (
    <div className="min-h-[100svh]" style={{ background: cor }}>
      {/* Header fixo */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: cor }}>
        {logoUrl ? (
          <img src={logoUrl} alt={clinica.nome} style={{ height: 32, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 14,
          }}>
            {clinica.nome.charAt(0)}
          </div>
        )}
        <p style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>{clinica.nome}</p>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '0 16px 40px', maxWidth: 480, margin: '0 auto' }}>
        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 24, padding: '24px 20px',
          boxShadow: '0 4px 24px rgba(27,43,58,0.10)',
        }}>
          {passo < 6 && <IndicadorPassos passo={passo} cor={cor} />}

          {/* ── PASSO 1: Identificação ── */}
          {passo === 1 && (
            <div>
              <div className="text-center mb-6">
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B2B3A', marginBottom: 4 }}>
                  Olá! Como podemos te chamar?
                </h2>
                <p style={{ fontSize: 13, color: '#8A9BB0' }}>
                  Você receberá a confirmação no WhatsApp
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8A9BB0', marginBottom: 6 }}>
                    Seu nome completo
                  </label>
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={e => setClienteNome(e.target.value)}
                    placeholder="Ex: João Silva"
                    autoComplete="name"
                    autoFocus
                    style={{ width: '100%', height: 52, background: '#F8F6F1', border: '1.5px solid transparent', borderRadius: 12, padding: '0 16px', fontSize: 16, color: '#1B2B3A', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = cor; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = '#F8F6F1'; }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8A9BB0', marginBottom: 6 }}>
                    Seu WhatsApp
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={clienteTelefone}
                    onChange={e => setClienteTelefone(formatarTelefone(e.target.value))}
                    placeholder="(85) 99999-0000"
                    autoComplete="tel"
                    style={{ width: '100%', height: 52, background: '#F8F6F1', border: '1.5px solid transparent', borderRadius: 12, padding: '0 16px', fontSize: 16, color: '#1B2B3A', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = cor; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = '#F8F6F1'; }}
                  />
                  <p style={{ fontSize: 12, color: '#8A9BB0', marginTop: 4 }}>Você receberá a confirmação nesse número</p>
                </div>
              </div>
              <button
                onClick={avancar}
                disabled={!clienteNome.trim() || clienteTelefone.replace(/\D/g, '').length < 10}
                style={{ width: '100%', height: 52, borderRadius: 12, border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', marginTop: 24, background: cor, opacity: (!clienteNome.trim() || clienteTelefone.replace(/\D/g, '').length < 10) ? 0.4 : 1, transition: 'opacity 150ms' }}
              >
                Continuar →
              </button>
            </div>
          )}

          {/* ── PASSO 2: Serviço ── */}
          {passo === 2 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1B2B3A', marginBottom: 4 }}>O que você gostaria de fazer?</h2>
              <p style={{ fontSize: 13, color: '#8A9BB0', marginBottom: 20 }}>Escolha o serviço desejado</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {servicos.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#8A9BB0', fontSize: 13, padding: '24px 0' }}>Nenhum serviço disponível.</p>
                )}
                {servicos.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setServico(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: 14, borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${servico?.id === s.id ? cor : '#EEE9DF'}`,
                      background: servico?.id === s.id ? `${cor}0D` : 'white',
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: s.color ? `${s.color}25` : `${cor}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color || cor }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#1B2B3A' }}>{s.nome}</p>
                      <p style={{ fontSize: 12, color: '#8A9BB0', marginTop: 2 }}>
                        {s.duracaoMinutos} min{s.descricao ? ` · ${s.descricao}` : ''}
                      </p>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: cor, flexShrink: 0 }}>
                      {s.preco > 0 ? `R$ ${s.preco.toFixed(2).replace('.', ',')}` : 'Grátis'}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={voltar} style={{ flex: 1, height: 52, borderRadius: 12, border: '1.5px solid #EEE9DF', background: 'white', color: '#4A6480', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>← Voltar</button>
                <button onClick={avancar} disabled={!servico} style={{ flex: 2, height: 52, borderRadius: 12, border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', background: cor, opacity: !servico ? 0.4 : 1, transition: 'opacity 150ms' }}>Continuar →</button>
              </div>
            </div>
          )}

          {/* ── PASSO 3: Profissional ── */}
          {passo === 3 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1B2B3A', marginBottom: 4 }}>Com quem você prefere?</h2>
              <p style={{ fontSize: 13, color: '#8A9BB0', marginBottom: 20 }}>Escolha seu profissional</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Sem preferência */}
                <div
                  onClick={() => setProfissional({ id: 'qualquer', nome: 'Sem preferência' })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${profissional?.id === 'qualquer' ? cor : '#EEE9DF'}`,
                    background: profissional?.id === 'qualquer' ? `${cor}0D` : 'white',
                    transition: 'all 150ms',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0FAF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A9BB0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
                      <circle cx="17" cy="8" r="3"/><path d="M21 21v-1.5a3 3 0 00-3-3h-1"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1B2B3A' }}>Sem preferência</p>
                    <p style={{ fontSize: 12, color: '#8A9BB0' }}>Primeiro horário disponível</p>
                  </div>
                </div>

                {/* Profissionais do serviço */}
                {(servico?.profissionais ?? []).map(p => (
                  <div
                    key={p.id}
                    onClick={() => setProfissional({ id: p.id, nome: p.nome })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${profissional?.id === p.id ? cor : '#EEE9DF'}`,
                      background: profissional?.id === p.id ? `${cor}0D` : 'white',
                      transition: 'all 150ms',
                    }}
                  >
                    {p.fotoUrl ? (
                      <img src={p.fotoUrl} alt={p.nome} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: p.color || cor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                        {iniciais(p.nome)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#1B2B3A' }}>{p.nome}</p>
                      {p.especialidade && <p style={{ fontSize: 12, color: '#8A9BB0' }}>{p.especialidade}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={voltar} style={{ flex: 1, height: 52, borderRadius: 12, border: '1.5px solid #EEE9DF', background: 'white', color: '#4A6480', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>← Voltar</button>
                <button onClick={avancar} disabled={!profissional} style={{ flex: 2, height: 52, borderRadius: 12, border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', background: cor, opacity: !profissional ? 0.4 : 1, transition: 'opacity 150ms' }}>Continuar →</button>
              </div>
            </div>
          )}

          {/* ── PASSO 4: Data e Horário ── */}
          {passo === 4 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1B2B3A', marginBottom: 4 }}>Quando prefere?</h2>
              <p style={{ fontSize: 13, color: '#8A9BB0', marginBottom: 16 }}>Escolha o dia e horário</p>

              {/* Calendário horizontal */}
              <div ref={calendarRef} style={{ overflowX: 'auto', marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20, paddingBottom: 8 }} className="no-scrollbar">
                <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
                  {dias.map(iso => {
                    const d = new Date(iso + 'T00:00:00');
                    const hoje = new Date();
                    const isPast = d < hoje && d.toDateString() !== hoje.toDateString();
                    const isSel = iso === dataSelecionada;
                    return (
                      <div
                        key={iso}
                        onClick={() => {
                          if (isPast) return;
                          setDataSelecionada(iso);
                          buscarSlots(iso);
                        }}
                        style={{
                          minWidth: 52, display: 'flex', flexDirection: 'column', alignItems: 'center',
                          padding: '10px 4px', borderRadius: 12, cursor: isPast ? 'default' : 'pointer',
                          background: isSel ? cor : isPast ? '#F8F6F1' : 'white',
                          border: `1px solid ${isSel ? cor : isPast ? '#EEE9DF' : '#D8F3DC'}`,
                          opacity: isPast ? 0.4 : 1, transition: 'all 150ms',
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: isSel ? 'white' : '#8A9BB0', letterSpacing: '0.4px' }}>
                          {diasSemanaAbrev(d)}
                        </span>
                        <span style={{ fontSize: 20, fontWeight: 600, color: isSel ? 'white' : '#1B2B3A', lineHeight: 1.2 }}>
                          {d.getDate()}
                        </span>
                        {!isPast && (
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.6)' : cor, marginTop: 3 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slots */}
              {dataSelecionada && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: '#8A9BB0', marginBottom: 12 }}>
                    {formatarDataExibicao(dataSelecionada)}
                  </p>
                  {carregandoSlots ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${cor}30`, borderTopColor: cor, animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                    </div>
                  ) : slots.length === 0 ? (
                    <div>
                      {filaStatus === 'na_fila' ? (
                        <div style={{ background: `${cor}10`, border: `1.5px solid ${cor}30`, borderRadius: 14, padding: 16, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#1B2B3A', marginBottom: 4 }}>Você está na fila!</p>
                          <p style={{ fontSize: 12, color: '#8A9BB0' }}>Posição <strong>{filaPosicao}</strong> — te avisaremos pelo WhatsApp assim que abrir um horário.</p>
                        </div>
                      ) : (
                        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: 16 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 12 }}>
                            Nenhum horário disponível neste dia.
                          </p>
                          {carregandoAlternativas && (
                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${cor}30`, borderTopColor: cor, animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                            </div>
                          )}
                          {!carregandoAlternativas && alternativas.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Horários alternativos:</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {alternativas.map((alt, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      if (alt.data !== dataSelecionada) setDataSelecionada(alt.data);
                                      setHorario(alt.horario);
                                      buscarSlots(alt.data, alt.horario);
                                    }}
                                    style={{ width: '100%', padding: '10px 14px', background: 'white', border: '1px solid #EEE9DF', borderRadius: 8, textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#1B2B3A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                  >
                                    <span>
                                      {alt.tipo === 'outro_profissional'
                                        ? `${alt.profissional} disponível às ${alt.horario}`
                                        : `${alt.profissional} às ${alt.horario}${alt.data !== dataSelecionada ? ` (${alt.data.split('-').reverse().slice(0, 2).join('/')})` : ''}`
                                      }
                                    </span>
                                    <span style={{ color: cor, fontWeight: 600 }}>→</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {!carregandoAlternativas && clienteNome && clienteTelefone && (
                            <button
                              onClick={entrarNaFila}
                              disabled={filaStatus === 'entrando'}
                              style={{ width: '100%', padding: '11px 14px', background: 'transparent', border: `1.5px solid ${cor}`, borderRadius: 10, color: cor, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: filaStatus === 'entrando' ? 0.6 : 1 }}
                            >
                              {filaStatus === 'entrando' ? 'Entrando na fila...' : '⏳ Entrar na fila de espera'}
                            </button>
                          )}
                          {!clienteNome && (
                            <p style={{ fontSize: 11, color: '#92400E', marginTop: 8, textAlign: 'center' }}>
                              Volte ao início e informe seu nome para entrar na fila.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {slots.map(h => (
                        <div
                          key={h}
                          onClick={() => setHorario(h)}
                          style={{
                            padding: '12px 0', borderRadius: 10, textAlign: 'center',
                            fontSize: 14, fontWeight: 500, cursor: 'pointer',
                            background: horario === h ? cor : '#F8F6F1',
                            color: horario === h ? 'white' : '#1B2B3A',
                            border: `1px solid ${horario === h ? cor : '#EEE9DF'}`,
                            transition: 'all 150ms',
                          }}
                        >
                          {h}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={voltar} style={{ flex: 1, height: 52, borderRadius: 12, border: '1.5px solid #EEE9DF', background: 'white', color: '#4A6480', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>← Voltar</button>
                <button
                  onClick={() => { avancar(); if (servico) carregarSugestoes(servico.id); }}
                  disabled={!dataSelecionada || !horario}
                  style={{ flex: 2, height: 52, borderRadius: 12, border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', background: cor, opacity: !dataSelecionada || !horario ? 0.4 : 1, transition: 'opacity 150ms' }}
                >Continuar →</button>
              </div>
            </div>
          )}

          {/* ── PASSO 5: Produtos sugeridos ── */}
          {passo === 5 && servico && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🛍️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1B2B3A', marginBottom: 4 }}>Aproveite o atendimento!</h2>
                <p style={{ fontSize: 13, color: '#8A9BB0' }}>Reserve produtos para levar ou usar durante o serviço</p>
                <p style={{ fontSize: 11, color: '#B5C4D3', marginTop: 4 }}>💡 Reservar não cobra nada agora</p>
              </div>

              {carregandoSugestoes ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${cor}30`, borderTopColor: cor, animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                </div>
              ) : sugestoesProduto.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0 24px', color: '#8A9BB0', fontSize: 13 }}>
                  <p>Nenhum produto sugerido para este serviço.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {sugestoesProduto.map(p => {
                    const reservado = produtosReservados.some(r => r.id === p.id);
                    const semEstoque = p.estoque === 0;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14,
                          border: `2px solid ${reservado ? cor : '#EEE9DF'}`,
                          background: reservado ? `${cor}0D` : 'white', transition: 'all 150ms',
                          opacity: semEstoque ? 0.5 : 1,
                        }}
                      >
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.nome} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/></svg>
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#1B2B3A' }}>{p.nome}</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: cor, marginTop: 2 }}>R$ {p.preco.toFixed(2).replace('.', ',')}</p>
                          {p.estoque <= 3 && p.estoque > 0 && <p style={{ fontSize: 10, color: '#D97706', fontWeight: 600 }}>Últimas unidades</p>}
                          {semEstoque && <p style={{ fontSize: 10, color: '#9CA3AF' }}>Indisponível</p>}
                        </div>
                        {!semEstoque && (
                          <button
                            onClick={() => toggleProdutoReservado(p)}
                            style={{
                              width: 32, height: 32, borderRadius: '50%', border: `2px solid ${cor}`,
                              background: reservado ? cor : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'all 150ms', flexShrink: 0,
                            }}
                          >
                            {reservado ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2.5"><path strokeLinecap="round" d="M12 4v16M4 12h16"/></svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Link para vitrine completa */}
              <a
                href={`/agendar/${slug}/vitrine`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px 0', borderRadius: 10, border: `1.5px solid ${cor}30`, background: `${cor}08`, color: cor, fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 16, boxSizing: 'border-box' }}
              >
                🏪 Ver vitrine completa
              </a>

              {/* Mini resumo do carrinho */}
              {produtosReservados.length > 0 && (
                <div style={{ background: `${cor}0D`, border: `1.5px solid ${cor}30`, borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: cor, fontWeight: 600, marginBottom: 6 }}>Reservados ({produtosReservados.length})</p>
                  {produtosReservados.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#1B2B3A', marginBottom: 2 }}>
                      <span>{r.nome}</span>
                      <span style={{ fontWeight: 500 }}>R$ {r.preco.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${cor}20`, marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 }}>
                    <span style={{ color: '#1B2B3A' }}>Total produtos</span>
                    <span style={{ color: cor }}>R$ {totalProdutos.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={voltar} style={{ flex: 1, height: 52, borderRadius: 12, border: '1.5px solid #EEE9DF', background: 'white', color: '#4A6480', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>← Voltar</button>
                <button onClick={avancar} style={{ flex: 2, height: 52, borderRadius: 12, border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', background: cor }}>
                  {produtosReservados.length > 0 ? `Continuar com ${produtosReservados.length} produto(s) →` : 'Pular →'}
                </button>
              </div>
            </div>
          )}

          {/* ── PASSO 6: Confirmar + Pagamento ── */}
          {passo === 6 && servico && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1B2B3A', marginBottom: 4 }}>Confirmar agendamento</h2>
              <p style={{ fontSize: 13, color: '#8A9BB0', marginBottom: 20 }}>Revise os detalhes antes de confirmar</p>

              {/* Resumo */}
              <div style={{ background: '#F8F6F1', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                {[
                  { label: 'Serviço', value: servico.nome },
                  { label: 'Profissional', value: profissional?.id === 'qualquer' ? 'Sem preferência' : profissional?.nome || '—' },
                  { label: 'Data', value: formatarDataExibicao(dataSelecionada) },
                  { label: 'Horário', value: horario },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #EEE9DF' : 'none' }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8A9BB0' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1B2B3A', textAlign: 'right', maxWidth: '60%' }}>{item.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #EEE9DF' }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8A9BB0' }}>Serviço</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1B2B3A' }}>{servico.preco > 0 ? `R$ ${servico.preco.toFixed(2).replace('.', ',')}` : 'Grátis'}</span>
                </div>
                {produtosReservados.length > 0 && (
                  <>
                    {produtosReservados.map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #EEE9DF' }}>
                        <span style={{ fontSize: 11, color: '#8A9BB0' }}>🛍️ {r.nome}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#1B2B3A' }}>R$ {r.preco.toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid #EEE9DF', marginTop: 4 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8A9BB0' }}>Total estimado</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: cor }}>
                    R$ {(servico.preco + totalProdutos).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Pagamento */}
              {servico.preco > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: '#8A9BB0', marginBottom: 10 }}>Como prefere pagar?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Pagar na hora — sempre visível */}
                    {(['hora'] as const).concat(clinica.aceitaPagamento ? (['total', 'sinal'] as const) : []).map(tipo => {
                      const opcoes = {
                        hora: { label: 'Pagar na hora', sub: 'Pague no dia do atendimento' },
                        total: { label: 'Pagar agora (100%)', sub: `R$ ${servico.preco.toFixed(2).replace('.', ',')} — garante seu horário` },
                        sinal: { label: 'Sinal (50%)', sub: `R$ ${(servico.preco * 0.5).toFixed(2).replace('.', ',')} agora + R$ ${(servico.preco * 0.5).toFixed(2).replace('.', ',')} no dia` },
                      };
                      const op = opcoes[tipo];
                      const sel = tipoPagamento === tipo;
                      return (
                        <label key={tipo} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, cursor: 'pointer', border: `2px solid ${sel ? cor : '#EEE9DF'}`, background: sel ? `${cor}0D` : 'white', transition: 'all 150ms' }}>
                          <input type="radio" name="pagamento" checked={sel} onChange={() => setTipoPagamento(tipo)} style={{ accentColor: cor, marginTop: 2, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#1B2B3A' }}>
                              {op.label}
                              {tipo === 'total' && (
                                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: cor, background: `${cor}20`, padding: '2px 8px', borderRadius: 20 }}>Recomendado</span>
                              )}
                            </p>
                            <p style={{ fontSize: 12, color: '#8A9BB0', marginTop: 2 }}>{op.sub}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dados do cliente */}
              <div style={{ background: '#F8F6F1', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1B2B3A' }}>{clienteNome}</p>
                  <p style={{ fontSize: 12, color: '#8A9BB0' }}>{clienteTelefone}</p>
                </div>
                <button onClick={() => setPasso(1)} style={{ fontSize: 12, color: '#8A9BB0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Alterar</button>
              </div>

              {erroConfirm && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: '#DC2626' }}>{erroConfirm}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={voltar} style={{ flex: 1, height: 52, borderRadius: 12, border: '1.5px solid #EEE9DF', background: 'white', color: '#4A6480', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>← Voltar</button>
                <button onClick={confirmar} disabled={confirmando} style={{ flex: 2, height: 52, borderRadius: 12, border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', background: cor, opacity: confirmando ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {confirmando ? (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
                      Confirmando...
                    </>
                  ) : 'Confirmar agendamento'}
                </button>
              </div>
            </div>
          )}

          {/* ── PASSO 7: Sucesso ── */}
          {passo === 7 && servico && (
            <div style={{ textAlign: 'center' }}>
              {/* Ícone de sucesso */}
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M23 7L11 19l-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1B2B3A', marginBottom: 6 }}>Agendamento confirmado!</h2>
              <p style={{ fontSize: 13, color: '#8A9BB0', marginBottom: 16 }}>
                Você receberá uma confirmação no WhatsApp
              </p>

              {/* Protocolo */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F8F6F1', borderRadius: 20, padding: '6px 16px', marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: '#8A9BB0' }}>Protocolo:</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1B2B3A', letterSpacing: '0.1em' }}>#{protocolo}</span>
              </div>

              {/* Resumo final */}
              <div style={{ background: '#F8F6F1', borderRadius: 16, padding: 16, textAlign: 'left', marginBottom: 20 }}>
                {[
                  { icon: '📅', label: 'Data e horário', value: `${formatarDataExibicao(dataSelecionada)} às ${horario}` },
                  { icon: '✂️', label: 'Serviço', value: servico.nome },
                  { icon: '🏠', label: 'Local', value: clinica.nome },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid #EEE9DF' }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <p style={{ fontSize: 11, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1B2B3A' }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adicionar ao calendário */}
              <a
                href={gerarLinkCalendario({ titulo: `${servico.nome} — ${clinica.nome}`, data: dataSelecionada, horario, duracao: servico.duracaoMinutos })}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 0', borderRadius: 12, border: '1.5px solid #EEE9DF', background: 'white', color: '#4A6480', fontSize: 14, fontWeight: 500, textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Adicionar ao calendário
              </a>

              <button
                onClick={() => {
                  setPasso(1); setServico(null); setProfissional(null);
                  setDataSelecionada(''); setSlots([]); setHorario('');
                  setTipoPagamento('hora'); setProtocolo(''); setErroConfirm('');
                  setProdutosReservados([]); setSugestoesProduto([]);
                }}
                style={{ fontSize: 14, color: cor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
              >
                Fazer outro agendamento
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '0 0 16px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
        Powered by Synka
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
