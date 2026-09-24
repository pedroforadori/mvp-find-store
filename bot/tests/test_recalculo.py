from unittest.mock import MagicMock, patch

from src.models import Lead, LeadArmazenado, SinaisLead
from src.recalculo import executar_recalculo, recalcular_lead
from src.site_diagnostico import DiagnosticoSite
from src.instagram_diagnostico import DiagnosticoInstagram


def _registro(**overrides):
    base = dict(
        id=1,
        place_id="place-1",
        telefone_normalizado="+5511987654321",
        nome_loja="Loja Teste",
        nicho="papelaria",
        cidade="São Paulo",
        endereco="Rua Teste, 1",
        site_url=None,
        instagram_handle=None,
        categoria="sem_site",
        score=30,
        prioridade="baixa",
        status="novo",
        pagespeed_mobile=None,
    )
    base.update(overrides)
    return LeadArmazenado(**base)


def _lead(categoria="sem_site", score=70, prioridade="quente", **overrides):
    base = dict(
        place_id="place-1",
        telefone_normalizado="+5511987654321",
        nome_loja="Loja Teste",
        nicho="papelaria",
        endereco=None,
        instagram_handle=None,
        site_url=None,
        categoria=categoria,
        score=score,
        prioridade=prioridade,
        sinais=SinaisLead(tem_site=False),
    )
    base.update(overrides)
    return Lead(**base)


def _diag_site(**overrides):
    base = dict(
        tem_ssl=True, tem_meta_tags=True, tecnologia_detectada=None, tecnologia_desatualizada=False,
        tem_botao_whatsapp=True, tem_checkout=False, tem_catalogo_produtos=False, site_quebrado=False,
        instagram_handle=None,
    )
    base.update(overrides)
    return DiagnosticoSite(**base)


SEM_IG = DiagnosticoInstagram(tem_link_venda=False, ativo_30d=False)


@patch("src.pipeline.diagnosticar_instagram", return_value=SEM_IG)
@patch("src.pipeline.diagnosticar_site")
def test_recalcular_lead_com_instagram_como_site_vira_sem_site_quente(diag_site, _diag_ig):
    lead = recalcular_lead(_registro(site_url="https://instagram.com/lojateste", categoria="site_institucional"))

    diag_site.assert_not_called()
    assert lead.categoria == "sem_site"
    assert lead.prioridade == "quente"
    assert lead.site_url is None
    assert lead.instagram_handle == "lojateste"


@patch("src.pipeline.diagnosticar_instagram", return_value=SEM_IG)
@patch("src.pipeline.diagnosticar_site", return_value=_diag_site())
def test_recalcular_lead_reaproveita_pagespeed_gravado(_diag_site_mock, _diag_ig):
    lead = recalcular_lead(_registro(site_url="https://loja.com.br", pagespeed_mobile=30))

    assert lead.sinais.pagespeed_mobile == 30


@patch("src.pipeline.diagnosticar_instagram", return_value=SEM_IG)
@patch("src.pipeline.diagnosticar_site")
def test_recalcular_lead_em_plataforma_de_ecommerce_e_descartado(diag_site, _diag_ig):
    diag_site.return_value = _diag_site(tecnologia_detectada="Shopify", tem_checkout=True)

    lead = recalcular_lead(_registro(site_url="https://loja.com.br", categoria="site_institucional"))

    assert lead.categoria == "descartado"


@patch("src.pipeline.diagnosticar_instagram", return_value=SEM_IG)
def test_recalcular_lead_mantem_handle_gravado_se_nao_achar_outro(_diag_ig):
    lead = recalcular_lead(_registro(instagram_handle="lojateste"))

    assert lead.instagram_handle == "lojateste"


def _repo(registros):
    repo = MagicMock()
    repo.buscar_leads_para_recalculo.return_value = registros
    return repo


def test_executar_recalculo_simulacao_nao_grava():
    repo = _repo([_registro()])

    contagens = executar_recalculo(repo, aplicar=False, recalcular=lambda r: _lead())

    assert contagens["alterados"] == 1
    repo.atualizar_recalculo.assert_not_called()


def test_executar_recalculo_aplica_apenas_leads_alterados():
    inalterado = _registro(id=1, categoria="sem_site", score=70, prioridade="quente")
    alterado = _registro(id=2)
    repo = _repo([inalterado, alterado])

    contagens = executar_recalculo(repo, aplicar=True, recalcular=lambda r: _lead())

    assert contagens["alterados"] == 1
    repo.atualizar_recalculo.assert_called_once()
    assert repo.atualizar_recalculo.call_args[0][0] == 2
    repo.descartar_lead.assert_not_called()


def test_executar_recalculo_exclui_lead_novo_descartado():
    repo = _repo([_registro(id=4)])

    contagens = executar_recalculo(
        repo, aplicar=True, recalcular=lambda r: _lead(categoria="descartado", score=0, prioridade="baixa")
    )

    assert contagens["descartados"] == 1
    assert contagens["prioridade_depois"]["descartado"] == 1
    repo.descartar_lead.assert_called_once_with(4)
    repo.atualizar_recalculo.assert_not_called()


def test_executar_recalculo_mantem_lead_ja_contatado_que_vira_descartado():
    repo = _repo([_registro(id=4, status="contatado")])

    executar_recalculo(
        repo, aplicar=True, recalcular=lambda r: _lead(categoria="descartado", score=0, prioridade="baixa")
    )

    repo.descartar_lead.assert_not_called()
    repo.atualizar_recalculo.assert_called_once()


def test_executar_recalculo_continua_apos_erro_em_um_lead():
    def recalcular(registro):
        if registro.id == 1:
            raise RuntimeError("site estranho")
        return _lead()

    repo = _repo([_registro(id=1), _registro(id=2)])

    contagens = executar_recalculo(repo, aplicar=True, recalcular=recalcular)

    assert contagens["erros"] == 1
    assert contagens["alterados"] == 1
