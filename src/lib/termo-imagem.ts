import crypto from 'crypto'

export const TERMO_VERSAO = 'v1.0'

export function gerarTermoTexto(dados: {
  nomeCliente: string
  nomeClinica: string
  nomeProfissional: string
  procedimento: string
  data: string
}): string {
  return `TERMO DE AUTORIZACAO DE USO DE IMAGEM E DADOS

Eu, ${dados.nomeCliente}, portador(a) dos dados cadastrados neste sistema, declaro que:

1. AUTORIZACAO DE IMAGEM
Autorizo expressamente ${dados.nomeClinica} e seus profissionais a capturar, armazenar e utilizar fotografias do procedimento "${dados.procedimento}" realizado em ${dados.data} pela(o) profissional ${dados.nomeProfissional}.

2. FINALIDADE
As imagens poderao ser utilizadas exclusivamente para:
- Acompanhamento do meu tratamento
- Compartilhamento comigo via WhatsApp ou link privado
- Divulgacao em redes sociais, mediante minha autorizacao expressa em cada compartilhamento

3. DIREITOS LGPD (Lei 13.709/2018)
Tenho ciencia de que posso, a qualquer momento:
- Solicitar a exclusao das minhas imagens
- Revogar esta autorizacao
- Solicitar copia dos dados armazenados

Contato para exercer meus direitos: ${dados.nomeClinica}

4. VALIDADE
Este termo tem validade a partir da data de aceite registrada eletronicamente, com forca de documento particular nos termos do art. 107 do Codigo Civil.

Data: ${dados.data}
Local: Registro eletronico via plataforma Synka`
}

export function gerarHashTermo(texto: string): string {
  return crypto.createHash('sha256').update(texto).digest('hex')
}
