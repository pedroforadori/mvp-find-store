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
  contato_manual: null,
};

const leadPendente: Lead = {
  ...lead,
  contato_manual: {
    tipo: 'primeiro_contato',
    mensagem: 'Olá! Vi que a Loja da Esquina ainda não tem um site.',
    link_whatsapp: 'https://wa.me/5511999999999?text=Ol%C3%A1',
  },
};

describe('LeadCard', () => {
  it('exibe os dados principais do lead', () => {
    render(<LeadCard lead={lead} onStatusChange={jest.fn()} onRegistrarContato={jest.fn()} />);

    expect(screen.getByText('Loja da Esquina')).toBeInTheDocument();
    expect(screen.getByText(/Vestuário/)).toBeInTheDocument();
    expect(screen.getByText(/Score 80/)).toBeInTheDocument();
  });

  it('chama onStatusChange com o novo status ao selecionar outra opção', async () => {
    const onStatusChange = jest.fn();
    const usuario = userEvent.setup();

    render(<LeadCard lead={lead} onStatusChange={onStatusChange} onRegistrarContato={jest.fn()} />);

    await usuario.selectOptions(screen.getByLabelText('Status de Loja da Esquina'), 'destaque');

    expect(onStatusChange).toHaveBeenCalledWith(1, 'destaque');
  });

  it('desabilita o seletor de status enquanto atualiza', () => {
    render(<LeadCard lead={lead} onStatusChange={jest.fn()} onRegistrarContato={jest.fn()} atualizando />);

    expect(screen.getByLabelText('Status de Loja da Esquina')).toBeDisabled();
  });

  it('exibe telefone formatado e link para a ficha da loja no Google Maps', () => {
    render(<LeadCard lead={lead} onStatusChange={jest.fn()} onRegistrarContato={jest.fn()} />);

    expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Ver no Google Maps' });
    expect(link.getAttribute('href')).toContain('query_place_id=place-1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.queryByText('Fixo')).not.toBeInTheDocument();
  });

  it('sinaliza telefone fixo e orienta a procurar outro contato no Maps', () => {
    const leadFixo: Lead = { ...leadPendente, telefone_normalizado: '+551133334444' };

    render(<LeadCard lead={leadFixo} onStatusChange={jest.fn()} onRegistrarContato={jest.fn()} />);

    expect(screen.getByText('Fixo')).toBeInTheDocument();
    expect(screen.getByText(/se o WhatsApp não encontrar o número/)).toBeInTheDocument();
  });

  it('não exibe ações de contato quando não há contato pendente', () => {
    render(<LeadCard lead={lead} onStatusChange={jest.fn()} onRegistrarContato={jest.fn()} />);

    expect(screen.queryByText('Abrir no WhatsApp')).not.toBeInTheDocument();
    expect(screen.queryByText('Marcar como enviado')).not.toBeInTheDocument();
  });

  it('exibe mensagem sugerida e link do WhatsApp quando há contato pendente', () => {
    render(<LeadCard lead={leadPendente} onStatusChange={jest.fn()} onRegistrarContato={jest.fn()} />);

    expect(screen.getByText('1º contato pendente')).toBeInTheDocument();
    expect(screen.getByText(/ainda não tem um site/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Abrir no WhatsApp' });
    expect(link).toHaveAttribute('href', 'https://wa.me/5511999999999?text=Ol%C3%A1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('chama onRegistrarContato ao marcar como enviado', async () => {
    const onRegistrarContato = jest.fn();
    const usuario = userEvent.setup();

    render(<LeadCard lead={leadPendente} onStatusChange={jest.fn()} onRegistrarContato={onRegistrarContato} />);

    await usuario.click(screen.getByRole('button', { name: 'Marcar como enviado' }));

    expect(onRegistrarContato).toHaveBeenCalledWith(1);
  });
});
