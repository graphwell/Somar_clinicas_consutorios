import { NichoType } from '@prisma/client';

export interface NichoLabels {
  termoPaciente:           string; // "Paciente" | "Cliente"
  termoPacientePlural:     string; // "Pacientes" | "Clientes"
  termoServico:            string; // "Consulta" | "Serviço" | "Procedimento"
  termoServicoPlural:      string;
  termoProfissional:       string; // "Médico" | "Profissional" | "Especialista"
  termoProfissionalPlural: string; // "Médicos" | "Profissionais" | "Especialistas"
  termoAgenda:             string; // "Agenda" | "Atendimentos"
  termoProntuario:         string; // "Prontuário" | "Ficha" | "Anamnese"
  temProntuario:           boolean;
  temConvenio:             boolean;
  temAssinatura:           boolean;
  temEspecialidades:       boolean;
  temMultiProf:            boolean;
}

export function getNomenclature(nicho: NichoType | string): NichoLabels {
  // Garantir que nicho seja tratado corretamente se vier como string do banco
  const n = typeof nicho === 'string' ? nicho as NichoType : nicho;

  switch (n) {
    case NichoType.CLINICA_MEDICA:
    case NichoType.FISIOTERAPIA:
    case NichoType.ODONTOLOGIA: {
      const prof = n === 'ODONTOLOGIA' ? 'Dentista' : (n === 'FISIOTERAPIA' ? 'Fisioterapeuta' : 'Médico');
      const profPlural = n === 'ODONTOLOGIA' ? 'Dentistas' : (n === 'FISIOTERAPIA' ? 'Fisioterapeutas' : 'Médicos');
      return {
        termoPaciente: 'Paciente',
        termoPacientePlural: 'Pacientes',
        termoServico: 'Consulta',
        termoServicoPlural: 'Consultas',
        termoProfissional: prof,
        termoProfissionalPlural: profPlural,
        termoAgenda: 'Agenda',
        termoProntuario: 'Prontuário',
        temProntuario: true,
        temConvenio: true,
        temAssinatura: false,
        temEspecialidades: false,
        temMultiProf: true
      };
    }

    case NichoType.CLINICA_MULTI:
      return {
        termoPaciente: 'Paciente',
        termoPacientePlural: 'Pacientes',
        termoServico: 'Consulta',
        termoServicoPlural: 'Consultas',
        termoProfissional: 'Especialista',
        termoProfissionalPlural: 'Especialistas',
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
        termoProfissionalPlural: 'Esteticistas',
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
        termoProfissionalPlural: n === 'BARBEARIA' ? 'Barbeiros' : 'Profissionais',
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
        termoProfissionalPlural: 'Profissionais',
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
