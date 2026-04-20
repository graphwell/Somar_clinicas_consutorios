/**
 * Gerador de BR Code PIX (padrão BACEN / EMV Merchant QR Code).
 * Produz o string "copia e cola" compatível com qualquer app bancário.
 */
export function gerarPixBRCode(
  chave: string,
  nomeFavorecido: string,
  valor: number,
  cidade: string = 'FORTALEZA',
): string {
  const f = (id: string, v: string) =>
    `${id}${String(v.length).padStart(2, '0')}${v}`;

  const nomeClean = nomeFavorecido
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .slice(0, 25)
    .trim() || 'FAVORECIDO';

  const cidadeClean = cidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
    .slice(0, 15)
    .trim() || 'FORTALEZA';

  const merchant = f('26', f('00', 'br.gov.bcb.pix') + f('01', chave));
  const additional = f('62', f('05', '***'));

  const s =
    f('00', '01') +      // Payload Format Indicator
    f('01', '11') +      // Static QR (reusável)
    merchant +
    f('52', '0000') +    // MCC
    f('53', '986') +     // BRL
    f('54', valor.toFixed(2)) +
    f('58', 'BR') +
    f('59', nomeClean) +
    f('60', cidadeClean) +
    additional +
    '6304';              // CRC placeholder

  let crc = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }

  return s + crc.toString(16).toUpperCase().padStart(4, '0');
}
