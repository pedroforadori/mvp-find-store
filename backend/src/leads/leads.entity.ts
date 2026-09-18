import { Categoria, Prioridade, Status } from './leads.constants';

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
}
