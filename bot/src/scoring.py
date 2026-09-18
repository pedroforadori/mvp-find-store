from .models import SinaisLead

PONTOS_SEM_SITE_NEM_INSTAGRAM = 30
PONTOS_SEM_SSL = 20
PONTOS_PAGESPEED_BAIXO = 20
PONTOS_SEM_META_TAGS = 10
PONTOS_TECNOLOGIA_DESATUALIZADA = 10
PONTOS_SEM_BOTAO_WHATSAPP = 10
PONTOS_INSTAGRAM_ATIVO_SITE_QUEBRADO = 10

LIMIAR_PAGESPEED_BAIXO = 50

FAIXA_QUENTE = 70
FAIXA_MORNO = 40


def calcular_score(sinais: SinaisLead) -> int:
    """Soma os pesos de scoring. Checkout funcional zera o score (é descarte)."""
    if sinais.tem_checkout:
        return 0

    score = 0

    if not sinais.tem_site and not sinais.tem_instagram_link_venda:
        score += PONTOS_SEM_SITE_NEM_INSTAGRAM

    if sinais.tem_site and sinais.tem_ssl is False:
        score += PONTOS_SEM_SSL

    if sinais.pagespeed_mobile is not None and sinais.pagespeed_mobile < LIMIAR_PAGESPEED_BAIXO:
        score += PONTOS_PAGESPEED_BAIXO

    if sinais.tem_site and sinais.tem_meta_tags is False:
        score += PONTOS_SEM_META_TAGS

    if sinais.tecnologia_desatualizada:
        score += PONTOS_TECNOLOGIA_DESATUALIZADA

    if sinais.tem_botao_whatsapp is False:
        score += PONTOS_SEM_BOTAO_WHATSAPP

    if sinais.instagram_ativo_30d and (not sinais.tem_site or sinais.site_quebrado):
        score += PONTOS_INSTAGRAM_ATIVO_SITE_QUEBRADO

    return score


def definir_prioridade(score: int) -> str:
    if score >= FAIXA_QUENTE:
        return "quente"
    if score >= FAIXA_MORNO:
        return "morno"
    return "baixa"
