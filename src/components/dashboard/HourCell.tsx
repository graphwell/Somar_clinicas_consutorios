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

  return (
    <button 
      onClick={onClick}
      className={`group relative p-6 rounded-[2.5rem] border transition-all duration-500 text-left overflow-hidden h-32 flex flex-col justify-between
        ${appt ? 'bg-white shadow-xl scale-[1.02] border-primary/10' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:scale-105 hover:shadow-2xl hover:border-primary/20'}`}
    >
      <div className="flex justify-between items-start w-full">
        <span className={`text-lg font-black italic tracking-tighter ${appt ? 'text-primary' : 'text-text-placeholder opacity-40'}`}>
          {hour}
        </span>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.dot }}></div>
           <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">{config.label}</span>
        </div>
      </div>

      <div className="w-full">
        {appt ? (
          <>
            <p className="text-xs font-black text-text-main uppercase tracking-tight line-clamp-1 mb-1">{appt.paciente.nome}</p>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">{appt.servico?.nome || labels?.termoServico || 'Consulta'}</span>
              
              {(() => {
                const start = new Date(appt.dataHora).getTime();
                const now = new Date().getTime();
                const duration = (appt.durationMinutes || 30) * 60000;
                const progress = Math.min(100, Math.max(0, ((now - start) / duration) * 100));
                
                if (progress > 0 && progress < 100 && appt.status !== 'cancelado') {
                  return (
                    <div className="absolute -bottom-6 right-0 w-24 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </>
        ) : (
          <span className="text-[9px] font-black opacity-30 group-hover:opacity-100 uppercase tracking-[0.2em]">Disponível</span>
        )}
      </div>
    </button>
  );
}
