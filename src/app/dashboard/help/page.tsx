"use client";
import React, { useState } from 'react';

const SUGGESTIONS = [
  { text: 'Como criar um novo agendamento?', icon: '📅' },
  { text: 'Como configurar um novo profissional?', icon: '🧑‍💼' },
  { text: 'Como visualizar o financeiro mensal?', icon: '🏦' },
  { text: 'Como mudar o nicho da clínica?', icon: '⚙️' },
];

export default function HelpCenterPage() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-premium">
      
      {/* Header Search V2.2 */}
      <div className="text-center space-y-6 py-12">
         <h2 className="text-4xl font-black italic uppercase tracking-tighter text-text-main">🧠 Central de <span className="text-primary">Conhecimento</span></h2>
         <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.3em] opacity-60">Assistência Inteligente Synka V2.2</p>
         <div className="relative max-w-xl mx-auto mt-12 group">
            <input type="text" placeholder="Qual sua dúvida operacional hoje?" 
              className="input-premium w-full py-6 px-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 text-base" />
            <button className="absolute right-4 top-4 px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-primary/20 hover:scale-105 transition-all">Buscar</button>
         </div>
      </div>

      {/* Suggested Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {SUGGESTIONS.map((s, idx) => (
          <div key={idx} className="premium-card p-10 flex items-center gap-8 cursor-pointer hover:bg-primary-soft/30 transition-all border-l-[6px] border-l-transparent hover:border-l-primary group">
             <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{s.icon}</div>
             <p className="text-[11px] font-black uppercase text-text-main tracking-tight italic">{s.text}</p>
          </div>
        ))}
      </div>

      {/* AI Maya Premium Card */}
      <div className="bg-primary rounded-[3.5rem] p-14 text-white shadow-2xl shadow-primary/30 relative overflow-hidden flex flex-col md:flex-row items-center gap-12 group">
         <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
         <div className="w-28 h-28 rounded-[2.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-5xl shadow-inner border border-white/20 shrink-0 italic font-black">M</div>
         <div className="space-y-6 text-center md:text-left relative z-10">
            <h3 className="text-3xl font-black italic uppercase tracking-tighter">Fale com a Maya IA</h3>
            <p className="text-sm text-blue-50 font-medium leading-relaxed max-w-md opacity-80">Nossa inteligência operacional entende seu contexto clínico e guia sua equipe em tempo real.</p>
            <button onClick={() => setChatOpen(true)} className="px-12 py-5 bg-white text-primary rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all">Ativar Protocolo de Ajuda</button>
         </div>
      </div>

      {/* Chat Bot Maya V2.2 */}
      {chatOpen && (
        <div className="fixed bottom-10 right-10 w-96 h-[600px] bg-white border border-card-border rounded-[3rem] shadow-2xl z-[100] flex flex-col animate-in slide-in-from-bottom-12 duration-700 overflow-hidden">
           <div className="p-8 bg-text-main text-white flex justify-between items-center relative">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-xl italic font-black">M</div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Maya Concierge</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary">Sincronizado</p>
                 </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center font-black">✕</button>
           </div>
           
           <div className="flex-1 p-8 space-y-6 overflow-y-auto bg-background no-scrollbar">
              <div className="bg-white border border-card-border p-6 rounded-[1.5rem] rounded-tl-none shadow-sm max-w-[90%]">
                 <p className="text-xs text-text-main font-medium leading-relaxed">Olá! Sou a Maya. Estou analisando sua unidade para te ajudar com agendamentos ou configurações. O que precisa agora?</p>
              </div>
              <div className="bg-primary text-white p-6 rounded-[1.5rem] rounded-tr-none shadow-xl max-w-[90%] ml-auto">
                 <p className="text-xs font-medium leading-relaxed">Como altero a cor da minha logo no dashboard?</p>
              </div>
              <div className="bg-white border border-card-border p-6 rounded-[1.5rem] rounded-tl-none shadow-sm max-w-[90%]">
                 <p className="text-xs text-text-main font-medium leading-relaxed italic font-black">Vá em Configurações &gt; DNA do Sistema. Lá você pode subir uma nova logo e o sistema adaptará a paleta automaticamente. ✨</p>
              </div>
           </div>

           <div className="p-8 border-t border-card-border bg-white">
              <input type="text" placeholder="Sua pergunta para a IA..." className="input-premium w-full py-4 px-6 rounded-2xl text-xs" />
           </div>
        </div>
      )}
    </div>
  );
}
