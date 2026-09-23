import type { Lead, Status } from '../types/lead';
import { STATUSES } from '../types/lead';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { ehTelefoneFixo, formatarTelefone, montarLinkMaps } from '../utils/leadLinks';

const ROTULOS_CATEGORIA: Record<string, string> = {
  sem_site: 'Sem site',
  sem_ecommerce: 'Sem e-commerce',
  site_institucional: 'Site institucional',
  site_desatualizado: 'Site desatualizado',
  descartado: 'Descartado',
};

const ROTULOS_TIPO_CONTATO = {
  primeiro_contato: '1º contato pendente',
  followup: 'Follow-up pendente',
} as const;

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (id: number, status: Status) => void;
  onRegistrarContato: (id: number) => void;
  atualizando?: boolean;
}

export function LeadCard({ lead, onStatusChange, onRegistrarContato, atualizando }: LeadCardProps) {
  const contato = lead.contato_manual;
  const telefoneFixo = lead.telefone_normalizado ? ehTelefoneFixo(lead.telefone_normalizado) : false;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <p className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {lead.telefone_normalizado ? (
              <span>{formatarTelefone(lead.telefone_normalizado)}</span>
            ) : (
              <span>Sem telefone</span>
            )}
            {telefoneFixo && (
              <span
                className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800"
                title="Telefone fixo raramente tem WhatsApp — confira o contato no Maps"
              >
                Fixo
              </span>
            )}
            <a
              href={montarLinkMaps(lead)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              Ver no Google Maps
            </a>
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
      </div>

      {contato && (
        <div className="flex flex-col gap-2 rounded border border-green-200 bg-green-50 p-3">
          <p className="text-xs font-medium text-green-800">{ROTULOS_TIPO_CONTATO[contato.tipo]}</p>
          <p className="text-xs text-gray-700">{contato.mensagem}</p>
          {telefoneFixo && (
            <p className="text-xs text-amber-800">
              Telefone fixo: se o WhatsApp não encontrar o número, procure outro contato (celular, Instagram, site)
              na ficha do Google Maps.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href={contato.link_whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              Abrir no WhatsApp
            </a>
            <button
              type="button"
              className="rounded border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
              disabled={atualizando}
              onClick={() => onRegistrarContato(lead.id)}
            >
              Marcar como enviado
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
