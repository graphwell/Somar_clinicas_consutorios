import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYNKA_KNOWLEDGE = `
## ESTRUTURA DO SISTEMA SYNKA

### Menu Principal (Dashboard)
- **Painel** — Visão geral com KPIs: agendamentos do dia, receita mensal, taxa de ocupação, novos pacientes
- **Agenda** — Calendário de agendamentos; permite criar, editar, confirmar e cancelar
- **Agendamentos** — Lista completa com filtros por data, status, profissional
- **Pacientes / Clientes** — Cadastro e histórico de pacientes
- **Prontuários** — Registros clínicos (disponível conforme nicho)
- **Odontograma** — Mapa dental interativo ISO 3950 (apenas nicho ODONTOLOGIA)
- **Plano Alimentar** — Registros nutricionais e medidas corporais (apenas nicho NUTRICAO)
- **Profissionais** — Cadastro da equipe, horários, especialidades
- **Serviços** — Catálogo de procedimentos com preço e duração
- **Financeiro** — Transações, receitas e despesas
- **Relatórios** — Estatísticas e exportações (apenas admin)
- **Configurações** — Dados da clínica, integrações, DNA do sistema
- **Central de Ajuda** — Esta tela de suporte com IA

### Como realizar tarefas comuns

**Criar um agendamento:**
1. Acesse "Agenda" ou "Agendamentos" no menu
2. Clique em "Novo Agendamento" (botão azul no canto)
3. Selecione o paciente (ou crie um novo)
4. Escolha o serviço, profissional, data e hora
5. Confirme — o status inicial é PENDENTE
6. Para confirmar a presença: clique no agendamento → "Confirmar Presença"

**Cadastrar um profissional:**
1. Vá em "Profissionais" no menu lateral
2. Clique em "Novo Profissional"
3. Preencha nome, especialidade, CRM/CRO (se aplicável)
4. Configure a agenda semanal (dias e horários de atendimento)
5. Associe os serviços que este profissional realiza
6. Salve — o profissional aparecerá como opção nos agendamentos

**Cadastrar um serviço:**
1. Acesse "Serviços" no menu
2. Clique em "Novo Serviço"
3. Informe nome, duração (em minutos) e preço
4. Associe os profissionais que realizam este serviço
5. Salve

**Configurar a clínica (DNA do sistema):**
1. Vá em "Configurações" → aba "DNA do Sistema"
2. Altere logo, cores e nome da clínica
3. Selecione o nicho (tipo de negócio) — isso adapta os rótulos do sistema
4. Salve

**Configurar integração WhatsApp / n8n:**
1. Acesse "Configurações" → aba "Integrações"
2. Localize o card de WhatsApp ou n8n
3. Informe a chave de API e URL do webhook
4. Teste a conexão
5. Ative o toggle para habilitar

**Configurar pagamentos (Stripe):**
1. Acesse "Configurações" → "Planos e Cobrança" ou "Billing"
2. Selecione o plano desejado (Starter ou Pro)
3. Você será redirecionado ao Stripe Checkout
4. Após o pagamento, a integração é ativada automaticamente

**Visualizar financeiro:**
1. Acesse "Financeiro" no menu
2. Use os filtros de data e tipo (receita/despesa)
3. Para adicionar lançamento: clique em "Nova Transação"
4. Para exportar: clique no ícone de exportação (apenas admin)

**Criar prontuário:**
1. Acesse "Prontuários" no menu
2. Busque o paciente pelo nome ou telefone
3. Clique em "Novo Prontuário"
4. Preencha queixa principal e informações clínicas
5. Para nutricional: adicione medidas corporais (o IMC é calculado automaticamente)
6. Salve

**Usar o Odontograma:**
1. Acesse "Odontograma" no menu (disponível apenas para clínicas odontológicas)
2. Busque o paciente
3. Selecione o prontuário odontológico (ou crie um novo)
4. Clique em qualquer dente para editar seu status
5. Escolha: Hígido, Cárie, Restaurado, Canal, Coroa, Implante, Extração Indicada, Extraído, Fratura
6. Para cárie/restauração: selecione as faces afetadas
7. Salve — o histórico de alterações é registrado automaticamente

**Gerenciar convênios:**
1. Acesse "Configurações" → "Convênios"
2. Cadastre o convênio com nome e código
3. Associe aos pacientes e agendamentos conforme necessário

**Criar campanha / aviso:**
1. Acesse "Avisos e Lembretes" no menu
2. Crie mensagens automáticas para WhatsApp
3. Configure gatilhos (antes do agendamento, aniversário, pós-atendimento)

### Papéis de usuário
- **admin** — Acesso total, incluindo financeiro, relatórios e configurações
- **recepcao** — Gerencia agendamentos e pacientes; sem acesso ao financeiro
- **profissional** — Vê apenas seus próprios agendamentos e pacientes

### Nichos disponíveis
- CLINICA_MEDICA — "consulta", "médico", "paciente", prontuário clínico
- ODONTOLOGIA — "consulta", "dentista", "paciente", odontograma
- NUTRICAO — "consulta", "nutricionista", "paciente", plano alimentar
- FISIOTERAPIA — "sessão", "fisioterapeuta", "paciente"
- CLINICA_ESTETICA — "procedimento", "especialista", "cliente"
- SALAO_BELEZA — "serviço", "profissional", "cliente"
- BARBEARIA — "serviço", "barbeiro", "cliente"
- CLINICA_MULTI — multi-especialidades

### Solução de problemas comuns
- **Não consigo fazer login**: Verifique se o e-mail e senha estão corretos. Se esqueceu a senha, contate o administrador.
- **Agendamento não aparece na agenda**: Verifique se o profissional e serviço estão cadastrados e ativos.
- **WhatsApp não envia mensagens**: Verifique a integração em Configurações → Integrações; teste a conexão.
- **Financeiro não carrega**: Apenas administradores têm acesso ao módulo financeiro.
- **Odontograma não aparece no menu**: O nicho da clínica precisa ser ODONTOLOGIA. Configure em Configurações → DNA do Sistema.
`;

export async function POST(request: Request) {
  try {
    const { tenantId, role } = await getSessionInfo();
    const { message, history } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuração de IA pendente (GEMINI_API_KEY).' }, { status: 500 });
    }

    const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
    if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });

    const services = await prisma.servico.findMany({ where: { tenantId }, take: 20 });
    const servicesList = services.length > 0
      ? services.map(s => `- ${s.nome}: R$ ${s.preco.toFixed(2)} (${s.duracaoMinutos}min)`).join('\n')
      : '(nenhum serviço cadastrado ainda)';

    const profissionais = await prisma.profissional.findMany({ where: { tenantId }, take: 10 });
    const profList = profissionais.length > 0
      ? profissionais.map(p => `- ${p.nome}${p.especialidade ? ` (${p.especialidade})` : ''}`).join('\n')
      : '(nenhum profissional cadastrado ainda)';

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const systemPrompt = `Você é a Synka IA, assistente de suporte da plataforma Synka.
Você está ajudando um usuário da clínica "${clinica.razaoSocial}" (nicho: ${clinica.nicho}, papel: ${role}).

CONTEXTO DA CLÍNICA:
- Serviços cadastrados:
${servicesList}
- Profissionais cadastrados:
${profList}

CONHECIMENTO DA PLATAFORMA:
${SYNKA_KNOWLEDGE}

DIRETRIZES:
1. Responda SEMPRE em Português Brasil.
2. Seja direta e objetiva. Use listas numeradas para passo-a-passo.
3. Formate usando Markdown: **negrito**, listas, \`código\`.
4. Quando guiar em um passo-a-passo, seja específico sobre onde clicar e o que preencher.
5. Se a pergunta for sobre uma funcionalidade que não existe no nicho atual (${clinica.nicho}), informe isso claramente.
6. Máximo 400 tokens por resposta — seja concisa.
7. Se o usuário agradece ou encerra, responda brevemente e ofereça mais ajuda.`;

    const chat = model.startChat({
      generationConfig: { maxOutputTokens: 400 },
      history: [
        {
          role: 'user',
          parts: [{ text: 'Olá, quem é você e o que pode me ajudar?' }]
        },
        {
          role: 'model',
          parts: [{
            text: `Olá! Sou a **Synka IA**, sua assistente de suporte para a plataforma Synka.\n\nPosso te ajudar com:\n- 📅 Criar e gerenciar agendamentos\n- 👤 Configurar profissionais e serviços\n- ⚙️ Configurar integrações (WhatsApp, Stripe)\n- 📊 Entender relatórios e financeiro\n- 🦷 Usar o Odontograma e Prontuários\n\nComo posso te ajudar hoje?`
          }]
        },
        ...(history || [])
      ]
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error('[CHAT_IA_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao processar inteligência.' }, { status: 500 });
  }
}
