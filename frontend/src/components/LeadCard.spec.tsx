import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Lead } from '../types/lead';
import { LeadCard } from './LeadCard';

const lead: Lead = {
  id: 1,
  place_id: 'place-1',
  telefone_normalizado: '5511999999999',
  nome_loja: 'Loja da Esquina',
  nicho: 'Vestuário',
  cidade: 'São Paulo',
  endereco: 'Rua Augusta, 100',
  instagram_handle: '@lojadaesquina',
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
};

describe('LeadCard', () => {
  it('exibe os dados principais do lead', () => {
    render(<LeadCard lead={lead} onStatusChange={jest.fn()} />);

    expect(screen.getByText('Loja da Esquina')).toBeInTheDocument();
    expect(screen.getByText(/Vestuário/)).toBeInTheDocument();
    expect(screen.getByText(/Score 80/)).toBeInTheDocument();
  });

  it('chama onStatusChange com o novo status ao selecionar outra opção', async () => {
    const onStatusChange = jest.fn();
    const usuario = userEvent.setup();

    render(<LeadCard lead={lead} onStatusChange={onStatusChange} />);

    await usuario.selectOptions(screen.getByLabelText('Status de Loja da Esquina'), 'destaque');

    expect(onStatusChange).toHaveBeenCalledWith(1, 'destaque');
  });

  it('desabilita o seletor de status enquanto atualiza', () => {
    render(<LeadCard lead={lead} onStatusChange={jest.fn()} atualizando />);

    expect(screen.getByLabelText('Status de Loja da Esquina')).toBeDisabled();
  });
});
