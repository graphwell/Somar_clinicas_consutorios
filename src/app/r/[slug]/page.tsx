import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { SliderAntesDePois } from '@/components/ui/SliderAntesDePois'
import BotoesCompartilhar from '@/components/ui/BotoesCompartilhar'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://synka.somar.ia.br'

async function getResultado(slug: string) {
  return prisma.resultadoAntesDepois.findUnique({
    where: { slugPublico: slug },
    include: {
      profissional: { select: { nome: true, fotoUrl: true, especialidade: true } },
      clinica: { select: { nome: true, slug: true, configBranding: true } },
      consentimento: { select: { revogado: true } },
    },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  try {
    const { slug } = await params
    const r = await getResultado(slug)
    if (!r) return { title: 'Resultado não encontrado' }
    return {
      title: `${r.procedimento} — ${r.clinica.nome}`,
      description: `Resultado verificado de ${r.procedimento} em ${r.clinica.nome}`,
      openGraph: {
        images: [r.fotoDepoisUrl],
        title: `Resultado: ${r.procedimento}`,
        description: `Transformação verificada em ${r.clinica.nome}`,
      },
    }
  } catch {
    return { title: 'Resultado' }
  }
}

export default async function ResultadoPublico({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const resultado = await getResultado(slug)

  if (!resultado || !resultado.publicado || resultado.consentimento?.revogado) {
    return notFound()
  }

  // Fire-and-forget
  prisma.resultadoAntesDepois
    .update({ where: { id: resultado.id }, data: { totalVisualizacoes: { increment: 1 } } })
    .catch(() => {})

  const branding = (resultado.clinica.configBranding ?? {}) as { logoUrl?: string; primaryColor?: string }
  const cor = branding.primaryColor ?? '#40916C'
  const urlPublica = `${BASE_URL}/r/${slug}`
  const linkAgendar = `${BASE_URL}/agendar/${resultado.clinica.slug}`
  const laudo = resultado.laudoEditado ?? resultado.laudoIA

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up  { animation: fadeUp 0.5s ease forwards; }
        .fade-up-2 { animation: fadeUp 0.5s 0.15s ease both; }
        .fade-up-3 { animation: fadeUp 0.5s 0.3s ease both; }
      `}</style>

      <div style={{
        minHeight: '100svh',
        background: '#0a0a0a',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        color: 'white',
      }}>

        {/* HEADER STICKY */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={resultado.clinica.nome}
                style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: cor, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: '700', fontSize: '16px',
              }}>
                {resultado.clinica.nome.charAt(0)}
              </div>
            )}
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', lineHeight: 1.2 }}>
                {resultado.clinica.nome}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Resultado verificado</p>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: `${cor}22`, border: `1px solid ${cor}44`,
            borderRadius: '20px', padding: '4px 12px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cor }} />
            <span style={{ fontSize: '11px', color: cor, fontWeight: '600' }}>Verificado</span>
          </div>
        </div>

        {/* HERO */}
        <div className="fade-up" style={{ padding: '32px 20px 24px', textAlign: 'center' }}>
          <p style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px',
          }}>
            Resultado do procedimento
          </p>
          <h1 style={{
            fontSize: 'clamp(24px, 6vw, 38px)',
            fontFamily: 'Playfair Display, Georgia, serif',
            fontWeight: '700', color: 'white', marginBottom: '8px', lineHeight: 1.2,
          }}>
            {resultado.procedimento}
          </h1>
          <p style={{ fontSize: '14px', color: cor, fontWeight: '500' }}>
            {resultado.periodoTratamento}
          </p>
        </div>

        {/* SLIDER */}
        <div className="fade-up-2" style={{ padding: '0 16px 8px' }}>
          <SliderAntesDePois
            fotoAntes={resultado.fotoAntesUrl}
            fotoDepois={resultado.fotoDepoisUrl}
          />
          <p style={{
            textAlign: 'center', fontSize: '12px',
            color: 'rgba(255,255,255,0.35)', marginTop: '10px',
          }}>
            Arraste para comparar
          </p>
        </div>

        {/* CONTEÚDO */}
        <div className="fade-up-3" style={{ padding: '20px 16px 0' }}>

          {/* LAUDO */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '20px', marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '3px', height: '20px', background: cor, borderRadius: '2px' }} />
              <p style={{
                fontSize: '11px', fontWeight: '700',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase', letterSpacing: '1.5px',
              }}>
                Análise do Resultado
              </p>
            </div>
            <p style={{
              fontSize: '14px', color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.75, whiteSpace: 'pre-wrap',
            }}>
              {laudo}
            </p>
            <p style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.25)',
              marginTop: '14px', fontStyle: 'italic',
            }}>
              Análise gerada por IA — validada pelo profissional responsável.
            </p>
          </div>

          {/* PROFISSIONAL */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '16px',
            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px',
          }}>
            {resultado.profissional.fotoUrl ? (
              <img
                src={resultado.profissional.fotoUrl}
                alt={resultado.profissional.nome}
                style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  objectFit: 'cover', border: `2px solid ${cor}`, flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: cor, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: '700', fontSize: '18px', flexShrink: 0,
              }}>
                {resultado.profissional.nome.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                {resultado.profissional.nome}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {resultado.profissional.especialidade ?? 'Resultado validado pelo profissional'}
              </p>
            </div>
            <div style={{
              background: `${cor}22`, border: `1px solid ${cor}44`,
              borderRadius: '8px', padding: '4px 10px',
              fontSize: '11px', color: cor, fontWeight: '600', flexShrink: 0,
            }}>
              Validado
            </div>
          </div>

          {/* LGPD */}
          <p style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.2)',
            textAlign: 'center', marginBottom: '20px', lineHeight: 1.6,
          }}>
            Imagens publicadas com autorização expressa do cliente. LGPD — Lei 13.709/2018.
          </p>

          {/* CTA */}
          <a
            href={linkAgendar}
            style={{
              display: 'block',
              background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
              color: 'white', textAlign: 'center', padding: '16px',
              borderRadius: '16px', fontSize: '15px', fontWeight: '600',
              textDecoration: 'none', marginBottom: '10px',
              boxShadow: `0 8px 32px ${cor}44`,
            }}
          >
            Agendar meu procedimento
          </a>

          {/* COMPARTILHAR */}
          <BotoesCompartilhar
            urlPublica={urlPublica}
            nomeClinica={resultado.clinica.nome}
            procedimento={resultado.procedimento}
          />

          <p style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.15)',
            textAlign: 'center', margin: '24px 0 32px',
          }}>
            Powered by Synka — synka.somar.ia.br
          </p>
        </div>
      </div>
    </>
  )
}
