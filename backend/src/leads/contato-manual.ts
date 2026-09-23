import { Lead } from './leads.entity';

// Espelha as regras de bot/src/disparo.py — no modo manual quem registra o
// envio é o Nest (via dashboard), então o prazo/teto precisam valer aqui também.
export const DIAS_ENTRE_FOLLOWUP = 3;
export const MAX_TENTATIVAS = 2;

// Espelha bot/src/mensagens.py. Um único texto para todas as categorias: todo
// lead qualificado, por definição, ainda não tem loja online.
const MENSAGEM_PRIMEIRO_CONTATO =
  'Oi! {apresentacao}Ajudo lojas físicas a venderem também pela internet. ' +
  'A {nome_loja} apareceu na minha busca por {nicho} em {bairro}, mas sem link ' +
  'de loja online — é algo que vocês já pensaram em ter?';

const NICHO_PADRAO = 'lojas';

// Endereço do Google Places: "Rua X, 100 - Bairro, Cidade - UF, CEP, Brazil".
// Pega o trecho entre o último " - " e ", Cidade - UF".
const REGEX_BAIRRO = /(?:^|- )([^,-]+), [^,]+ - [A-Z]{2}(?:,|$)/;

/** Bairro a partir do endereço formatado do Google; sem padrão reconhecível, usa a cidade. */
export function extrairBairro(endereco: string | null, cidade: string): string {
  const bairro = endereco?.match(REGEX_BAIRRO)?.[1]?.trim();
  return bairro || cidade;
}

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

/** `nomeRemetente` vazio omite o "Sou X." em vez de deixar um buraco no texto. */
export function montarMensagem(lead: Lead, tipo: TipoContato, nomeRemetente = ''): string {
  if (tipo === 'followup') {
    return MENSAGEM_FOLLOWUP.replace('{nome_loja}', lead.nome_loja);
  }
  const nome = nomeRemetente.trim();
  return MENSAGEM_PRIMEIRO_CONTATO.replace('{apresentacao}', nome ? `Sou ${nome}. ` : '')
    .replace('{nome_loja}', lead.nome_loja)
    .replace('{nicho}', lead.nicho?.trim() || NICHO_PADRAO)
    .replace('{bairro}', extrairBairro(lead.endereco, lead.cidade));
}

export function montarLinkWhatsapp(telefoneNormalizado: string, mensagem: string): string {
  const digitos = telefoneNormalizado.replace(/\D/g, '');
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

export function anexarContatoManual(lead: Lead, agora: Date, nomeRemetente = ''): LeadComContato {
  const tipo = contatoPendente(lead, agora);
  if (!tipo || !lead.telefone_normalizado) {
    return { ...lead, contato_manual: null };
  }
  const mensagem = montarMensagem(lead, tipo, nomeRemetente);
  return {
    ...lead,
    contato_manual: {
      tipo,
      mensagem,
      link_whatsapp: montarLinkWhatsapp(lead.telefone_normalizado, mensagem),
    },
  };
}
