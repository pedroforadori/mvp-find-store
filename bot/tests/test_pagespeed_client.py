from unittest.mock import MagicMock

import requests

from src.pagespeed_client import PageSpeedClient


def test_obter_score_mobile_retorna_score_arredondado():
    session = MagicMock()
    resposta = MagicMock()
    resposta.raise_for_status.return_value = None
    resposta.json.return_value = {
        "lighthouseResult": {"categories": {"performance": {"score": 0.437}}}
    }
    session.get.return_value = resposta

    client = PageSpeedClient(api_key="fake-key", session=session)

    assert client.obter_score_mobile("https://exemplo.com") == 44


def test_obter_score_mobile_retorna_none_em_erro_de_rede():
    session = MagicMock()
    session.get.side_effect = requests.RequestException("timeout")
    client = PageSpeedClient(api_key="fake-key", session=session)

    assert client.obter_score_mobile("https://exemplo.com") is None


def test_obter_score_mobile_retorna_none_quando_resposta_incompleta():
    session = MagicMock()
    resposta = MagicMock()
    resposta.raise_for_status.return_value = None
    resposta.json.return_value = {"lighthouseResult": {}}
    session.get.return_value = resposta
    client = PageSpeedClient(api_key="fake-key", session=session)

    assert client.obter_score_mobile("https://exemplo.com") is None
