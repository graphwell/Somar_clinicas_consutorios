"use client";
import React from 'react';
import { Appointment, STATUS_MAP } from '@/lib/agenda-utils';

interface HourCellProps {
  hour: string;
  appt?: Appointment;
  onClick: () => void;
  labels?: any;
}

export default function HourCell({ hour, appt, onClick, labels }: HourCellProps) {
  const status = appt ? appt.status : 'available';
  const config = STATUS_MAP[status] || STATUS_MAP.available;

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'confirmado': return '✅';
      case 'pendente': return '⏳';
      case 'cancelado': return '❌';
      case 'done': return '🏁';
      case 'reagendado': return '🔄';
      default: return null;
    }
  };

  return (
    <button 
      onClick={onClick}
      className={`group relative p-4 rounded-3xl border transition-all duration-500 text-left overflow-hidden h-28 flex flex-col justify-between
        ${appt 
          ? 'bg-white/80 backdrop-blur-md shadow-xl scale-[1.02] z-10' 
          : 'bg-slate-50/30 backdrop-blur-sm border-slate-100 hover:bg-white hover:scale-105 hover:shadow-2xl hover:border-primary/20'}`}
      style={appt ? { borderLeft: `6px solid ${config.bg}`, background: `linear-gradient(to right, ${config.bg}05, white)` } : {}}
    >
      <div className="flex justify-between items-start w-full relative z-10">
        <span className={`text-[12px] font-black italic tracking-tighter ${appt ? 'text-primary' : 'text-text-placeholder opacity-40'}`}>
          {hour}
        </span>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${appt ? 'bg-primary/5 text-primary' : 'bg-slate-100/50'}`}>
           <span className="text-[12px]">{getStatusIcon(status)}</span>
           <span className="text-[7px] font-black uppercase tracking-widest opacity-60">{config.label}</span>
        </div>
      </div>

      <div className="w-full relative z-10">
        {appt ? (
          <div className="space-y-1">
            <p className="text-[11px] font-black text-text-main uppercase tracking-tighter leading-tight line-clamp-1">{appt.paciente.nome}</p>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-primary/80 uppercase tracking-widest">{appt.servico?.nome || labels?.termoServico || 'Consulta'}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-10 group-hover:opacity-100 transition-opacity">
            <span className="text-[14px]">➕</span>
            <span className="text-[8px] font-black uppercase tracking-widest">Disponível</span>
          </div>
        )}
      </div>

      {/* Decorative Gradient Background */}
      {appt && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      )}
    </button>
  );
}
