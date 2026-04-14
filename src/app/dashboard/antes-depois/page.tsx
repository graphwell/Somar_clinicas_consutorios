'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-utils'

interface Resultado {
  id: string
  procedimento: string
  periodoTratamento: string
  publicado: boolean
  createdAt: string
  totalVisualizacoes: number
  slugPublico: string
  fotoDepoisUrl: string
  paciente: { nome: string }
  profissional: { nome: string }
}

export default function AntesDePoisPage() {
  const router = useRouter()
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithAuth('/api/antes-depois')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setResultados(data) })
      .finally(() => setLoading(false))
  }, [])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-40 animate-premium">
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

      {loading ? (
        <div className="py-40 text-center font-black uppercase tracking-[0.4em] text-[10px] text-text-placeholder animate-pulse">Carregando...</div>
      ) : resultados.length === 0 ? (
        <div className="py-40 text-center bg-white border border-card-border rounded-[4rem] text-text-placeholder uppercase font-black text-xs tracking-[0.3em] opacity-40 italic shadow-inner">
          Nenhum resultado publicado ainda
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resultados.map(r => (
            <div key={r.id} className="premium-card overflow-hidden group">
              <div className="aspect-square overflow-hidden relative">
                <img src={r.fotoDepoisUrl} alt={r.procedimento} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white font-black text-sm uppercase italic tracking-tight">{r.procedimento}</p>
                  <p className="text-white/60 text-[10px] font-bold">{r.paciente.nome}</p>
                </div>
                <div className="absolute top-3 right-3 bg-black/50 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  {r.totalVisualizacoes} vis.
                </div>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">{r.profissional.nome}</p>
                  <p className="text-[9px] text-text-placeholder">{r.periodoTratamento}</p>
                </div>
                <a href={`${baseUrl}/r/${r.slugPublico}`} target="_blank"
                  className="text-[9px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity">
                  Ver →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
