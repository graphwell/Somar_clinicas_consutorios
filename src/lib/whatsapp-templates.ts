/** Formata data no fuso Fortaleza (ex: "segunda-feira, 14/04") */
export function formatarDataBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

/** Formata hora no fuso Fortaleza em HH:MM (ex: "09:30") */
export function formatarHoraBR(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export const TPL = {

  confirmacaoImediata: (v: {
    nome: string;
    servico: string;
    data: string;
    hora: string;
    profissional: string;
    clinica: string;
    protocolo: string;
  }) =>
    `Ola ${v.nome}!\n\n` +
    `Agendamento recebido:\n\n` +
    `Servico: ${v.servico}\n` +
    `Data: ${v.data} as ${v.hora}\n` +
    `Profissional: ${v.profissional}\n` +
    `Local: ${v.clinica}\n` +
    `Protocolo: #${v.protocolo}\n\n` +
    `Para CONFIRMAR responda: SIM\n` +
    `Para CANCELAR responda: NAO`,

  lembrete: (v: {
    nome: string;
    servico: string;
    data: string;
    hora: string;
    clinica: string;
    horas: number;
  }) =>
    `Ola ${v.nome}!\n\n` +
    `Lembrete de agendamento em ${v.horas}h:\n\n` +
    `${v.servico}\n` +
    `${v.data} as ${v.hora}\n` +
    `${v.clinica}\n\n` +
    `Para CONFIRMAR responda: SIM\n` +
    `Para CANCELAR responda: NAO`,

  confirmadoPeloCliente: (v: {
    nome: string;
    servico: string;
    data: string;
    hora: string;
  }) =>
    `Confirmado, ${v.nome}!\n\n` +
    `Te esperamos:\n` +
    `${v.servico}\n` +
    `${v.data} as ${v.hora}\n\n` +
    `Ate la!`,

  cancelamento: (v: {
    nome: string;
    servico: string;
    data: string;
    hora: string;
    clinica: string;
  }) =>
    `Ola ${v.nome},\n\n` +
    `Agendamento cancelado:\n\n` +
    `${v.servico}\n` +
    `${v.data} as ${v.hora}\n\n` +
    `Para reagendar entre em contato.\n` +
    `${v.clinica}`,

  remarcacao: (v: {
    nome: string;
    servico: string;
    dataAntiga: string;
    horaAntiga: string;
    dataNova: string;
    horaNova: string;
    clinica: string;
  }) =>
    `Ola ${v.nome},\n\n` +
    `Agendamento remarcado:\n\n` +
    `De: ${v.dataAntiga} as ${v.horaAntiga}\n` +
    `Para: ${v.dataNova} as ${v.horaNova}\n\n` +
    `Servico: ${v.servico}\n` +
    `${v.clinica}\n\n` +
    `Para confirmar responda: SIM`,

  aniversario: (v: {
    nome: string;
    clinica: string;
  }) =>
    `Feliz aniversario, ${v.nome}!\n\n` +
    `A equipe da ${v.clinica} deseja ` +
    `um dia muito especial para voce!\n\n` +
    `Que tal agendar um horario hoje?`,
};
