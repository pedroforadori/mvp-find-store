import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as leadsApi from '../api/leadsApi';
import type { ContagemLeads, Lead } from '../types/lead';
import { LeadsList, TAMANHO_PAGINA } from './LeadsList';

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

// jsdom não implementa IntersectionObserver: o mock guarda os callbacks para
// o teste simular a sentinela do fim da lista entrando na tela.
let observadores: { callback: IntersectionObserverCallback; alvos: Element[] }[] = [];

class IntersectionObserverMock {
  private readonly registro: { callback: IntersectionObserverCallback; alvos: Element[] };

  constructor(callback: IntersectionObserverCallback) {
    this.registro = { callback, alvos: [] };
    observadores.push(this.registro);
  }

  observe(alvo: Element) {
    this.registro.alvos.push(alvo);
  }

  disconnect() {
    observadores = observadores.filter((registro) => registro !== this.registro);
  }

  unobserve() {}
  takeRecords() {
    return [];
  }
}

function rolarAteOFim() {
  act(() => {
    for (const { callback, alvos } of observadores) {
      callback(
        alvos.map((alvo) => ({ isIntersecting: true, target: alvo }) as IntersectionObserverEntry),
        {} as IntersectionObserver,
      );
    }
  });
}

function paginaDeLeads(inicio: number, quantidade: number): Lead[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    ...lead,
    id: inicio + i,
    nome_loja: `Loja ${inicio + i}`,
  }));
}

const contagem: ContagemLeads = {
  total: 12,
  por_status: { novo: 7, contatado: 2, aguardando_followup: 1, esgotado: 0, destaque: 2 },
};

describe('LeadsList', () => {
  beforeEach(() => {
    observadores = [];
    window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
    leadsApiMock.contarLeads.mockResolvedValue(contagem);
  });

  it('mostra o total de leads e a contagem por status no topo', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);

    render(<LeadsList />);

    expect(await screen.findByTestId('total-leads')).toHaveTextContent('12');
    expect(screen.getByTestId('contagem-novo')).toHaveTextContent('7');
    expect(screen.getByTestId('contagem-destaque')).toHaveTextContent('2');
    expect(screen.queryByTestId('contagem-descartado')).not.toBeInTheDocument();
  });

  it('descartar exclui o card da lista e recarrega a contagem', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);
    leadsApiMock.atualizarStatusLead.mockResolvedValue({ id: 1, excluido: true });
    const confirmar = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const usuario = userEvent.setup();

    render(<LeadsList />);
    await screen.findByText('Loja da Esquina');

    await usuario.selectOptions(screen.getByLabelText('Status de Loja da Esquina'), 'descartado');

    await waitFor(() => expect(screen.queryByText('Loja da Esquina')).not.toBeInTheDocument());
    expect(confirmar).toHaveBeenCalled();
    expect(leadsApiMock.atualizarStatusLead).toHaveBeenCalledWith(1, 'descartado');
    expect(leadsApiMock.contarLeads).toHaveBeenCalledTimes(2);
    confirmar.mockRestore();
  });

  it('não descarta quando o usuário cancela a confirmação', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);
    const confirmar = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const usuario = userEvent.setup();

    render(<LeadsList />);
    await screen.findByText('Loja da Esquina');

    await usuario.selectOptions(screen.getByLabelText('Status de Loja da Esquina'), 'descartado');

    expect(leadsApiMock.atualizarStatusLead).not.toHaveBeenCalled();
    expect(screen.getByText('Loja da Esquina')).toBeInTheDocument();
    confirmar.mockRestore();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('carrega a próxima página ao rolar até o fim da lista', async () => {
    leadsApiMock.listarLeads
      .mockResolvedValueOnce(paginaDeLeads(1, TAMANHO_PAGINA))
      .mockResolvedValueOnce(paginaDeLeads(TAMANHO_PAGINA + 1, 5));

    render(<LeadsList />);
    await screen.findByText('Loja 1');
    expect(screen.queryByText(`Loja ${TAMANHO_PAGINA + 1}`)).not.toBeInTheDocument();

    rolarAteOFim();

    expect(await screen.findByText(`Loja ${TAMANHO_PAGINA + 1}`)).toBeInTheDocument();
    expect(leadsApiMock.listarLeads).toHaveBeenLastCalledWith({}, { limit: TAMANHO_PAGINA, offset: TAMANHO_PAGINA });
    expect(screen.getAllByRole('combobox', { name: /^Status de / })).toHaveLength(TAMANHO_PAGINA + 5);

    // Página incompleta: não há mais o que buscar.
    rolarAteOFim();
    expect(leadsApiMock.listarLeads).toHaveBeenCalledTimes(2);
  });

  it('não observa o fim da lista quando a primeira página já veio incompleta', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);

    render(<LeadsList />);
    await screen.findByText('Loja da Esquina');

    expect(observadores).toHaveLength(0);
  });

  it('volta para a primeira página ao trocar o filtro', async () => {
    leadsApiMock.listarLeads
      .mockResolvedValueOnce(paginaDeLeads(1, TAMANHO_PAGINA))
      .mockResolvedValueOnce(paginaDeLeads(100, 2));
    const usuario = userEvent.setup();

    render(<LeadsList />);
    await screen.findByText('Loja 1');

    await usuario.selectOptions(screen.getByLabelText('Filtrar por categoria'), 'sem_site');

    expect(await screen.findByText('Loja 100')).toBeInTheDocument();
    expect(screen.queryByText('Loja 1')).not.toBeInTheDocument();
    expect(leadsApiMock.listarLeads).toHaveBeenLastCalledWith(
      { categoria: 'sem_site' },
      { limit: TAMANHO_PAGINA, offset: 0 },
    );
  });

  it('lista os leads retornados pela API', async () => {
    leadsApiMock.listarLeads.mockResolvedValue([lead]);

    render(<LeadsList />);

    expect(screen.getByText('Carregando leads…')).toBeInTheDocument();
    expect(await screen.findByText('Loja da Esquina')).toBeInTheDocument();
    expect(leadsApiMock.listarLeads).toHaveBeenCalledWith({}, { limit: TAMANHO_PAGINA, offset: 0 });
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

    await waitFor(() => expect(leadsApiMock.listarLeads).toHaveBeenLastCalledWith({ categoria: 'sem_site' }, { limit: TAMANHO_PAGINA, offset: 0 }));
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

    await waitFor(() => expect(leadsApiMock.listarLeads).toHaveBeenLastCalledWith({ pendente_contato: true }, { limit: TAMANHO_PAGINA, offset: 0 }));
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
