/** Substitui {variavel} pelo valor correspondente no template */
export function processarTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((msg, [key, val]) => {
    return msg.replaceAll(`{${key}}`, val ?? '');
  }, template);
}

/** Gera código de cupom de aniversário único */
export function gerarCodigoCupom(clienteId: string): string {
  const ano = new Date().getFullYear();
  const sufixo = clienteId.slice(-4).toUpperCase();
  return `ANIV${ano}${sufixo}`;
}

/** Normaliza telefone para E.164 (+5511999990000) */
export function formatarTelefone(tel: string): string {
  const numeros = tel.replace(/\D/g, '');
  if (numeros.startsWith('55') && numeros.length >= 12) return `+${numeros}`;
  if (numeros.length >= 10) return `+55${numeros}`;
  return `+55${numeros}`;
}

// ─── Templates padrão ────────────────────────────────────────────

export const TEMPLATE_LEMBRETE_PADRAO = `Ola, {nome}!

Lembrete do seu agendamento:
*{data}* as *{hora}*
{servico}{profissional_linha}

Para confirmar, responda *SIM*.
Para cancelar, responda *NAO*.

Equipe {clinica}`;

export const TEMPLATE_ANIVERSARIO_PADRAO = `Feliz Aniversario, {nome}!

A equipe {clinica} deseja a voce um dia muito especial!

Como presente, um desconto exclusivo:
*{desconto}% OFF* na sua proxima visita!

Valido por 30 dias.

Com carinho,
Equipe {clinica}`;

export const TEMPLATE_COMBO_PADRAO = `Ola, {nome}!

Temos uma oferta especial para voce:

*{combo_nome}*
{combo_descricao}

De R$ {preco_original} por apenas *R$ {preco_combo}*
Economize {desconto}%!

Valido por {validade} dias.

Equipe {clinica}`;
