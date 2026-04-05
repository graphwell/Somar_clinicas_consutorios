"use client";
import React, { useState, useRef } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

type Foto = {
  id: string;
  tipo: string;
  urlArquivo: string;
  descricao?: string | null;
  servicoNome?: string | null;
  createdAt: string;
};

interface GaleriaFotosProps {
  pacienteId: string;
  fotos: Foto[];
  onFotoAdicionada: (foto: Foto) => void;
  onFotoDeletada: (fotoId: string) => void;
}

const TIPOS = ["Todos", "antes", "depois", "referencia", "evolucao"];
const TIPO_LABEL: Record<string, string> = {
  antes: "Antes",
  depois: "Depois",
  referencia: "Referência",
  evolucao: "Evolução",
};

export function GaleriaFotos({ pacienteId, fotos, onFotoAdicionada, onFotoDeletada }: GaleriaFotosProps) {
  const [filtro, setFiltro] = useState("Todos");
  const [comparando, setComparando] = useState(false);
  const [fotoAntes, setFotoAntes] = useState<Foto | null>(null);
  const [fotoDepois, setFotoDepois] = useState<Foto | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTipo, setUploadTipo] = useState("depois");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<Foto | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fotosFiltradas = filtro === "Todos" ? fotos : fotos.filter(f => f.tipo === filtro);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function enviarFoto() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", uploadFile);
      fd.append("tipo", uploadTipo);
      if (uploadDesc) fd.append("descricao", uploadDesc);
      const res = await fetchWithAuth(`/api/ficha-cliente/${pacienteId}/fotos`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.foto) {
        onFotoAdicionada(data.foto);
        setUploadOpen(false);
        setUploadFile(null);
        setPreview(null);
        setUploadDesc("");
      } else {
        alert(data.error || "Erro ao enviar foto");
      }
    } catch {
      alert("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  }

  async function deletarFoto(fotoId: string) {
    if (!confirm("Remover esta foto?")) return;
    const res = await fetchWithAuth(`/api/ficha-cliente/${pacienteId}/fotos/${fotoId}`, { method: "DELETE" });
    if (res.ok) onFotoDeletada(fotoId);
  }

  const fotosAntes = fotos.filter(f => f.tipo === "antes");
  const fotosDepois = fotos.filter(f => f.tipo === "depois");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {TIPOS.map(t => (
            <button
              key={t}
              onClick={() => setFiltro(t)}
              className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border transition-all ${
                filtro === t
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-text-muted border-card-border hover:border-primary/30"
              }`}
            >
              {t === "Todos" ? "Todas" : TIPO_LABEL[t] ?? t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {fotosAntes.length > 0 && fotosDepois.length > 0 && (
            <button
              onClick={() => { setComparando(true); setFotoAntes(fotosAntes[0]); setFotoDepois(fotosDepois[0]); }}
              className="text-[9px] font-black uppercase px-3 py-1.5 rounded-full border border-primary/20 text-primary bg-primary-soft hover:bg-primary/10 transition-colors"
            >
              Comparar
            </button>
          )}
          <button
            onClick={() => setUploadOpen(true)}
            className="text-[9px] font-black uppercase px-3 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* Grade de fotos */}
      {fotosFiltradas.length === 0 ? (
        <div className="bg-slate-50 border border-card-border rounded-2xl py-12 text-center">
          <p className="text-text-placeholder text-xs font-black uppercase tracking-widest">
            {filtro === "Todos" ? "Nenhuma foto cadastrada" : `Nenhuma foto do tipo "${TIPO_LABEL[filtro] ?? filtro}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotosFiltradas.map(foto => (
            <div key={foto.id} className="relative group rounded-xl overflow-hidden bg-slate-100 aspect-square">
              <img
                src={foto.urlArquivo}
                alt={foto.descricao ?? foto.tipo}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setFotoAmpliada(foto)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg bg-black/50 text-white">
                  {TIPO_LABEL[foto.tipo] ?? foto.tipo}
                </span>
              </div>
              <button
                onClick={() => deletarFoto(foto.id)}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {foto.descricao && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-white leading-tight">{foto.descricao}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Upload */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" onClick={() => { setUploadOpen(false); setPreview(null); setUploadFile(null); }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-[2rem] shadow-2xl border border-card-border p-6 w-full max-w-sm space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black uppercase text-sm tracking-tight text-text-main">Adicionar Foto</h3>
              <button onClick={() => { setUploadOpen(false); setPreview(null); setUploadFile(null); }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-text-placeholder">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Preview ou seletor */}
            {preview ? (
              <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-100">
                <img src={preview} className="w-full h-full object-cover" />
                <button onClick={() => { setPreview(null); setUploadFile(null); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full aspect-video bg-slate-50 border-2 border-dashed border-card-border rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p className="text-xs text-text-muted">Clique para selecionar</p>
                <p className="text-[9px] text-text-placeholder">JPG, PNG ou WebP • max 10MB</p>
              </button>
            )}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
              capture="environment" className="hidden" onChange={handleFileChange} />

            {/* Tipo */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Tipo de foto</label>
              <select value={uploadTipo} onChange={e => setUploadTipo(e.target.value)} className="input-premium w-full py-2.5 text-sm">
                <option value="depois">Depois</option>
                <option value="antes">Antes</option>
                <option value="referencia">Referência</option>
                <option value="evolucao">Evolução</option>
              </select>
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Descrição (opcional)</label>
              <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                placeholder="Ex: Após coloração loiro mel..." className="input-premium w-full py-2.5 text-sm" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setUploadOpen(false); setPreview(null); setUploadFile(null); }}
                className="flex-1 py-2.5 bg-slate-50 border border-card-border rounded-xl text-[9px] font-black uppercase hover:bg-slate-100">
                Cancelar
              </button>
              <button onClick={enviarFoto} disabled={!uploadFile || uploading}
                className="flex-1 btn-primary py-2.5 text-[9px] disabled:opacity-40">
                {uploading ? "Enviando..." : "Salvar Foto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Comparação */}
      {comparando && fotoAntes && fotoDepois && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80" onClick={() => setComparando(false)}>
          <div className="relative w-full max-w-2xl px-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setComparando(false)}
              className="absolute -top-10 right-4 text-white/70 hover:text-white text-sm font-bold">
              Fechar ×
            </button>
            <div className="relative overflow-hidden rounded-2xl" style={{ paddingBottom: "56.25%" }}>
              <img src={fotoDepois.urlArquivo} className="absolute inset-0 w-full h-full object-cover" alt="depois" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                <img src={fotoAntes.urlArquivo} className="absolute inset-0 w-full h-full object-cover" alt="antes" />
              </div>
              {/* Labels */}
              <div className="absolute top-3 left-3 text-[9px] font-black uppercase bg-black/50 text-white px-2 py-1 rounded-lg">Antes</div>
              <div className="absolute top-3 right-3 text-[9px] font-black uppercase bg-black/50 text-white px-2 py-1 rounded-lg">Depois</div>
              {/* Divider */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-lg pointer-events-none" style={{ left: `${sliderPos}%` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l-3 4 3 4M9 3l3 4-3 4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <input type="range" min="0" max="100" value={sliderPos}
                onChange={e => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize z-10" />
            </div>
            {/* Seleção de fotos */}
            {(fotosAntes.length > 1 || fotosDepois.length > 1) && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1 space-y-1">
                  <p className="text-[9px] font-bold uppercase text-white/60">Antes</p>
                  <div className="flex gap-1 overflow-x-auto">
                    {fotosAntes.map(f => (
                      <img key={f.id} src={f.urlArquivo} onClick={() => setFotoAntes(f)}
                        className={`w-12 h-12 object-cover rounded-lg cursor-pointer flex-shrink-0 ${fotoAntes.id === f.id ? 'ring-2 ring-white' : 'opacity-60'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[9px] font-bold uppercase text-white/60">Depois</p>
                  <div className="flex gap-1 overflow-x-auto">
                    {fotosDepois.map(f => (
                      <img key={f.id} src={f.urlArquivo} onClick={() => setFotoDepois(f)}
                        className={`w-12 h-12 object-cover rounded-lg cursor-pointer flex-shrink-0 ${fotoDepois.id === f.id ? 'ring-2 ring-white' : 'opacity-60'}`} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80" onClick={() => setFotoAmpliada(null)}>
          <img src={fotoAmpliada.urlArquivo} className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
