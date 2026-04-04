"use client";
import React, { useState, useRef, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

type Message = {
  role: 'user' | 'model';
  text: string;
};

const SugIcon = ({ path, d2 }: { path: string; d2?: string }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
    <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    {d2 && <path d={d2} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>}
  </svg>
);

const SUGGESTIONS = [
  { text: 'Como criar um novo agendamento?', icon: <SugIcon path="M3.667 5.5h14.666M3.667 5.5V18.333A1.833 1.833 0 005.5 20.167h11a1.833 1.833 0 001.833-1.834V5.5" d2="M7.333 1.833V5.5M14.667 1.833V5.5M11 10.083v5.5M8.25 12.833h5.5"/> },
  { text: 'Como cadastrar um profissional?', icon: <SugIcon path="M11 2.75a3.667 3.667 0 100 7.333 3.667 3.667 0 000-7.333zM2.75 19.25c0-4.556 3.709-8.25 8.25-8.25s8.25 3.694 8.25 8.25"/> },
  { text: 'Como visualizar o financeiro?',  icon: <SugIcon path="M1.833 5.5h18.334M1.833 5.5V17.417A1.833 1.833 0 003.667 19.25H18.333a1.833 1.833 0 001.834-1.833V5.5" d2="M6.417 9.167h2.75M6.417 12.833h7.333"/> },
  { text: 'Como configurar o WhatsApp?',    icon: <SugIcon path="M11 1.833C5.937 1.833 1.833 5.937 1.833 11c0 1.718.453 3.33 1.247 4.73L1.833 20.167l4.599-1.2A9.148 9.148 0 0011 20.167c5.063 0 9.167-4.104 9.167-9.167S16.063 1.833 11 1.833z"/> },
  { text: 'Como usar o Odontograma?',       icon: <SugIcon path="M8.25 2.75c-.5 1.833-.917 3.208-.917 4.583a3.667 3.667 0 007.334 0c0-1.375-.417-2.75-.917-4.583M11 10v9.25" d2="M8.25 14.667h5.5"/> },
  { text: 'Como mudar o nicho da clínica?', icon: <SugIcon path="M11 2.75v1.833M11 17.417v1.833M3.695 5.195l1.296 1.296M16.009 15.509l1.296 1.296M2.75 11h1.833M16.417 11h1.833M3.695 16.805l1.296-1.296M16.009 6.491l1.296-1.296" d2="M11 13.75a2.75 2.75 0 100-5.5 2.75 2.75 0 000 5.5z"/> },
];

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Headers
        if (line.startsWith('### ')) {
          return <p key={i} className="font-black text-xs uppercase tracking-tight mt-2">{renderInline(line.slice(4))}</p>;
        }
        if (line.startsWith('## ')) {
          return <p key={i} className="font-black text-sm uppercase tracking-tight mt-2">{renderInline(line.slice(3))}</p>;
        }

        // Numbered list
        const numMatch = line.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="font-black text-primary text-xs shrink-0">{numMatch[1]}.</span>
              <span className="text-xs leading-relaxed">{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Bullet list
        const bulletMatch = line.match(/^[-*]\s+(.+)/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-primary text-xs shrink-0 mt-0.5">•</span>
              <span className="text-xs leading-relaxed">{renderInline(bulletMatch[1])}</span>
            </div>
          );
        }

        return <p key={i} className="text-xs leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-100 px-1 rounded text-[10px] font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function HelpCenterPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const openChat = () => {
    setChatOpen(true);
    if (messages.length === 0) {
      setMessages([{
        role: 'model',
        text: 'Olá! Sou a **Synka IA**, sua assistente de suporte.\n\nPosso te ajudar com:\n- Criar e gerenciar agendamentos\n- Configurar profissionais e serviços\n- Integrações e configurações\n- Financeiro e relatórios\n\nComo posso te ajudar hoje?',
      }]);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    setInput('');
    setError('');

    const userMsg: Message = { role: 'user', text: messageText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    // Build history for Gemini (exclude the initial greeting we add locally)
    const historyForApi = updatedMessages
      .slice(messages.length === 1 && messages[0].role === 'model' ? 1 : 0)
      .slice(0, -1) // exclude the message we just added (sent as `message`)
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

    try {
      const res = await fetchWithAuth('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: messageText, history: historyForApi }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setError(data.error || 'Erro ao processar resposta.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (text: string) => {
    openChat();
    // Small delay to let chat open before sending
    setTimeout(() => sendMessage(text), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-premium">

      {/* Header */}
      <div className="text-center space-y-4 py-10">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-text-main">
          Central de <span className="text-primary">Suporte</span>
        </h2>
        <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.3em] opacity-60">
          Assistência Inteligente — Synka IA
        </p>
      </div>

      {/* Suggestions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestion(s.text)}
            className="premium-card p-6 flex items-center gap-4 cursor-pointer hover:bg-primary-soft/30 transition-all border-l-[4px] border-l-transparent hover:border-l-primary group text-left"
          >
            <div className="text-text-muted group-hover:text-primary transition-colors shrink-0">{s.icon}</div>
            <p className="text-[10px] font-black uppercase text-text-main tracking-tight italic leading-tight">{s.text}</p>
          </button>
        ))}
      </div>

      {/* AI CTA Card */}
      <div className="bg-primary rounded-[3rem] p-12 text-white shadow-2xl shadow-primary/30 relative overflow-hidden flex flex-col md:flex-row items-center gap-10 group">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
        <div className="w-24 h-24 rounded-[2rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-4xl shadow-inner border border-white/20 shrink-0 italic font-black">S</div>
        <div className="space-y-4 text-center md:text-left relative z-10">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter">Fale com a Synka IA</h3>
          <p className="text-sm text-blue-50 font-medium leading-relaxed max-w-md opacity-80">
            Tire dúvidas, receba passo-a-passo de configuração e explore os recursos da plataforma em tempo real.
          </p>
          <button
            onClick={openChat}
            className="px-10 py-4 bg-white text-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all"
          >
            Iniciar Conversa
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            onClick={() => setChatOpen(false)}
          />
          <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-white border border-card-border rounded-[2.5rem] shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">

            {/* Chat Header */}
            <div className="px-6 py-5 bg-text-main text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-base italic font-black shadow-lg shadow-primary/30">S</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synka IA</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-green-300">Online</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-slate-50 border border-card-border text-text-main rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <MarkdownText text={msg.text} />
                    ) : (
                      <p className="text-xs leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-card-border px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1 items-center h-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center">
                  <p className="text-[10px] text-red-500 font-black uppercase tracking-wider bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                    {error}
                  </p>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-card-border bg-white shrink-0">
              <div className="flex gap-2 items-center bg-slate-50 border border-card-border rounded-2xl px-4 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escreva sua dúvida..."
                  disabled={loading}
                  className="flex-1 bg-transparent text-xs text-text-main placeholder:text-text-placeholder outline-none py-1 disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-black disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-sm shadow-primary/30"
                >
                  ↑
                </button>
              </div>
              <p className="text-[8px] text-text-placeholder text-center mt-2 font-black uppercase tracking-wider opacity-40">
                Enter para enviar
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
