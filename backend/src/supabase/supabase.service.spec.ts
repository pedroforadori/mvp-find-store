import { createClient } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

function mockQueryBuilder(resultado: unknown[]) {
  const builder: Record<string, jest.Mock> & { then?: unknown } = {} as never;
  for (const metodo of ['from', 'select', 'order', 'eq', 'not', 'or', 'range']) {
    builder[metodo] = jest.fn(() => builder);
  }
  builder.then = (resolve: (valor: unknown) => unknown) => resolve({ data: resultado, error: null });
  return builder;
}

describe('SupabaseService.listarLeads', () => {
  it('ordena por score decrescente, desempata pelo lead mais novo e pagina', async () => {
    const builder = mockQueryBuilder([{ id: 1 }]);
    (createClient as jest.Mock).mockReturnValue({ from: builder.from });

    const resultado = await new SupabaseService().listarLeads({ categoria: 'sem_site' }, { limit: 30, offset: 60 });

    expect(builder.order.mock.calls).toEqual([
      ['score', { ascending: false }],
      ['criado_em', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(builder.eq).toHaveBeenCalledWith('categoria', 'sem_site');
    expect(builder.range).toHaveBeenCalledWith(60, 89);
    expect(builder.or).not.toHaveBeenCalled();
    expect(resultado).toEqual([{ id: 1 }]);
  });

  it('filtra pendentes de contato no banco: lead novo ou follow-up com prazo vencido', async () => {
    const builder = mockQueryBuilder([]);
    (createClient as jest.Mock).mockReturnValue({ from: builder.from });

    await new SupabaseService().listarLeads(
      { pendente_contato: true },
      { limit: 30, offset: 0 },
      new Date('2026-01-15T12:00:00Z'),
    );

    expect(builder.not).toHaveBeenCalledWith('telefone_normalizado', 'is', null);
    expect(builder.or).toHaveBeenCalledWith(
      'status.eq.novo,and(status.eq.contatado,tentativas.lt.2,data_ultimo_contato.lte.2026-01-12T12:00:00.000)',
    );
  });
});
