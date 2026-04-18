'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-utils'
import { SliderAntesDePois } from '@/components/ui/SliderAntesDePois'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://synka.somar.ia.br'

interface Resultado {
  id: string
  procedimento: string
  periodoTratamento: string
  publicado: boolean
  createdAt: string
  totalVisualizacoes: number
  slugPublico: string
  fotoAntesUrl: string
  fotoDepoisUrl: string
  imagemPngUrl: string | null
  imagemGeradaEm: string | null
  imagemExpirarEm: string | null
  laudoEditado: string | null
  laudoIA: string
  paciente: { nome: string }
  profissional: { nome: string; fotoUrl: string | null }
}

interface Branding {
  nome: string
  logoUrl?: string
  primaryColor?: string
}

/* ─── Canvas client-side ────────────────────────────────────────── */
function carregarImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function gerarPNG(r: Resultado, branding: Branding): Promise<string> {
  const W = 1080, H = 1080
  const cor = branding.primaryColor ?? '#40916C'
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, 160)
  ctx.fillStyle = cor; ctx.fillRect(0, 0, W, 4)

  if (branding.logoUrl) {
    try {
      const logo = await carregarImg(branding.logoUrl)
      const lH = 70, lW = (logo.width / logo.height) * lH
      ctx.drawImage(logo, 40, 45, lW, lH)
    } catch {}
  }

  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 28px sans-serif'
  ctx.fillText(branding.nome, 140, 85)
  ctx.fillStyle = cor; ctx.font = '18px sans-serif'
  ctx.fillText('Resultado verificado', 140, 115)

  const fY = 160, fH = 760, fW = W / 2

  for (const [url, ox] of [[r.fotoAntesUrl, 0], [r.fotoDepoisUrl, fW]] as [string, number][]) {
    try {
      const img = await carregarImg(url)
      ctx.save(); ctx.beginPath(); ctx.rect(ox, fY, fW, fH); ctx.clip()
      const sc = Math.max(fW / img.width, fH / img.height)
      ctx.drawImage(img, ox + (fW - img.width * sc) / 2, fY + (fH - img.height * sc) / 2, img.width * sc, img.height * sc)
      ctx.restore()
    } catch {}
  }

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(W / 2 - 2, fY, 4, fH)
  ctx.beginPath(); ctx.arc(W / 2, fY + fH / 2, 30, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFFFF'; ctx.fill()
  ctx.fillStyle = '#1B2B3A'; ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'; ctx.fillText('↔', W / 2, fY + fH / 2 + 8)
  ctx.textAlign = 'left'

  for (const [label, x] of [['ANTES', 30], ['DEPOIS', W - 100]] as [string, number][]) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x === 30 ? 20 : W - 110, fY + 20, 90, 32)
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(label, x, fY + 41)
  }

  ctx.fillStyle = '#111111'; ctx.fillRect(0, 920, W, 160)
  ctx.fillStyle = cor; ctx.fillRect(0, 920, W, 3)
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(r.procedimento, W / 2, 960)
  ctx.fillStyle = '#8A9BB0'; ctx.font = '18px sans-serif'
  ctx.fillText(`${r.periodoTratamento} · ${r.profissional.nome}`, W / 2, 990)
  ctx.fillStyle = '#4A6480'; ctx.font = '14px sans-serif'
  ctx.fillText('Imagem publicada com autorização do cliente', W / 2, 1020)
  ctx.fillStyle = cor; ctx.font = 'bold 16px sans-serif'
  ctx.fillText('synka.somar.ia.br', W / 2, 1055)

  return canvas.toDataURL('image/png')
}

/* ─── Drawer de ações ───────────────────────────────────────────── */
const WA_ICON = <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>

function Drawer({
  resultado, branding, onClose,
}: {
  resultado: Resultado
  branding: Branding | null
  onClose: () => void
}) {
  const [tab, setTab] = useState<'compartilhar' | 'imagem'>('compartilhar')
  const [imgUrl, setImgUrl] = useState<string | null>(
    resultado.imagemExpirarEm && new Date(resultado.imagemExpirarEm) < new Date()
      ? null  // descarta imagem expirada imediatamente
      : resultado.imagemPngUrl
  )
  const [gerando, setGerando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const urlPublica = `${BASE_URL}/r/${resultado.slugPublico}`

  const handleGerar = async () => {
    if (!branding || gerando) return
    setGerando(true)
    try {
      const png = await gerarPNG(resultado, branding)
      setImgUrl(png)
      fetchWithAuth('/api/antes-depois/salvar-imagem', {
        method: 'POST',
        body: JSON.stringify({ resultadoId: resultado.id, imagemPngUrl: png }),
      }).catch(() => {})
    } catch (err) {
      console.error('[drawer gerarPNG]', err)
    }
    setGerando(false)
  }

  const handleCopiar = () => {
    navigator.clipboard.writeText(urlPublica).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  // Ao trocar para a aba imagem sem imagem disponível → gera automaticamente
  useEffect(() => {
    if (tab === 'imagem' && !imgUrl && !gerando && branding) {
      handleGerar()
    }
  }, [tab, branding])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-black text-base uppercase italic tracking-tighter text-slate-800">{resultado.procedimento}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{resultado.paciente.nome} · {resultado.periodoTratamento}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Slider de comparação */}
        <div className="shrink-0 px-4 pt-4">
          <SliderAntesDePois fotoAntes={resultado.fotoAntesUrl} fotoDepois={resultado.fotoDepoisUrl} />
          <p className="text-[10px] text-slate-400 text-center mt-1 mb-3">Arraste para comparar</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          {(['compartilhar', 'imagem'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
            >
              {t === 'compartilhar' ? '🔗 Compartilhar' : '🖼 Imagem PNG'}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">

          {tab === 'compartilhar' && (
            <>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Link público</p>
                <p className="text-xs text-slate-600 font-mono break-all leading-relaxed">{urlPublica}</p>
              </div>

              <button
                onClick={handleCopiar}
                className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${copiado ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-primary text-white hover:opacity-90'}`}
              >
                {copiado ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copiado!</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar link</>
                )}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Veja o resultado de ${resultado.procedimento}!\n${urlPublica}`)}`}
                target="_blank"
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                {WA_ICON} Enviar pelo WhatsApp
              </a>

              <a
                href={urlPublica}
                target="_blank"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                Ver página pública
              </a>

              <p className="text-center text-[10px] text-slate-300 pt-1">
                {resultado.totalVisualizacoes} visualização{resultado.totalVisualizacoes !== 1 ? 'ões' : ''}
              </p>
            </>
          )}

          {tab === 'imagem' && (
            <>
              {/* Preview */}
              <div className="rounded-2xl overflow-hidden bg-slate-900" style={{ aspectRatio: '1' }}>
                {gerando && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full border-[3px] border-primary/30 border-t-primary animate-spin" />
                    <p className="text-slate-400 text-xs">Gerando imagem 1080×1080...</p>
                  </div>
                )}
                {!gerando && imgUrl && (
                  <img src={imgUrl} alt="preview" className="w-full h-full object-cover" />
                )}
                {!gerando && !imgUrl && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4A6480" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <p className="text-slate-400 text-sm">Imagem não gerada ainda</p>
                    <button
                      onClick={handleGerar}
                      disabled={!branding}
                      className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      Gerar agora
                    </button>
                  </div>
                )}
              </div>

              {imgUrl && resultado.imagemExpirarEm && (
                <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span>⏳</span>
                  <p className="text-xs text-amber-700">
                    Expira em {new Date(resultado.imagemExpirarEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}

              {imgUrl && (
                <a
                  href={imgUrl}
                  download={`resultado-${resultado.slugPublico}.png`}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white bg-primary hover:opacity-90 transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  Baixar PNG 1080×1080
                </a>
              )}

              {imgUrl && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Veja o resultado de ${resultado.procedimento}!\n${urlPublica}`)}`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:opacity-90 transition-opacity"
                  style={{ background: '#25D366' }}
                >
                  {WA_ICON} Enviar pelo WhatsApp
                </a>
              )}

              {imgUrl && (
                <button
                  onClick={handleGerar}
                  disabled={gerando}
                  className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  {gerando ? 'Gerando...' : 'Regenerar imagem'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ─── Página principal ──────────────────────────────────────────── */
export default function AntesDePoisPage() {
  const router = useRouter()
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(true)
  const [selecionado, setSelecionado] = useState<Resultado | null>(null)
  const [branding, setBranding] = useState<Branding | null>(null)

  useEffect(() => {
    fetchWithAuth('/api/antes-depois')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setResultados(data) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchWithAuth('/api/settings').then(r => r.json()).then(data => {
      if (data.clinica) {
        const b = data.clinica.configBranding as any
        setBranding({ nome: data.clinica.nome || '', logoUrl: b?.logoUrl, primaryColor: b?.primaryColor })
      }
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-40 animate-premium">

      {/* Header */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">
              Antes e <span className="text-primary">Depois</span>
            </h2>
            <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.2em] mt-1 opacity-60">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} publicado{resultados.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={() => router.push('/dashboard/antes-depois/novo')}
          className="w-full md:w-auto px-10 py-5 bg-primary text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 transition-all">
          Novo Resultado
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-40 text-center font-black uppercase tracking-[0.4em] text-[10px] text-text-placeholder animate-pulse">Carregando...</div>
      ) : resultados.length === 0 ? (
        <div className="py-40 text-center bg-white border border-card-border rounded-[4rem] text-text-placeholder uppercase font-black text-xs tracking-[0.3em] opacity-40 italic shadow-inner">
          Nenhum resultado publicado ainda
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resultados.map(r => (
            <button
              key={r.id}
              onClick={() => setSelecionado(r)}
              className="premium-card overflow-hidden group text-left w-full hover:ring-2 hover:ring-primary/30 transition-all"
            >
              <div className="aspect-square overflow-hidden relative">
                <img src={r.fotoDepoisUrl} alt={r.procedimento} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white font-black text-sm uppercase italic tracking-tight">{r.procedimento}</p>
                  <p className="text-white/60 text-[10px] font-bold">{r.paciente.nome}</p>
                </div>
                {/* Badge de imagem gerada */}
                {r.imagemPngUrl && !r.imagemExpirarEm && (
                  <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    PNG
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-black/50 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  {r.totalVisualizacoes} vis.
                </div>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">{r.profissional.nome}</p>
                  <p className="text-[9px] text-text-placeholder mt-0.5">{r.periodoTratamento}</p>
                </div>
                <div className="flex items-center gap-1.5 text-primary text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver ações
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Drawer */}
      {selecionado && (
        <Drawer
          resultado={selecionado}
          branding={branding}
          onClose={() => setSelecionado(null)}
        />
      )}
    </div>
  )
}
