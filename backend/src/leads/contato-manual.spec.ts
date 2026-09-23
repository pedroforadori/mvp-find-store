import {
  anexarContatoManual,
  contatoPendente,
  extrairBairro,
  montarLinkWhatsapp,
  montarMensagem,
  tipoContatoPermitido,
} from './contato-manual';
import { Lead } from './leads.entity';

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

describe('tipoContatoPermitido', () => {
  it('lead novo recebe 1º contato', () => {
    expect(tipoContatoPermitido(lead())).toBe('primeiro_contato');
  });

  it('lead contatado abaixo do teto recebe follow-up', () => {
    expect(tipoContatoPermitido(lead({ status: 'contatado', tentativas: 1 }))).toBe('followup');
  });

  it.each([
    ['contatado no teto', { status: 'contatado' as const, tentativas: 2 }],
    ['aguardando_followup', { status: 'aguardando_followup' as const, tentativas: 2 }],
    ['descartado', { status: 'descartado' as const }],
    ['destaque', { status: 'destaque' as const }],
    ['esgotado', { status: 'esgotado' as const }],
    ['sem telefone', { telefone_normalizado: null }],
  ])('não permite contato: %s', (_, overrides) => {
    expect(tipoContatoPermitido(lead(overrides))).toBeNull();
  });
});

describe('contatoPendente', () => {
  it('follow-up só fica pendente após 3 dias do último contato', () => {
    const vencido = lead({ status: 'contatado', tentativas: 1, data_ultimo_contato: '2026-01-12T12:00:00' });
    const noPrazo = lead({ status: 'contatado', tentativas: 1, data_ultimo_contato: '2026-01-13T12:00:00' });

    expect(contatoPendente(vencido, AGORA)).toBe('followup');
    expect(contatoPendente(noPrazo, AGORA)).toBeNull();
  });

  it('interpreta TIMESTAMP sem fuso como UTC', () => {
    // 3 dias exatos em UTC; se fosse lido como hora local (ex: UTC-3) ficaria fora do prazo.
    const noLimite = lead({ status: 'contatado', tentativas: 1, data_ultimo_contato: '2026-01-12T12:00:00' });

    expect(contatoPendente(noLimite, AGORA)).toBe('followup');
  });

  it('lead novo está sempre pendente', () => {
    expect(contatoPendente(lead(), AGORA)).toBe('primeiro_contato');
  });
});

describe('extrairBairro', () => {
  it.each([
    ['R. Teodoro Sampaio, 1806 - Pinheiros, São Paulo - SP, 05405-150, Brazil', 'Pinheiros'],
    ['Av. Paulista, 486 - Lj A - Bela Vista, São Paulo - SP, 01311-200, Brazil', 'Bela Vista'],
    [
      'Shopping Vista 14 - R. Santa Ifigênia, 190 - Santa Ifigênia, São Paulo - SP, 01207-000, Brazil',
      'Santa Ifigênia',
    ],
    ['R. São Paulo, 1969 - Cerâmica, São Caetano do Sul - SP, 09530-210, Brazil', 'Cerâmica'],
  ])('%s → %s', (endereco, bairro) => {
    expect(extrairBairro(endereco, 'São Paulo')).toBe(bairro);
  });

  it('usa a cidade quando não há endereço ou o formato não é reconhecido', () => {
    expect(extrairBairro(null, 'São Paulo')).toBe('São Paulo');
    expect(extrairBairro('Rua sem bairro 123', 'São Paulo')).toBe('São Paulo');
  });
});

describe('montarMensagem', () => {
  const lojaEmPinheiros = lead({
    nome_loja: 'Sasha Calçados',
    nicho: 'loja de calçados',
    endereco: 'R. Teodoro Sampaio, 1806 - Pinheiros, São Paulo - SP, 05405-150, Brazil',
  });

  it('monta o 1º contato com remetente, loja, nicho e bairro', () => {
    expect(montarMensagem(lojaEmPinheiros, 'primeiro_contato', 'Pedro')).toBe(
      'Oi! Sou Pedro, ajudo lojas físicas a venderem online ou terem um site de ' +
        'apresentação. Encontrei a Sasha Calçados buscando por loja de calçados em ' +
        'Pinheiros, mas sem nenhum link de site ou loja — vocês já pensaram nisso?',
    );
  });

  it('usa o mesmo texto para todas as categorias', () => {
    const institucional = { ...lojaEmPinheiros, categoria: 'site_institucional' as const };
    expect(montarMensagem(institucional, 'primeiro_contato', 'Pedro')).toBe(
      montarMensagem(lojaEmPinheiros, 'primeiro_contato', 'Pedro'),
    );
  });

  it('omite a apresentação quando não há nome de remetente', () => {
    expect(montarMensagem(lojaEmPinheiros, 'primeiro_contato', '  ')).toMatch(/^Oi! Ajudo lojas físicas/);
  });

  it('usa "lojas" e a cidade quando faltam nicho e endereço', () => {
    expect(montarMensagem(lead({ nicho: null, endereco: null }), 'primeiro_contato')).toContain(
      'buscando por lojas em São Paulo',
    );
  });

  it('usa a mensagem de follow-up com o nome da loja', () => {
    expect(montarMensagem(lead(), 'followup')).toMatch(/^Olá, Loja Teste! Só retomando/);
  });
});

describe('montarLinkWhatsapp', () => {
  it('gera link wa.me só com dígitos e texto codificado', () => {
    expect(montarLinkWhatsapp('+5511987654321', 'Olá & tchau')).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1%20%26%20tchau',
    );
  });
});

describe('anexarContatoManual', () => {
  it('anexa mensagem e link quando há contato pendente', () => {
    const resultado = anexarContatoManual(lead(), AGORA);

    expect(resultado.contato_manual?.tipo).toBe('primeiro_contato');
    expect(resultado.contato_manual?.link_whatsapp).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
  });

  it('anexa null quando não há contato pendente', () => {
    expect(anexarContatoManual(lead({ status: 'destaque' }), AGORA).contato_manual).toBeNull();
  });
});
