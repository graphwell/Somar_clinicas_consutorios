"use client";
import React, { useState, useRef, useEffect } from "react";

interface GravadorVozProps {
  onTranscricao: (texto: string) => void;
  disabled?: boolean;
}

type Estado = "idle" | "gravando" | "processando" | "erro";

export default function GravadorVoz({ onTranscricao, disabled }: GravadorVozProps) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [segundos, setSegundos] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animRef.current) clearInterval(animRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  function animateWaveform(analyser: AnalyserNode) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function draw() {
      analyser.getByteFrequencyData(dataArray);
      const step = Math.floor(dataArray.length / 20);
      const newBars = Array.from({ length: 20 }, (_, i) => {
        const val = dataArray[i * step] || 0;
        return Math.max(4, Math.round((val / 255) * 40));
      });
      setBars(newBars);
      animFrameRef.current = requestAnimationFrame(draw);
    }
    draw();
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio analysis for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setBars(Array(20).fill(4));
        await processarAudio(mimeType);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setEstado("gravando");
      setSegundos(0);

      timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
      animateWaveform(analyser);
    } catch {
      setEstado("erro");
    }
  }

  function pararGravacao() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setEstado("processando");
  }

  async function processarAudio(mimeType: string) {
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const formData = new FormData();
      formData.append("audio", blob, "gravacao.webm");

      const res = await fetch("/api/prontuario/ia/transcricao", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("synka-token") || ""}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.transcricao) {
        onTranscricao(data.transcricao);
        setEstado("idle");
      } else {
        setEstado("erro");
      }
    } catch {
      setEstado("erro");
    }
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-warm-50 border border-warm-200">
      {/* Waveform */}
      <div className="flex items-end gap-[2px] h-10 w-24 shrink-0">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full transition-all duration-75"
            style={{
              height: `${h}px`,
              background:
                estado === "gravando"
                  ? `hsl(${152 - i * 2}, 60%, 45%)`
                  : "rgba(0,0,0,0.12)",
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="flex-1 min-w-0">
        {estado === "idle" && (
          <p className="text-xs text-slate-300">Clique para gravar a consulta</p>
        )}
        {estado === "gravando" && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 font-medium">Gravando {fmt(segundos)}</span>
          </div>
        )}
        {estado === "processando" && (
          <p className="text-xs text-sage-600 animate-pulse">Transcrevendo com IA...</p>
        )}
        {estado === "erro" && (
          <p className="text-xs text-red-500">Erro na transcrição. Tente novamente.</p>
        )}
      </div>

      {/* Button */}
      <button
        onClick={estado === "gravando" ? pararGravacao : iniciarGravacao}
        disabled={disabled || estado === "processando"}
        className={[
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          "transition-all duration-200 focus:outline-none",
          estado === "gravando"
            ? "bg-red-500 hover:bg-red-600 shadow-md"
            : estado === "processando"
            ? "bg-warm-200 cursor-not-allowed"
            : "bg-sage-500 hover:bg-sage-600 shadow-md",
        ].join(" ")}
      >
        {estado === "gravando" ? (
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : estado === "processando" ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
            <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm-1 18.93A9 9 0 013.06 12H1a11 11 0 0010 10.93v2.07h2v-2.07A11 11 0 0023 12h-2.06A9 9 0 0113 19.93V17h-2v2.93z" />
          </svg>
        )}
      </button>
    </div>
  );
}
