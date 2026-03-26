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
      className={`group relative p-3 rounded-2xl border transition-all duration-300 text-left overflow-hidden h-24 flex flex-col justify-between
        ${appt ? 'bg-white shadow-md scale-[1.01] border-primary/20' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:scale-105 hover:shadow-xl hover:border-primary/30'}`}
    >
      <div className="flex justify-between items-start w-full">
        <span className={`text-sm font-black italic tracking-tighter ${appt ? 'text-primary' : 'text-text-placeholder opacity-40'}`}>
          {hour}
        </span>
        <div className="flex items-center gap-1.5">
           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.dot }}></div>
           <span className="text-[7px] font-black uppercase tracking-widest opacity-40">{config.label}</span>
        </div>
      </div>

      <div className="w-full">
        {appt ? (
          <>
            <p className="text-[9px] font-black text-text-main uppercase tracking-tight line-clamp-1 mb-1 leading-none">{appt.paciente.nome}</p>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold text-primary/60 uppercase tracking-widest leading-none">{appt.servico?.nome || labels?.termoServico || 'Consulta'}</span>
            </div>
          </>
        ) : (
          <span className="text-[8px] font-black opacity-30 group-hover:opacity-100 uppercase tracking-widest">Livre</span>
        )}
      </div>
    </button>
  );
}
