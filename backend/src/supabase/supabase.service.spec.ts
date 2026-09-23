import { createClient } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

function mockQueryBuilder(resultado: unknown[]) {
  const builder: Record<string, jest.Mock> & { then?: unknown } = {} as never;
  for (const metodo of ['from', 'select', 'order', 'eq']) {
    builder[metodo] = jest.fn(() => builder);
  }
  builder.then = (resolve: (valor: unknown) => unknown) => resolve({ data: resultado, error: null });
  return builder;
}

describe('SupabaseService.listarLeads', () => {
  it('ordena por score decrescente e desempata pelo lead mais novo', async () => {
    const builder = mockQueryBuilder([{ id: 1 }]);
    (createClient as jest.Mock).mockReturnValue({ from: builder.from });

    const resultado = await new SupabaseService().listarLeads({ categoria: 'sem_site' });

    expect(builder.order.mock.calls).toEqual([
      ['score', { ascending: false }],
      ['criado_em', { ascending: false }],
    ]);
    expect(builder.eq).toHaveBeenCalledWith('categoria', 'sem_site');
    expect(resultado).toEqual([{ id: 1 }]);
  });
});
