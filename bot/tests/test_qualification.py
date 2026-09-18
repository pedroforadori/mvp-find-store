from src.models import SinaisLead
from src.qualification import (
    CATEGORIA_DESCARTADO,
    CATEGORIA_SEM_ECOMMERCE,
    CATEGORIA_SEM_SITE,
    CATEGORIA_SITE_DESATUALIZADO,
    CATEGORIA_SITE_INSTITUCIONAL,
    qualificar_categoria,
)

SINAIS_BASE = dict(
    tem_site=True,
    tem_instagram_link_venda=False,
    tecnologia_desatualizada=False,
    tem_checkout=False,
    tem_catalogo_produtos=False,
    site_quebrado=False,
)


def sinais(**overrides):
    return SinaisLead(**{**SINAIS_BASE, **overrides})


def test_checkout_funcional_descarta_independente_de_outros_sinais():
    resultado = qualificar_categoria(
        sinais(tem_checkout=True, tem_site=False, tecnologia_desatualizada=True)
    )
    assert resultado == CATEGORIA_DESCARTADO


def test_sem_site_e_categoria_sem_site():
    assert qualificar_categoria(sinais(tem_site=False)) == CATEGORIA_SEM_SITE


def test_sem_site_mesmo_com_instagram_com_link_de_venda():
    assert qualificar_categoria(sinais(tem_site=False, tem_instagram_link_venda=True)) == CATEGORIA_SEM_SITE


def test_site_tecnologia_desatualizada():
    assert qualificar_categoria(sinais(tecnologia_desatualizada=True)) == CATEGORIA_SITE_DESATUALIZADO


def test_site_quebrado_conta_como_desatualizado():
    assert qualificar_categoria(sinais(site_quebrado=True)) == CATEGORIA_SITE_DESATUALIZADO


def test_site_com_catalogo_de_produtos_sem_checkout():
    assert qualificar_categoria(sinais(tem_catalogo_produtos=True)) == CATEGORIA_SEM_ECOMMERCE


def test_site_institucional_sem_catalogo_nem_checkout():
    assert qualificar_categoria(sinais(tem_catalogo_produtos=False)) == CATEGORIA_SITE_INSTITUCIONAL
