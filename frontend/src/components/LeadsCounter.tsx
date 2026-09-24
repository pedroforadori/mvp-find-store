import type { ContagemLeads } from '../types/lead';
import { STATUSES_ATIVOS } from '../types/lead';
import { StatusBadge } from './StatusBadge';

interface LeadsCounterProps {
  contagem: ContagemLeads | null;
}

export function LeadsCounter({ contagem }: LeadsCounterProps) {
  return (
    <section
      aria-label="Contagem de leads"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
    >
      <p className="text-sm text-gray-600">
        <span data-testid="total-leads" className="text-lg font-semibold text-gray-900">
          {contagem ? contagem.total : '…'}
        </span>{' '}
        leads no total
      </p>
      <ul className="flex flex-wrap items-center gap-3">
        {STATUSES_ATIVOS.map((status) => (
          <li key={status} className="flex items-center gap-1.5 text-sm text-gray-700">
            <StatusBadge status={status} />
            <span data-testid={`contagem-${status}`} className="font-medium">
              {contagem ? contagem.por_status[status] : '…'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
