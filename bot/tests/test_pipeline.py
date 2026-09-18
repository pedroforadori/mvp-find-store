from unittest.mock import MagicMock, patch

from src.instagram_diagnostico import DiagnosticoInstagram
from src.pipeline import executar_pipeline
from src.site_diagnostico import DiagnosticoSite


def _places_client(resultados_por_nicho):
    client = MagicMock()
    client.buscar_lojas.side_effect = lambda nicho, cidade, **kw: iter(
        resultados_por_nicho.get(nicho, [])
    )
    return client


def _diagnostico_site(**overrides):
    base = dict(
        tem_ssl=True,
        tem_meta_tags=True,
        tecnologia_detectada=None,
        tecnologia_desatualizada=False,
        tem_botao_whatsapp=True,
        tem_checkout=False,
        tem_catalogo_produtos=True,
        site_quebrado=False,
        instagram_handle=None,
    )
    base.update(overrides)
    return DiagnosticoSite(**base)


@patch("src.pipeline.diagnosticar_instagram")
@patch("src.pipeline.diagnosticar_site")
def test_lead_sem_site_e_gravado(mock_diag_site, mock_diag_ig):
    mock_diag_ig.return_value = DiagnosticoInstagram(tem_link_venda=False, ativo_30d=False)

    places_client = _places_client({"papelaria": [{"place_id": "p1", "name": "Loja 1"}]})
    places_client.obter_detalhes.return_value = {
        "place_id": "p1", "name": "Loja 1", "website": None, "formatted_phone_number": None,
    }
    pagespeed_client = MagicMock()
    repositorio = MagicMock()
    repositorio.inserir_lead.return_value = 1

    contagens = executar_pipeline(
        places_client, pagespeed_client, repositorio, "São Paulo", categorias=["papelaria"]
    )

    mock_diag_site.assert_not_called()
    assert contagens == {"encontrados": 1, "descartados": 0, "gravados": 1, "duplicados": 0}
    repositorio.inserir_diagnostico.assert_called_once()


@patch("src.pipeline.diagnosticar_instagram")
@patch("src.pipeline.diagnosticar_site")
def test_lead_com_checkout_e_descartado(mock_diag_site, mock_diag_ig):
    mock_diag_site.return_value = _diagnostico_site(tem_checkout=True)
    mock_diag_ig.return_value = DiagnosticoInstagram(tem_link_venda=False, ativo_30d=False)

    places_client = _places_client({"papelaria": [{"place_id": "p2", "name": "Loja 2"}]})
    places_client.obter_detalhes.return_value = {
        "place_id": "p2", "name": "Loja 2", "website": "https://loja2.com", "formatted_phone_number": None,
    }
    pagespeed_client = MagicMock()
    pagespeed_client.obter_score_mobile.return_value = 90
    repositorio = MagicMock()

    contagens = executar_pipeline(
        places_client, pagespeed_client, repositorio, "São Paulo", categorias=["papelaria"]
    )

    assert contagens == {"encontrados": 1, "descartados": 1, "gravados": 0, "duplicados": 0}
    repositorio.inserir_lead.assert_not_called()


@patch("src.pipeline.diagnosticar_instagram")
@patch("src.pipeline.diagnosticar_site")
def test_lead_duplicado_nao_grava_diagnostico(mock_diag_site, mock_diag_ig):
    mock_diag_ig.return_value = DiagnosticoInstagram(tem_link_venda=False, ativo_30d=False)

    places_client = _places_client({"papelaria": [{"place_id": "p3", "name": "Loja 3"}]})
    places_client.obter_detalhes.return_value = {
        "place_id": "p3", "name": "Loja 3", "website": None, "formatted_phone_number": None,
    }
    pagespeed_client = MagicMock()
    repositorio = MagicMock()
    repositorio.inserir_lead.return_value = None  # já existia (dedup)

    contagens = executar_pipeline(
        places_client, pagespeed_client, repositorio, "São Paulo", categorias=["papelaria"]
    )

    assert contagens == {"encontrados": 1, "descartados": 0, "gravados": 0, "duplicados": 1}
    repositorio.inserir_diagnostico.assert_not_called()


@patch("src.pipeline.diagnosticar_instagram")
@patch("src.pipeline.diagnosticar_site")
def test_resultado_sem_place_id_e_ignorado(mock_diag_site, mock_diag_ig):
    places_client = _places_client({"papelaria": [{"name": "Sem place id"}]})
    pagespeed_client = MagicMock()
    repositorio = MagicMock()

    contagens = executar_pipeline(
        places_client, pagespeed_client, repositorio, "São Paulo", categorias=["papelaria"]
    )

    assert contagens == {"encontrados": 1, "descartados": 0, "gravados": 0, "duplicados": 0}
    places_client.obter_detalhes.assert_not_called()
