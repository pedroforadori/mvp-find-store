import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LeadsFilters } from './LeadsFilters';

describe('LeadsFilters', () => {
  it('chama onChange com o filtro de categoria selecionado', async () => {
    const onChange = jest.fn();
    const usuario = userEvent.setup();

    render(<LeadsFilters filtros={{}} onChange={onChange} />);

    await usuario.selectOptions(screen.getByLabelText('Filtrar por categoria'), 'sem_site');

    expect(onChange).toHaveBeenCalledWith({ categoria: 'sem_site' });
  });

  it('não exibe o botão de limpar filtros quando nenhum filtro está ativo', () => {
    render(<LeadsFilters filtros={{}} onChange={jest.fn()} />);

    expect(screen.queryByText('Limpar filtros')).not.toBeInTheDocument();
  });

  it('limpa os filtros ao clicar em "Limpar filtros"', async () => {
    const onChange = jest.fn();
    const usuario = userEvent.setup();

    render(<LeadsFilters filtros={{ status: 'novo' }} onChange={onChange} />);

    await usuario.click(screen.getByText('Limpar filtros'));

    expect(onChange).toHaveBeenCalledWith({});
  });
});
