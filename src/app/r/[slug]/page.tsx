import { Metadata } from 'next'
import prisma from '@/lib/prisma'
import { SliderAntesDePois } from '@/components/ui/SliderAntesDePois'

export const dynamic = 'force-dynamic'

async function getResultado(slug: string) {
  return prisma.resultadoAntesDepois.findUnique({
    where: { slugPublico: slug },
    include: {
      profissional: { select: { nome: true, fotoUrl: true } },
      clinica: { select: { nome: true, slug: true } },
      consentimento: { select: { revogado: true } },
    },
  })
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const r = await getResultado(params.slug)
  if (!r) return { title: 'Resultado nao encontrado' }
  return {
    title: `${r.procedimento} — ${r.clinica.nome}`,
    description: `Resultado verificado de ${r.procedimento} em ${r.clinica.nome}`,
    openGraph: {
      images: [r.fotoDepoisUrl],
      title: `Resultado: ${r.procedimento}`,
      description: `Veja a transformacao realizada em ${r.clinica.nome}`,
    },
  }
}

export default async function ResultadoPublico({ params }: { params: { slug: string } }) {
  const resultado = await getResultado(params.slug)

  if (!resultado || !resultado.publicado || resultado.consentimento?.revogado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Este resultado nao esta disponivel.</p>
      </div>
    )
  }

  // Incrementar visualizacoes (fire and forget)
  prisma.resultadoAntesDepois.update({
    where: { id: resultado.id },
    data: { totalVisualizacoes: { increment: 1 } },
  }).catch(() => {})

  const laudo = resultado.laudoEditado ?? resultado.laudoIA
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://synka.somar.ia.br'
  const urlCompleta = `${baseUrl}/r/${params.slug}`

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #40916C, #2D6A4F)' }}>
          {resultado.clinica.nome.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{resultado.clinica.nome}</p>
          <p className="text-[11px] text-slate-400">Resultado verificado</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{resultado.procedimento}</h1>
          <p className="text-sm text-slate-400 mt-1">Periodo: {resultado.periodoTratamento}</p>
        </div>

        <SliderAntesDePois fotoAntes={resultado.fotoAntesUrl} fotoDepois={resultado.fotoDepoisUrl} />
        <p className="text-[11px] text-slate-400 text-center">Arraste para comparar</p>

        {/* Laudo */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Analise do Resultado</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{laudo}</p>
          <p className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-50">
            Analise gerada por IA e validada pelo profissional responsavel.
          </p>
        </div>

        {/* Profissional */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
          {resultado.profissional.fotoUrl ? (
            <img src={resultado.profissional.fotoUrl} alt={resultado.profissional.nome}
              className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #40916C, #2D6A4F)' }}>
              {resultado.profissional.nome.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-800">{resultado.profissional.nome}</p>
            <p className="text-[11px] text-slate-400">Resultado validado pelo profissional</p>
          </div>
        </div>

        {/* LGPD */}
        <p className="text-[10px] text-slate-400 text-center">
          Imagens publicadas com autorizacao expressa do cliente. LGPD — Lei 13.709/2018.
        </p>

        {/* CTA */}
        <a href={`${baseUrl}/agendar/${resultado.clinica.slug}`}
          className="block text-white text-center py-4 rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #40916C, #2D6A4F)' }}>
          Agendar meu procedimento
        </a>

        {/* Compartilhamento */}
        <div className="grid grid-cols-2 gap-3">
          <a href={`https://wa.me/?text=${encodeURIComponent(`Veja meu resultado em ${resultado.clinica.nome}:\n${urlCompleta}`)}`} target="_blank"
            className="flex items-center justify-center gap-2 py-3 border border-slate-100 rounded-xl bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            Enviar por WhatsApp
          </a>
          <div className="flex items-center justify-center py-3 border border-slate-100 rounded-xl bg-white text-sm text-slate-400">
            {params.slug}
          </div>
        </div>

        <p className="text-[11px] text-slate-300 text-center">Powered by Synka</p>
      </div>
    </div>
  )
}
