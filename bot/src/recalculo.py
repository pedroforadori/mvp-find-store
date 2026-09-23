import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, List, Optional

from .models import Lead, LeadArmazenado
from .pipeline import montar_lead
from .qualification import CATEGORIA_DESCARTADO

logger = logging.getLogger(__name__)


class _PageSpeedArmazenado:
    """Devolve o PageSpeed já gravado em vez de chamar a API de novo (é a
    etapa mais lenta e com cota do pipeline, e o valor muda pouco)."""

    def __init__(self, valor: Optional[int]):
        self._valor = valor

    def obter_score_mobile(self, url: str) -> Optional[int]:
        return self._valor


def recalcular_lead(registro: LeadArmazenado) -> Lead:
    """Refaz diagnóstico, categoria e score de um lead já gravado com as
    regras atuais do pipeline (mesmo `montar_lead` usado na descoberta)."""
    detalhes = {
        "place_id": registro.place_id,
        "name": registro.nome_loja,
        "website": registro.site_url,
        "formatted_phone_number": registro.telefone_normalizado,
        "formatted_address": registro.endereco,
    }
    lead = montar_lead(detalhes, registro.nicho, registro.cidade, _PageSpeedArmazenado(registro.pagespeed_mobile))
    if not lead.instagram_handle:
        lead.instagram_handle = registro.instagram_handle
    return lead


def executar_recalculo(repositorio, aplicar: bool = False,
                        recalcular: Callable[[LeadArmazenado], Lead] = recalcular_lead,
                        max_workers: int = 8) -> dict:
    """Recalcula todos os leads. Sem `aplicar`, só simula e loga as mudanças.

    Lead que passa a ser descartado (ex: loja em Shopify) só tem o status
    trocado para 'descartado' se ainda for 'novo' — quem já foi contatado
    mantém o status para não perder o histórico da conversa.
    """
    registros: List[LeadArmazenado] = repositorio.buscar_leads_para_recalculo()
    contagens = {"total": len(registros), "alterados": 0, "descartados": 0, "erros": 0}
    antes = {"quente": 0, "morno": 0, "baixa": 0}
    depois = {"quente": 0, "morno": 0, "baixa": 0, CATEGORIA_DESCARTADO: 0}

    def _tentar(registro):
        try:
            return registro, recalcular(registro)
        except Exception:  # noqa: BLE001 — um site problemático não pode parar o lote
            logger.exception("Falha ao recalcular lead %s", registro.id)
            return registro, None

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        resultados = list(executor.map(_tentar, registros))

    for registro, lead in resultados:
        antes[registro.prioridade or "baixa"] = antes.get(registro.prioridade or "baixa", 0) + 1
        if lead is None:
            contagens["erros"] += 1
            continue

        descartar = lead.categoria == CATEGORIA_DESCARTADO
        depois[CATEGORIA_DESCARTADO if descartar else lead.prioridade] += 1

        mudou = (lead.categoria, lead.score, lead.prioridade) != (registro.categoria, registro.score, registro.prioridade)
        if not mudou:
            continue

        contagens["alterados"] += 1
        if descartar:
            contagens["descartados"] += 1
        logger.info(
            "%s: %s/%s/%s -> %s/%s/%s",
            registro.nome_loja, registro.categoria, registro.score, registro.prioridade,
            lead.categoria, lead.score, lead.prioridade,
        )
        if aplicar:
            repositorio.atualizar_recalculo(registro.id, lead, descartar_se_novo=descartar)

    contagens["prioridade_antes"] = antes
    contagens["prioridade_depois"] = depois
    return contagens
