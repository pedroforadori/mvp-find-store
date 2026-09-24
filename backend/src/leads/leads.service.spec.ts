import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service';
import { Lead } from './leads.entity';
import { LeadsService, LIMITE_PADRAO } from './leads.service';

const AGORA = new Date('2026-01-15T12:00:00Z');

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 1,
    place_id: 'place-1',
    telefone_normalizado: '+5511987654321',
    nome_loja: 'Loja Teste',
    nicho: null,
    cidade: 'São Paulo',
    endereco: null,
    instagram_handle: null,
    site_url: null,
    categoria: 'sem_site',
    score: 80,
    prioridade: 'quente',
    status: 'novo',
    tentativas: 0,
    data_primeiro_contato: null,
    data_ultimo_contato: null,
    resposta_sentimento: null,
    criado_em: '2026-01-01T00:00:00',
    atualizado_em: '2026-01-01T00:00:00',
    ...overrides,
  };
}

describe('LeadsService', () => {
  let service: LeadsService;
  let supabase: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: SupabaseService,
          useValue: {
            listarLeads: jest.fn(),
            buscarLeadPorId: jest.fn(),
            atualizarStatusLead: jest.fn(),
            registrarContatoManual: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(LeadsService);
    supabase = module.get(SupabaseService);
  });

  it('lista leads repassando filtros e paginação para o Supabase', async () => {
    supabase.listarLeads.mockResolvedValue([lead({ status: 'destaque' })]);

    const resultado = await service.listar({ categoria: 'sem_site' }, { limit: 10, offset: 20 }, AGORA);

    expect(supabase.listarLeads).toHaveBeenCalledWith({ categoria: 'sem_site' }, { limit: 10, offset: 20 }, AGORA);
    expect(resultado).toEqual([{ ...lead({ status: 'destaque' }), contato_manual: null }]);
  });

  it('usa a primeira página com o limite padrão quando a paginação é omitida', async () => {
    supabase.listarLeads.mockResolvedValue([]);

    await service.listar({});

    expect(supabase.listarLeads).toHaveBeenCalledWith({}, { limit: LIMITE_PADRAO, offset: 0 }, expect.any(Date));
  });

  it('anexa a mensagem sugerida aos leads com contato pendente', async () => {
    supabase.listarLeads.mockResolvedValue([lead()]);

    const [resultado] = await service.listar({}, undefined, AGORA);

    expect(resultado.contato_manual?.tipo).toBe('primeiro_contato');
  });

  it('repassa o filtro de pendentes ao Supabase para filtrar antes de paginar', async () => {
    supabase.listarLeads.mockResolvedValue([]);

    await service.listar({ prioridade: 'quente', pendente_contato: true }, { limit: 30, offset: 0 }, AGORA);

    expect(supabase.listarLeads).toHaveBeenCalledWith(
      { prioridade: 'quente', pendente_contato: true },
      { limit: 30, offset: 0 },
      AGORA,
    );
  });

  it('atualiza o status quando o lead existe', async () => {
    supabase.buscarLeadPorId.mockResolvedValue(lead());
    supabase.atualizarStatusLead.mockResolvedValue(lead({ status: 'destaque' }));

    const resultado = await service.atualizarStatus(1, 'destaque');

    expect(supabase.atualizarStatusLead).toHaveBeenCalledWith(1, 'destaque');
    expect(resultado.status).toBe('destaque');
  });

  it('lança NotFoundException quando o lead não existe', async () => {
    supabase.buscarLeadPorId.mockResolvedValue(null);

    await expect(service.atualizarStatus(999, 'destaque')).rejects.toBeInstanceOf(NotFoundException);
    expect(supabase.atualizarStatusLead).not.toHaveBeenCalled();
  });

  describe('registrarContatoManual', () => {
    it('1º contato leva o lead para contatado', async () => {
      const novo = lead();
      supabase.buscarLeadPorId.mockResolvedValue(novo);
      supabase.registrarContatoManual.mockResolvedValue(lead({ status: 'contatado', tentativas: 1 }));

      const resultado = await service.registrarContatoManual(1);

      expect(supabase.registrarContatoManual).toHaveBeenCalledWith(
        novo,
        'contatado',
        expect.stringContaining('Loja Teste'),
      );
      expect(resultado.status).toBe('contatado');
    });

    it('follow-up leva o lead para aguardando_followup, mesmo antes do prazo', async () => {
      const contatado = lead({ status: 'contatado', tentativas: 1, data_ultimo_contato: new Date().toISOString() });
      supabase.buscarLeadPorId.mockResolvedValue(contatado);
      supabase.registrarContatoManual.mockResolvedValue(lead({ status: 'aguardando_followup', tentativas: 2 }));

      await service.registrarContatoManual(1);

      expect(supabase.registrarContatoManual).toHaveBeenCalledWith(
        contatado,
        'aguardando_followup',
        expect.stringContaining('Só retomando'),
      );
    });

    it('rejeita lead que já atingiu o teto ou saiu da fila', async () => {
      supabase.buscarLeadPorId.mockResolvedValue(lead({ status: 'aguardando_followup', tentativas: 2 }));

      await expect(service.registrarContatoManual(1)).rejects.toBeInstanceOf(ConflictException);
      expect(supabase.registrarContatoManual).not.toHaveBeenCalled();
    });

    it('rejeita quando o lead mudou entre a leitura e o update (clique duplo)', async () => {
      supabase.buscarLeadPorId.mockResolvedValue(lead());
      supabase.registrarContatoManual.mockResolvedValue(null);

      await expect(service.registrarContatoManual(1)).rejects.toBeInstanceOf(ConflictException);
    });

    it('lança NotFoundException quando o lead não existe', async () => {
      supabase.buscarLeadPorId.mockResolvedValue(null);

      await expect(service.registrarContatoManual(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
