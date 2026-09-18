import { render, screen } from '@testing-library/react';

import { PriorityBadge } from './PriorityBadge';

describe('PriorityBadge', () => {
  it('exibe o rótulo de prioridade quente', () => {
    render(<PriorityBadge prioridade="quente" />);

    expect(screen.getByTestId('priority-badge')).toHaveTextContent('Quente');
  });

  it('exibe um traço quando não há prioridade definida', () => {
    render(<PriorityBadge prioridade={null} />);

    expect(screen.getByTestId('priority-badge')).toHaveTextContent('—');
  });
});
