import { ConflictException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

describe('LeadsController (integração)', () => {
  let app: INestApplication;
  const leadsService = {
    listar: jest.fn(),
    atualizarStatus: jest.fn(),
    registrarContatoManual: jest.fn(),
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
    expect(leadsService.listar).toHaveBeenCalledWith({}, { limit: 30, offset: 0 });
  });

  it('GET /leads repassa filtros de query válidos', async () => {
    leadsService.listar.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/leads?categoria=sem_site&prioridade=quente').expect(200);

    expect(leadsService.listar).toHaveBeenCalledWith({ categoria: 'sem_site', prioridade: 'quente' }, { limit: 30, offset: 0 });
  });

  it('GET /leads rejeita categoria inválida', async () => {
    await request(app.getHttpServer()).get('/leads?categoria=inexistente').expect(400);
  });

  it('GET /leads converte pendente_contato=true em booleano', async () => {
    leadsService.listar.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/leads?pendente_contato=true&categoria=sem_site').expect(200);

    expect(leadsService.listar).toHaveBeenCalledWith({ categoria: 'sem_site', pendente_contato: true }, { limit: 30, offset: 0 });
  });

  it('GET /leads ignora pendente_contato=false', async () => {
    leadsService.listar.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/leads?pendente_contato=false').expect(200);

    expect(leadsService.listar).toHaveBeenCalledWith({}, { limit: 30, offset: 0 });
  });

  it('GET /leads rejeita pendente_contato inválido', async () => {
    await request(app.getHttpServer()).get('/leads?pendente_contato=sim').expect(400);
  });

  it('GET /leads converte limit/offset em números', async () => {
    leadsService.listar.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/leads?limit=10&offset=20').expect(200);

    expect(leadsService.listar).toHaveBeenCalledWith({}, { limit: 10, offset: 20 });
  });

  it.each(['limit=0', 'limit=101', 'limit=abc', 'offset=-1'])('GET /leads rejeita paginação inválida (%s)', async (query) => {
    await request(app.getHttpServer()).get(`/leads?${query}`).expect(400);
  });

  it('POST /leads/:id/contato-manual registra o envio', async () => {
    leadsService.registrarContatoManual.mockResolvedValue({ id: 1, status: 'contatado' });

    const resposta = await request(app.getHttpServer()).post('/leads/1/contato-manual').expect(200);

    expect(resposta.body).toEqual({ id: 1, status: 'contatado' });
    expect(leadsService.registrarContatoManual).toHaveBeenCalledWith(1);
  });

  it('POST /leads/:id/contato-manual devolve 409 quando o lead não está pendente', async () => {
    leadsService.registrarContatoManual.mockRejectedValue(new ConflictException('não pendente'));

    await request(app.getHttpServer()).post('/leads/1/contato-manual').expect(409);
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
