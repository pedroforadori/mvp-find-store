import { ehTelefoneFixo, formatarTelefone, montarLinkMaps } from './leadLinks';

describe('montarLinkMaps', () => {
  it('usa o place_id para abrir a ficha exata da loja', () => {
    const link = montarLinkMaps({ place_id: 'ChIJ123', nome_loja: 'Loja X', endereco: 'Rua A, 1' });

    const url = new URL(link);
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('query')).toBe('Loja X Rua A, 1');
    expect(url.searchParams.get('query_place_id')).toBe('ChIJ123');
  });

  it('sem place_id busca por nome e endereço', () => {
    const url = new URL(montarLinkMaps({ place_id: null, nome_loja: 'Loja X', endereco: null }));

    expect(url.searchParams.get('query')).toBe('Loja X');
    expect(url.searchParams.has('query_place_id')).toBe(false);
  });
});

describe('telefone', () => {
  it('identifica fixo e celular', () => {
    expect(ehTelefoneFixo('+551133334444')).toBe(true);
    expect(ehTelefoneFixo('+5511987654321')).toBe(false);
  });

  it('formata fixo e celular', () => {
    expect(formatarTelefone('+551133334444')).toBe('(11) 3333-4444');
    expect(formatarTelefone('+5511987654321')).toBe('(11) 98765-4321');
  });
});
