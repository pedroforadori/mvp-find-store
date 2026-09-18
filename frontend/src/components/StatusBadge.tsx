import type { Status } from '../types/lead';

const ESTILOS: Record<Status, string> = {
  novo: 'bg-blue-100 text-blue-800',
  contatado: 'bg-indigo-100 text-indigo-800',
  aguardando_followup: 'bg-amber-100 text-amber-800',
  esgotado: 'bg-gray-200 text-gray-700',
  descartado: 'bg-red-100 text-red-800',
  destaque: 'bg-emerald-100 text-emerald-800',
};

const ROTULOS: Record<Status, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  aguardando_followup: 'Aguardando follow-up',
  esgotado: 'Esgotado',
  descartado: 'Descartado',
  destaque: 'Destaque',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILOS[status]}`}
    >
      {ROTULOS[status]}
    </span>
  );
}
