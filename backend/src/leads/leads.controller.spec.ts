import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

describe('LeadsController (integração)', () => {
  let app: INestApplication;
  const leadsService = {
    listar: jest.fn(),
    atualizarStatus: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [{ provide: LeadsService, useValue: leadsService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /leads retorna a lista de leads', async () => {
    leadsService.listar.mockResolvedValue([{ id: 1, nome_loja: 'Loja Teste' }]);

    const resposta = await request(app.getHttpServer()).get('/leads').expect(200);

    expect(resposta.body).toEqual([{ id: 1, nome_loja: 'Loja Teste' }]);
    expect(leadsService.listar).toHaveBeenCalledWith({});
  });

  it('GET /leads repassa filtros de query válidos', async () => {
    leadsService.listar.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/leads?categoria=sem_site&prioridade=quente').expect(200);

    expect(leadsService.listar).toHaveBeenCalledWith({ categoria: 'sem_site', prioridade: 'quente' });
  });

  it('GET /leads rejeita categoria inválida', async () => {
    await request(app.getHttpServer()).get('/leads?categoria=inexistente').expect(400);
  });

  it('PATCH /leads/:id/status atualiza o status', async () => {
    leadsService.atualizarStatus.mockResolvedValue({ id: 1, status: 'destaque' });

    const resposta = await request(app.getHttpServer())
      .patch('/leads/1/status')
      .send({ status: 'destaque' })
      .expect(200);

    expect(resposta.body).toEqual({ id: 1, status: 'destaque' });
    expect(leadsService.atualizarStatus).toHaveBeenCalledWith(1, 'destaque');
  });

  it('PATCH /leads/:id/status rejeita status inválido', async () => {
    await request(app.getHttpServer()).patch('/leads/1/status').send({ status: 'inexistente' }).expect(400);
  });
});
