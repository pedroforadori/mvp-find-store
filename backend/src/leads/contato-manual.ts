import { Lead } from './leads.entity';

// Espelha as regras de bot/src/disparo.py — no modo manual quem registra o
// envio é o Nest (via dashboard), então o prazo/teto precisam valer aqui também.
export const DIAS_ENTRE_FOLLOWUP = 3;
export const MAX_TENTATIVAS = 2;

// Espelha bot/src/mensagens.py.
const TEMPLATES_PRIMEIRO_CONTATO: Record<string, string> = {
  sem_site:
    'Olá! Vi que a {nome_loja} ainda não tem um site ou loja online. ' +
    'Muita gente busca vocês no Google antes de comprar — posso te mostrar ' +
    'como resolver isso rapidinho?',
  sem_ecommerce:
    'Olá! Notei que o site da {nome_loja} não tem uma loja virtual pra vender ' +
    'online. Dá pra ativar isso sem dor de cabeça — quer entender como?',
  site_institucional:
    'Olá! O site da {nome_loja} é só institucional, sem vender online. ' +
    'Se quiser transformar visitas em vendas, posso te ajudar com isso.',
  site_desatualizado:
    'Olá! O site da {nome_loja} parece estar desatualizado (lento ou sem ' +
    'versão para celular). Isso afasta clientes — posso te mostrar uma solução rápida?',
};

const CATEGORIA_PADRAO = 'sem_site';

const MENSAGEM_FOLLOWUP =
  'Olá, {nome_loja}! Só retomando o contato — ainda faz sentido conversarmos ' +
  'sobre melhorar a presença online de vocês?';

export type TipoContato = 'primeiro_contato' | 'followup';

export interface ContatoManual {
  tipo: TipoContato;
  mensagem: string;
  link_whatsapp: string;
}

export type LeadComContato = Lead & { contato_manual: ContatoManual | null };

/**
 * Colunas TIMESTAMP (sem fuso) chegam do Supabase sem "Z"; o `now()` do
 * Postgres grava em UTC, então interpretamos como UTC e não como hora local.
 */
function parseTimestampUtc(valor: string): Date {
  const temFuso = /(Z|[+-]\d{2}:?\d{2})$/.test(valor);
  return new Date(temFuso ? valor : `${valor}Z`);
}

/** Qual contato o lead pode receber agora, ignorando o prazo de follow-up. */
export function tipoContatoPermitido(lead: Lead): TipoContato | null {
  if (!lead.telefone_normalizado) return null;
  if (lead.status === 'novo') return 'primeiro_contato';
  if (lead.status === 'contatado' && lead.tentativas < MAX_TENTATIVAS) return 'followup';
  return null;
}

/** Contato pendente: 1º contato de lead novo ou follow-up com prazo vencido. */
export function contatoPendente(lead: Lead, agora: Date): TipoContato | null {
  const tipo = tipoContatoPermitido(lead);
  if (tipo !== 'followup') return tipo;
  if (!lead.data_ultimo_contato) return null;

  const limite = agora.getTime() - DIAS_ENTRE_FOLLOWUP * 24 * 60 * 60 * 1000;
  return parseTimestampUtc(lead.data_ultimo_contato).getTime() <= limite ? 'followup' : null;
}

export function montarMensagem(lead: Lead, tipo: TipoContato): string {
  const template =
    tipo === 'followup'
      ? MENSAGEM_FOLLOWUP
      : TEMPLATES_PRIMEIRO_CONTATO[lead.categoria ?? ''] ?? TEMPLATES_PRIMEIRO_CONTATO[CATEGORIA_PADRAO];
  return template.replace('{nome_loja}', lead.nome_loja);
}

export function montarLinkWhatsapp(telefoneNormalizado: string, mensagem: string): string {
  const digitos = telefoneNormalizado.replace(/\D/g, '');
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

export function anexarContatoManual(lead: Lead, agora: Date): LeadComContato {
  const tipo = contatoPendente(lead, agora);
  if (!tipo || !lead.telefone_normalizado) {
    return { ...lead, contato_manual: null };
  }
  const mensagem = montarMensagem(lead, tipo);
  return {
    ...lead,
    contato_manual: {
      tipo,
      mensagem,
      link_whatsapp: montarLinkWhatsapp(lead.telefone_normalizado, mensagem),
    },
  };
}
