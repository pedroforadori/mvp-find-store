import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { Lead } from '../leads/leads.entity';
import { Status } from '../leads/leads.constants';

export interface FiltrosLeads {
  categoria?: string;
  prioridade?: string;
  status?: string;
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

  async listarLeads(filtros: FiltrosLeads): Promise<Lead[]> {
    let query = this.client.from('leads').select('*').order('criado_em', { ascending: false });

    if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
    if (filtros.prioridade) query = query.eq('prioridade', filtros.prioridade);
    if (filtros.status) query = query.eq('status', filtros.status);

    const { data, error } = await query;
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
