from .models import SinaisLead
from .qualification import (
    CATEGORIA_SEM_ECOMMERCE,
    CATEGORIA_SEM_SITE,
    CATEGORIA_SITE_DESATUALIZADO,
    CATEGORIA_SITE_INSTITUCIONAL,
    qualificar_categoria,
)

# A categoria define a faixa: quem não tem site ou loja online é o lead
# quente (é o público do serviço). Os demais pesos só ordenam dentro da faixa.
PONTOS_BASE_POR_CATEGORIA = {
    CATEGORIA_SEM_SITE: 70,
    CATEGORIA_SEM_ECOMMERCE: 70,
    CATEGORIA_SITE_INSTITUCIONAL: 40,
    CATEGORIA_SITE_DESATUALIZADO: 40,
}

# Sem site: já vender/estar ativo no Instagram mostra demanda por loja própria.
PONTOS_INSTAGRAM_LINK_VENDA = 20
PONTOS_INSTAGRAM_ATIVO = 10

# Com site: cada problema encontrado reforça a necessidade de refazer o site.
PONTOS_SEM_SSL = 5
PONTOS_PAGESPEED_BAIXO = 5
PONTOS_SEM_META_TAGS = 5
PONTOS_TECNOLOGIA_DESATUALIZADA = 5
PONTOS_SEM_BOTAO_WHATSAPP = 5

LIMIAR_PAGESPEED_BAIXO = 50

SCORE_MAXIMO = 100
FAIXA_QUENTE = 70
FAIXA_MORNO = 40


def calcular_score(sinais: SinaisLead) -> int:
    """Base pela categoria + bônus de sinais. Checkout funcional zera o score (é descarte)."""
    categoria = qualificar_categoria(sinais)
    if categoria not in PONTOS_BASE_POR_CATEGORIA:
        return 0

    score = PONTOS_BASE_POR_CATEGORIA[categoria]

    if not sinais.tem_site:
        if sinais.tem_instagram_link_venda:
            score += PONTOS_INSTAGRAM_LINK_VENDA
        if sinais.instagram_ativo_30d:
            score += PONTOS_INSTAGRAM_ATIVO
    else:
        if sinais.tem_ssl is False:
            score += PONTOS_SEM_SSL
        if sinais.pagespeed_mobile is not None and sinais.pagespeed_mobile < LIMIAR_PAGESPEED_BAIXO:
            score += PONTOS_PAGESPEED_BAIXO
        if sinais.tem_meta_tags is False:
            score += PONTOS_SEM_META_TAGS
        if sinais.tecnologia_desatualizada:
            score += PONTOS_TECNOLOGIA_DESATUALIZADA
        if sinais.tem_botao_whatsapp is False:
            score += PONTOS_SEM_BOTAO_WHATSAPP

    return min(score, SCORE_MAXIMO)


def definir_prioridade(score: int) -> str:
    if score >= FAIXA_QUENTE:
        return "quente"
    if score >= FAIXA_MORNO:
        return "morno"
    return "baixa"
