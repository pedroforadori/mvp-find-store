import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as leadsApi from '../api/leadsApi';
import type { Lead } from '../types/lead';
import { LeadsList } from './LeadsList';

jest.mock('../api/leadsApi');

const leadsApiMock = leadsApi as jest.Mocked<typeof leadsApi>;

const lead: Lead = {
  id: 1,
  place_id: 'place-1',
  telefone_normalizado: '5511999999999',
  nome_loja: 'Loja da Esquina',
  nicho: 'Vestuário',
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
  criado_em: '2026-01-01T00:00:00.000Z',
  atualizado_em: '2026-01-01T00:00:00.000Z',
  contato_manual: {
    tipo: 'primeiro_contato',
    mensagem: 'Olá!',
    link_whatsapp: 'https://wa.me/5511999999999?text=Ol%C3%A1!',
  },
};

describe('LeadsList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('lista os leads retornados pela API', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);

    render(<LeadsList />);

    expect(screen.getByText('Carregando leads…')).toBeInTheDocument();
    expect(await screen.findByText('Loja da Esquina')).toBeInTheDocument();
    expect(leadsApiMock.listarLeads).toHaveBeenCalledWith({});
  });

  it('exibe mensagem de lista vazia quando não há leads', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([]);

    render(<LeadsList />);

    expect(await screen.findByText('Nenhum lead encontrado para os filtros selecionados.')).toBeInTheDocument();
  });

  it('exibe erro quando a busca falha', async () => {
    leadsApiMock.listarLeads.mockRejectedValue(new Error('falha de rede'));

    render(<LeadsList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os leads.');
  });

  it('refaz a busca ao aplicar um filtro de categoria', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);
    const usuario = userEvent.setup();

    render(<LeadsList />);
    await screen.findByText('Loja da Esquina');

    await usuario.selectOptions(screen.getByLabelText('Filtrar por categoria'), 'sem_site');

    await waitFor(() => expect(leadsApiMock.listarLeads).toHaveBeenLastCalledWith({ categoria: 'sem_site' }));
  });

  it('atualiza o status do lead ao selecionar uma nova opção', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);
    leadsApiMock.atualizarStatusLead.mockResolvedValue({ ...lead, status: 'destaque' });
    const usuario = userEvent.setup();

    render(<LeadsList />);
    await screen.findByText('Loja da Esquina');

    await usuario.selectOptions(screen.getByLabelText('Status de Loja da Esquina'), 'destaque');

    await waitFor(() => expect(leadsApiMock.atualizarStatusLead).toHaveBeenCalledWith(1, 'destaque'));
  });

  it('filtra só pendentes de contato', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);
    const usuario = userEvent.setup();

    render(<LeadsList />);
    await screen.findByText('Loja da Esquina');

    await usuario.click(screen.getByLabelText('Só pendentes de contato'));

    await waitFor(() => expect(leadsApiMock.listarLeads).toHaveBeenLastCalledWith({ pendente_contato: true }));
  });

  it('registra o envio manual e atualiza o card', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);
    leadsApiMock.registrarContatoManual.mockResolvedValue({
      ...lead,
      status: 'contatado',
      tentativas: 1,
      contato_manual: null,
    });
    const usuario = userEvent.setup();

    render(<LeadsList />);
    await screen.findByText('Loja da Esquina');

    await usuario.click(screen.getByRole('button', { name: 'Marcar como enviado' }));

    expect(leadsApiMock.registrarContatoManual).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.queryByText('Marcar como enviado')).not.toBeInTheDocument());
    expect(screen.getByText(/1 tentativa\b/)).toBeInTheDocument();
  });

  it('exibe erro quando o registro do envio falha', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);
    leadsApiMock.registrarContatoManual.mockRejectedValue(new Error('409'));
    const usuario = userEvent.setup();

    render(<LeadsList />);
    await screen.findByText('Loja da Esquina');

    await usuario.click(screen.getByRole('button', { name: 'Marcar como enviado' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível registrar o envio do contato.');
  });
});
