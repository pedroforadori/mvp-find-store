import { useCallback, useEffect, useRef, useState } from 'react';

import { atualizarStatusLead, contarLeads, listarLeads, registrarContatoManual } from '../api/leadsApi';
import type { ContagemLeads, FiltrosLeads, Lead, LeadExcluido, Status } from '../types/lead';
import { LeadCard } from './LeadCard';
import { LeadsCounter } from './LeadsCounter';
import { LeadsFilters } from './LeadsFilters';

export const TAMANHO_PAGINA = 30;

export function LeadsList() {
  const [contagem, setContagem] = useState<ContagemLeads | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtros, setFiltros] = useState<FiltrosLeads>({});
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [idAtualizando, setIdAtualizando] = useState<number | null>(null);
  const [sentinela, setSentinela] = useState<HTMLElement | null>(null);
  // Incrementa a cada troca de filtro para descartar páginas de buscas antigas.
  const versaoBusca = useRef(0);

  // A contagem é secundária: se falhar, o contador só fica sem números.
  const atualizarContagem = useCallback(() => {
    contarLeads()
      .then(setContagem)
      .catch(() => undefined);
  }, []);

  useEffect(atualizarContagem, [atualizarContagem]);

  useEffect(() => {
    const versao = ++versaoBusca.current;
    setCarregando(true);
    setCarregandoMais(false);
    setErro(null);

    listarLeads(filtros, { limit: TAMANHO_PAGINA, offset: 0 })
      .then((resultado) => {
        if (versao !== versaoBusca.current) return;
        setLeads(resultado);
        setTemMais(resultado.length === TAMANHO_PAGINA);
      })
      .catch(() => {
        if (versao === versaoBusca.current) setErro('Não foi possível carregar os leads.');
      })
      .finally(() => {
        if (versao === versaoBusca.current) setCarregando(false);
      });
  }, [filtros]);

  const carregarMais = useCallback(() => {
    const versao = versaoBusca.current;
    setCarregandoMais(true);

    listarLeads(filtros, { limit: TAMANHO_PAGINA, offset: leads.length })
      .then((resultado) => {
        if (versao !== versaoBusca.current) return;
        // Um lead pode mudar de posição entre páginas (ex.: status alterado);
        // ignora os que já estão na lista.
        setLeads((atual) => {
          const ids = new Set(atual.map((lead) => lead.id));
          return [...atual, ...resultado.filter((lead) => !ids.has(lead.id))];
        });
        setTemMais(resultado.length === TAMANHO_PAGINA);
      })
      .catch(() => {
        if (versao !== versaoBusca.current) return;
        setErro('Não foi possível carregar mais leads.');
        setTemMais(false);
      })
      .finally(() => {
        if (versao === versaoBusca.current) setCarregandoMais(false);
      });
  }, [filtros, leads.length]);

  // Busca a próxima página quando o fim da lista se aproxima da área visível.
  useEffect(() => {
    if (!sentinela || !temMais || carregando || carregandoMais) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) carregarMais();
      },
      { rootMargin: '400px' },
    );
    observador.observe(sentinela);
    return () => observador.disconnect();
  }, [sentinela, temMais, carregando, carregandoMais, carregarMais]);

  async function atualizarLead(
    id: number,
    operacao: () => Promise<Lead | LeadExcluido>,
    mensagemErro: string,
  ) {
    setIdAtualizando(id);
    try {
      const resultado = await operacao();
      setLeads((atual) =>
        'excluido' in resultado
          ? atual.filter((lead) => lead.id !== id)
          : atual.map((lead) => (lead.id === id ? resultado : lead)),
      );
      atualizarContagem();
    } catch {
      setErro(mensagemErro);
    } finally {
      setIdAtualizando(null);
    }
  }

  function handleStatusChange(id: number, status: Status) {
    if (status === 'descartado') {
      const nome = leads.find((lead) => lead.id === id)?.nome_loja ?? 'este lead';
      if (!window.confirm(`Descartar ${nome}? O lead será excluído e a loja não será mais prospectada.`)) {
        return;
      }
    }
    return atualizarLead(id, () => atualizarStatusLead(id, status), 'Não foi possível atualizar o status do lead.');
  }

  function handleRegistrarContato(id: number) {
    return atualizarLead(id, () => registrarContatoManual(id), 'Não foi possível registrar o envio do contato.');
  }

  return (
    <div className="flex flex-col gap-4">
      <LeadsCounter contagem={contagem} />
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
        <>
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
          {temMais && <div ref={setSentinela} aria-hidden="true" className="h-px" />}
          {carregandoMais && <p className="text-center text-sm text-gray-500">Carregando mais leads…</p>}
        </>
      )}
    </div>
  );
}
