import logging
from typing import Optional

from .instagram_diagnostico import diagnosticar_instagram
from .models import Lead, SinaisLead
from .pagespeed_client import PageSpeedClient
from .phone import normalizar_telefone
from .places_client import CATEGORIAS_BUSCA_PADRAO, GooglePlacesClient
from .qualification import CATEGORIA_DESCARTADO, qualificar_categoria
from .scoring import calcular_score, definir_prioridade
from .site_diagnostico import diagnosticar_site, eh_site_proprio, extrair_instagram_handle
from .supabase_repo import LeadRepository

logger = logging.getLogger(__name__)


def montar_lead(place_details: dict, nicho: str, cidade: str,
                 pagespeed_client: PageSpeedClient) -> Lead:
    """Roda o diagnóstico completo de um resultado do Places e monta o Lead."""
    nome_loja = place_details.get("name", "")
    website = place_details.get("website") or None
    telefone_normalizado = normalizar_telefone(place_details.get("formatted_phone_number"))
    endereco = place_details.get("formatted_address")
    place_id = place_details.get("place_id")

    # Lojas sem site costumam cadastrar o Instagram/Linktree como "website" no
    # Google: isso não é site próprio, mas é a fonte do handle do Instagram.
    site_url = website if eh_site_proprio(website) else None

    if site_url:
        diagnostico_site = diagnosticar_site(site_url)
        pagespeed_mobile = pagespeed_client.obter_score_mobile(site_url)
        instagram_handle = diagnostico_site.instagram_handle
    else:
        diagnostico_site = None
        pagespeed_mobile = None
        instagram_handle = extrair_instagram_handle(website)

    diagnostico_ig = diagnosticar_instagram(instagram_handle)

    sinais = SinaisLead(
        tem_site=bool(site_url),
        tem_instagram_link_venda=diagnostico_ig.tem_link_venda,
        tem_ssl=diagnostico_site.tem_ssl if diagnostico_site else None,
        pagespeed_mobile=pagespeed_mobile,
        tem_meta_tags=diagnostico_site.tem_meta_tags if diagnostico_site else None,
        tecnologia_detectada=diagnostico_site.tecnologia_detectada if diagnostico_site else None,
        tecnologia_desatualizada=diagnostico_site.tecnologia_desatualizada if diagnostico_site else False,
        tem_botao_whatsapp=diagnostico_site.tem_botao_whatsapp if diagnostico_site else None,
        instagram_ativo_30d=diagnostico_ig.ativo_30d,
        tem_checkout=diagnostico_site.tem_checkout if diagnostico_site else False,
        tem_catalogo_produtos=diagnostico_site.tem_catalogo_produtos if diagnostico_site else False,
        site_quebrado=diagnostico_site.site_quebrado if diagnostico_site else False,
    )

    categoria = qualificar_categoria(sinais)
    score = calcular_score(sinais)
    prioridade = definir_prioridade(score)

    return Lead(
        place_id=place_id,
        telefone_normalizado=telefone_normalizado,
        nome_loja=nome_loja,
        nicho=nicho,
        cidade=cidade,
        endereco=endereco,
        instagram_handle=instagram_handle,
        site_url=site_url,
        categoria=categoria,
        score=score,
        prioridade=prioridade,
        sinais=sinais,
    )


def executar_pipeline(places_client: GooglePlacesClient, pagespeed_client: PageSpeedClient,
                       repositorio: LeadRepository, cidade: str,
                       categorias: Optional[list] = None) -> dict:
    """Descobre lojas, qualifica, faz scoring e grava no banco. Retorna contagens."""
    categorias = categorias or CATEGORIAS_BUSCA_PADRAO
    contagens = {"encontrados": 0, "descartados": 0, "gravados": 0, "duplicados": 0}

    for nicho in categorias:
        for resultado in places_client.buscar_lojas(nicho, cidade):
            contagens["encontrados"] += 1
            place_id = resultado.get("place_id")
            if not place_id:
                continue

            detalhes = places_client.obter_detalhes(place_id)
            detalhes.setdefault("place_id", place_id)
            detalhes.setdefault("name", resultado.get("name"))

            lead = montar_lead(detalhes, nicho, cidade, pagespeed_client)

            if lead.categoria == CATEGORIA_DESCARTADO:
                contagens["descartados"] += 1
                continue

            lead_id = repositorio.inserir_lead(lead)
            if lead_id is None:
                contagens["duplicados"] += 1
                continue

            repositorio.inserir_diagnostico(lead_id, lead)
            contagens["gravados"] += 1
            logger.info("Lead gravado: %s (%s, score=%d)", lead.nome_loja, lead.categoria, lead.score)

    return contagens
