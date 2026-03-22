"use client";
import React from 'react';

const PATIENTS = [
  { id: '1', nome: 'Alan Santos', telefone: '5585991516106', ultCons: '20/03/2026' },
  { id: '2', nome: 'Julia Lima', telefone: '5585991223344', ultCons: '18/03/2026' },
  { id: '3', nome: 'Carlos Eduardo', telefone: '5585988776655', ultCons: '15/03/2026' },
];

export default function PatientList() {
  return (
    <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-medium">Gestão de Pacientes</h3>
        <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-all">
          + Novo Paciente
        </button>
      </div>

      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-white/5">
          <tr>
            <th className="px-6 py-4 font-medium">Nome</th>
            <th className="px-6 py-4 font-medium">WhatsApp</th>
            <th className="px-6 py-4 font-medium">Última Consulta</th>
            <th className="px-6 py-4 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {PATIENTS.map(p => (
            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
              <td className="px-6 py-4 font-medium text-white">{p.nome}</td>
              <td className="px-6 py-4 text-gray-400">{p.telefone}</td>
              <td className="px-6 py-4 text-gray-400">{p.ultCons}</td>
              <td className="px-6 py-4">
                <button className="text-[#4a4ae2] hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver Ficha
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
