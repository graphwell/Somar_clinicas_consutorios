import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {

  console.log('🌱 Iniciando seed da conta demo...')

  // ============================================
  // 1. CLÍNICA DEMO — tenant mestre para testes
  // ============================================
  
  const clinicaDemo = await prisma.clinica.upsert({
    where: { tenantId: 'demo-synka-master' },
    update: {},
    create: {
      tenantId:   'demo-synka-master',
      slug:       'demo-synka',
      nome:       'Clínica Demo Synka',
      nicho:      'CLINICA_MULTI',
      razaoSocial: 'Synka Demonstração Ltda',
      cnpj:       '00.000.000/0001-00',
      endereco:   'Av. Demo, 1000 — Fortaleza/CE',
      adminPhone: '(85) 99999-0000',
      botActive:  true,
      onboardingCompleted: true,
      multiProfissional:   true,
      openingTime: '07:00',
      closingTime: '20:00',
      workingDays: '1,2,3,4,5,6',
      configBranding: {
        nomeExibicao: 'Clínica Demo Synka',
        corPrimaria:  '#40916C',
        logoUrl:      null
      }
    }
  })

  console.log('✅ Clínica demo criada:', clinicaDemo.nome)

  // ============================================
  // 2. USUÁRIO ADMIN MASTER
  // ============================================

  const senhaHash = await bcrypt.hash('Demo@2026', 10)

  const admin = await prisma.usuario.upsert({
    where: { email: 'demo@synka.com.br' },
    update: {},
    create: {
      nome:           'Admin',
      sobrenome:      'Demo',
      email:          'demo@synka.com.br',
      senhaHash,
      role:           'admin',
      tenantId:       'demo-synka-master',
      emailVerificado: true,
      primeiroAcesso:  false,
      perfilCompleto:  true,
      telefone:       '(85) 99999-0000',
    }
  })

  console.log('✅ Admin demo criado:', admin.email)

  // ============================================
  // 3. PROFISSIONAIS — um por especialidade
  // ============================================

  const profissionais = await Promise.all([
    
    // Médico Clínico
    prisma.profissional.upsert({
      where: { id: 'prof-medico-demo' },
      update: {},
      create: {
        id:           'prof-medico-demo',
        nome:         'Dr. Carlos Andrade',
        especialidade: 'Clínico Geral',
        registroProfissional: 'CRM/CE 12345',
        bio:          'Médico clínico com 15 anos de experiência.',
        color:        '#378ADD',
        ativo:        true,
        tenantId:     'demo-synka-master',
        horariosJson: {
          seg: { inicio: '08:00', fim: '17:00', almoco: { inicio: '12:00', fim: '13:00' }},
          ter: { inicio: '08:00', fim: '17:00', almoco: { inicio: '12:00', fim: '13:00' }},
          qua: { inicio: '08:00', fim: '17:00', almoco: { inicio: '12:00', fim: '13:00' }},
          qui: { inicio: '08:00', fim: '17:00', almoco: { inicio: '12:00', fim: '13:00' }},
          sex: { inicio: '08:00', fim: '14:00', almoco: null },
        }
      }
    }),

    // Dentista
    prisma.profissional.upsert({
      where: { id: 'prof-dentista-demo' },
      update: {},
      create: {
        id:           'prof-dentista-demo',
        nome:         'Dra. Marina Costa',
        especialidade: 'Odontologia',
        registroProfissional: 'CRO/CE 9876',
        bio:          'Dentista especialista em ortodontia.',
        color:        '#9B72CF',
        ativo:        true,
        tenantId:     'demo-synka-master',
        horariosJson: {
          seg: { inicio: '09:00', fim: '18:00', almoco: { inicio: '12:30', fim: '13:30' }},
          ter: { inicio: '09:00', fim: '18:00', almoco: { inicio: '12:30', fim: '13:30' }},
          qua: { inicio: '09:00', fim: '18:00', almoco: { inicio: '12:30', fim: '13:30' }},
          qui: { inicio: '09:00', fim: '18:00', almoco: { inicio: '12:30', fim: '13:30' }},
          sex: { inicio: '09:00', fim: '18:00', almoco: { inicio: '12:30', fim: '13:30' }},
        }
      }
    }),

    // Psicóloga
    prisma.profissional.upsert({
      where: { id: 'prof-psico-demo' },
      update: {},
      create: {
        id:           'prof-psico-demo',
        nome:         'Dra. Ana Beatriz Melo',
        especialidade: 'Psicologia',
        registroProfissional: 'CRP/CE 5544',
        bio:          'Psicóloga clínica com foco em TCC.',
        color:        '#D4537E',
        ativo:        true,
        tenantId:     'demo-synka-master',
        horariosJson: {
          seg: { inicio: '08:00', fim: '18:00', almoco: { inicio: '12:00', fim: '13:00' }},
          ter: { inicio: '08:00', fim: '18:00', almoco: { inicio: '12:00', fim: '13:00' }},
          qua: { inicio: '14:00', fim: '20:00', almoco: null }, // tarde
          qui: { inicio: '08:00', fim: '18:00', almoco: { inicio: '12:00', fim: '13:00' }},
          // sex: folga
        }
      }
    }),

    // Nutricionista
    prisma.profissional.upsert({
      where: { id: 'prof-nutri-demo' },
      update: {},
      create: {
        id:           'prof-nutri-demo',
        nome:         'Dra. Juliana Ferreira',
        especialidade: 'Nutrição',
        registroProfissional: 'CRN/CE 7788',
        bio:          'Nutricionista esportiva e clínica.',
        color:        '#52B788',
        ativo:        true,
        tenantId:     'demo-synka-master',
        horariosJson: {
          ter: { inicio: '08:00', fim: '17:00', almoco: { inicio: '12:00', fim: '13:00' }},
          qui: { inicio: '08:00', fim: '17:00', almoco: { inicio: '12:00', fim: '13:00' }},
          sex: { inicio: '08:00', fim: '15:00', almoco: null },
          // atende só ter, qui, sex
        }
      }
    }),

    // Esteticista
    prisma.profissional.upsert({
      where: { id: 'prof-estetica-demo' },
      update: {},
      create: {
        id:           'prof-estetica-demo',
        nome:         'Camila Rodrigues',
        especialidade: 'Estética',
        registroProfissional: 'COREN/CE 3322',
        bio:          'Especialista em estética facial e corporal.',
        color:        '#C4973A',
        ativo:        true,
        tenantId:     'demo-synka-master',
        horariosJson: {
          seg: { inicio: '09:00', fim: '19:00', almoco: { inicio: '13:00', fim: '14:00' }},
          ter: { inicio: '09:00', fim: '19:00', almoco: { inicio: '13:00', fim: '14:00' }},
          qua: { inicio: '09:00', fim: '19:00', almoco: { inicio: '13:00', fim: '14:00' }},
          qui: { inicio: '09:00', fim: '19:00', almoco: { inicio: '13:00', fim: '14:00' }},
          sex: { inicio: '09:00', fim: '19:00', almoco: { inicio: '13:00', fim: '14:00' }},
          sab: { inicio: '09:00', fim: '14:00', almoco: null },
        }
      }
    }),

    // Recepcionista (usuário, não profissional de saúde)
    prisma.profissional.upsert({
      where: { id: 'prof-recepcao-demo' },
      update: {},
      create: {
        id:           'prof-recepcao-demo',
        nome:         'Fernanda Lima',
        especialidade: 'Recepção',
        color:        '#8A9BB0',
        ativo:        true,
        tenantId:     'demo-synka-master',
      }
    }),
  ])

  console.log('✅ Profissionais criados:', profissionais.length)

  // ============================================
  // 4. SCHEDULES DOS PROFISSIONAIS
  // ============================================

  // Criar ProfessionalSchedule para cada profissional
  // baseado no horariosJson acima
  // diaSemana: 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab

  const schedules = [
    // Dr. Carlos — seg a sex
    { profissionalId: 'prof-medico-demo', diaSemana: 1, horaInicio: '08:00', horaFim: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { profissionalId: 'prof-medico-demo', diaSemana: 2, horaInicio: '08:00', horaFim: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { profissionalId: 'prof-medico-demo', diaSemana: 3, horaInicio: '08:00', horaFim: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { profissionalId: 'prof-medico-demo', diaSemana: 4, horaInicio: '08:00', horaFim: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { profissionalId: 'prof-medico-demo', diaSemana: 5, horaInicio: '08:00', horaFim: '14:00', lunchStart: null,    lunchEnd: null    },

    // Dra. Marina — seg a sex
    { profissionalId: 'prof-dentista-demo', diaSemana: 1, horaInicio: '09:00', horaFim: '18:00', lunchStart: '12:30', lunchEnd: '13:30' },
    { profissionalId: 'prof-dentista-demo', diaSemana: 2, horaInicio: '09:00', horaFim: '18:00', lunchStart: '12:30', lunchEnd: '13:30' },
    { profissionalId: 'prof-dentista-demo', diaSemana: 3, horaInicio: '09:00', horaFim: '18:00', lunchStart: '12:30', lunchEnd: '13:30' },
    { profissionalId: 'prof-dentista-demo', diaSemana: 4, horaInicio: '09:00', horaFim: '18:00', lunchStart: '12:30', lunchEnd: '13:30' },
    { profissionalId: 'prof-dentista-demo', diaSemana: 5, horaInicio: '09:00', horaFim: '18:00', lunchStart: '12:30', lunchEnd: '13:30' },

    // Dra. Ana Beatriz — seg ter qui (qua tarde, sex folga)
    { profissionalId: 'prof-psico-demo', diaSemana: 1, horaInicio: '08:00', horaFim: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { profissionalId: 'prof-psico-demo', diaSemana: 2, horaInicio: '08:00', horaFim: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { profissionalId: 'prof-psico-demo', diaSemana: 3, horaInicio: '14:00', horaFim: '20:00', lunchStart: null,    lunchEnd: null    },
    { profissionalId: 'prof-psico-demo', diaSemana: 4, horaInicio: '08:00', horaFim: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    // sexta: sem schedule = folga

    // Dra. Juliana — ter qui sex
    { profissionalId: 'prof-nutri-demo', diaSemana: 2, horaInicio: '08:00', horaFim: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { profissionalId: 'prof-nutri-demo', diaSemana: 4, horaInicio: '08:00', horaFim: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { profissionalId: 'prof-nutri-demo', diaSemana: 5, horaInicio: '08:00', horaFim: '15:00', lunchStart: null,    lunchEnd: null    },

    // Camila — seg a sab
    { profissionalId: 'prof-estetica-demo', diaSemana: 1, horaInicio: '09:00', horaFim: '19:00', lunchStart: '13:00', lunchEnd: '14:00' },
    { profissionalId: 'prof-estetica-demo', diaSemana: 2, horaInicio: '09:00', horaFim: '19:00', lunchStart: '13:00', lunchEnd: '14:00' },
    { profissionalId: 'prof-estetica-demo', diaSemana: 3, horaInicio: '09:00', horaFim: '19:00', lunchStart: '13:00', lunchEnd: '14:00' },
    { profissionalId: 'prof-estetica-demo', diaSemana: 4, horaInicio: '09:00', horaFim: '19:00', lunchStart: '13:00', lunchEnd: '14:00' },
    { profissionalId: 'prof-estetica-demo', diaSemana: 5, horaInicio: '09:00', horaFim: '19:00', lunchStart: '13:00', lunchEnd: '14:00' },
    { profissionalId: 'prof-estetica-demo', diaSemana: 6, horaInicio: '09:00', horaFim: '14:00', lunchStart: null,    lunchEnd: null    },
  ]

  for (const s of schedules) {
    await prisma.professionalSchedule.upsert({
      where: {
        profissionalId_diaSemana: {
          profissionalId: s.profissionalId,
          diaSemana: s.diaSemana
        }
      },
      update: s,
      create: { ...s, ativo: true }
    })
  }

  console.log('✅ Schedules criados:', schedules.length)

  // ============================================
  // 5. USUÁRIOS POR PROFISSIONAL
  // ============================================

  const usuarios = [
    { email: 'carlos@demo.synka.com.br',   nome: 'Carlos',   role: 'profissional', profId: 'prof-medico-demo'    },
    { email: 'marina@demo.synka.com.br',   nome: 'Marina',   role: 'profissional', profId: 'prof-dentista-demo'  },
    { email: 'ana@demo.synka.com.br',      nome: 'Ana',      role: 'profissional', profId: 'prof-psico-demo'     },
    { email: 'juliana@demo.synka.com.br',  nome: 'Juliana',  role: 'profissional', profId: 'prof-nutri-demo'     },
    { email: 'camila@demo.synka.com.br',   nome: 'Camila',   role: 'profissional', profId: 'prof-estetica-demo'  },
    { email: 'fernanda@demo.synka.com.br', nome: 'Fernanda', role: 'recepcao',     profId: 'prof-recepcao-demo'  },
  ]

  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: {
        nome:            u.nome,
        email:           u.email,
        senhaHash,       // mesma senha: Demo@2026
        role:            u.role,
        tenantId:        'demo-synka-master',
        profissionalId:  u.profId,
        emailVerificado: true,
        primeiroAcesso:  false,
        perfilCompleto:  true,
      }
    })
  }

  console.log('✅ Usuários criados')

  // ============================================
  // 6. SERVIÇOS POR ESPECIALIDADE
  // ============================================

  const servicos = [
    // Médico
    { nome: 'Consulta Clínica',       duracaoMinutos: 30, bufferTimeMinutes: 10, preco: 200, color: '#378ADD', nicho: 'medico' },
    { nome: 'Retorno',                duracaoMinutos: 20, bufferTimeMinutes: 5,  preco: 100, color: '#5B8DEF', nicho: 'medico' },
    { nome: 'Atestado Médico',        duracaoMinutos: 15, bufferTimeMinutes: 0,  preco: 50,  color: '#7BA7F7', nicho: 'medico' },
    
    // Odontologia
    { nome: 'Limpeza Dental',         duracaoMinutos: 60, bufferTimeMinutes: 15, preco: 180, color: '#9B72CF', nicho: 'odonto' },
    { nome: 'Restauração',            duracaoMinutos: 90, bufferTimeMinutes: 15, preco: 250, color: '#B892EF', nicho: 'odonto' },
    { nome: 'Extração',               duracaoMinutos: 60, bufferTimeMinutes: 30, preco: 300, color: '#7B52AF', nicho: 'odonto' },
    { nome: 'Clareamento',            duracaoMinutos: 90, bufferTimeMinutes: 15, preco: 450, color: '#C4A8FF', nicho: 'odonto' },
    
    // Psicologia
    { nome: 'Sessão Psicológica',     duracaoMinutos: 50, bufferTimeMinutes: 10, preco: 180, color: '#D4537E', nicho: 'psico'  },
    { nome: 'Avaliação Psicológica',  duracaoMinutos: 90, bufferTimeMinutes: 10, preco: 300, color: '#E87BA0', nicho: 'psico'  },
    
    // Nutrição
    { nome: 'Consulta Nutricional',   duracaoMinutos: 50, bufferTimeMinutes: 10, preco: 160, color: '#52B788', nicho: 'nutri'  },
    { nome: 'Retorno Nutricional',    duracaoMinutos: 30, bufferTimeMinutes: 5,  preco: 80,  color: '#74C69D', nicho: 'nutri'  },
    { nome: 'Bioimpedância',          duracaoMinutos: 20, bufferTimeMinutes: 5,  preco: 60,  color: '#40916C', nicho: 'nutri'  },
    
    // Estética
    { nome: 'Limpeza de Pele',        duracaoMinutos: 60, bufferTimeMinutes: 15, preco: 150, color: '#C4973A', nicho: 'estetica' },
    { nome: 'Drenagem Linfática',     duracaoMinutos: 60, bufferTimeMinutes: 10, preco: 120, color: '#EF9F27', nicho: 'estetica' },
    { nome: 'Hidratação Facial',      duracaoMinutos: 45, bufferTimeMinutes: 10, preco: 130, color: '#BA7517', nicho: 'estetica' },
    { nome: 'Massagem Relaxante',     duracaoMinutos: 60, bufferTimeMinutes: 15, preco: 140, color: '#D4A843', nicho: 'estetica' },
    { nome: 'Peeling Químico',        duracaoMinutos: 45, bufferTimeMinutes: 15, preco: 200, color: '#FAC775', nicho: 'estetica' },
  ]

  for (const s of servicos) {
    await prisma.servico.upsert({
      where: { 
        id: `servico-${s.nicho}-${s.nome.toLowerCase().replace(/\s/g,'-')}-demo`
      },
      update: {},
      create: {
        id:               `servico-${s.nicho}-${s.nome.toLowerCase().replace(/\s/g,'-')}-demo`,
        nome:             s.nome,
        duracaoMinutos:   s.duracaoMinutos,
        bufferTimeMinutes: s.bufferTimeMinutes,
        preco:            s.preco,
        color:            s.color,
        nicho:            s.nicho,
        ativo:            true,
        tenantId:         'demo-synka-master',
      }
    })
  }

  console.log('✅ Serviços criados:', servicos.length)

  // ============================================
  // 7. PACIENTES DEMO
  // ============================================

  const hoje = new Date()
  const pacientes = [
    { nome: 'Ana Beatriz Santos',    telefone: '(85) 98111-0001', nascimento: new Date('1990-03-31'), convenio: 'Unimed',   visitas: 8  },
    { nome: 'Carlos Eduardo Lima',   telefone: '(85) 98111-0002', nascimento: new Date('1985-07-15'), convenio: null,       visitas: 3  },
    { nome: 'Fernanda Oliveira',     telefone: '(85) 98111-0003', nascimento: new Date('1995-12-22'), convenio: 'Bradesco', visitas: 12 },
    { nome: 'Roberto Mendes',        telefone: '(85) 98111-0004', nascimento: new Date('1978-05-08'), convenio: null,       visitas: 1  },
    { nome: 'Juliana Costa',         telefone: '(85) 98111-0005', nascimento: new Date('2000-01-30'), convenio: 'Unimed',   visitas: 5  },
    { nome: 'Pedro Henrique Souza',  telefone: '(85) 98111-0006', nascimento: new Date('1992-09-14'), convenio: null,       visitas: 2  },
    { nome: 'Mariana Alves',         telefone: '(85) 98111-0007', nascimento: new Date('1988-11-03'), convenio: 'SulAmérica', visitas: 7 },
    { nome: 'Lucas Ferreira',        telefone: '(85) 98111-0008', nascimento: new Date('2001-06-20'), convenio: null,       visitas: 4  },
    // Aniversariante de hoje para testar marketing:
    { nome: 'Sofia Nascimento',      telefone: '(85) 98111-0009', nascimento: new Date(hoje.getFullYear() - 28, hoje.getMonth(), hoje.getDate()), convenio: null, visitas: 6 },
  ]

  for (let i = 0; i < pacientes.length; i++) {
    const p = pacientes[i]
    await prisma.paciente.upsert({
      where: { id: `paciente-demo-${i+1}` },
      update: {},
      create: {
        id:              `paciente-demo-${i+1}`,
        nome:            p.nome,
        telefone:        p.telefone,
        dataNascimento:  p.nascimento,
        convenio:        p.convenio,
        tipoAtendimento: p.convenio ? 'convenio' : 'particular',
        contagemVisitas: p.visitas,
        totalGasto:      p.visitas * 180,
        ultimaVisita:    new Date(Date.now() - Math.random() * 30 * 86400000),
        tenantId:        'demo-synka-master',
      }
    })
  }

  console.log('✅ Pacientes criados:', pacientes.length)

  // ============================================
  // 8. AGENDAMENTOS DE HOJE (para testar agenda)
  // ============================================

  const agora = new Date()
  const dataHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())

  const agendamentos = [
    { hora: 8,  min: 0,  profId: 'prof-medico-demo',    pacId: 'paciente-demo-1', servId: 'servico-medico-consulta-clínica-demo',    status: 'concluido'     },
    { hora: 9,  min: 0,  profId: 'prof-medico-demo',    pacId: 'paciente-demo-2', servId: 'servico-medico-consulta-clínica-demo',    status: 'concluido'     },
    { hora: 10, min: 0,  profId: 'prof-medico-demo',    pacId: 'paciente-demo-3', servId: 'servico-medico-retorno-demo',             status: 'em_atendimento' },
    { hora: 11, min: 0,  profId: 'prof-medico-demo',    pacId: 'paciente-demo-4', servId: 'servico-medico-consulta-clínica-demo',    status: 'aguardando'    },
    { hora: 14, min: 0,  profId: 'prof-medico-demo',    pacId: 'paciente-demo-5', servId: 'servico-medico-consulta-clínica-demo',    status: 'pendente'      },
    { hora: 15, min: 0,  profId: 'prof-medico-demo',    pacId: 'paciente-demo-6', servId: 'servico-medico-retorno-demo',             status: 'pendente'      },

    { hora: 9,  min: 0,  profId: 'prof-dentista-demo',  pacId: 'paciente-demo-7', servId: 'servico-odonto-limpeza-dental-demo',      status: 'concluido'     },
    { hora: 10, min: 30, profId: 'prof-dentista-demo',  pacId: 'paciente-demo-8', servId: 'servico-odonto-restauração-demo',         status: 'aguardando'    },
    { hora: 14, min: 0,  profId: 'prof-dentista-demo',  pacId: 'paciente-demo-1', servId: 'servico-odonto-clareamento-demo',         status: 'pendente'      },

    { hora: 8,  min: 0,  profId: 'prof-psico-demo',     pacId: 'paciente-demo-3', servId: 'servico-psico-sessão-psicológica-demo',   status: 'concluido'     },
    { hora: 9,  min: 0,  profId: 'prof-psico-demo',     pacId: 'paciente-demo-5', servId: 'servico-psico-sessão-psicológica-demo',   status: 'concluido'     },
    { hora: 10, min: 0,  profId: 'prof-psico-demo',     pacId: 'paciente-demo-9', servId: 'servico-psico-sessão-psicológica-demo',   status: 'aguardando'    },

    { hora: 9,  min: 0,  profId: 'prof-estetica-demo',  pacId: 'paciente-demo-2', servId: 'servico-estetica-limpeza-de-pele-demo',   status: 'concluido'     },
    { hora: 10, min: 30, profId: 'prof-estetica-demo',  pacId: 'paciente-demo-4', servId: 'servico-estetica-drenagem-linfática-demo', status: 'concluido'   },
    { hora: 14, min: 0,  profId: 'prof-estetica-demo',  pacId: 'paciente-demo-6', servId: 'servico-estetica-massagem-relaxante-demo', status: 'pendente'    },
    { hora: 15, min: 30, profId: 'prof-estetica-demo',  pacId: 'paciente-demo-7', servId: 'servico-estetica-hidratação-facial-demo',  status: 'pendente'    },
  ]

  for (let i = 0; i < agendamentos.length; i++) {
    const a = agendamentos[i]
    const dataHora = new Date(dataHoje)
    dataHora.setHours(a.hora, a.min, 0, 0)
    const fimDataHora = new Date(dataHora.getTime() + 30 * 60000)

    await prisma.agendamento.upsert({
      where: { eventoId: `demo-agend-${i+1}` },
      update: { status: a.status },
      create: {
        eventoId:       `demo-agend-${i+1}`,
        pacienteId:     a.pacId,
        profissionalId: a.profId,
        servicoId:      a.servId,
        dataHora,
        fimDataHora,
        durationMinutes: 30,
        status:         a.status,
        categoria:      'consulta',
        tipoAtendimento: 'particular',
        tenantId:       'demo-synka-master',
      }
    })
  }

  console.log('✅ Agendamentos de hoje criados:', agendamentos.length)

  // ============================================
  // 9. CONVÊNIOS DEMO
  // ============================================

  const convenios = ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Seguro']
  for (const nome of convenios) {
    await prisma.convenioEmpresa.upsert({
      where: { id: `convenio-${nome.toLowerCase().replace(/\s/g,'-')}-demo` },
      update: {},
      create: {
        id:       `convenio-${nome.toLowerCase().replace(/\s/g,'-')}-demo`,
        nomeConvenio: nome,
        ativo:    true,
        tenantId: 'demo-synka-master',
      }
    })
  }

  console.log('✅ Convênios criados:', convenios.length)

  // ============================================
  // 10. COMBOS UPSELL DEMO
  // ============================================

  await prisma.comboUpsell.upsert({
    where: { idItem: 'combo-demo-1' },
    update: {},
    create: {
      idItem:             'combo-demo-1',
      tenantId:           'demo-synka-master',
      servicoGatilhoId:   'servico-estetica-limpeza-de-pele-demo',
      servicoOferecidoId: 'servico-estetica-hidratação-facial-demo',
      descricaoOferta:    'Aproveite e faça também uma Hidratação Facial com 20% OFF!',
      desconto:           20,
      ativo:              true,
    }
  })

  console.log('✅ Combos upsell criados')

  console.log('')
  console.log('🎉 Seed completo!')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('CREDENCIAIS DA CONTA DEMO:')
  console.log('')
  console.log('👑 Admin Master:')
  console.log('   Email: demo@synka.com.br')
  console.log('   Senha: Demo@2026')
  console.log('')
  console.log('👨⚕️ Dr. Carlos (Médico):')
  console.log('   Email: carlos@demo.synka.com.br')
  console.log('   Senha: Demo@2026')
  console.log('')
  console.log('🦷 Dra. Marina (Dentista):')
  console.log('   Email: marina@demo.synka.com.br')
  console.log('   Senha: Demo@2026')
  console.log('')
  console.log('🧠 Dra. Ana (Psicóloga):')
  console.log('   Email: ana@demo.synka.com.br')
  console.log('   Senha: Demo@2026')
  console.log('')
  console.log('🥗 Dra. Juliana (Nutricionista):')
  console.log('   Email: juliana@demo.synka.com.br')
  console.log('   Senha: Demo@2026')
  console.log('')
  console.log('💆 Camila (Esteticista):')
  console.log('   Email: camila@demo.synka.com.br')
  console.log('   Senha: Demo@2026')
  console.log('')
  console.log('📋 Fernanda (Recepcionista):')
  console.log('   Email: fernanda@demo.synka.com.br')
  console.log('   Senha: Demo@2026')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
