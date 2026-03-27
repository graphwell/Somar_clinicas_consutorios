"use client";

export interface Service {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  bufferTimeMinutes: number;
}

export interface Profissional {
  id: string;
  nome: string;
  color?: string;
  especialidade?: string | null;
  fotoUrl?: string | null;
  bio?: string | null;
  escalas?: Array<{ diaSemana: number, horaInicio: string, horaFim: string, lunchStart?: string | null, lunchEnd?: string | null, ativo: boolean }>;
  horariosJson?: any;
}

export interface Appointment {
  id: string;
  dataHora: string;
  fimDataHora?: string;
  durationMinutes?: number;
  status: string;
  paciente: { id: string; nome: string; telefone: string };
  profissional?: Profissional | null;
  servico?: Service | null;
  tipoAtendimento?: string;
  convenio?: string;
  observacoes?: string;
}

export const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  confirmado: { label: 'Confirmado', bg: '#22C55E', text: 'white', dot: '#15803D' },
  pendente: { label: 'Pendente', bg: '#F59E0B', text: 'white', dot: '#B45309' },
  cancelado: { label: 'Cancelado', bg: '#EF4444', text: 'white', dot: '#B91C1C' },
  available: { label: 'Livre', bg: '#FFFFFF', text: '#1E293B', dot: '#CBD5E1' },
  done: { label: 'Concluído', bg: '#1E293B', text: 'white', dot: '#020617' },
  reagendado: { label: 'Reagendado', bg: '#6366F1', text: 'white', dot: '#4338CA' },
};

export const WEEKDAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function formatTime(iso: string) { 
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return "--:--"; }
}

export function formatDate(iso: string) { 
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return "---"; }
}

export function isSameDay(a: Date, b: Date) { 
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); 
}

export const generateSmartSlots = (
  startStr: string = "08:00",
  endStr: string = "18:00",
  service?: Service | null,
  existingAppts: Appointment[] = [],
  selectedDate: Date = new Date(),
  profDuration?: number,
  profBuffer?: number,
  lunchStart?: string | null,
  lunchEnd?: string | null
) => {
  const slots: string[] = [];
  const startParts = (startStr || "08:00").split(':').map(Number);
  const endParts = (endStr || "18:00").split(':').map(Number);
  
  let current = new Date(selectedDate);
  current.setHours(startParts[0], startParts[1], 0, 0);
  
  const end = new Date(selectedDate);
  end.setHours(endParts[0], endParts[1], 0, 0);

  // Prioritize professional settings over service settings
  const duration = profDuration || service?.duracaoMinutos || 30;
  const buffer = (profBuffer !== undefined && profBuffer !== null) ? profBuffer : (service?.bufferTimeMinutes || 0);
  const slotTotal = duration + buffer;

  while (current < end) {
    const timeStr = current.getHours().toString().padStart(2, '0') + ':' + current.getMinutes().toString().padStart(2, '0');
    
    // Lunch Break Logic V5.11
    if (lunchStart && lunchEnd && timeStr >= lunchStart && timeStr < lunchEnd) {
      const [leH, leM] = lunchEnd.split(':').map(Number);
      current.setHours(leH, leM, 0, 0);
      continue;
    }

    if (new Date(current.getTime() + slotTotal * 60000) > end) break;
    slots.push(timeStr);
    
    const appt = existingAppts.find(a => {
      const aDate = new Date(a.dataHora);
      return aDate.getHours() === current.getHours() && aDate.getMinutes() === current.getMinutes();
    });

    if (appt) {
      const apptDuration = appt.durationMinutes || 30;
      const apptBuffer = appt.servico?.bufferTimeMinutes || 0;
      current = new Date(current.getTime() + (apptDuration + apptBuffer) * 60000);
    } else {
      current = new Date(current.getTime() + slotTotal * 60000);
    }
  }
  return slots;
};
