'use client'
import { useRef, useState } from 'react'

export function CanvasAssinatura({ onChange }: { onChange: (base64: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [desenhando, setDesenhando] = useState(false)
  const [temAssinatura, setTemAssinatura] = useState(false)

  function getPos(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  function iniciar(e: React.TouchEvent | React.MouseEvent) {
    setDesenhando(true)
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function desenhar(e: React.TouchEvent | React.MouseEvent) {
    if (!desenhando) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1B2B3A'
    ctx.lineTo(x, y)
    ctx.stroke()
    setTemAssinatura(true)
  }

  function parar() {
    setDesenhando(false)
    if (temAssinatura) onChange(canvasRef.current!.toDataURL('image/png'))
  }

  function limpar() {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setTemAssinatura(false)
    onChange(null)
  }

  return (
    <div>
      <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest mb-2">Assine no campo abaixo</p>
      <canvas
        ref={canvasRef}
        width={640}
        height={200}
        className="w-full rounded-2xl border border-card-border bg-slate-50 touch-none block"
        style={{ height: '100px' }}
        onMouseDown={iniciar}
        onMouseMove={desenhar}
        onMouseUp={parar}
        onMouseLeave={parar}
        onTouchStart={iniciar}
        onTouchMove={desenhar}
        onTouchEnd={parar}
      />
      {temAssinatura && (
        <button type="button" onClick={limpar}
          className="mt-1.5 text-[11px] text-red-500 hover:text-red-700 font-medium">
          Limpar assinatura
        </button>
      )}
    </div>
  )
}
