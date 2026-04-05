# Módulo: agenda-multiprofissional

## O que faz
Agenda de agendamentos multi-profissional com suporte a múltiplos profissionais,
horários de trabalho por dia da semana (com almoço), duração configurável por
serviço, buffer de tempo entre consultas, convênios por profissional e upsell
de serviços complementares.

## Casos de uso
- Clínicas com múltiplos médicos/especialistas
- Salões de beleza com vários profissionais
- Barbearias, estúdios de pilates, clínicas de fisioterapia
- Qualquer negócio que precise de agenda com slots de horário

## Dependências externas
Nenhuma (módulo independente).

## Models do banco
- `Agendamento`: registro de um atendimento (paciente + profissional + serviço + horário)
- `Profissional`: cadastro do profissional com config de repasse financeiro
- `ProfessionalSchedule`: horários de trabalho por dia da semana (0=Dom, 6=Sáb)
- `Servico`: serviço com duração, buffer e preço
- `ComboUpsell`: regra de oferta de serviço B quando cliente agenda serviço A
- `ConvenioEmpresa`: convênios aceitos pela empresa
- `ProfissionalConvenio`: quais convênios cada profissional aceita

## API Routes
- `GET/POST /api/appointments` — listar agendamentos e criar novo
- `GET /api/appointments/hoje` — agendamentos do dia
- `GET /api/appointments/semana` — agendamentos da semana (por profissional)
- `GET /api/appointments/agenda` — slots disponíveis para agendamento

## Fluxo de agendamento
1. Cliente escolhe serviço → duração e preço são carregados do Servico
2. Cliente escolhe profissional → slots disponíveis são calculados com base em ProfessionalSchedule
3. Se tipoAtendimento=convenio: verificar se profissional aceita o convênio
4. Criar Agendamento com `fimDataHora = dataHora + duracaoMinutos`
5. O `eventoId` é gerado automaticamente (usado como ID externo de calendário)

## Validação de convênio
O sistema valida se o profissional aceita o convênio antes de criar o agendamento:
1. Busca o convênio pelo nome no tenant
2. Verifica se o profissional tem algum convênio cadastrado
3. Se tem convênios: verifica se este específico está na lista
4. Se não tem convênios cadastrados: aceita todos (sem bloqueio)
5. Se não aceita: retorna erro 422 com lista dos convênios aceitos

## Como adaptar para novo projeto
1. Copiar os models do `schema.prisma` deste módulo
2. Adaptar os status de agendamento ao seu fluxo (pendente → confirmado → concluido/cancelado)
3. Configurar o cálculo de slots disponíveis conforme a necessidade

## O que NÃO está incluído (customizar)
- Interface visual de calendário (FullCalendar, react-big-calendar, etc.)
- Notificações automáticas de confirmação (ver módulo whatsapp-marketing)
- Reagendamento automático em caso de cancelamento
- Integração com Google Calendar / Outlook
