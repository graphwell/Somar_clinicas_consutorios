"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNicho } from '@/context/NichoContext';

const TENANT_ID = 'clinica_id_default';

interface HorariosSemana {
  [key: string]: {
    ativo: boolean;
    inicio: string;
    fim: string;
  };
}

interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
  registroProfissional: string | null;
  bio: string | null;
  fotoUrl: string | null;
  color: string | null;
  horariosJson: any; 
  ativo: boolean;
}

const DIAS_SEMANA = [
  { id: 'seg', label: 'Segunda' },
  { id: 'ter', label: 'Terça' },
  { id: 'qua', label: 'Quarta' },
  { id: 'qui', label: 'Quinta' },
  { id: 'sex', label: 'Sexta' },
  { id: 'sab', label: 'Sábado' },
  { id: 'dom', label: 'Domingo' },
];

const DEFAULT_HORARIOS: HorariosSemana = {
  seg: { ativo: true, inicio: '08:00', fim: '18:00' },
  ter: { ativo: true, inicio: '08:00', fim: '18:00' },
  qua: { ativo: true, inicio: '08:00', fim: '18:00' },
  qui: { ativo: true, inicio: '08:00', fim: '18:00' },
  sex: { ativo: true, inicio: '08:00', fim: '18:00' },
  sab: { ativo: false, inicio: '08:00', fim: '12:00' },
  dom: { ativo: false, inicio: '08:00', fim: '12:00' },
};

const PRESET_COLORS = ['#4a4ae2', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6'];

export default function TeamPage() {
  const { labels } = useNicho();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Profissional | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [registroProfissional, setRegistroProfissional] = useState('');
  const [bio, setBio] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [color, setColor] = useState('#4a4ae2');
  const [horarios, setHorarios] = useState<HorariosSemana>(DEFAULT_HORARIOS);
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchTeam = useCallback(() => {
    setLoading(true);
    fetch(`/api/team?tenantId=${TENANT_ID}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setProfissionais(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const openAdd = () => {
    setEditing(null);
    setNome('');
    setEspecialidade('');
    setRegistroProfissional('');
    setBio('');
    setFotoUrl('');
    setColor('#4a4ae2');
    setHorarios(DEFAULT_HORARIOS);
    setAtivo(true);
    setShowModal(true);
  };

  const openEdit = (p: Profissional) => {
    setEditing(p);
    setNome(p.nome);
    setEspecialidade(p.especialidade || '');
    setRegistroProfissional(p.registroProfissional || '');
    setBio(p.bio || '');
    setFotoUrl(p.fotoUrl || '');
    setColor(p.color || '#4a4ae2');
    setHorarios(p.horariosJson ? (p.horariosJson as HorariosSemana) : DEFAULT_HORARIOS);
    setAtivo(p.ativo);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/team/${editing.id}` : '/api/team';
      const method = editing ? 'PUT' : 'POST';
      const body = { 
        tenantId: TENANT_ID, 
        nome, 
        especialidade, 
        registroProfissional,
        bio,
        fotoUrl: fotoUrl || null,
        color,
        horariosJson: horarios,
        ativo 
      };

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();
      setShowModal(false);
      fetchTeam();
    } catch (error) {
      alert("Erro ao salvar profissional");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoUrl(reader.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const updateHorario = (dia: string, field: string, value: any) => {
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: value }
    }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-[3rem] shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--foreground)] uppercase italic">
            🧑‍💼 Minha Equipe <span className="text-[var(--accent)] text-lg">2.0</span>
          </h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-black uppercase tracking-widest opacity-60">Gestão avançada de perfis, registros e fotos.</p>
        </div>
        <button onClick={openAdd} className="px-8 py-4 bg-[var(--accent)] hover:opacity-90 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl shadow-[var(--accent)]/20 active:scale-95">+ Adicionar {labels.profissional}</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center font-black uppercase tracking-widest text-[10px] opacity-40 animate-pulse">Carregando Time...</div>
        ) : profissionais.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[var(--border)] rounded-[3rem] text-[var(--text-muted)] uppercase font-black text-xs tracking-widest">Nenhum profissional cadastrado</div>
        ) : profissionais.map(p => (
            <div key={p.id} className="group relative bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-8 hover:border-[var(--accent)]/40 transition-all shadow-sm flex flex-col items-center text-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: p.color || 'var(--accent)' }} />
              
              <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.ativo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {p.ativo ? 'Ativo' : 'Inativo'}
              </div>
              
              <div className="relative mt-4 mb-6">
                <div className="w-28 h-28 rounded-[2rem] p-1 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500" style={{ backgroundColor: p.color || 'var(--accent)' }}>
                  {p.fotoUrl ? (
                    <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover rounded-[1.8rem] bg-[var(--card-bg)]" />
                  ) : (
                    <div className="w-full h-full bg-[var(--card-bg)] rounded-[1.8rem] flex items-center justify-center text-3xl font-black" style={{ color: p.color || 'var(--accent)' }}>
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight mb-1 uppercase italic">{p.nome}</h3>
              <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest mb-2" style={{ color: p.color || 'var(--accent)' }}>{p.especialidade || labels.profissional}</p>
              {p.registroProfissional && (
                <p className="text-[8px] font-black text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-md uppercase tracking-[0.2em] mb-4 opacity-60">{p.registroProfissional}</p>
              )}
              
              <p className="text-[11px] text-[var(--text-muted)] font-medium italic mb-6 line-clamp-2 h-8 opacity-70">
                {p.bio || 'Sem biografia disponível.'}
              </p>

              <button onClick={() => openEdit(p)} className="w-full py-4 bg-[var(--foreground)]/5 hover:bg-[var(--accent)]/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border)] transition-all">Configurar Perfil</button>
            </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight uppercase italic">{editing ? `Editar Perfil` : `Novo Registro`}</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1">Dados oficiais e identidade visual</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] p-3 hover:bg-[var(--foreground)]/5 rounded-2xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nome Completo</label>
                    <input required type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Especialidade</label>
                      <input type="text" value={especialidade} onChange={e => setEspecialidade(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" placeholder="Ex: Médico" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Reg. Profissional</label>
                      <input type="text" value={registroProfissional} onChange={e => setRegistroProfissional(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" placeholder="Ex: CRM 12345" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Biografia Curta</label>
                    <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-4 text-sm focus:outline-none resize-none" placeholder="Conte um pouco sobre a experiência..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Cor de Identificação</label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-lg transition-all ${color === c ? 'ring-4 ring-[var(--accent)]/30 scale-110' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Foto do Profissional</label>
                    <div className="relative group cursor-pointer" onClick={triggerUpload}>
                       <div className="w-full aspect-square rounded-[2rem] bg-[var(--foreground)]/5 border-2 border-dashed border-[var(--border)] group-hover:border-[var(--accent)]/40 transition-all flex flex-col items-center justify-center overflow-hidden">
                          {uploading ? (
                             <div className="w-8 h-8 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
                          ) : fotoUrl ? (
                             <>
                               <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Trocar Foto</span>
                               </div>
                             </>
                          ) : (
                             <>
                               <span className="text-3xl mb-2">📸</span>
                               <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tirar Foto ou Upload</span>
                             </>
                          )}
                       </div>
                       <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                    </div>
                    {fotoUrl && (
                       <button type="button" onClick={(e) => { e.stopPropagation(); setFotoUrl(''); }} className="text-[8px] font-black uppercase tracking-widest text-red-500 mt-2 hover:underline">Remover Foto</button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Agenda Semanal</label>
                    <div className="bg-[var(--foreground)]/[0.02] border border-[var(--border)] p-4 rounded-3xl space-y-2">
                      {DIAS_SEMANA.map(dia => (
                        <div key={dia.id} className="flex items-center justify-between text-[10px] py-1">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={horarios[dia.id]?.ativo} onChange={e => updateHorario(dia.id, 'ativo', e.target.checked)} className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)]" />
                            <span className="font-black uppercase">{dia.label}</span>
                          </div>
                          {horarios[dia.id]?.ativo && (
                            <div className="flex gap-2">
                              <input type="time" value={horarios[dia.id]?.inicio} onChange={e => updateHorario(dia.id, 'inicio', e.target.value)} className="bg-transparent font-black focus:outline-none" />
                              <span>-</span>
                              <input type="time" value={horarios[dia.id]?.fim} onChange={e => updateHorario(dia.id, 'fim', e.target.value)} className="bg-transparent font-black focus:outline-none" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="col-span-full flex gap-4 mt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-[var(--foreground)]/5 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                  <button type="submit" disabled={saving || uploading} className="flex-2 py-5 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20">
                    {saving ? 'SALVANDO...' : 'CONFIRMAR ALTERAÇÕES'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
