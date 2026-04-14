'use client'
import { useState, useRef } from 'react'

export function SliderAntesDePois({ fotoAntes, fotoDepois }: { fotoAntes: string; fotoDepois: string }) {
  const [pos, setPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  function calcPos(clientX: number) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl select-none cursor-col-resize"
      style={{ paddingBottom: '100%' }}
      onMouseDown={() => setDragging(true)}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      onMouseMove={e => { if (dragging) calcPos(e.clientX) }}
      onTouchMove={e => calcPos(e.touches[0].clientX)}
    >
      {/* DEPOIS (fundo) */}
      <img src={fotoDepois} className="absolute inset-0 w-full h-full object-cover" alt="depois" />

      {/* ANTES (clipado) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={fotoAntes}
          className="absolute top-0 left-0 h-full object-cover"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
          alt="antes"
        />
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/50 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">ANTES</div>
      <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">DEPOIS</div>

      {/* Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center text-text-main font-black text-sm">
          ↔
        </div>
      </div>
    </div>
  )
}
