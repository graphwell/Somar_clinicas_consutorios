"use client";
import React, { useState, useRef, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

export default function SynkaChatModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Olá! Sou a Synka IA. Como posso ajudar na gestão da sua clínica hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMsg,
          history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: data.error || 'Desculpe, tive um problema ao processar.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Erro de conexão com a inteligência.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button Premium */}
      <div className="fixed bottom-8 right-8 z-[100]">
        {!isOpen && (
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all duration-500 hover:scale-110 active:scale-95 z-10 ${
            isOpen ? 'bg-text-main text-white rotate-180' : 'bg-primary text-white'
          }`}
        >
          {isOpen ? '✕' : '🧠'}
        </button>
      </div>

      {/* Modal Premium V2.3 */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 w-[420px] h-[650px] bg-white border border-card-border rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] flex flex-col overflow-hidden animate-premium">
          
          {/* Header */}
          <div className="p-10 bg-text-main text-white flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
             <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-2xl font-black italic shadow-lg shadow-primary/20">S</div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Synka IA</p>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Atendimento Inteligente</p>
                </div>
             </div>
             <div className="flex items-center gap-2 relative z-10">
                <button 
                  onClick={() => setMessages([{ role: 'model', text: 'Olá! Sou a Synka IA. Como posso ajudar na gestão da sua clínica hoje?' }])}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors opacity-40 hover:opacity-100"
                  title="Limpar Chat"
                >
                   🗑️
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                   ✕
                </button>
             </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 p-8 space-y-6 overflow-y-auto bg-slate-50/30 no-scrollbar">
             {messages.map((m, i) => (
               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                 <div className={`max-w-[85%] p-6 rounded-[2rem] text-[11px] font-medium leading-relaxed shadow-sm border ${
                   m.role === 'user' 
                     ? 'bg-primary text-white border-primary/20 rounded-tr-none' 
                     : 'bg-white border-card-border text-text-main rounded-tl-none font-semibold'
                 }`}>
                   {m.text}
                 </div>
               </div>
             ))}
             {loading && (
               <div className="flex justify-start">
                 <div className="bg-white border border-card-border p-5 rounded-[2rem] rounded-tl-none flex gap-1.5 shadow-sm">
                   <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-duration:0.6s]" />
                   <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]" />
                   <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.4s]" />
                 </div>
               </div>
             )}
          </div>

          {/* Input Area */}
          <div className="p-8 border-t border-slate-50 bg-white">
             <form onSubmit={handleSend} className="relative group">
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Descreva sua dúvida operacional..." 
                  className="w-full bg-slate-50 border border-card-border py-5 px-8 pr-12 rounded-[1.5rem] text-[11px] font-black placeholder:text-text-placeholder focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/30 outline-none transition-all"
                />
                <button 
                   type="submit"
                   className={`absolute right-3 top-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                     input.trim() ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-200 text-white cursor-not-allowed'
                   }`}
                >
                   ➡
                </button>
             </form>
             <p className="text-center text-[8px] font-black text-text-placeholder uppercase tracking-widest mt-6 opacity-40">
                Ambiente de Inteligência Monitorada • 2025
             </p>
          </div>
        </div>
      )}
    </>
  );
}
