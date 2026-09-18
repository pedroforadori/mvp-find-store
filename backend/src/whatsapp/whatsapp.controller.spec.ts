import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappController (integração)', () => {
  let app: INestApplication;
  const whatsappService = { processarEvento: jest.fn() };
  const VERIFY_TOKEN_ORIGINAL = process.env.WHATSAPP_VERIFY_TOKEN;

  beforeAll(async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'token-secreto';

    const moduleRef = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [{ provide: WhatsappService, useValue: whatsappService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN_ORIGINAL;
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET responde com o challenge quando o token de verificação é válido', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/webhook/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'token-secreto', 'hub.challenge': '12345' })
      .expect(200);

    expect(resposta.text).toBe('12345');
  });

  it('GET rejeita token de verificação inválido', async () => {
    await request(app.getHttpServer())
      .get('/webhook/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'errado', 'hub.challenge': '12345' })
      .expect(403);
  });

  it('POST processa um payload válido e retorna 200', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'e1',
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  {
                    from: '5511987654321',
                    type: 'interactive',
                    interactive: { type: 'button_reply', button_reply: { id: 'quero_saber_mais', title: 'x' } },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const resposta = await request(app.getHttpServer()).post('/webhook/whatsapp').send(payload).expect(200);

    expect(resposta.body).toEqual({ status: 'ok' });
    expect(whatsappService.processarEvento).toHaveBeenCalledWith({
      telefone: '5511987654321',
      buttonId: 'quero_saber_mais',
    });
  });

  it('POST ignora payload com formato inesperado sem quebrar', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/webhook/whatsapp')
      .send({ algo: 'invalido' })
      .expect(200);

    expect(resposta.body).toEqual({ status: 'ignorado' });
    expect(whatsappService.processarEvento).not.toHaveBeenCalled();
  });
});
