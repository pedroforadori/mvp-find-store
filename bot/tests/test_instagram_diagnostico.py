from unittest.mock import MagicMock

import requests

from src.instagram_diagnostico import diagnosticar_instagram


def _resposta(html):
    resp = MagicMock()
    resp.text = html
    resp.raise_for_status.return_value = None
    return resp


def test_sem_handle_retorna_sinais_negativos():
    resultado = diagnosticar_instagram(None)

    assert resultado.tem_link_venda is False
    assert resultado.ativo_30d is False


def test_perfil_com_link_de_venda_na_bio():
    session = MagicMock()
    session.get.return_value = _resposta("<html>bio: linktr.ee/lojadaana</html>")

    resultado = diagnosticar_instagram("lojadaana", session=session)

    assert resultado.tem_link_venda is True
    assert resultado.ativo_30d is True


def test_perfil_sem_link_de_venda():
    session = MagicMock()
    session.get.return_value = _resposta("<html>bio sem links</html>")

    resultado = diagnosticar_instagram("lojadaana", session=session)

    assert resultado.tem_link_venda is False
    assert resultado.ativo_30d is True


def test_perfil_inacessivel_retorna_sinais_negativos():
    session = MagicMock()
    session.get.side_effect = requests.RequestException("blocked")

    resultado = diagnosticar_instagram("lojadaana", session=session)

    assert resultado.tem_link_venda is False
    assert resultado.ativo_30d is False
