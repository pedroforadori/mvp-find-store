import { extrairEventos, isValidWhatsAppWebhookPayload, WhatsAppWebhookPayload } from './whatsapp.types';

const PAYLOAD_BOTAO: WhatsAppWebhookPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'entry-1',
      changes: [
        {
          field: 'messages',
          value: {
            messages: [
              {
                from: '5511987654321',
                type: 'interactive',
                interactive: { type: 'button_reply', button_reply: { id: 'quero_saber_mais', title: 'Quero saber mais' } },
              },
            ],
          },
        },
      ],
    },
  ],
};

const PAYLOAD_TEXTO_LIVRE: WhatsAppWebhookPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'entry-1',
      changes: [
        {
          field: 'messages',
          value: {
            messages: [{ from: '5511987654321', type: 'text', text: { body: 'Não tenho interesse' } }],
          },
        },
      ],
    },
  ],
};

describe('isValidWhatsAppWebhookPayload', () => {
  it('aceita um payload com o formato esperado', () => {
    expect(isValidWhatsAppWebhookPayload(PAYLOAD_BOTAO)).toBe(true);
  });

  it('rejeita null e tipos primitivos', () => {
    expect(isValidWhatsAppWebhookPayload(null)).toBe(false);
    expect(isValidWhatsAppWebhookPayload('string qualquer')).toBe(false);
    expect(isValidWhatsAppWebhookPayload(42)).toBe(false);
  });

  it('rejeita objeto sem "object" correto', () => {
    expect(isValidWhatsAppWebhookPayload({ object: 'outra_coisa', entry: [] })).toBe(false);
  });

  it('rejeita objeto sem "entry" como array', () => {
    expect(isValidWhatsAppWebhookPayload({ object: 'whatsapp_business_account' })).toBe(false);
  });
});

describe('extrairEventos', () => {
  it('extrai evento de clique em botão interativo', () => {
    expect(extrairEventos(PAYLOAD_BOTAO)).toEqual([
      { telefone: '5511987654321', buttonId: 'quero_saber_mais' },
    ]);
  });

  it('extrai evento de texto livre', () => {
    expect(extrairEventos(PAYLOAD_TEXTO_LIVRE)).toEqual([
      { telefone: '5511987654321', textoLivre: 'Não tenho interesse' },
    ]);
  });

  it('retorna lista vazia quando não há mensagens', () => {
    const payload: WhatsAppWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{ id: 'entry-1', changes: [{ field: 'messages', value: {} }] }],
    };
    expect(extrairEventos(payload)).toEqual([]);
  });

  it('ignora mensagens sem remetente', () => {
    const payload: WhatsAppWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry-1',
          changes: [
            { field: 'messages', value: { messages: [{ from: '', type: 'text', text: { body: 'oi' } }] } },
          ],
        },
      ],
    };
    expect(extrairEventos(payload)).toEqual([]);
  });
});
