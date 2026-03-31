"use client";
import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { fetchWithAuth } from '@/lib/api-utils';

interface Props {
  currentUrl?: string | null;
  nome?: string;
  size?: number; // px, default 40
  onUpdate?: (newUrl: string) => void;
  readOnly?: boolean;
}

interface Area { x: number; y: number; width: number; height: number }

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92));
}

function hashColor(nome: string): string {
  const colors = [
    'linear-gradient(135deg,#40916C,#52B788)',
    'linear-gradient(135deg,#3B82F6,#60A5FA)',
    'linear-gradient(135deg,#C4973A,#E4B86A)',
    'linear-gradient(135deg,#8B5CF6,#A78BFA)',
    'linear-gradient(135deg,#E05C5C,#F87171)',
    'linear-gradient(135deg,#0891B2,#22D3EE)',
  ];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function AvatarEditor({ currentUrl, nome = 'U', size = 40, onUpdate, readOnly = false }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [srcImg, setSrcImg] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const initials = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const openFile = (capture?: boolean) => {
    setMenuOpen(false);
    if (capture) selfieRef.current?.click();
    else fileRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSrcImg(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onCropComplete = useCallback((_: unknown, pixels: Area) => setCroppedAreaPixels(pixels), []);

  const handleRemove = async () => {
    setMenuOpen(false);
    setSaving(true);
    try {
      await fetchWithAuth('/api/upload/avatar', {
        method: 'DELETE',
      });
      onUpdate?.('');
      setToast('Foto removida.');
    } catch {
      setToast('Erro ao remover.');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleSave = async () => {
    if (!srcImg || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(srcImg, croppedAreaPixels);
      const form = new FormData();
      form.append('avatar', blob, 'avatar.jpg');
      const res = await fetchWithAuth('/api/upload/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) {
        onUpdate?.(data.avatarUrl);
        setToast('Foto atualizada ✓');
      } else {
        setToast(data.error || 'Erro ao salvar.');
      }
    } catch {
      setToast('Erro ao salvar.');
    } finally {
      setSaving(false);
      setSrcImg(null);
      setTimeout(() => setToast(''), 2500);
    }
  };

  return (
    <>
      {/* Avatar clicável */}
      <div className="relative inline-block" style={{ width: size, height: size }}>
        <div
          className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center font-medium text-white select-none ${!readOnly ? 'cursor-pointer' : ''}`}
          style={{
            background: currentUrl ? 'transparent' : hashColor(nome),
            fontSize: size * 0.38,
          }}
          onClick={() => !readOnly && setMenuOpen((v) => !v)}
        >
          {currentUrl ? (
            <img src={currentUrl} alt={nome} className="w-full h-full object-cover" />
          ) : (
            initials || 'U'
          )}
          {!readOnly && (
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <span style={{ fontSize: size * 0.35 }}>📷</span>
            </div>
          )}
        </div>

        {/* Indicador de loading */}
        {saving && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <svg className="animate-spin text-white" style={{ width: size * 0.4, height: size * 0.4 }} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}

        {/* Menu de opções */}
        {menuOpen && !readOnly && (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-xl border border-warm-200 py-1 overflow-hidden"
            style={{ top: size + 6, left: '50%', transform: 'translateX(-50%)', minWidth: 180 }}
          >
            <button
              onClick={() => openFile(true)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-warm-100 transition-colors"
            >
              <span>📷</span> Tirar selfie
            </button>
            <button
              onClick={() => openFile(false)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-warm-100 transition-colors"
            >
              <span>🖼️</span> Escolher foto
            </button>
            {currentUrl && (
              <button
                onClick={handleRemove}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-warm-200"
              >
                <span>🗑️</span> Remover foto
              </button>
            )}
          </div>
        )}

        {/* Overlay para fechar menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
        )}
      </div>

      {/* Inputs de arquivo ocultos */}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
      <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFileChange} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* Modal de crop */}
      {srcImg && (
        <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'rgba(0,0,0,0.85)' }}>
          {/* Área de crop */}
          <div className="relative flex-1">
            <Cropper
              image={srcImg}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controles */}
          <div className="bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-100 w-10">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-sage-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSrcImg(null)}
                className="flex-1 h-10 rounded-lg border border-warm-300 text-slate-300 text-sm hover:bg-warm-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-10 rounded-lg text-white text-sm font-medium disabled:opacity-60 transition-colors"
                style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}
              >
                {saving ? 'Salvando...' : 'Salvar foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
