import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service';
import { BOTAO_NAO_TENHO_INTERESSE, BOTAO_QUERO_SABER_MAIS, WhatsappService } from './whatsapp.service';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let supabase: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: SupabaseService,
          useValue: {
            buscarLeadPorTelefone: jest.fn(),
            atualizarStatusLead: jest.fn(),
            marcarUltimoContatoRespondido: jest.fn(),
            descartarLead: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WhatsappService);
    supabase = module.get(SupabaseService);
  });

  describe('classificarTextoLivre', () => {
    it('classifica palavra-chave negativa como descartado', () => {
      expect(service.classificarTextoLivre('Não tenho interesse, obrigado')).toBe('descartado');
    });

    it('classifica texto ambíguo como destaque', () => {
      expect(service.classificarTextoLivre('quero entender melhor')).toBe('destaque');
    });
  });

  describe('processarEvento', () => {
    it('marca destaque quando o botão é "quero saber mais"', async () => {
      supabase.buscarLeadPorTelefone.mockResolvedValue({ id: 10 } as any);

      await service.processarEvento({ telefone: '5511987654321', buttonId: BOTAO_QUERO_SABER_MAIS });

      expect(supabase.buscarLeadPorTelefone).toHaveBeenCalledWith('+5511987654321');
      expect(supabase.atualizarStatusLead).toHaveBeenCalledWith(10, 'destaque');
      expect(supabase.marcarUltimoContatoRespondido).toHaveBeenCalledWith(10);
    });

    it('exclui o lead quando o botão é "não tenho interesse"', async () => {
      supabase.buscarLeadPorTelefone.mockResolvedValue({ id: 11 } as any);

      await service.processarEvento({ telefone: '5511987654321', buttonId: BOTAO_NAO_TENHO_INTERESSE });

      expect(supabase.descartarLead).toHaveBeenCalledWith(11);
      expect(supabase.atualizarStatusLead).not.toHaveBeenCalled();
      expect(supabase.marcarUltimoContatoRespondido).not.toHaveBeenCalled();
    });

    it('classifica texto livre negativo e exclui o lead', async () => {
      supabase.buscarLeadPorTelefone.mockResolvedValue({ id: 12 } as any);

      await service.processarEvento({ telefone: '5511987654321', textoLivre: 'não quero mais' });

      expect(supabase.descartarLead).toHaveBeenCalledWith(12);
    });

    it('ignora evento quando o telefone é inválido', async () => {
      await service.processarEvento({ telefone: '123', buttonId: BOTAO_QUERO_SABER_MAIS });

      expect(supabase.buscarLeadPorTelefone).not.toHaveBeenCalled();
      expect(supabase.atualizarStatusLead).not.toHaveBeenCalled();
    });

    it('ignora evento quando nenhum lead é encontrado para o telefone', async () => {
      supabase.buscarLeadPorTelefone.mockResolvedValue(null);

      await service.processarEvento({ telefone: '5511987654321', buttonId: BOTAO_QUERO_SABER_MAIS });

      expect(supabase.atualizarStatusLead).not.toHaveBeenCalled();
    });

    it('ignora botão desconhecido', async () => {
      supabase.buscarLeadPorTelefone.mockResolvedValue({ id: 13 } as any);

      await service.processarEvento({ telefone: '5511987654321', buttonId: 'botao_desconhecido' });

      expect(supabase.atualizarStatusLead).not.toHaveBeenCalled();
    });
  });
});
