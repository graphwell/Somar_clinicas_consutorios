"use client";
import React, { useState } from "react";

const PERGUNTAS_PHQ9 = [
  "Pouco interesse ou prazer em fazer as coisas",
  "Sentir-se para baixo, deprimido(a) ou sem esperança",
  "Dificuldade para adormecer ou permanecer dormindo, ou dormir mais do que o habitual",
  "Sentir-se cansado(a) ou com pouca energia",
  "Falta de apetite ou comer em excesso",
  "Sentir-se mal consigo mesmo(a) — ou que é um fracasso ou que decepcionou a si mesmo(a) ou a sua família",
  "Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão",
  "Lentidão para se movimentar ou falar, a ponto de outras pessoas perceberem; ou o oposto — estar tão agitado(a) que você fica andando de um lado para o outro mais do que o habitual",
  "Pensar em se machucar ou que seria melhor estar morto(a)",
];

const OPCOES = [
  { label: "Nenhuma vez", value: 0 },
  { label: "Vários dias", value: 1 },
  { label: "Mais da metade dos dias", value: 2 },
  { label: "Quase todos os dias", value: 3 },
];

function calcularSeveridade(score: number): { label: string; color: string } {
  if (score <= 4) return { label: "Mínima/Nenhuma", color: "text-green-600" };
  if (score <= 9) return { label: "Leve", color: "text-gold-500" };
  if (score <= 14) return { label: "Moderada", color: "text-orange-500" };
  if (score <= 19) return { label: "Moderadamente grave", color: "text-red-500" };
  return { label: "Grave", color: "text-red-700" };
}

interface PHQ9FormProps {
  valor?: Record<string, number>;
  onChange: (dados: { respostas: number[]; score: number; severidade: string }) => void;
}

export default function PHQ9Form({ valor, onChange }: PHQ9FormProps) {
  const [respostas, setRespostas] = useState<number[]>(
    valor?.respostas || Array(9).fill(-1)
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-blue-700">
          PHQ-9 — Escala de Depressão de Patient Health Questionnaire
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          Nas últimas 2 semanas, com que frequência você foi incomodado(a) por algum dos problemas a seguir?
        </p>
      </div>

      <div className="space-y-3">
        {PERGUNTAS_PHQ9.map((pergunta, i) => (
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
                      ? "bg-sage-500 border-sage-500 text-white font-medium"
                      : "border-warm-200 text-slate-500 hover:border-sage-300",
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
            <p className="text-xs text-slate-300">Score total PHQ-9</p>
            <p className={`text-lg font-bold ${sev.color}`}>{score}/27</p>
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
