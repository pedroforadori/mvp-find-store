import { useEffect, useState } from 'react';

import { atualizarStatusLead, listarLeads, registrarContatoManual } from '../api/leadsApi';
import type { FiltrosLeads, Lead, Status } from '../types/lead';
import { LeadCard } from './LeadCard';
import { LeadsFilters } from './LeadsFilters';

export function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtros, setFiltros] = useState<FiltrosLeads>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [idAtualizando, setIdAtualizando] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    listarLeads(filtros)
      .then((resultado) => {
        if (!cancelado) setLeads(resultado);
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar os leads.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [filtros]);

  async function atualizarLead(id: number, operacao: () => Promise<Lead>, mensagemErro: string) {
    setIdAtualizando(id);
    try {
      const leadAtualizado = await operacao();
      setLeads((atual) => atual.map((lead) => (lead.id === id ? leadAtualizado : lead)));
    } catch {
      setErro(mensagemErro);
    } finally {
      setIdAtualizando(null);
    }
  }

  function handleStatusChange(id: number, status: Status) {
    return atualizarLead(id, () => atualizarStatusLead(id, status), 'Não foi possível atualizar o status do lead.');
  }

  function handleRegistrarContato(id: number) {
    return atualizarLead(id, () => registrarContatoManual(id), 'Não foi possível registrar o envio do contato.');
  }

  return (
    <div className="flex flex-col gap-4">
      <LeadsFilters filtros={filtros} onChange={setFiltros} />

      {erro && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando leads…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum lead encontrado para os filtros selecionados.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onStatusChange={handleStatusChange}
              onRegistrarContato={handleRegistrarContato}
              atualizando={idAtualizando === lead.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
