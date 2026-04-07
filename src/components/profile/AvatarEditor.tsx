"use client";
import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { fetchWithAuth } from '@/lib/api-utils';

interface Props {
  /** URL atual da foto (string vazia = sem foto) */
  currentUrl?: string | null;
  /** Nome para gerar iniciais e cor quando sem foto */
  nome?: string;
  /** Tamanho do avatar em px (default 40) */
  size?: number;
  /** 'circle' = circular (padrão usuário) | 'rounded' = quadrado arredondado (padrão profissional) */
  shape?: 'circle' | 'rounded';
  /** Tamanho final da imagem exportada em px (default 256) */
  outputSize?: number;
  /** Endpoint de upload (default: /api/upload/avatar) */
  uploadEndpoint?: string;
  /** Campo do FormData que carrega a imagem (default: 'avatar') */
  fieldName?: string;
  /** Campo da resposta JSON com a URL retornada (default: 'avatarUrl') */
  responseField?: string;
  /** Chamado com a nova URL após salvar */
  onUpdate?: (newUrl: string) => void;
  /** Se true, não exibe overlay de edição */
  readOnly?: boolean;
}

interface Area { x: number; y: number; width: number; height: number }

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize: number
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    img,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outputSize, outputSize
  );
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.88)
  );
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

export default function AvatarEditor({
  currentUrl,
  nome = 'U',
  size = 40,
  shape = 'circle',
  outputSize = 256,
  uploadEndpoint = '/api/upload/avatar',
  fieldName = 'avatar',
  responseField = 'avatarUrl',
  onUpdate,
  readOnly = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [srcImg, setSrcImg] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const borderRadius = shape === 'circle' ? '50%' : '16px';
  const cropShape = shape === 'circle' ? 'round' : 'rect';

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
      await fetchWithAuth(uploadEndpoint, { method: 'DELETE' });
      onUpdate?.('');
      showToast('Foto removida.');
    } catch {
      showToast('Erro ao remover.');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSave = async () => {
    if (!srcImg || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(srcImg, croppedAreaPixels, outputSize);
      const form = new FormData();
      form.append(fieldName, blob, 'avatar.jpg');
      const res = await fetchWithAuth(uploadEndpoint, { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) {
        onUpdate?.(data[responseField]);
        showToast('Foto atualizada ✓');
      } else {
        showToast(data.error || 'Erro ao salvar.');
      }
    } catch {
      showToast('Erro ao salvar.');
    } finally {
      setSaving(false);
      setSrcImg(null);
    }
  };

  return (
    <>
      {/* ── Avatar clicável ── */}
      <div className="relative inline-block" style={{ width: size, height: size }}>
        <div
          className={`w-full h-full overflow-hidden flex items-center justify-center font-medium text-white select-none ${!readOnly ? 'cursor-pointer' : ''}`}
          style={{
            borderRadius,
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
        </div>

        {/* Overlay hover com ícone de câmera */}
        {!readOnly && (
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            style={{
              borderRadius,
              background: 'rgba(0,0,0,0.42)',
            }}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg
              width={Math.max(14, size * 0.32)}
              height={Math.max(14, size * 0.32)}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}

        {/* Badge câmera (canto inferior direito) — visível sempre em modo edição */}
        {!readOnly && !saving && (
          <div
            className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center shadow-md pointer-events-none"
            style={{
              width: Math.max(16, size * 0.36),
              height: Math.max(16, size * 0.36),
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#40916C,#2D6A4F)',
              border: '2px solid white',
            }}
          >
            <svg
              width={Math.max(8, size * 0.18)}
              height={Math.max(8, size * 0.18)}
              viewBox="0 0 10 10"
              fill="none"
            >
              <path
                d="M1.667 3.333c0-.46.373-.833.833-.833H3.5l.5-1h2l.5 1h1c.46 0 .833.373.833.833v4.334a.833.833 0 01-.833.833H2.5a.833.833 0 01-.833-.833V3.333z"
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              <circle cx="5" cy="5.167" r="1.167" stroke="white" strokeWidth="1" />
            </svg>
          </div>
        )}

        {/* Loading overlay */}
        {saving && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/50"
            style={{ borderRadius }}
          >
            <svg
              className="animate-spin text-white"
              style={{ width: size * 0.4, height: size * 0.4 }}
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Menu de opções */}
        {menuOpen && !readOnly && (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden"
            style={{ top: size + 8, left: '50%', transform: 'translateX(-50%)', minWidth: 190 }}
          >
            <button
              onClick={() => openFile(true)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>📷 Tirar foto agora</span>
            </button>
            <button
              onClick={() => openFile(false)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>📁 Escolher da galeria</span>
            </button>
            {currentUrl && (
              <button
                onClick={handleRemove}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-slate-100"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
                <span>Remover foto</span>
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
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={onFileChange}
      />
      <input
        ref={selfieRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* ── Modal de crop ── */}
      {srcImg && (
        <div
          className="fixed inset-0 z-[200] flex flex-col"
          style={{ background: 'rgba(0,0,0,0.9)' }}
        >
          {/* Header do modal */}
          <div className="flex items-center justify-between px-5 py-4">
            <button
              onClick={() => setSrcImg(null)}
              className="text-white/60 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Cancelar
            </button>
            <p className="text-white/80 text-sm font-medium">Ajuste a foto</p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={{ background: '#40916C' }}
            >
              {saving ? 'Salvando…' : 'Usar foto'}
            </button>
          </div>

          {/* Área de crop */}
          <div className="relative flex-1">
            <Cropper
              image={srcImg}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controles */}
          <div className="bg-black/60 backdrop-blur-sm px-6 py-5 space-y-3">
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <input
                type="range"
                min={1}
                max={3}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: '#40916C' }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="text-center text-xs text-white/40">Arraste para reencaixar · Deslize para dar zoom</p>
          </div>
        </div>
      )}
    </>
  );
}
