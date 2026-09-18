const DDD_VALIDOS = new Set(Array.from({ length: 89 }, (_, i) => String(i + 11)));

/**
 * Normaliza um telefone brasileiro para o formato E.164 (+55DDNNNNNNNNN).
 * Espelha a lógica de bot/src/phone.py para casar respostas do WhatsApp
 * (que chegam como dígitos puros, ex: "5511987654321") com
 * `telefone_normalizado` gravado pelo bot.
 */
export function normalizarTelefone(bruto: string | null | undefined): string | null {
  if (!bruto) return null;

  const digitos = bruto.replace(/\D/g, '');
  if (!digitos) return null;

  let digitosSemDdi: string;
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    digitosSemDdi = digitos.slice(2);
  } else if (digitos.startsWith('0') && (digitos.length === 11 || digitos.length === 12)) {
    digitosSemDdi = digitos.replace(/^0+/, '');
  } else if (digitos.length === 10 || digitos.length === 11) {
    digitosSemDdi = digitos;
  } else {
    return null;
  }

  if (digitosSemDdi.length !== 10 && digitosSemDdi.length !== 11) {
    return null;
  }

  const ddd = digitosSemDdi.slice(0, 2);
  const numero = digitosSemDdi.slice(2);
  if (!DDD_VALIDOS.has(ddd)) return null;
  if (numero.length === 9 && numero[0] !== '9') return null;

  return `+55${ddd}${numero}`;
}
