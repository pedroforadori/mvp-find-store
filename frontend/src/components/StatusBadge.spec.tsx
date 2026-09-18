import { render, screen } from '@testing-library/react';

import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('exibe o rótulo em português para cada status', () => {
    render(<StatusBadge status="aguardando_followup" />);

    expect(screen.getByTestId('status-badge')).toHaveTextContent('Aguardando follow-up');
  });

  it('exibe o rótulo de destaque', () => {
    render(<StatusBadge status="destaque" />);

    expect(screen.getByTestId('status-badge')).toHaveTextContent('Destaque');
  });
});
