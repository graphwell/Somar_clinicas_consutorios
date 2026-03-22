"use client";
import React, { useState } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

export default function CalendarView() {
  const [selectedDay, setSelectedDay] = useState('Seg');

  return (
    <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-medium">Agenda Semanal</h3>
        <div className="flex gap-2">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                selectedDay === day 
                ? 'bg-[#4a4ae2] text-white shadow-[0_0_15px_rgba(74,74,226,0.3)]' 
                : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-white/5">
        {HOURS.map(hour => (
          <div key={hour} className="flex min-h-[80px] hover:bg-white/[0.02] transition-colors">
            <div className="w-20 p-4 text-xs text-gray-500 border-r border-white/5 text-right font-mono">
              {hour}:00
            </div>
            <div className="flex-1 p-4 relative">
              {/* Slot Interativo */}
              <div className="absolute inset-2 rounded-xl group cursor-pointer border border-dashed border-white/10 hover:border-[#4a4ae2]/50 hover:bg-[#4a4ae2]/5 flex items-center justify-center transition-all">
                <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  + Novo Agendamento
                </span>
              </div>
              
              {/* Exemplo de agendamento fixo */}
              {hour === 10 && (
                <div className="absolute inset-2 rounded-xl bg-gradient-to-r from-[#4a4ae2]/20 to-[#4a4ae2]/10 border border-[#4a4ae2]/30 p-3 shadow-lg backdrop-blur-sm z-[1]">
                  <p className="text-xs font-bold text-[#4a4ae2]">Alan Santos</p>
                  <p className="text-[10px] text-gray-400">Consulta de Rotina</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
