# Módulo: prontuario-ia

## O que faz
Prontuário clínico digital com suporte a múltiplos nichos (médico, odontológico,
nutricional, estético) e integração com IA para:
- Transcrição de voz para texto (ditado do prontuário)
- Geração de rascunho estruturado a partir de texto livre
- Sugestão automática de CID-10
- Leitura e resumo de documentos/exames
- Assinatura digital com hash de integridade

## Casos de uso
- Clínicas médicas com prontuário SOAP
- Dentistas com odontograma digital
- Nutricionistas com plano alimentar e medidas corporais
- Clínicas estéticas com anamnese e fotos antes/depois

## Dependências externas
- Google Gemini API (ou outro LLM) — para transcrição, rascunho e CID
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_PROVIDER`

## Models do banco
- `ProntuarioRegistro`: evolução/consulta clínica (campos para todos os nichos)
- `ProntuarioArquivo`: arquivos anexados com prazo LGPD de exclusão automática
- `ProntuarioTemplate`: templates de campos por especialidade
- `MedidaCorporal`: peso, altura, IMC, circunferências (nutricional/estética)
- `OdontogramaItem`: estado de cada dente (ISO 3950) com faces afetadas
- `OdontogramaHistorico`: histórico de alterações do odontograma
- `CidSugerido`: CIDs sugeridos pela IA com flag de confirmação
- `PacienteAlergia`: alergias do paciente com gravidade
- `PacienteMedicamento`: medicamentos em uso com dosagem e frequência
- `StatusDente` (enum): HIGIDO, CARIE, RESTAURADO, EXTRACAO_INDICADA, EXTRAIDO, COROA, IMPLANTE, CANAL, FRATURA

## API Routes
- `GET/POST /api/prontuario` — listar e criar evoluções
- `GET /api/prontuario/[pacienteId]` — prontuários de um paciente
- `GET/PUT/DELETE /api/prontuario/[pacienteId]/evolucoes/[id]` — CRUD de evolução
- `GET /api/prontuario/[pacienteId]/metricas` — métricas de saúde (medidas)
- `GET/POST /api/prontuario/[pacienteId]/alergias` — alergias do paciente
- `GET/POST /api/prontuario/[pacienteId]/medicamentos` — medicamentos do paciente
- `GET/POST /api/prontuario/templates` — templates de campos
- `POST /api/prontuario/ia/transcricao` — transcrição de áudio → texto
- `POST /api/prontuario/ia/rascunho` — texto livre → prontuário estruturado
- `POST /api/prontuario/ia/cid-search` — buscar CIDs por texto
- `POST /api/prontuario/ia/perguntas` — gerar perguntas de anamnese
- `POST /api/prontuario/ia/ler-documento` — extrair texto/resumo de documento
- `POST /api/prontuario/assinar` — assinar digitalmente com hash
- `POST /api/prontuario/adendo` — adicionar adendo após assinatura

## Campos de IA no ProntuarioRegistro
- `iaRascunho`: rascunho gerado pela IA (editável antes de salvar)
- `iaPromptUsado`: prompt enviado para a IA (auditoria)
- `iaRevisado`: flag se o médico revisou o rascunho da IA
- `transcricaoOriginal`: transcrição de voz original (antes da estruturação)

## LGPD em arquivos
- `deletarEm`: 48h após o upload, o arquivo pode ser deletado automaticamente
- `url`: field setado para null após exclusão (mas `iaResumo` fica para consulta futura)
- `consentimento`: deve ser true antes do upload

## Assinatura digital
- Hash SHA-256 do conteúdo do prontuário no momento da assinatura
- Após assinatura: somente adendos são permitidos (não editar campos originais)

## Como adaptar para novo projeto
1. Selecionar apenas os models necessários para o seu nicho
2. Adaptar os campos do ProntuarioRegistro ao tipo de atendimento
3. Configurar o LLM (Gemini ou outro) para transcrição e geração de rascunho

## O que NÃO está incluído (customizar)
- Upload de arquivos para S3/Cloudflare R2 (implementar storage separado)
- OCR de imagens e PDFs (usar serviço externo)
- Assinatura digital com certificado ICP-Brasil
- Exportação de PDF do prontuário
