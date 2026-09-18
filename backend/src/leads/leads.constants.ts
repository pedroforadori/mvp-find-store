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
