export const CATEGORIAS = [
  'sem_site',
  'sem_ecommerce',
  'site_institucional',
  'site_desatualizado',
  'descartado',
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const PRIORIDADES = ['quente', 'morno', 'baixa'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const STATUSES = [
  'novo',
  'contatado',
  'aguardando_followup',
  'esgotado',
  'descartado',
  'destaque',
] as const;
export type Status = (typeof STATUSES)[number];

/** Lead descartado é excluído da base: não aparece em filtro nem em contagem. */
export const STATUSES_ATIVOS = STATUSES.filter(
  (status): status is Exclude<Status, 'descartado'> => status !== 'descartado',
);
export type StatusAtivo = (typeof STATUSES_ATIVOS)[number];

export interface ContagemLeads {
  total: number;
  por_status: Record<StatusAtivo, number>;
}

/** Resposta do PATCH de status ao descartar: o lead foi excluído. */
export interface LeadExcluido {
  id: number;
  excluido: true;
}

export interface ContatoManual {
  tipo: 'primeiro_contato' | 'followup';
  mensagem: string;
  link_whatsapp: string;
}

export interface Lead {
  id: number;
  place_id: string | null;
  telefone_normalizado: string | null;
  nome_loja: string;
  nicho: string | null;
  cidade: string;
  endereco: string | null;
  instagram_handle: string | null;
  site_url: string | null;
  categoria: Categoria | null;
  score: number;
  prioridade: Prioridade | null;
  status: Status;
  tentativas: number;
  data_primeiro_contato: string | null;
  data_ultimo_contato: string | null;
  resposta_sentimento: 'positiva' | 'negativa' | null;
  criado_em: string;
  atualizado_em: string;
  /** Preenchido pelo Nest quando o lead tem 1º contato ou follow-up pendente. */
  contato_manual: ContatoManual | null;
}

export interface FiltrosLeads {
  categoria?: Categoria;
  prioridade?: Prioridade;
  status?: StatusAtivo;
  pendente_contato?: boolean;
}
