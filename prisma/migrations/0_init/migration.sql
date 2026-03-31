-- CreateEnum
CREATE TYPE "NichoType" AS ENUM ('CLINICA_MEDICA', 'CLINICA_MULTI', 'CLINICA_ESTETICA', 'SALAO_BELEZA', 'BARBEARIA', 'FISIOTERAPIA', 'ODONTOLOGIA', 'NUTRICAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('LIVRE', 'EM_USO', 'DEMO', 'OFFLINE', 'AGUARDANDO');

-- CreateEnum
CREATE TYPE "WhatsappPlataforma" AS ENUM ('WASENDERAPI', 'ULTRAMSG');

-- CreateEnum
CREATE TYPE "StatusDente" AS ENUM ('HIGIDO', 'CARIE', 'RESTAURADO', 'EXTRACAO_INDICADA', 'EXTRAIDO', 'COROA', 'IMPLANTE', 'CANAL', 'FRATURA');

-- CreateTable
CREATE TABLE "clinicas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 'clinica-default',
    "nome" TEXT NOT NULL,
    "nicho" "NichoType" NOT NULL DEFAULT 'CLINICA_MEDICA',
    "configBranding" JSONB,
    "razaoSocial" TEXT,
    "cnpj" TEXT,
    "endereco" TEXT,
    "adminPhone" TEXT,
    "botActive" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "multiProfissional" BOOLEAN NOT NULL DEFAULT false,
    "openingTime" TEXT NOT NULL DEFAULT '08:00',
    "closingTime" TEXT NOT NULL DEFAULT '18:00',
    "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'recepcao',
    "tenantId" TEXT NOT NULL,
    "profissionalId" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "convenio" TEXT,
    "tipoAtendimento" TEXT NOT NULL DEFAULT 'particular',
    "totalGasto" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ultimaVisita" TIMESTAMP(3),
    "contagemVisitas" INTEGER NOT NULL DEFAULT 0,
    "isSubscriber" BOOLEAN NOT NULL DEFAULT false,
    "profissionalPreferidoId" TEXT,
    "cpf" TEXT,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profissionais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especialidade" TEXT,
    "registroProfissional" TEXT,
    "bio" TEXT,
    "fotoUrl" TEXT,
    "color" TEXT DEFAULT '#4a4ae2',
    "horariosJson" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profissionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_schedules" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "lunchStart" TEXT,
    "lunchEnd" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "professional_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convenios_empresa" (
    "id" TEXT NOT NULL,
    "nomeConvenio" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convenios_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nichos_config" (
    "id" TEXT NOT NULL,
    "nomeNicho" TEXT NOT NULL,
    "labelCliente" TEXT NOT NULL DEFAULT 'Cliente',
    "labelServico" TEXT NOT NULL DEFAULT 'Serviço',
    "labelProfissional" TEXT NOT NULL DEFAULT 'Profissional',
    "servicosPadraoJson" JSONB,

    CONSTRAINT "nichos_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "profissionalId" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "fimDataHora" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "eventoId" TEXT NOT NULL,
    "categoria" TEXT DEFAULT 'consulta',
    "convenio" TEXT,
    "tipoAtendimento" TEXT NOT NULL DEFAULT 'particular',
    "tenantId" TEXT NOT NULL,
    "servicoId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes_financeiras" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'income',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "descricao" TEXT,
    "categoria" TEXT DEFAULT 'Geral',
    "agendamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transacoes_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_logs" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'recepcao',
    "tenantId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "plano" TEXT NOT NULL DEFAULT 'starter',
    "status" TEXT NOT NULL DEFAULT 'trial',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "duracaoMinutos" INTEGER NOT NULL DEFAULT 30,
    "bufferTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "preco" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "color" TEXT DEFAULT '#3B82F6',
    "nicho" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos_upsell" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "servicoGatilhoId" TEXT NOT NULL,
    "servicoOferecidoId" TEXT NOT NULL,
    "descricaoOferta" TEXT NOT NULL,
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combos_upsell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas_aviso" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "segmentoFiltrosJson" TEXT,
    "dataEnvio" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "totalEnviado" INTEGER NOT NULL DEFAULT 0,
    "totalErros" INTEGER NOT NULL DEFAULT 0,
    "tipo" TEXT NOT NULL DEFAULT 'todos',
    "filtroServico" TEXT,
    "filtroInativoDias" INTEGER,
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanhas_aviso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_assinatura" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "periodicidade" TEXT NOT NULL,
    "servicos" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas_cliente" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "valorPago" DOUBLE PRECISION NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_instances" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "sessionId" TEXT NOT NULL,
    "bearerToken" TEXT NOT NULL,
    "numeroWa" TEXT,
    "status" "WhatsappStatus" NOT NULL DEFAULT 'LIVRE',
    "plataforma" "WhatsappPlataforma" NOT NULL DEFAULT 'WASENDERAPI',
    "webhookUrl" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conectadoEm" TIMESTAMP(3),
    "ultimoPing" TIMESTAMP(3),

    CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prontuario_registros" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profissionalId" TEXT,
    "tipo" TEXT NOT NULL,
    "agendamentoId" TEXT,
    "queixaPrincipal" TEXT,
    "evolucao" TEXT,
    "historiaMolestia" TEXT,
    "historicoMedico" TEXT,
    "medicamentosUso" TEXT,
    "alergias" TEXT,
    "exameSolicitado" TEXT,
    "exameResultado" TEXT,
    "hipoteseDiagnostica" TEXT,
    "conduta" TEXT,
    "retornoEm" TIMESTAMP(3),
    "cidCodigo" TEXT,
    "cidDescricao" TEXT,
    "pressaoSistolica" INTEGER,
    "pressaoDiastolica" INTEGER,
    "temperatura" DOUBLE PRECISION,
    "saturacao" INTEGER,
    "glicemia" INTEGER,
    "historicoAlimentar" TEXT,
    "restricoes" TEXT,
    "objetivoPaciente" TEXT,
    "planoAlimentar" TEXT,
    "recordatorio24h" TEXT,
    "metas" TEXT,
    "iaRascunho" TEXT,
    "iaPromptUsado" TEXT,
    "iaRevisado" BOOLEAN NOT NULL DEFAULT false,
    "transcricaoOriginal" TEXT,
    "soapSubjetivo" TEXT,
    "soapObjetivo" TEXT,
    "soapAvaliacao" TEXT,
    "soapPlano" TEXT,
    "assinadoPor" TEXT,
    "assinadoEm" TIMESTAMP(3),
    "assinaturaHash" TEXT,
    "escalasAplicadas" JSONB,
    "objetivosTerapeuticos" TEXT,
    "evolucaoPsico" TEXT,
    "protocoloEstetico" TEXT,
    "regiaoTratada" TEXT,
    "produtosUsados" TEXT,
    "fotosAntesDep" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prontuario_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cids_sugeridos" (
    "id" TEXT NOT NULL,
    "prontuarioId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "relevancia" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cids_sugeridos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prontuario_arquivos" (
    "id" TEXT NOT NULL,
    "evolutionId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prontuario_arquivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente_alergias" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "gravidade" TEXT NOT NULL DEFAULT 'MODERADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paciente_alergias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente_medicamentos" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dosagem" TEXT,
    "frequencia" TEXT,
    "uso" TEXT NOT NULL DEFAULT 'CONTINUO',
    "inicio" TIMESTAMP(3),
    "fim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paciente_medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prontuario_templates" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especialidade" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "campos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prontuario_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medidas_corporais" (
    "id" TEXT NOT NULL,
    "prontuarioId" TEXT NOT NULL,
    "peso" DOUBLE PRECISION,
    "altura" DOUBLE PRECISION,
    "imc" DOUBLE PRECISION,
    "percGordura" DOUBLE PRECISION,
    "circAbdominal" DOUBLE PRECISION,
    "circQuadril" DOUBLE PRECISION,
    "circBraco" DOUBLE PRECISION,
    "circCoxa" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medidas_corporais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odontograma_itens" (
    "id" TEXT NOT NULL,
    "prontuarioId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "numeroDente" INTEGER NOT NULL,
    "status" "StatusDente" NOT NULL DEFAULT 'HIGIDO',
    "facesAfetadas" JSONB,
    "observacao" TEXT,
    "atualizadoPor" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odontograma_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wasenderApiKey" TEXT,
    "wasenderSessionId" TEXT,
    "lembreteAtivo" BOOLEAN NOT NULL DEFAULT true,
    "lembreteAntecedenciaHoras" INTEGER NOT NULL DEFAULT 24,
    "lembreteHorario" TEXT NOT NULL DEFAULT '09:00',
    "lembreteTemplate" TEXT,
    "aniversarioAtivo" BOOLEAN NOT NULL DEFAULT true,
    "aniversarioHorario" TEXT NOT NULL DEFAULT '08:00',
    "aniversarioDescontoPct" INTEGER NOT NULL DEFAULT 15,
    "aniversarioTemplate" TEXT,
    "linkConfirmacao" TEXT,
    "nomeClinica" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_combos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "servicos" TEXT[],
    "gatilhoServico" TEXT,
    "precoOriginal" DECIMAL(10,2),
    "precoCombo" DECIMAL(10,2) NOT NULL,
    "descontoPct" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "validadeDias" INTEGER NOT NULL DEFAULT 30,
    "templateWhatsapp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_envios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clienteNome" TEXT,
    "clienteTelefone" TEXT NOT NULL,
    "mensagemEnviada" TEXT,
    "comboId" TEXT,
    "wasenderMsgId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'enviado',
    "erroDetalhe" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_envios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campanhas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "filtroServico" TEXT,
    "filtroInativoDias" INTEGER,
    "template" TEXT NOT NULL,
    "totalDestinatarios" INTEGER NOT NULL DEFAULT 0,
    "totalEnviados" INTEGER NOT NULL DEFAULT 0,
    "totalErros" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "agendadoPara" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "marketing_campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes_role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "permissoes_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odontograma_historico" (
    "id" TEXT NOT NULL,
    "numeroDente" INTEGER NOT NULL,
    "statusAnterior" "StatusDente",
    "statusNovo" "StatusDente" NOT NULL,
    "observacao" TEXT,
    "alteradoPor" TEXT,
    "tenantId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odontograma_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfissionalToServico" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_tenantId_key" ON "clinicas"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_slug_key" ON "clinicas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nichos_config_nomeNicho_key" ON "nichos_config"("nomeNicho");

-- CreateIndex
CREATE UNIQUE INDEX "agendamentos_eventoId_key" ON "agendamentos"("eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "transacoes_financeiras_agendamentoId_key" ON "transacoes_financeiras"("agendamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_tenantId_key" ON "assinaturas"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_sessionId_key" ON "whatsapp_instances"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "odontograma_itens_prontuarioId_numeroDente_key" ON "odontograma_itens"("prontuarioId", "numeroDente");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_configs_tenantId_key" ON "marketing_configs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_role_tenantId_role_recurso_acao_key" ON "permissoes_role"("tenantId", "role", "recurso", "acao");

-- CreateIndex
CREATE UNIQUE INDEX "_ProfissionalToServico_AB_unique" ON "_ProfissionalToServico"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfissionalToServico_B_index" ON "_ProfissionalToServico"("B");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_schedules" ADD CONSTRAINT "professional_schedules_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convenios_empresa" ADD CONSTRAINT "convenios_empresa_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes_financeiras" ADD CONSTRAINT "transacoes_financeiras_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes_financeiras" ADD CONSTRAINT "transacoes_financeiras_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combos_upsell" ADD CONSTRAINT "combos_upsell_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combos_upsell" ADD CONSTRAINT "combos_upsell_servicoGatilhoId_fkey" FOREIGN KEY ("servicoGatilhoId") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combos_upsell" ADD CONSTRAINT "combos_upsell_servicoOferecidoId_fkey" FOREIGN KEY ("servicoOferecidoId") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas_aviso" ADD CONSTRAINT "campanhas_aviso_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_assinatura" ADD CONSTRAINT "planos_assinatura_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_cliente" ADD CONSTRAINT "assinaturas_cliente_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_cliente" ADD CONSTRAINT "assinaturas_cliente_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_assinatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_integrations" ADD CONSTRAINT "clinic_integrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "clinicas"("tenantId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuario_registros" ADD CONSTRAINT "prontuario_registros_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuario_registros" ADD CONSTRAINT "prontuario_registros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuario_registros" ADD CONSTRAINT "prontuario_registros_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cids_sugeridos" ADD CONSTRAINT "cids_sugeridos_prontuarioId_fkey" FOREIGN KEY ("prontuarioId") REFERENCES "prontuario_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuario_arquivos" ADD CONSTRAINT "prontuario_arquivos_evolutionId_fkey" FOREIGN KEY ("evolutionId") REFERENCES "prontuario_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_alergias" ADD CONSTRAINT "paciente_alergias_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_medicamentos" ADD CONSTRAINT "paciente_medicamentos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuario_templates" ADD CONSTRAINT "prontuario_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medidas_corporais" ADD CONSTRAINT "medidas_corporais_prontuarioId_fkey" FOREIGN KEY ("prontuarioId") REFERENCES "prontuario_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odontograma_itens" ADD CONSTRAINT "odontograma_itens_prontuarioId_fkey" FOREIGN KEY ("prontuarioId") REFERENCES "prontuario_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odontograma_itens" ADD CONSTRAINT "odontograma_itens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_envios" ADD CONSTRAINT "marketing_envios_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "marketing_combos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissoes_role" ADD CONSTRAINT "permissoes_role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odontograma_historico" ADD CONSTRAINT "odontograma_historico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfissionalToServico" ADD CONSTRAINT "_ProfissionalToServico_A_fkey" FOREIGN KEY ("A") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfissionalToServico" ADD CONSTRAINT "_ProfissionalToServico_B_fkey" FOREIGN KEY ("B") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

