import type { Lead } from '../types/lead';

/**
 * Link da ficha da loja no Google Maps. Com `place_id` abre exatamente o
 * lugar de onde o lead foi tirado; sem ele, cai numa busca por nome + endereço.
 */
export function montarLinkMaps(lead: Pick<Lead, 'place_id' | 'nome_loja' | 'endereco'>): string {
  const busca = [lead.nome_loja, lead.endereco].filter(Boolean).join(' ');
  const params = new URLSearchParams({ api: '1', query: busca });
  if (lead.place_id) params.set('query_place_id', lead.place_id);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function digitosNacionais(telefone: string): string {
  return telefone.replace(/\D/g, '').replace(/^55/, '');
}

/** Fixo = DDD + 8 dígitos (celular tem 9 começando com 9). Fixo raramente tem WhatsApp. */
export function ehTelefoneFixo(telefone: string): boolean {
  return digitosNacionais(telefone).length === 10;
}

/** "+5511987654321" → "(11) 98765-4321"; "+551133334444" → "(11) 3333-4444". */
export function formatarTelefone(telefone: string): string {
  const digitos = digitosNacionais(telefone);
  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const corte = numero.length - 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}
