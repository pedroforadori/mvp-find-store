import type { Lead, Status } from '../types/lead';
import { STATUSES } from '../types/lead';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

const ROTULOS_CATEGORIA: Record<string, string> = {
  sem_site: 'Sem site',
  sem_ecommerce: 'Sem e-commerce',
  site_institucional: 'Site institucional',
  site_desatualizado: 'Site desatualizado',
  descartado: 'Descartado',
};

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (id: number, status: Status) => void;
  atualizando?: boolean;
}

export function LeadCard({ lead, onStatusChange, atualizando }: LeadCardProps) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{lead.nome_loja}</h3>
          <StatusBadge status={lead.status} />
          <PriorityBadge prioridade={lead.prioridade} />
        </div>
        <p className="text-xs text-gray-500">
          {lead.nicho ?? 'Nicho não informado'} · {lead.cidade}
          {lead.endereco ? ` · ${lead.endereco}` : ''}
        </p>
        <p className="text-xs text-gray-500">
          {lead.categoria ? ROTULOS_CATEGORIA[lead.categoria] : 'Sem categoria'} · Score {lead.score} ·{' '}
          {lead.tentativas} tentativa{lead.tentativas === 1 ? '' : 's'}
        </p>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-600">
        Status
        <select
          aria-label={`Status de ${lead.nome_loja}`}
          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
          value={lead.status}
          disabled={atualizando}
          onChange={(evento) => onStatusChange(lead.id, evento.target.value as Status)}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
    </li>
  );
}
