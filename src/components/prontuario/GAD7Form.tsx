"use client";
import React, { useState } from "react";

const PERGUNTAS_GAD7 = [
  "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)",
  "Não ser capaz de impedir ou controlar as preocupações",
  "Preocupar-se muito com diversas coisas",
  "Dificuldade para relaxar",
  "Ficar tão agitado(a) que fica difícil permanecer sentado(a)",
  "Ficar facilmente aborrecido(a) ou irritado(a)",
  "Sentir medo como se algo horrível fosse acontecer",
];

const OPCOES = [
  { label: "Nenhuma vez", value: 0 },
  { label: "Vários dias", value: 1 },
  { label: "Mais da metade dos dias", value: 2 },
  { label: "Quase todos os dias", value: 3 },
];

function calcularSeveridade(score: number): { label: string; color: string } {
  if (score <= 4) return { label: "Mínima", color: "text-green-600" };
  if (score <= 9) return { label: "Leve", color: "text-gold-500" };
  if (score <= 14) return { label: "Moderada", color: "text-orange-500" };
  return { label: "Grave", color: "text-red-600" };
}

interface GAD7FormProps {
  valor?: Record<string, number>;
  onChange: (dados: { respostas: number[]; score: number; severidade: string }) => void;
}

export default function GAD7Form({ valor, onChange }: GAD7FormProps) {
  const [respostas, setRespostas] = useState<number[]>(
    valor?.respostas || Array(7).fill(-1)
  );

  function responder(index: number, val: number) {
    const novas = [...respostas];
    novas[index] = val;
    setRespostas(novas);
    const score = novas.reduce((acc, v) => acc + (v >= 0 ? v : 0), 0);
    const severidade = calcularSeveridade(score).label;
    onChange({ respostas: novas, score, severidade });
  }

  const score = respostas.reduce((acc, v) => acc + (v >= 0 ? v : 0), 0);
  const todasRespondidas = respostas.every((v) => v >= 0);
  const sev = calcularSeveridade(score);

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-purple-700">
          GAD-7 — Escala de Ansiedade Generalizada
        </p>
        <p className="text-xs text-purple-600 mt-0.5">
          Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos seguintes problemas?
        </p>
      </div>

      <div className="space-y-3">
        {PERGUNTAS_GAD7.map((pergunta, i) => (
          <div key={i} className="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <p className="text-sm text-slate-700 mb-2">
              <span className="font-medium text-slate-300 mr-1">{i + 1}.</span>
              {pergunta}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {OPCOES.map((op) => (
                <button
                  key={op.value}
                  onClick={() => responder(i, op.value)}
                  className={[
                    "px-2.5 py-1 rounded-lg text-xs border transition-all",
                    respostas[i] === op.value
                      ? "bg-purple-500 border-purple-500 text-white font-medium"
                      : "border-warm-200 text-slate-500 hover:border-purple-300",
                  ].join(" ")}
                >
                  {op.value} — {op.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {todasRespondidas && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-warm-50 border border-warm-200">
          <div>
            <p className="text-xs text-slate-300">Score total GAD-7</p>
            <p className={`text-lg font-bold ${sev.color}`}>{score}/21</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300">Severidade</p>
            <p className={`text-sm font-semibold ${sev.color}`}>{sev.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}
