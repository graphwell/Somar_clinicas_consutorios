"use client";
import React, { useState } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

export default function CalendarView() {
  const [selectedDay, setSelectedDay] = useState('Seg');

  return (
    <div className="bg-[var(--card-bg)] backdrop-blur-md border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--foreground)]">Agenda Semanal</h3>
        <div className="flex gap-2">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDay === day 
                ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30' 
                : 'hover:bg-white/5 text-[var(--text-muted)]'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-[var(--border)]">
        {HOURS.map(hour => (
          <div key={hour} className="flex min-h-[90px] hover:bg-white/[0.01] transition-colors group">
            <div className="w-20 p-4 text-[10px] text-[var(--text-muted)] border-r border-[var(--border)] text-right font-mono font-bold">
              {hour}:00
            </div>
            <div className="flex-1 p-4 relative">
              {/* Slot Interativo */}
              <div className="absolute inset-2 rounded-2xl border border-dashed border-[var(--border)] group-hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 flex items-center justify-center transition-all">
                <span className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  + Novo Agendamento
                </span>
              </div>
              
              {/* Exemplo de agendamento fixo */}
              {hour === 10 && (
                <div className="absolute inset-2 rounded-2xl bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent)]/10 border border-[var(--accent)]/30 p-4 shadow-xl backdrop-blur-md z-[1] animate-in fade-in slide-in-from-left-2">
                  <p className="text-xs font-black text-[var(--accent)]">Alan Santos</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold mt-0.5">Consulta de Rotina</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
