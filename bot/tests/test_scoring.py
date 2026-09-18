from src.models import SinaisLead
from src.scoring import calcular_score, definir_prioridade

SINAIS_BASE = dict(
    tem_site=True,
    tem_instagram_link_venda=False,
    tem_ssl=True,
    pagespeed_mobile=90,
    tem_meta_tags=True,
    tecnologia_desatualizada=False,
    tem_botao_whatsapp=True,
    instagram_ativo_30d=False,
    tem_checkout=False,
    tem_catalogo_produtos=True,
    site_quebrado=False,
)


def sinais(**overrides):
    return SinaisLead(**{**SINAIS_BASE, **overrides})


def test_nenhum_criterio_score_zero():
    assert calcular_score(sinais()) == 0


def test_checkout_funcional_zera_score_mesmo_com_outros_criterios():
    assert calcular_score(sinais(tem_checkout=True, tem_ssl=False, tem_meta_tags=False)) == 0


def test_sem_site_e_sem_instagram_com_link_de_venda():
    assert calcular_score(sinais(tem_site=False, tem_instagram_link_venda=False)) == 30


def test_sem_site_mas_com_instagram_com_link_de_venda_nao_pontua_esse_criterio():
    assert calcular_score(sinais(tem_site=False, tem_instagram_link_venda=True)) == 0


def test_tem_site_nao_pontua_criterio_sem_site():
    assert calcular_score(sinais(tem_site=True, tem_instagram_link_venda=False)) == 0


def test_site_sem_ssl():
    assert calcular_score(sinais(tem_ssl=False)) == 20


def test_sem_ssl_nao_conta_se_nao_tem_site():
    assert calcular_score(sinais(tem_site=False, tem_ssl=False, tem_instagram_link_venda=True)) == 0


def test_pagespeed_mobile_abaixo_de_50():
    assert calcular_score(sinais(pagespeed_mobile=49)) == 20


def test_pagespeed_mobile_exatamente_50_nao_pontua():
    assert calcular_score(sinais(pagespeed_mobile=50)) == 0


def test_pagespeed_mobile_none_nao_pontua():
    assert calcular_score(sinais(pagespeed_mobile=None)) == 0


def test_sem_meta_tags():
    assert calcular_score(sinais(tem_meta_tags=False)) == 10


def test_sem_meta_tags_nao_conta_se_nao_tem_site():
    assert calcular_score(sinais(tem_site=False, tem_meta_tags=False, tem_instagram_link_venda=True)) == 0


def test_tecnologia_desatualizada():
    assert calcular_score(sinais(tecnologia_desatualizada=True)) == 10


def test_sem_botao_whatsapp():
    assert calcular_score(sinais(tem_botao_whatsapp=False)) == 10


def test_botao_whatsapp_desconhecido_nao_pontua():
    assert calcular_score(sinais(tem_botao_whatsapp=None)) == 0


def test_instagram_ativo_mas_sem_site():
    assert calcular_score(sinais(tem_site=False, instagram_ativo_30d=True, tem_instagram_link_venda=True)) == 10


def test_instagram_ativo_com_site_quebrado():
    assert calcular_score(sinais(instagram_ativo_30d=True, site_quebrado=True)) == 10


def test_instagram_ativo_com_site_saudavel_nao_pontua():
    assert calcular_score(sinais(instagram_ativo_30d=True, site_quebrado=False)) == 0


def test_combinacao_de_varios_criterios():
    resultado = sinais(
        tem_site=True,
        tem_ssl=False,
        pagespeed_mobile=30,
        tem_meta_tags=False,
        tecnologia_desatualizada=True,
        tem_botao_whatsapp=False,
    )
    # 20 (ssl) + 20 (pagespeed) + 10 (meta) + 10 (tecnologia) + 10 (whatsapp) = 70
    assert calcular_score(resultado) == 70


def test_prioridade_quente():
    assert definir_prioridade(70) == "quente"
    assert definir_prioridade(100) == "quente"


def test_prioridade_morno():
    assert definir_prioridade(40) == "morno"
    assert definir_prioridade(69) == "morno"


def test_prioridade_baixa():
    assert definir_prioridade(39) == "baixa"
    assert definir_prioridade(0) == "baixa"
