from .models import SinaisLead

CATEGORIA_DESCARTADO = "descartado"
CATEGORIA_SEM_SITE = "sem_site"
CATEGORIA_SITE_DESATUALIZADO = "site_desatualizado"
CATEGORIA_SEM_ECOMMERCE = "sem_ecommerce"
CATEGORIA_SITE_INSTITUCIONAL = "site_institucional"


def qualificar_categoria(sinais: SinaisLead) -> str:
    """Classifica a loja numa categoria de lead a partir dos sinais coletados.

    Checkout funcional descarta o lead antes de qualquer outra checagem.
    Entre os sites sem checkout, tecnologia desatualizada/site quebrado tem
    prioridade sobre a distinção sem_ecommerce vs. institucional, pois é o
    sinal mais forte de urgência para o dono da loja.
    """
    if sinais.tem_checkout:
        return CATEGORIA_DESCARTADO

    if not sinais.tem_site:
        return CATEGORIA_SEM_SITE

    if sinais.tecnologia_desatualizada or sinais.site_quebrado:
        return CATEGORIA_SITE_DESATUALIZADO

    if sinais.tem_catalogo_produtos:
        return CATEGORIA_SEM_ECOMMERCE

    return CATEGORIA_SITE_INSTITUCIONAL
