import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service';
import { LeadsService } from './leads.service';

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
          },
        },
      ],
    }).compile();

    service = module.get(LeadsService);
    supabase = module.get(SupabaseService);
  });

  it('lista leads repassando os filtros para o Supabase', async () => {
    supabase.listarLeads.mockResolvedValue([{ id: 1 } as any]);

    const resultado = await service.listar({ categoria: 'sem_site' });

    expect(supabase.listarLeads).toHaveBeenCalledWith({ categoria: 'sem_site' });
    expect(resultado).toEqual([{ id: 1 }]);
  });

  it('atualiza o status quando o lead existe', async () => {
    supabase.buscarLeadPorId.mockResolvedValue({ id: 1 } as any);
    supabase.atualizarStatusLead.mockResolvedValue({ id: 1, status: 'destaque' } as any);

    const resultado = await service.atualizarStatus(1, 'destaque');

    expect(supabase.atualizarStatusLead).toHaveBeenCalledWith(1, 'destaque');
    expect(resultado.status).toBe('destaque');
  });

  it('lança NotFoundException quando o lead não existe', async () => {
    supabase.buscarLeadPorId.mockResolvedValue(null);

    await expect(service.atualizarStatus(999, 'destaque')).rejects.toBeInstanceOf(NotFoundException);
    expect(supabase.atualizarStatusLead).not.toHaveBeenCalled();
  });
});
