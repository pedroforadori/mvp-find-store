from src.models import SinaisLead
from src.scoring import calcular_score, definir_prioridade

# Site institucional "saudável": nenhum problema técnico encontrado.
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
    tem_catalogo_produtos=False,
    site_quebrado=False,
)

SEM_SITE = dict(
    tem_site=False, tem_ssl=None, pagespeed_mobile=None, tem_meta_tags=None, tem_botao_whatsapp=None,
)


def sinais(**overrides):
    return SinaisLead(**{**SINAIS_BASE, **overrides})


# --- Base por categoria ---

def test_checkout_funcional_zera_score_mesmo_com_outros_criterios():
    assert calcular_score(sinais(tem_checkout=True, tem_ssl=False, tem_meta_tags=False)) == 0


def test_sem_site_e_quente():
    score = calcular_score(sinais(**SEM_SITE))
    assert score == 70
    assert definir_prioridade(score) == "quente"


def test_site_com_catalogo_sem_checkout_e_quente():
    score = calcular_score(sinais(tem_catalogo_produtos=True))
    assert score == 70
    assert definir_prioridade(score) == "quente"


def test_site_institucional_e_morno():
    score = calcular_score(sinais())
    assert score == 40
    assert definir_prioridade(score) == "morno"


def test_site_desatualizado_e_morno():
    score = calcular_score(sinais(site_quebrado=True, tem_ssl=None, tem_meta_tags=None, tem_botao_whatsapp=None))
    assert score == 40
    assert definir_prioridade(score) == "morno"


# --- Bônus para quem não tem site (Instagram) ---

def test_sem_site_com_instagram_com_link_de_venda():
    assert calcular_score(sinais(**SEM_SITE, tem_instagram_link_venda=True)) == 90


def test_sem_site_com_instagram_ativo():
    assert calcular_score(sinais(**SEM_SITE, instagram_ativo_30d=True)) == 80


def test_sem_site_vendendo_no_instagram_ativo_atinge_maximo():
    assert calcular_score(sinais(**SEM_SITE, tem_instagram_link_venda=True, instagram_ativo_30d=True)) == 100


def test_instagram_nao_pontua_para_quem_tem_site():
    assert calcular_score(sinais(tem_instagram_link_venda=True, instagram_ativo_30d=True)) == 40


# --- Bônus de problemas no site ---

def test_site_sem_ssl():
    assert calcular_score(sinais(tem_ssl=False)) == 45


def test_pagespeed_mobile_abaixo_de_50():
    assert calcular_score(sinais(pagespeed_mobile=49)) == 45


def test_pagespeed_mobile_exatamente_50_nao_pontua():
    assert calcular_score(sinais(pagespeed_mobile=50)) == 40


def test_pagespeed_mobile_none_nao_pontua():
    assert calcular_score(sinais(pagespeed_mobile=None)) == 40


def test_sem_meta_tags():
    assert calcular_score(sinais(tem_meta_tags=False)) == 45


def test_tecnologia_desatualizada():
    # Tecnologia desatualizada também muda a categoria para site_desatualizado (base 40).
    assert calcular_score(sinais(tecnologia_desatualizada=True)) == 45


def test_sem_botao_whatsapp():
    assert calcular_score(sinais(tem_botao_whatsapp=False)) == 45


def test_botao_whatsapp_desconhecido_nao_pontua():
    assert calcular_score(sinais(tem_botao_whatsapp=None)) == 40


def test_site_institucional_com_todos_os_problemas_continua_morno():
    resultado = sinais(
        tem_ssl=False,
        pagespeed_mobile=30,
        tem_meta_tags=False,
        tecnologia_desatualizada=True,
        tem_botao_whatsapp=False,
    )
    score = calcular_score(resultado)
    assert score == 65
    assert definir_prioridade(score) == "morno"


def test_sem_ecommerce_com_problemas_no_site_sobe_dentro_da_faixa_quente():
    resultado = sinais(tem_catalogo_produtos=True, tem_ssl=False, pagespeed_mobile=30)
    assert calcular_score(resultado) == 80


# --- Faixas ---

def test_prioridade_quente():
    assert definir_prioridade(70) == "quente"
    assert definir_prioridade(100) == "quente"


def test_prioridade_morno():
    assert definir_prioridade(40) == "morno"
    assert definir_prioridade(69) == "morno"


def test_prioridade_baixa():
    assert definir_prioridade(39) == "baixa"
    assert definir_prioridade(0) == "baixa"
