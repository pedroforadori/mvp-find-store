import type { Prioridade } from '../types/lead';

const ESTILOS: Record<Prioridade, string> = {
  quente: 'bg-red-100 text-red-800',
  morno: 'bg-orange-100 text-orange-800',
  baixa: 'bg-gray-100 text-gray-600',
};

const ROTULOS: Record<Prioridade, string> = {
  quente: 'Quente',
  morno: 'Morno',
  baixa: 'Baixa prioridade',
};

export function PriorityBadge({ prioridade }: { prioridade: Prioridade | null }) {
  if (!prioridade) {
    return (
      <span data-testid="priority-badge" className="text-xs text-gray-400">
        —
      </span>
    );
  }

  return (
    <span
      data-testid="priority-badge"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILOS[prioridade]}`}
    >
      {ROTULOS[prioridade]}
    </span>
  );
}
