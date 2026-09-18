from unittest.mock import MagicMock

from src.places_client import GooglePlacesClient


def _resposta(json_data, status_ok=True):
    resp = MagicMock()
    resp.json.return_value = json_data
    resp.raise_for_status.return_value = None
    return resp


def test_buscar_lojas_sem_paginacao():
    session = MagicMock()
    session.get.return_value = _resposta({"results": [{"place_id": "a"}, {"place_id": "b"}]})
    client = GooglePlacesClient(api_key="fake-key", session=session)

    resultados = list(client.buscar_lojas("papelaria", "São Paulo"))

    assert [r["place_id"] for r in resultados] == ["a", "b"]
    session.get.assert_called_once()


def test_buscar_lojas_segue_paginacao_ate_max_paginas():
    session = MagicMock()
    pagina1 = _resposta({"results": [{"place_id": "a"}], "next_page_token": "tok1"})
    pagina2 = _resposta({"results": [{"place_id": "b"}]})
    session.get.side_effect = [pagina1, pagina2]
    sleep_fn = MagicMock()

    client = GooglePlacesClient(api_key="fake-key", session=session, sleep_fn=sleep_fn)
    resultados = list(client.buscar_lojas("papelaria", "São Paulo", max_paginas=3))

    assert [r["place_id"] for r in resultados] == ["a", "b"]
    sleep_fn.assert_called_once()


def test_buscar_lojas_respeita_limite_max_paginas():
    session = MagicMock()
    pagina_com_token = _resposta({"results": [{"place_id": "a"}], "next_page_token": "tok1"})
    session.get.return_value = pagina_com_token

    client = GooglePlacesClient(api_key="fake-key", session=session, sleep_fn=MagicMock())
    resultados = list(client.buscar_lojas("papelaria", "São Paulo", max_paginas=1))

    assert len(resultados) == 1
    session.get.assert_called_once()


def test_obter_detalhes_retorna_result():
    session = MagicMock()
    session.get.return_value = _resposta({"result": {"name": "Loja X", "website": "https://x.com"}})
    client = GooglePlacesClient(api_key="fake-key", session=session)

    detalhes = client.obter_detalhes("place-123")

    assert detalhes["name"] == "Loja X"
    assert detalhes["website"] == "https://x.com"
