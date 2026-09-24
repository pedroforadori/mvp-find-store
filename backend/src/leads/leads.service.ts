import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { FiltrosLeads, Paginacao, SupabaseService } from '../supabase/supabase.service';
import { anexarContatoManual, LeadComContato, montarMensagem, tipoContatoPermitido } from './contato-manual';
import { Status } from './leads.constants';

export type { FiltrosLeads, Paginacao };

export const LIMITE_PADRAO = 30;
export const LIMITE_MAXIMO = 100;

@Injectable()
export class LeadsService {
  /** Nome que assina a 1ª mensagem ("Oi! Sou X."). */
  private readonly nomeRemetente = process.env.NOME_REMETENTE ?? '';

  constructor(private readonly supabase: SupabaseService) {}

  async listar(
    filtros: FiltrosLeads,
    paginacao: Paginacao = { limit: LIMITE_PADRAO, offset: 0 },
    agora: Date = new Date(),
  ): Promise<LeadComContato[]> {
    // O filtro de pendentes roda no banco: filtrar em memória depois do
    // range() devolveria páginas incompletas.
    const leads = await this.supabase.listarLeads(filtros, paginacao, agora);
    return leads.map((lead) => anexarContatoManual(lead, agora, this.nomeRemetente));
  }

  async atualizarStatus(id: number, status: Status): Promise<LeadComContato> {
    const lead = await this.supabase.buscarLeadPorId(id);
    if (!lead) {
      throw new NotFoundException(`Lead ${id} não encontrado`);
    }
    const atualizado = await this.supabase.atualizarStatusLead(id, status);
    return anexarContatoManual(atualizado, new Date(), this.nomeRemetente);
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
    const mensagem = montarMensagem(lead, tipo, this.nomeRemetente);
    const atualizado = await this.supabase.registrarContatoManual(lead, novoStatus, mensagem);
    if (!atualizado) {
      throw new ConflictException(`Lead ${id} foi alterado por outra operação; recarregue a lista`);
    }
    return anexarContatoManual(atualizado, new Date(), this.nomeRemetente);
  }
}
