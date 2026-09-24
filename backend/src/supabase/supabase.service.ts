import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { filtroPendentePostgrest } from '../leads/contato-manual';
import { Lead } from '../leads/leads.entity';
import { Status } from '../leads/leads.constants';

export interface FiltrosLeads {
  categoria?: string;
  prioridade?: string;
  status?: string;
  pendente_contato?: boolean;
}

export interface Paginacao {
  limit: number;
  offset: number;
}

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    );
  }

  async listarLeads(filtros: FiltrosLeads, paginacao: Paginacao, agora: Date = new Date()): Promise<Lead[]> {
    // Prioridade é derivada do score, então ordenar por score já põe os
    // quentes primeiro na fila de contato; empate desempata pelo mais novo
    // e, por fim, pelo id, para a paginação ser estável.
    let query = this.client
      .from('leads')
      .select('*')
      .order('score', { ascending: false })
      .order('criado_em', { ascending: false })
      .order('id', { ascending: false });

    if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
    if (filtros.prioridade) query = query.eq('prioridade', filtros.prioridade);
    if (filtros.status) query = query.eq('status', filtros.status);
    if (filtros.pendente_contato) {
      query = query.not('telefone_normalizado', 'is', null).or(filtroPendentePostgrest(agora));
    }

    const { data, error } = await query.range(paginacao.offset, paginacao.offset + paginacao.limit - 1);
    if (error) throw error;
    return data ?? [];
  }

  async buscarLeadPorId(id: number): Promise<Lead | null> {
    const { data, error } = await this.client.from('leads').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async buscarLeadPorTelefone(telefoneNormalizado: string): Promise<Lead | null> {
    const { data, error } = await this.client
      .from('leads')
      .select('*')
      .eq('telefone_normalizado', telefoneNormalizado)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Exclui o lead e bloqueia place_id/telefone para o bot não reinseri-lo
   * (função `descartar_lead`, migration 0002). Retorna false se não existia.
   */
  async descartarLead(id: number): Promise<boolean> {
    const { data, error } = await this.client.rpc('descartar_lead', { p_lead_id: id });
    if (error) throw error;
    return Boolean(data);
  }

  /** Um count por status (sem trazer linhas), em paralelo. */
  async contarLeadsPorStatus(statuses: readonly Status[]): Promise<Record<Status, number>> {
    const contagens = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await this.client
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', status);
        if (error) throw error;
        return [status, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(contagens) as Record<Status, number>;
  }

  async atualizarStatusLead(id: number, status: Status): Promise<Lead> {
    const { data, error } = await this.client
      .from('leads')
      .update({ status, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Registra um envio feito manualmente (número pessoal): avança status/tentativas
   * e grava o histórico. O update só casa se status e tentativas ainda forem os
   * lidos antes — evita contar duas vezes num clique duplo. Retorna null se o
   * lead mudou nesse meio-tempo.
   */
  async registrarContatoManual(
    lead: Lead,
    novoStatus: Status,
    mensagem: string,
  ): Promise<Lead | null> {
    const agora = new Date().toISOString();
    const { data, error } = await this.client
      .from('leads')
      .update({
        status: novoStatus,
        tentativas: lead.tentativas + 1,
        data_primeiro_contato: lead.data_primeiro_contato ?? agora,
        data_ultimo_contato: agora,
        atualizado_em: agora,
      })
      .eq('id', lead.id)
      .eq('status', lead.status)
      .eq('tentativas', lead.tentativas)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { error: historicoError } = await this.client.from('historico_contatos').insert({
      lead_id: lead.id,
      canal: 'whatsapp_manual',
      mensagem_enviada: mensagem,
      resultado: 'entregue',
    });
    if (historicoError) throw historicoError;

    return data;
  }

  async marcarUltimoContatoRespondido(leadId: number): Promise<void> {
    const { data, error } = await this.client
      .from('historico_contatos')
      .select('id')
      .eq('lead_id', leadId)
      .order('enviado_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;

    const { error: updateError } = await this.client
      .from('historico_contatos')
      .update({ resultado: 'respondido' })
      .eq('id', data.id);
    if (updateError) throw updateError;
  }
}
