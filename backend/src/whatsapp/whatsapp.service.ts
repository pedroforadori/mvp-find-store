import { Injectable, Logger } from '@nestjs/common';

import { normalizarTelefone } from '../common/phone.util';
import { SupabaseService } from '../supabase/supabase.service';
import { EventoWhatsApp } from './whatsapp.types';

export const BOTAO_QUERO_SABER_MAIS = 'quero_saber_mais';
export const BOTAO_FALAR_DEPOIS = 'falar_depois';
export const BOTAO_NAO_TENHO_INTERESSE = 'nao_tenho_interesse';

const MAPA_BOTAO_STATUS: Record<string, 'destaque' | 'descartado'> = {
  [BOTAO_QUERO_SABER_MAIS]: 'destaque',
  [BOTAO_FALAR_DEPOIS]: 'destaque',
  [BOTAO_NAO_TENHO_INTERESSE]: 'descartado',
};

const PALAVRAS_NEGATIVAS = [
  'não tenho interesse',
  'nao tenho interesse',
  'sem interesse',
  'não quero',
  'nao quero',
  'não, obrigado',
  'nao obrigado',
  'pare',
  'parar',
  'remover',
];

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Classifica texto livre por palavra-chave; sem regra clara, marca 'destaque' (regra do MVP). */
  classificarTextoLivre(texto: string): 'destaque' | 'descartado' {
    const textoNormalizado = texto.toLowerCase();
    const ehNegativo = PALAVRAS_NEGATIVAS.some((palavra) => textoNormalizado.includes(palavra));
    return ehNegativo ? 'descartado' : 'destaque';
  }

  async processarEvento(evento: EventoWhatsApp): Promise<void> {
    const telefoneNormalizado = normalizarTelefone(evento.telefone);
    if (!telefoneNormalizado) {
      this.logger.warn(`Telefone inválido no webhook: ${evento.telefone}`);
      return;
    }

    const lead = await this.supabase.buscarLeadPorTelefone(telefoneNormalizado);
    if (!lead) {
      this.logger.warn(`Nenhum lead encontrado para ${telefoneNormalizado}`);
      return;
    }

    let novoStatus: 'destaque' | 'descartado' | undefined;
    if (evento.buttonId) {
      novoStatus = MAPA_BOTAO_STATUS[evento.buttonId];
    } else if (evento.textoLivre) {
      novoStatus = this.classificarTextoLivre(evento.textoLivre);
    }

    if (!novoStatus) {
      this.logger.warn(`Evento não reconhecido para o lead ${lead.id}`);
      return;
    }

    if (novoStatus === 'descartado') {
      // Exclui o lead (o histórico vai junto) e bloqueia a loja: nunca mais contatar.
      await this.supabase.descartarLead(lead.id);
      return;
    }

    await this.supabase.atualizarStatusLead(lead.id, novoStatus);
    await this.supabase.marcarUltimoContatoRespondido(lead.id);
  }
}
