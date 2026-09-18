import { Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { Status } from './leads.constants';
import { Lead } from './leads.entity';

export interface FiltrosLeads {
  categoria?: string;
  prioridade?: string;
  status?: string;
}

@Injectable()
export class LeadsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listar(filtros: FiltrosLeads): Promise<Lead[]> {
    return this.supabase.listarLeads(filtros);
  }

  async atualizarStatus(id: number, status: Status): Promise<Lead> {
    const lead = await this.supabase.buscarLeadPorId(id);
    if (!lead) {
      throw new NotFoundException(`Lead ${id} não encontrado`);
    }
    return this.supabase.atualizarStatusLead(id, status);
  }
}
