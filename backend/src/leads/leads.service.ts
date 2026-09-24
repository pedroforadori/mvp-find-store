import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { FiltrosLeads, Paginacao, SupabaseService } from '../supabase/supabase.service';
import { anexarContatoManual, LeadComContato, montarMensagem, tipoContatoPermitido } from './contato-manual';
import { Status, STATUSES } from './leads.constants';

export type { FiltrosLeads, Paginacao };

export const LIMITE_PADRAO = 30;
export const LIMITE_MAXIMO = 100;

/** Resposta do PATCH de status quando o lead é descartado: ele sai da base. */
export interface LeadExcluido {
  id: number;
  excluido: true;
}

/** Lead descartado é excluído da base, então não entra na contagem. */
export const STATUSES_CONTADOS = STATUSES.filter((status) => status !== 'descartado');

export interface ContagemLeads {
  total: number;
  por_status: Record<Exclude<Status, 'descartado'>, number>;
}

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

  async contar(): Promise<ContagemLeads> {
    const porStatus = await this.supabase.contarLeadsPorStatus(STATUSES_CONTADOS);
    const total = Object.values(porStatus).reduce((soma, quantidade) => soma + quantidade, 0);
    return { total, por_status: porStatus };
  }

  /** Descartar exclui o lead (e bloqueia a loja contra nova inserção pelo bot). */
  async atualizarStatus(id: number, status: Status): Promise<LeadComContato | LeadExcluido> {
    if (status === 'descartado') {
      const excluido = await this.supabase.descartarLead(id);
      if (!excluido) {
        throw new NotFoundException(`Lead ${id} não encontrado`);
      }
      return { id, excluido: true };
    }

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
