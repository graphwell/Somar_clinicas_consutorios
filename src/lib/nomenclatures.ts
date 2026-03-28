import { NichoType } from '@prisma/client';

export interface NichoLabels {
  // Profissional
  termoProfissional:        string; // "Médico" | "Barbeiro" | "Especialista"
  termoProfissionalPlural:  string; // "Médicos" | "Barbeiros"
  tratamentoProfissional:   string; // "Dr." | "Dra." | "" (sem tratamento)

  // Cliente / Paciente
  termoPaciente:            string; // "Paciente" | "Cliente"
  termoPacientePlural:      string;

  // Serviço / Atendimento
  termoServico:             string; // alias de termoAtendimento (retrocompatibilidade)
  termoServicoPlural:       string;
  termoAtendimento:         string; // "Consulta" | "Serviço" | "Atendimento"
  termoAtendimentoPlural:   string;
  termoAgendar:             string; // "Agendar Consulta" | "Agendar Serviço"

  // Agenda / Prontuário
  termoAgenda:              string; // "Agenda Médica" | "Agenda"
  termoProntuario:          string; // "Prontuário" | "Ficha" | "Anamnese"
  tipoProntuario:           'CLINICO' | 'ODONTOLOGICO' | 'NUTRICIONAL' | null;

  // Flags de módulos
  temProntuario:            boolean;
  temConvenio:              boolean;
  temAssinatura:            boolean;
  temEspecialidades:        boolean;
  temOdontograma:           boolean;
  temPlanoAlimentar:        boolean;
  temMultiProf:             boolean;
}

export function getNomenclature(nicho: NichoType | string): NichoLabels {
  const n = typeof nicho === 'string' ? nicho as NichoType : nicho;

  switch (n) {

    // ─── CLÍNICA MÉDICA ──────────────────────────────────────
    case NichoType.CLINICA_MEDICA:
      return {
        termoProfissional:       'Médico',
        termoProfissionalPlural: 'Médicos',
        tratamentoProfissional:  'Dr.',
        termoPaciente:           'Paciente',
        termoPacientePlural:     'Pacientes',
        termoServico:            'Consulta',
        termoServicoPlural:      'Consultas',
        termoAtendimento:        'Consulta',
        termoAtendimentoPlural:  'Consultas',
        termoAgendar:            'Agendar Consulta',
        termoAgenda:             'Agenda Médica',
        termoProntuario:         'Prontuário',
        tipoProntuario:          'CLINICO',
        temProntuario:           true,
        temConvenio:             true,
        temAssinatura:           false,
        temEspecialidades:       false,
        temOdontograma:          false,
        temPlanoAlimentar:       false,
        temMultiProf:            true,
      };

    // ─── CLÍNICA MULTI-ESPECIALIDADE ─────────────────────────
    case NichoType.CLINICA_MULTI:
      return {
        termoProfissional:       'Especialista',
        termoProfissionalPlural: 'Especialistas',
        tratamentoProfissional:  'Dr.',
        termoPaciente:           'Paciente',
        termoPacientePlural:     'Pacientes',
        termoServico:            'Consulta',
        termoServicoPlural:      'Consultas',
        termoAtendimento:        'Consulta',
        termoAtendimentoPlural:  'Consultas',
        termoAgendar:            'Agendar com Especialista',
        termoAgenda:             'Agenda',
        termoProntuario:         'Prontuário',
        tipoProntuario:          'CLINICO',
        temProntuario:           true,
        temConvenio:             true,
        temAssinatura:           false,
        temEspecialidades:       true,
        temOdontograma:          false,
        temPlanoAlimentar:       false,
        temMultiProf:            true,
      };

    // ─── ODONTOLOGIA ─────────────────────────────────────────
    case NichoType.ODONTOLOGIA:
      return {
        termoProfissional:       'Dentista',
        termoProfissionalPlural: 'Dentistas',
        tratamentoProfissional:  'Dr.',
        termoPaciente:           'Paciente',
        termoPacientePlural:     'Pacientes',
        termoServico:            'Atendimento',
        termoServicoPlural:      'Atendimentos',
        termoAtendimento:        'Atendimento',
        termoAtendimentoPlural:  'Atendimentos',
        termoAgendar:            'Agendar com Dentista',
        termoAgenda:             'Agenda',
        termoProntuario:         'Prontuário Odontológico',
        tipoProntuario:          'ODONTOLOGICO',
        temProntuario:           true,
        temConvenio:             true,
        temAssinatura:           false,
        temEspecialidades:       false,
        temOdontograma:          true,
        temPlanoAlimentar:       false,
        temMultiProf:            true,
      };

    // ─── FISIOTERAPIA ─────────────────────────────────────────
    case NichoType.FISIOTERAPIA:
      return {
        termoProfissional:       'Fisioterapeuta',
        termoProfissionalPlural: 'Fisioterapeutas',
        tratamentoProfissional:  '',
        termoPaciente:           'Paciente',
        termoPacientePlural:     'Pacientes',
        termoServico:            'Sessão',
        termoServicoPlural:      'Sessões',
        termoAtendimento:        'Sessão',
        termoAtendimentoPlural:  'Sessões',
        termoAgendar:            'Agendar Sessão',
        termoAgenda:             'Agenda',
        termoProntuario:         'Prontuário',
        tipoProntuario:          'CLINICO',
        temProntuario:           true,
        temConvenio:             true,
        temAssinatura:           false,
        temEspecialidades:       false,
        temOdontograma:          false,
        temPlanoAlimentar:       false,
        temMultiProf:            true,
      };

    // ─── NUTRIÇÃO ─────────────────────────────────────────────
    case NichoType.NUTRICAO:
      return {
        termoProfissional:       'Nutricionista',
        termoProfissionalPlural: 'Nutricionistas',
        tratamentoProfissional:  '',
        termoPaciente:           'Paciente',
        termoPacientePlural:     'Pacientes',
        termoServico:            'Consulta',
        termoServicoPlural:      'Consultas',
        termoAtendimento:        'Consulta',
        termoAtendimentoPlural:  'Consultas',
        termoAgendar:            'Agendar Consulta',
        termoAgenda:             'Agenda',
        termoProntuario:         'Prontuário Nutricional',
        tipoProntuario:          'NUTRICIONAL',
        temProntuario:           true,
        temConvenio:             true,
        temAssinatura:           false,
        temEspecialidades:       false,
        temOdontograma:          false,
        temPlanoAlimentar:       true,
        temMultiProf:            false,
      };

    // ─── CLÍNICA ESTÉTICA ────────────────────────────────────
    case NichoType.CLINICA_ESTETICA:
      return {
        termoProfissional:       'Esteticista',
        termoProfissionalPlural: 'Esteticistas',
        tratamentoProfissional:  '',
        termoPaciente:           'Cliente',
        termoPacientePlural:     'Clientes',
        termoServico:            'Procedimento',
        termoServicoPlural:      'Procedimentos',
        termoAtendimento:        'Procedimento',
        termoAtendimentoPlural:  'Procedimentos',
        termoAgendar:            'Agendar Procedimento',
        termoAgenda:             'Agenda',
        termoProntuario:         'Anamnese',
        tipoProntuario:          'CLINICO',
        temProntuario:           true,
        temConvenio:             false,
        temAssinatura:           false,
        temEspecialidades:       false,
        temOdontograma:          false,
        temPlanoAlimentar:       false,
        temMultiProf:            true,
      };

    // ─── SALÃO DE BELEZA ─────────────────────────────────────
    case NichoType.SALAO_BELEZA:
      return {
        termoProfissional:       'Profissional',
        termoProfissionalPlural: 'Profissionais',
        tratamentoProfissional:  '',
        termoPaciente:           'Cliente',
        termoPacientePlural:     'Clientes',
        termoServico:            'Serviço',
        termoServicoPlural:      'Serviços',
        termoAtendimento:        'Serviço',
        termoAtendimentoPlural:  'Serviços',
        termoAgendar:            'Agendar Serviço',
        termoAgenda:             'Agenda',
        termoProntuario:         'Ficha',
        tipoProntuario:          null,
        temProntuario:           false,
        temConvenio:             false,
        temAssinatura:           true,
        temEspecialidades:       false,
        temOdontograma:          false,
        temPlanoAlimentar:       false,
        temMultiProf:            true,
      };

    // ─── BARBEARIA ───────────────────────────────────────────
    case NichoType.BARBEARIA:
      return {
        termoProfissional:       'Barbeiro',
        termoProfissionalPlural: 'Barbeiros',
        tratamentoProfissional:  '',
        termoPaciente:           'Cliente',
        termoPacientePlural:     'Clientes',
        termoServico:            'Serviço',
        termoServicoPlural:      'Serviços',
        termoAtendimento:        'Serviço',
        termoAtendimentoPlural:  'Serviços',
        termoAgendar:            'Agendar Serviço',
        termoAgenda:             'Agenda',
        termoProntuario:         'Ficha',
        tipoProntuario:          null,
        temProntuario:           false,
        temConvenio:             false,
        temAssinatura:           true,
        temEspecialidades:       false,
        temOdontograma:          false,
        temPlanoAlimentar:       false,
        temMultiProf:            true,
      };

    // ─── DEFAULT / OUTRO ─────────────────────────────────────
    default:
      return {
        termoProfissional:       'Profissional',
        termoProfissionalPlural: 'Profissionais',
        tratamentoProfissional:  '',
        termoPaciente:           'Cliente',
        termoPacientePlural:     'Clientes',
        termoServico:            'Serviço',
        termoServicoPlural:      'Serviços',
        termoAtendimento:        'Serviço',
        termoAtendimentoPlural:  'Serviços',
        termoAgendar:            'Agendar Serviço',
        termoAgenda:             'Agenda',
        termoProntuario:         'Ficha',
        tipoProntuario:          null,
        temProntuario:           false,
        temConvenio:             false,
        temAssinatura:           false,
        temEspecialidades:       false,
        temOdontograma:          false,
        temPlanoAlimentar:       false,
        temMultiProf:            true,
      };
  }
}
