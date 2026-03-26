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
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center text-3xl z-50 hover:scale-110 transition-all animate-bounce-slow"
        style={{ animationDuration: '3s' }}
      >
        {isOpen ? '✕' : '🧠'}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 w-[400px] h-[600px] bg-white border border-card-border rounded-[2.5rem] shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          <div className="p-6 bg-text-main text-white flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black italic">S</div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Synka IA</p>
                <p className="text-[8px] opacity-60 uppercase font-bold">Inteligência Operacional</p>
             </div>
          </div>

          <div ref={scrollRef} className="flex-1 p-6 space-y-4 overflow-y-auto bg-slate-50/50 no-scrollbar">
             {messages.map((m, i) => (
               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                   m.role === 'user' 
                     ? 'bg-primary text-white rounded-tr-none' 
                     : 'bg-white border border-card-border text-text-main rounded-tl-none shadow-sm'
                 }`}>
                   {m.text}
                 </div>
               </div>
             ))}
             {loading && (
               <div className="flex justify-start">
                 <div className="bg-white border border-card-border p-4 rounded-2xl rounded-tl-none animate-pulse flex gap-1">
                   <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                   <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                 </div>
               </div>
             )}
          </div>

          <form onSubmit={handleSend} className="p-6 border-t border-card-border bg-white">
             <input 
               value={input}
               onChange={e => setInput(e.target.value)}
               placeholder="Pergunte sobre sua clínica..." 
               className="w-full bg-slate-50 border border-card-border p-4 rounded-2xl text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
             />
          </form>
        </div>
      )}
    </>
  );
}
