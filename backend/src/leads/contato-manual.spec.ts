import {
  anexarContatoManual,
  contatoPendente,
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

describe('montarMensagem', () => {
  it('usa o template da categoria no 1º contato', () => {
    expect(montarMensagem(lead({ categoria: 'sem_ecommerce' }), 'primeiro_contato')).toContain(
      'não tem uma loja virtual',
    );
  });

  it('cai no template padrão quando a categoria é desconhecida', () => {
    expect(montarMensagem(lead({ categoria: null }), 'primeiro_contato')).toContain('ainda não tem um site');
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
