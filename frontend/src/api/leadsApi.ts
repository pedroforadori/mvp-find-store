import type { FiltrosLeads, Lead, Status } from '../types/lead';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

async function tratarResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao chamar a API`);
  }
  return resposta.json() as Promise<T>;
}

export interface Paginacao {
  limit: number;
  offset: number;
}

export async function listarLeads(filtros: FiltrosLeads = {}, paginacao?: Paginacao): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (filtros.categoria) params.set('categoria', filtros.categoria);
  if (filtros.prioridade) params.set('prioridade', filtros.prioridade);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.pendente_contato) params.set('pendente_contato', 'true');
  if (paginacao) {
    params.set('limit', String(paginacao.limit));
    params.set('offset', String(paginacao.offset));
  }

  const query = params.toString();
  const resposta = await fetch(`${API_URL}/leads${query ? `?${query}` : ''}`);
  return tratarResposta<Lead[]>(resposta);
}

export async function atualizarStatusLead(id: number, status: Status): Promise<Lead> {
  const resposta = await fetch(`${API_URL}/leads/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return tratarResposta<Lead>(resposta);
}

export async function registrarContatoManual(id: number): Promise<Lead> {
  const resposta = await fetch(`${API_URL}/leads/${id}/contato-manual`, { method: 'POST' });
  return tratarResposta<Lead>(resposta);
}
