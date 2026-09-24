import type { Categoria, FiltrosLeads, Prioridade, StatusAtivo } from '../types/lead';
import { CATEGORIAS, PRIORIDADES, STATUSES_ATIVOS } from '../types/lead';

interface LeadsFiltersProps {
  filtros: FiltrosLeads;
  onChange: (filtros: FiltrosLeads) => void;
}

export function LeadsFilters({ filtros, onChange }: LeadsFiltersProps) {
  const temFiltroAtivo = Boolean(
    filtros.categoria || filtros.prioridade || filtros.status || filtros.pendente_contato,
  );

  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        Categoria
        <select
          aria-label="Filtrar por categoria"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={filtros.categoria ?? ''}
          onChange={(evento) =>
            onChange({ ...filtros, categoria: (evento.target.value || undefined) as Categoria | undefined })
          }
        >
          <option value="">Todas</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-gray-600">
        Prioridade
        <select
          aria-label="Filtrar por prioridade"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={filtros.prioridade ?? ''}
          onChange={(evento) =>
            onChange({ ...filtros, prioridade: (evento.target.value || undefined) as Prioridade | undefined })
          }
        >
          <option value="">Todas</option>
          {PRIORIDADES.map((prioridade) => (
            <option key={prioridade} value={prioridade}>
              {prioridade}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-gray-600">
        Status
        <select
          aria-label="Filtrar por status"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={filtros.status ?? ''}
          onChange={(evento) =>
            onChange({ ...filtros, status: (evento.target.value || undefined) as StatusAtivo | undefined })
          }
        >
          <option value="">Todos</option>
          {STATUSES_ATIVOS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 py-1 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={Boolean(filtros.pendente_contato)}
          onChange={(evento) => onChange({ ...filtros, pendente_contato: evento.target.checked || undefined })}
        />
        Só pendentes de contato
      </label>

      {temFiltroAtivo && (
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          onClick={() => onChange({})}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
