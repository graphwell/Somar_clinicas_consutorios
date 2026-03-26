"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

interface ProfessionalSchedule {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
}

interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
  registroProfissional: string | null;
  bio: string | null;
  fotoUrl: string | null;
  color: string | null;
  ativo: boolean;
  escalas?: ProfessionalSchedule[];
  horariosJson?: any;
}

const PRESET_COLORS = ['#3B82F6', '#F472B6', '#A78BFA', '#34D399', '#FB7185', '#60A5FA', '#38BDF8'];
const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function TeamPage() {
  const { labels } = useNicho();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Profissional | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [registroProfissional, setRegistroProfissional] = useState('');
  const [bio, setBio] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [ativo, setAtivo] = useState(true);
  const [escalas, setEscalas] = useState<ProfessionalSchedule[]>([]);
  const [atendeConvenio, setAtendeConvenio] = useState(false);
  const [conveniosSelecionados, setConveniosSelecionados] = useState<string[]>([]);
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const fetchTeam = useCallback(() => {
    setLoading(true);
    fetchWithAuth('/api/team')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setProfissionais(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const openAdd = () => {
    setEditing(null); setNome(''); setEspecialidade(''); setRegistroProfissional(''); setBio(''); setFotoUrl(''); setColor('#3B82F6'); setAtivo(true); setEscalas([]); 
    setAtendeConvenio(false); setConveniosSelecionados([]); setStartHour('08:00'); setEndHour('18:00');
    setShowModal(true);
  };

  const openEdit = (p: Profissional) => {
    setEditing(p); setNome(p.nome); setEspecialidade(p.especialidade || ''); setRegistroProfissional(p.registroProfissional || ''); setBio(p.bio || ''); setFotoUrl(p.fotoUrl || ''); setColor(p.color || '#3B82F6'); setAtivo(p.ativo); setEscalas(p.escalas || []); 
    
    // Parse metadata from horariosJson
    const metadata = p.horariosJson as any;
    setAtendeConvenio(metadata?.atendeConvenio || false);
    setConveniosSelecionados(metadata?.convenios || []);
    
    // Set start/end from first escala if exists
    if (p.escalas && p.escalas.length > 0) {
      setStartHour(p.escalas[0].horaInicio);
      setEndHour(p.escalas[0].horaFim);
    } else {
      setStartHour('08:00');
      setEndHour('18:00');
    }
    
    setShowModal(true);
  };

  const addEscala = () => {
    setEscalas([...escalas, { diaSemana: 1, horaInicio: '08:00', horaFim: '18:00', ativo: true }]);
  };

  const removeEscala = (index: number) => {
    setEscalas(escalas.filter((_, i) => i !== index));
  };

  const updateEscala = (index: number, field: keyof ProfessionalSchedule, value: any) => {
    const newEscalas = [...escalas];
    newEscalas[index] = { ...newEscalas[index], [field]: value };
    setEscalas(newEscalas);
  };

  const toggleDay = (day: number) => {
    const exists = escalas.some(e => e.diaSemana === day);
    if (exists) {
      setEscalas(escalas.filter(e => e.diaSemana !== day));
    } else {
      setEscalas([...escalas, { diaSemana: day, horaInicio: startHour, horaFim: endHour, ativo: true }]);
    }
  };

  useEffect(() => {
    // Update all existing escalas when hours change
    setEscalas(prev => prev.map(e => ({ ...e, horaInicio: startHour, horaFim: endHour })));
  }, [startHour, endHour]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = editing ? `/api/team/${editing.id}` : '/api/team';
      const method = editing ? 'PUT' : 'POST';
      const horariosJson = { atendeConvenio, convenios: conveniosSelecionados };
      const body = { nome, especialidade, registroProfissional, bio, fotoUrl: fotoUrl || null, color, ativo, escalas, horariosJson };
      await fetchWithAuth(url, { method, body: JSON.stringify(body) });
      setShowModal(false); fetchTeam();
    } catch { } finally { setSaving(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-premium">
      
      {/* Header Premium V2.2 */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">🧑‍💼</div>
           <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Gestão de <span className="text-primary">Profissionais</span></h2>
              <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.2em] mt-1 opacity-60">Quadro de {labels.termoProfissional}s • V2.2 Official</p>
           </div>
        </div>
        <button onClick={openAdd} className="w-full md:w-auto px-10 py-5 bg-primary text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 transition-all text-center">Adicionar Profissional</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {loading ? (
          <div className="col-span-full py-40 text-center font-black uppercase tracking-[0.4em] text-[10px] text-text-placeholder animate-pulse">Sincronizando corpo clínico...</div>
        ) : profissionais.length === 0 ? (
          <div className="col-span-full py-40 text-center bg-white border border-card-border rounded-[4rem] text-text-placeholder uppercase font-black text-xs tracking-[0.3em] opacity-40 italic shadow-inner">Sem profissionais cadastrados</div>
        ) : profissionais.map(p => (
            <div key={p.id} onClick={() => openEdit(p)} className="premium-card p-10 flex flex-col items-center text-center group relative overflow-hidden cursor-pointer pt-14">
              <div className="absolute top-0 inset-x-0 h-2 opacity-80" style={{ backgroundColor: p.color || '#3B82F6' }} />
              <div className="absolute top-4 right-6">
                 <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${p.ativo ? 'bg-status-success' : 'bg-text-placeholder'}`} />
              </div>
              
              <div className="relative mb-8">
                <div className="w-36 h-36 rounded-ultra p-1.5 shadow-2xl group-hover:scale-105 transition-transform duration-700 overflow-hidden bg-slate-50 border border-card-border">
                  {p.fotoUrl ? (
                    <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover rounded-ultra bg-white" />
                  ) : (
                    <div className="w-full h-full bg-white rounded-ultra flex items-center justify-center text-5xl font-black italic" style={{ color: p.color || '#3B82F6' }}>
                      {p.nome.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-black text-text-main tracking-tighter mb-1.5 uppercase italic underline decoration-primary/10 underline-offset-8 decoration-4">{p.nome}</h3>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6">{p.especialidade || labels.termoProfissional}</p>
              
              <div className="w-full space-y-4">
                 <p className="text-xs text-text-muted font-medium italic mb-8 line-clamp-2 px-4 leading-relaxed opacity-60 h-10">
                   {p.bio || 'Sem detalhes biográficos.'}
                 </p>
                 <Link href={`/dashboard/team/${p.id}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <button className="w-full py-4 bg-slate-50 hover:bg-primary-soft hover:text-primary rounded-2xl text-[9px] font-black uppercase tracking-widest text-text-placeholder transition-all border border-transparent hover:border-primary/10">Ver Perfil Completo</button>
                  </Link>
              </div>
            </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md" />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-card-border rounded-[3rem] shadow-2xl scale-in overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic">{editing ? `Refinar` : `Novo`} Profissional</h3>
                <p className="text-[9px] text-text-placeholder font-black uppercase tracking-widest mt-1">Configurações de identidade corporativa V2.2</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-text-placeholder transition-colors">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                    <input required value={nome} onChange={e => setNome(e.target.value)} className="input-premium w-full py-4" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.2em] ml-2">Título/Especialidade</label>
                      <input type="text" value={especialidade} onChange={e => setEspecialidade(e.target.value)} className="input-premium w-full" placeholder="Ex: Médico" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.2em] ml-2">Registro (CRM/CRP)</label>
                      <input type="text" value={registroProfissional} onChange={e => setRegistroProfissional(e.target.value)} className="input-premium w-full" placeholder="000.000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.2em] ml-2">Cor de Identificação Lateral</label>
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      {PRESET_COLORS.map(c => <button key={c} type="button" onClick={() => setColor(c)} className={`w-10 h-10 rounded-xl transition-all ${color === c ? 'ring-4 ring-primary/20 scale-110 shadow-lg' : 'opacity-30 hover:opacity-100'}`} style={{ backgroundColor: c }} />)}
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.2em] ml-2">Fotografia Profissional</label>
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <div className="w-full aspect-square rounded-[2rem] bg-slate-50 border-2 border-dashed border-card-border group-hover:border-primary/30 transition-all flex items-center justify-center overflow-hidden relative">
                          {fotoUrl ? (
                             <>
                               <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="text-[9px] font-black text-white uppercase tracking-widest">Alterar Foto</span>
                               </div>
                             </>
                          ) : (
                             <div className="text-center">
                                <span className="text-3xl mb-1 block grayscale">📸</span>
                                <span className="text-[9px] font-black uppercase text-text-placeholder">Upload Imagem</span>
                             </div>
                          )}
                       </div>
                       <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.2em] ml-2">Status do Profissional</label>
                    <button type="button" onClick={() => setAtivo(!ativo)} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ativo ? 'bg-status-success-bg text-status-success border border-status-success/10' : 'bg-slate-100 text-text-placeholder border border-card-border'}`}>
                       {ativo ? 'Ativo na Unidade' : 'Afastado / Inativo'}
                    </button>
                  </div>
               </div>

               {/* Seção de Escalas V5.0 - Simplificada (Estilo Empresa) */}
               <div className="col-span-full space-y-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-text-main uppercase tracking-widest italic">Horários de Atendimento</h4>
                      <p className="text-[8px] text-text-placeholder font-bold uppercase tracking-widest mt-0.5">Selecione os dias e defina o turno único</p>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-card-border space-y-6">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((d, i) => {
                        const active = escalas.some(e => e.diaSemana === i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleDay(i)}
                            className={`h-12 px-5 rounded-2xl text-[10px] font-black transition-all border ${
                              active 
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                : 'bg-white text-text-placeholder border-card-border opacity-40 hover:opacity-100'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-text-placeholder uppercase tracking-widest ml-1">Início do Turno</label>
                        <input type="time" value={startHour} onChange={e => setStartHour(e.target.value)} className="input-premium w-full py-4" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-text-placeholder uppercase tracking-widest ml-1">Fim do Turno</label>
                        <input type="time" value={endHour} onChange={e => setEndHour(e.target.value)} className="input-premium w-full py-4" />
                      </div>
                    </div>
                  </div>
               </div>

               {/* Seção de Convênios V5.0 */}
               <div className="col-span-full space-y-6 pt-6 border-t border-slate-50">
                  <div>
                    <h4 className="text-xs font-black text-text-main uppercase tracking-widest italic">Comercial e Convênios</h4>
                    <p className="text-[8px] text-text-placeholder font-bold uppercase tracking-widest mt-0.5">Defina as modalidades de pagamento aceitas</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setAtendeConvenio(false)}
                      className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${!atendeConvenio ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 text-text-placeholder border-card-border'}`}
                    >
                      Só Particular
                    </button>
                    <button
                      type="button"
                      onClick={() => setAtendeConvenio(true)}
                      className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${atendeConvenio ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 text-text-placeholder border-card-border'}`}
                    >
                      Atende Convênio
                    </button>
                  </div>

                  {atendeConvenio && (
                    <div className="p-6 bg-slate-50/50 rounded-3xl border border-card-border grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {['Unimed', 'Bradesco', 'Amil', 'SulAmérica', 'Cassi', 'Porto Seguro', 'Golden Cross', 'Care Plus', 'Intermédica', 'Outros'].map(c => {
                        const selected = conveniosSelecionados.includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              if (selected) setConveniosSelecionados(conveniosSelecionados.filter(item => item !== c));
                              else setConveniosSelecionados([...conveniosSelecionados, c]);
                            }}
                            className={`py-3 px-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${selected ? 'bg-primary-soft text-primary border-primary/20' : 'bg-white text-text-placeholder border-slate-100'}`}
                          >
                            {selected ? '✅ ' : ''}{c}
                          </button>
                        );
                      })}
                    </div>
                  )}
               </div>

               <div className="col-span-full pt-10 border-t border-slate-50">
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button type="submit" disabled={saving} className="btn-primary flex-2 py-5 rounded-[1.5rem] text-[10px]">
                      {saving ? 'Processando Registro...' : 'Confirmar e Publicar'}
                    </button>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
