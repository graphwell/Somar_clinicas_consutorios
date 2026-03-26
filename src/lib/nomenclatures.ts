import { NichoType } from '@prisma/client';

export interface NichoLabels {
  termoPaciente:      string; // "Paciente" | "Cliente"
  termoPacientePlural: string; // "Pacientes" | "Clientes"
  termoServico:       string; // "Consulta" | "Serviço" | "Procedimento"
  termoServicoPlural:  string;
  termoProfissional:  string; // "Médico" | "Profissional" | "Especialista"
  termoAgenda:        string; // "Agenda" | "Atendimentos"
  termoProntuario:    string; // "Prontuário" | "Ficha" | "Anamnese"
  temProntuario:      boolean;
  temConvenio:        boolean;
  temAssinatura:      boolean;
  temEspecialidades:  boolean;
  temMultiProf:       boolean;
}

export function getNomenclature(nicho: NichoType | string): NichoLabels {
  // Garantir que nicho seja tratado corretamente se vier como string do banco
  const n = typeof nicho === 'string' ? nicho as NichoType : nicho;

  switch (n) {
    case NichoType.CLINICA_MEDICA:
    case NichoType.FISIOTERAPIA:
    case NichoType.ODONTOLOGIA:
      return {
        termoPaciente: 'Paciente',
        termoPacientePlural: 'Pacientes',
        termoServico: 'Consulta',
        termoServicoPlural: 'Consultas',
        termoProfissional: n === 'ODONTOLOGIA' ? 'Dentista' : (n === 'FISIOTERAPIA' ? 'Fisioterapeuta' : 'Médico'),
        termoAgenda: 'Agenda',
        termoProntuario: 'Prontuário',
        temProntuario: true,
        temConvenio: true,
        temAssinatura: false,
        temEspecialidades: false,
        temMultiProf: true
      };

    case NichoType.CLINICA_MULTI:
      return {
        termoPaciente: 'Paciente',
        termoPacientePlural: 'Pacientes',
        termoServico: 'Consulta',
        termoServicoPlural: 'Consultas',
        termoProfissional: 'Especialista',
        termoAgenda: 'Agenda',
        termoProntuario: 'Prontuário',
        temProntuario: true,
        temConvenio: true,
        temAssinatura: false,
        temEspecialidades: true,
        temMultiProf: true
      };

    case NichoType.CLINICA_ESTETICA:
      return {
        termoPaciente: 'Cliente',
        termoPacientePlural: 'Clientes',
        termoServico: 'Procedimento',
        termoServicoPlural: 'Procedimentos',
        termoProfissional: 'Esteticista',
        termoAgenda: 'Agenda',
        termoProntuario: 'Anamnese',
        temProntuario: false,
        temConvenio: false,
        temAssinatura: false,
        temEspecialidades: false,
        temMultiProf: true
      };

    case NichoType.SALAO_BELEZA:
    case NichoType.BARBEARIA:
      return {
        termoPaciente: 'Cliente',
        termoPacientePlural: 'Clientes',
        termoServico: 'Serviço',
        termoServicoPlural: 'Serviços',
        termoProfissional: n === 'BARBEARIA' ? 'Barbeiro' : 'Profissional',
        termoAgenda: 'Agenda',
        termoProntuario: 'Ficha',
        temProntuario: false,
        temConvenio: false,
        temAssinatura: true,
        temEspecialidades: false,
        temMultiProf: true
      };

    default:
      return {
        termoPaciente: 'Cliente',
        termoPacientePlural: 'Clientes',
        termoServico: 'Serviço',
        termoServicoPlural: 'Serviços',
        termoProfissional: 'Profissional',
        termoAgenda: 'Agenda',
        termoProntuario: 'Ficha',
        temProntuario: false,
        temConvenio: false,
        temAssinatura: false,
        temEspecialidades: false,
        temMultiProf: true
      };
  }
}
