import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import {
  anexarContatoManual,
  contatoPendente,
  LeadComContato,
  montarMensagem,
  tipoContatoPermitido,
} from './contato-manual';
import { Status } from './leads.constants';

export interface FiltrosLeads {
  categoria?: string;
  prioridade?: string;
  status?: string;
  pendente_contato?: boolean;
}

@Injectable()
export class LeadsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listar(filtros: FiltrosLeads, agora: Date = new Date()): Promise<LeadComContato[]> {
    const { pendente_contato, ...filtrosBanco } = filtros;
    let leads = await this.supabase.listarLeads(filtrosBanco);
    if (pendente_contato) {
      leads = leads.filter((lead) => contatoPendente(lead, agora) !== null);
    }
    return leads.map((lead) => anexarContatoManual(lead, agora));
  }

  async atualizarStatus(id: number, status: Status): Promise<LeadComContato> {
    const lead = await this.supabase.buscarLeadPorId(id);
    if (!lead) {
      throw new NotFoundException(`Lead ${id} não encontrado`);
    }
    const atualizado = await this.supabase.atualizarStatusLead(id, status);
    return anexarContatoManual(atualizado, new Date());
  }

  /**
   * Registra que o 1º contato ou o follow-up foi enviado manualmente. Não exige
   * o prazo de 3 dias vencido (quem decide antecipar é o usuário), só respeita
   * o teto de tentativas e o status.
   */
  async registrarContatoManual(id: number): Promise<LeadComContato> {
    const lead = await this.supabase.buscarLeadPorId(id);
    if (!lead) {
      throw new NotFoundException(`Lead ${id} não encontrado`);
    }

    const tipo = tipoContatoPermitido(lead);
    if (!tipo) {
      throw new ConflictException(`Lead ${id} não está pendente de contato (status ${lead.status})`);
    }

    const novoStatus: Status = tipo === 'primeiro_contato' ? 'contatado' : 'aguardando_followup';
    const atualizado = await this.supabase.registrarContatoManual(lead, novoStatus, montarMensagem(lead, tipo));
    if (!atualizado) {
      throw new ConflictException(`Lead ${id} foi alterado por outra operação; recarregue a lista`);
    }
    return anexarContatoManual(atualizado, new Date());
  }
}
