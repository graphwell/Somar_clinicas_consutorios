'use client'
import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-utils'
import { CanvasAssinatura } from '@/components/ui/CanvasAssinatura'
import { SliderAntesDePois } from '@/components/ui/SliderAntesDePois'

type Step = 1 | 2 | 3 | 4 | 5

interface DadosFluxo {
  pacienteId: string
  pacienteNome: string
  profissionalId: string
  profissionalNome: string
  procedimento: string
  tipoAssinatura: 'checkbox' | 'manuscrita'
  assinaturaImg: string | null
  checkboxAceito: boolean
  consentimentoId: string | null
  fotoAntesUrl: string
  dataAntes: string
  fotoDepoisUrl: string
  periodoTratamento: string
  laudoIA: string
  laudoEditado: string
  assinaturaProfissional: string | null
  slug: string
  urlPublica: string
}

export default function AntesDePoisNovo() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [dados, setDados] = useState<DadosFluxo>({
    pacienteId: searchParams.get('clienteId') ?? '',
    pacienteNome: '',
    profissionalId: '',
    profissionalNome: '',
    procedimento: '',
    tipoAssinatura: 'checkbox',
    assinaturaImg: null,
    checkboxAceito: false,
    consentimentoId: null,
    fotoAntesUrl: '',
    dataAntes: new Date().toISOString().slice(0, 10),
    fotoDepoisUrl: '',
    periodoTratamento: '',
    laudoIA: '',
    laudoEditado: '',
    assinaturaProfissional: null,
    slug: '',
    urlPublica: '',
  })

  const [pacientes, setPacientes] = useState<{ id: string; nome: string }[]>([])
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([])
  const [buscaPaciente, setBuscaPaciente] = useState('')

  const inputAntesRef = useRef<HTMLInputElement>(null)
  const inputAntesCamRef = useRef<HTMLInputElement>(null)
  const inputDepoisRef = useRef<HTMLInputElement>(null)
  const inputDepoisCamRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchWithAuth('/api/team').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProfissionais(data.map((p: any) => ({ id: p.id, nome: p.nome })))
    })
  }, [])

  useEffect(() => {
    if (buscaPaciente.length < 2) return setPacientes([])
    const t = setTimeout(() => {
      fetchWithAuth(`/api/patients?search=${encodeURIComponent(buscaPaciente)}&limit=10`)
        .then(r => r.json())
        .then(data => {
          const lista = Array.isArray(data) ? data : (data.patients ?? [])
          setPacientes(lista.map((p: any) => ({ id: p.id, nome: p.nome })))
        })
    }, 300)
    return () => clearTimeout(t)
  }, [buscaPaciente])

  function gerarTermoPreview(): string {
    const data = new Intl.DateTimeFormat('pt-BR').format(new Date())
    return `TERMO DE AUTORIZACAO DE USO DE IMAGEM E DADOS\n\nEu, ${dados.pacienteNome || '[cliente]'}, declaro que autorizo expressamente a captura, armazenamento e utilizacao de fotografias do procedimento "${dados.procedimento || '[procedimento]'}" realizado em ${data} pela(o) profissional ${dados.profissionalNome || '[profissional]'}.\n\nAs imagens poderao ser utilizadas para acompanhamento do tratamento e compartilhamento via WhatsApp ou link privado, sempre com minha autorizacao.\n\nTenho ciencia dos meus direitos LGPD (Lei 13.709/2018) e posso revogar esta autorizacao a qualquer momento.\n\nData: ${data}\nRegistro eletronico via plataforma Synka`
  }

  async function handleUploadFoto(file: File, tipo: 'antes' | 'depois') {
    const form = new FormData()
    form.append('file', file)
    form.append('tipo', tipo)
    const res = await fetchWithAuth('/api/antes-depois/upload-foto', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.url as string
  }

  async function handleStep1Submit() {
    setErro('')
    if (!dados.pacienteId) return setErro('Selecione o cliente')
    if (!dados.profissionalId) return setErro('Selecione o profissional')
    if (!dados.procedimento.trim()) return setErro('Informe o procedimento')
    if (dados.tipoAssinatura === 'checkbox' && !dados.checkboxAceito) return setErro('Marque a caixa de concordancia')
    if (dados.tipoAssinatura === 'manuscrita' && !dados.assinaturaImg) return setErro('Adicione a assinatura manuscrita')

    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/antes-depois/consentimento', {
        method: 'POST',
        body: JSON.stringify({
          pacienteId: dados.pacienteId,
          profissionalId: dados.profissionalId,
          procedimento: dados.procedimento,
          tipoAssinatura: dados.tipoAssinatura,
          assinaturaImg: dados.assinaturaImg,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setDados(d => ({ ...d, consentimentoId: result.consentimentoId }))
      setStep(2)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFotoAntes(file: File) {
    setLoading(true)
    try {
      const url = await handleUploadFoto(file, 'antes')
      setDados(d => ({ ...d, fotoAntesUrl: url }))
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFotoDepois(file: File) {
    setLoading(true)
    try {
      const url = await handleUploadFoto(file, 'depois')
      setDados(d => ({ ...d, fotoDepoisUrl: url }))
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGerarLaudo() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetchWithAuth('/api/antes-depois/gerar-laudo', {
        method: 'POST',
        body: JSON.stringify({
          fotoAntesUrl: dados.fotoAntesUrl,
          fotoDepoisUrl: dados.fotoDepoisUrl,
          procedimento: dados.procedimento,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setDados(d => ({ ...d, laudoIA: result.laudo, laudoEditado: result.laudo }))
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePublicar() {
    if (!dados.assinaturaProfissional) return setErro('Assine como profissional responsavel')
    setLoading(true)
    setErro('')
    try {
      const res = await fetchWithAuth('/api/antes-depois/publicar', {
        method: 'POST',
        body: JSON.stringify({
          pacienteId: dados.pacienteId,
          profissionalId: dados.profissionalId,
          consentimentoId: dados.consentimentoId,
          fotoAntesUrl: dados.fotoAntesUrl,
          fotoDepoisUrl: dados.fotoDepoisUrl,
          procedimento: dados.procedimento,
          periodoTratamento: dados.periodoTratamento,
          dataAntes: dados.dataAntes,
          laudoIA: dados.laudoIA,
          laudoEditado: dados.laudoEditado,
          assinaturaProfissional: dados.assinaturaProfissional,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setDados(d => ({ ...d, slug: result.slug, urlPublica: result.urlPublica }))
      setStep(5)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = ['Consentimento', 'Foto Antes', 'Foto Depois', 'Laudo', 'Publicado']

  return (
    <div className="max-w-2xl mx-auto pb-20 animate-premium">
      {/* Header */}
      <div className="bg-white border border-card-border rounded-[3rem] p-8 mb-8 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-text-main">Novo Resultado</h1>
            <p className="text-[9px] font-black text-text-placeholder uppercase tracking-widest">{stepLabels[step - 1]}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5">
          {stepLabels.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i < step ? 'bg-primary' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm mb-6 font-medium">{erro}</div>
      )}

      {/* STEP 1: Consentimento */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white border border-card-border rounded-[2.5rem] p-8 space-y-6 shadow-sm">
            <h2 className="font-black text-lg uppercase italic tracking-tighter text-text-main">Dados do Atendimento</h2>

            {/* Busca de cliente */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-placeholder uppercase tracking-widest">Cliente</label>
              {dados.pacienteNome ? (
                <div className="flex items-center justify-between p-4 bg-primary-soft border border-primary/20 rounded-2xl">
                  <span className="font-bold text-primary text-sm">{dados.pacienteNome}</span>
                  <button type="button" onClick={() => setDados(d => ({ ...d, pacienteId: '', pacienteNome: '' }))}
                    className="text-[10px] text-text-placeholder hover:text-red-500">Trocar</button>
                </div>
              ) : (
                <div className="relative">
                  <input value={buscaPaciente} onChange={e => setBuscaPaciente(e.target.value)}
                    placeholder="Buscar cliente pelo nome..."
                    className="input-premium w-full" />
                  {pacientes.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-card-border rounded-2xl shadow-xl overflow-hidden">
                      {pacientes.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => { setDados(d => ({ ...d, pacienteId: p.id, pacienteNome: p.nome })); setBuscaPaciente(''); setPacientes([]) }}
                          className="w-full text-left px-5 py-3 text-sm hover:bg-slate-50 font-medium border-b border-slate-50 last:border-0">
                          {p.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profissional */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-placeholder uppercase tracking-widest">Profissional responsavel</label>
              <select value={dados.profissionalId} onChange={e => {
                const p = profissionais.find(x => x.id === e.target.value)
                setDados(d => ({ ...d, profissionalId: e.target.value, profissionalNome: p?.nome ?? '' }))
              }} className="input-premium w-full">
                <option value="">Selecionar...</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>

            {/* Procedimento */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-placeholder uppercase tracking-widest">Procedimento</label>
              <input value={dados.procedimento} onChange={e => setDados(d => ({ ...d, procedimento: e.target.value }))}
                placeholder="Ex: Limpeza de Pele, Coloracao, Corte..." className="input-premium w-full" />
            </div>
          </div>

          {/* Termo LGPD */}
          <div className="bg-white border border-card-border rounded-[2.5rem] p-8 space-y-6 shadow-sm">
            <h2 className="font-black text-base uppercase italic tracking-tighter text-text-main">Termo de Autorizacao de Imagem</h2>
            <div className="bg-slate-50 rounded-2xl p-5 h-48 overflow-y-auto text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-mono border border-card-border">
              {gerarTermoPreview()}
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">Forma de assinatura</p>
              <div className="grid grid-cols-2 gap-3">
                {(['checkbox', 'manuscrita'] as const).map(tipo => (
                  <button key={tipo} type="button"
                    onClick={() => setDados(d => ({ ...d, tipoAssinatura: tipo }))}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${dados.tipoAssinatura === tipo ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 text-text-placeholder border-card-border'}`}>
                    {tipo === 'checkbox' ? 'Concordancia' : 'Manuscrita'}
                  </button>
                ))}
              </div>

              {dados.tipoAssinatura === 'checkbox' ? (
                <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl border border-card-border">
                  <input type="checkbox" checked={dados.checkboxAceito}
                    onChange={e => setDados(d => ({ ...d, checkboxAceito: e.target.checked }))}
                    className="mt-0.5 accent-primary" />
                  <span className="text-xs text-text-main font-medium leading-relaxed">
                    Eu, <strong>{dados.pacienteNome || '[cliente]'}</strong>, li e concordo com os termos acima e autorizo o uso das minhas imagens conforme descrito.
                  </span>
                </label>
              ) : (
                <CanvasAssinatura onChange={base64 => setDados(d => ({ ...d, assinaturaImg: base64 }))} />
              )}
            </div>
          </div>

          <button onClick={handleStep1Submit} disabled={loading}
            className="btn-primary w-full py-5 rounded-[1.5rem] text-[11px] disabled:opacity-60">
            {loading ? 'Registrando...' : 'Aceitar e continuar →'}
          </button>
        </div>
      )}

      {/* STEP 2: Foto Antes */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white border border-card-border rounded-[2.5rem] p-8 space-y-6 shadow-sm">
            <h2 className="font-black text-lg uppercase italic tracking-tighter text-text-main">Foto ANTES do Procedimento</h2>

            <div className="w-full aspect-square rounded-[2rem] bg-slate-50 border-2 border-dashed border-card-border flex items-center justify-center overflow-hidden">
              {dados.fotoAntesUrl ? (
                <img src={dados.fotoAntesUrl} className="w-full h-full object-cover" alt="antes" />
              ) : (
                <div className="text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-text-placeholder">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">Sem foto</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => inputAntesRef.current?.click()}
                className="flex items-center justify-center gap-2 py-4 border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-placeholder hover:border-primary/30 hover:text-primary transition-all bg-slate-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Galeria
              </button>
              <button type="button" onClick={() => inputAntesCamRef.current?.click()}
                className="flex items-center justify-center gap-2 py-4 border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-placeholder hover:border-primary/30 hover:text-primary transition-all bg-slate-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Camera
              </button>
            </div>
            <input ref={inputAntesRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoAntes(f); e.target.value = '' }} />
            <input ref={inputAntesCamRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoAntes(f); e.target.value = '' }} />

            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-placeholder uppercase tracking-widest">Data desta foto</label>
              <input type="date" value={dados.dataAntes} onChange={e => setDados(d => ({ ...d, dataAntes: e.target.value }))}
                className="input-premium w-full" />
            </div>
          </div>

          <button onClick={() => { if (!dados.fotoAntesUrl) return setErro('Adicione a foto antes'); setErro(''); setStep(3) }}
            className="btn-primary w-full py-5 rounded-[1.5rem] text-[11px] disabled:opacity-60" disabled={loading}>
            {loading ? 'Enviando...' : 'Continuar →'}
          </button>
        </div>
      )}

      {/* STEP 3: Foto Depois */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white border border-card-border rounded-[2.5rem] p-8 space-y-6 shadow-sm">
            <h2 className="font-black text-lg uppercase italic tracking-tighter text-text-main">Foto DEPOIS do Procedimento</h2>

            {dados.fotoAntesUrl && dados.fotoDepoisUrl && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-placeholder mb-2">Antes</p>
                  <img src={dados.fotoAntesUrl} className="w-full aspect-square object-cover rounded-2xl" alt="antes" />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-primary mb-2">Depois</p>
                  <img src={dados.fotoDepoisUrl} className="w-full aspect-square object-cover rounded-2xl" alt="depois" />
                </div>
              </div>
            )}

            {!dados.fotoDepoisUrl && (
              <div className="w-full aspect-square rounded-[2rem] bg-slate-50 border-2 border-dashed border-card-border flex items-center justify-center">
                <div className="text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-text-placeholder">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">Sem foto</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => inputDepoisRef.current?.click()}
                className="flex items-center justify-center gap-2 py-4 border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-placeholder hover:border-primary/30 hover:text-primary transition-all bg-slate-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Galeria
              </button>
              <button type="button" onClick={() => inputDepoisCamRef.current?.click()}
                className="flex items-center justify-center gap-2 py-4 border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-placeholder hover:border-primary/30 hover:text-primary transition-all bg-slate-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Camera
              </button>
            </div>
            <input ref={inputDepoisRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoDepois(f); e.target.value = '' }} />
            <input ref={inputDepoisCamRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoDepois(f); e.target.value = '' }} />

            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-placeholder uppercase tracking-widest">Periodo entre as fotos</label>
              <input value={dados.periodoTratamento} onChange={e => setDados(d => ({ ...d, periodoTratamento: e.target.value }))}
                placeholder="Ex: 30 dias, 3 sessoes..." className="input-premium w-full" />
            </div>
          </div>

          <button onClick={async () => {
            if (!dados.fotoDepoisUrl) return setErro('Adicione a foto depois')
            if (!dados.periodoTratamento.trim()) return setErro('Informe o periodo de tratamento')
            setErro('')
            setStep(4)
            await handleGerarLaudo()
          }} className="btn-primary w-full py-5 rounded-[1.5rem] text-[11px]" disabled={loading}>
            {loading ? 'Enviando...' : 'Continuar →'}
          </button>
        </div>
      )}

      {/* STEP 4: Laudo */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Slider */}
          <div className="bg-white border border-card-border rounded-[2.5rem] p-8 space-y-4 shadow-sm">
            <h2 className="font-black text-lg uppercase italic tracking-tighter text-text-main">Comparacao</h2>
            <SliderAntesDePois fotoAntes={dados.fotoAntesUrl} fotoDepois={dados.fotoDepoisUrl} />
            <p className="text-[10px] text-text-placeholder text-center font-medium">Arraste para comparar</p>
          </div>

          {/* Laudo */}
          <div className="bg-white border border-card-border rounded-[2.5rem] p-8 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base uppercase italic tracking-tighter text-text-main">Laudo da Analise</h2>
              <button type="button" onClick={handleGerarLaudo} disabled={loading}
                className="text-[9px] font-black uppercase tracking-widest text-primary hover:opacity-70 disabled:opacity-40">
                {loading ? 'Gerando...' : 'Regerar'}
              </button>
            </div>

            {loading && !dados.laudoIA && (
              <div className="py-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-text-placeholder">Analisando com IA...</p>
              </div>
            )}

            {dados.laudoIA && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[10px] text-amber-700 font-medium">
                  Analise gerada por IA — revise e edite se necessario antes de publicar
                </div>
                <textarea value={dados.laudoEditado} onChange={e => setDados(d => ({ ...d, laudoEditado: e.target.value }))}
                  rows={10} className="w-full bg-slate-50 border border-card-border rounded-2xl px-5 py-4 text-sm font-medium text-text-main leading-relaxed focus:outline-none focus:border-primary resize-none" />
              </>
            )}

            {dados.laudoIA && (
              <div className="space-y-3 pt-4 border-t border-slate-50">
                <p className="text-[9px] font-black text-text-placeholder uppercase tracking-widest">Assinar como profissional responsavel</p>
                <CanvasAssinatura onChange={base64 => setDados(d => ({ ...d, assinaturaProfissional: base64 }))} />
              </div>
            )}
          </div>

          <button onClick={handlePublicar} disabled={loading || !dados.laudoIA}
            className="btn-primary w-full py-5 rounded-[1.5rem] text-[11px] disabled:opacity-60">
            {loading ? 'Publicando...' : 'Validar e publicar →'}
          </button>
        </div>
      )}

      {/* STEP 5: Publicado */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="bg-white border border-card-border rounded-[2.5rem] p-8 text-center space-y-5 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="font-black text-xl uppercase italic tracking-tighter text-text-main">Resultado Publicado!</h2>
            <p className="text-sm text-text-muted font-medium">Link publico gerado com sucesso</p>

            <div className="bg-slate-50 border border-card-border rounded-2xl px-5 py-4 font-mono text-xs text-text-main break-all">
              {dados.urlPublica}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(`Confira o resultado:\n${dados.urlPublica}`)}`} target="_blank"
                className="flex items-center justify-center gap-2 py-4 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-colors">
                WhatsApp
              </a>
              <button type="button" onClick={() => navigator.clipboard.writeText(dados.urlPublica).then(() => alert('Link copiado!'))}
                className="flex items-center justify-center gap-2 py-4 border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-placeholder hover:bg-slate-50 transition-colors">
                Copiar link
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <a href={dados.urlPublica} target="_blank"
                className="flex items-center justify-center py-3 border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-placeholder hover:bg-slate-50 transition-colors">
                Ver pagina
              </a>
              <button onClick={() => router.push('/dashboard/antes-depois')}
                className="flex items-center justify-center py-3 border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-placeholder hover:bg-slate-50 transition-colors">
                Ver historico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
