from unittest.mock import MagicMock

import requests

from src.site_diagnostico import diagnosticar_site

HTML_COMPLETO_COM_CHECKOUT = """
<html><head>
<title>Loja da Ana</title>
<meta name="description" content="A melhor papelaria da região">
<meta name="viewport" content="width=device-width">
</head>
<body>
<a href="https://instagram.com/lojadaana">Instagram</a>
<a href="https://wa.me/5511987654321">Fale conosco</a>
<button>Adicionar ao carrinho</button>
</body></html>
"""

HTML_INSTITUCIONAL_SEM_VIEWPORT = """
<html><head><title>Empresa X</title></head>
<body><p>Bem-vindo ao nosso site institucional.</p></body></html>
"""


def _resposta(html, url="https://exemplo.com"):
    resp = MagicMock()
    resp.text = html
    resp.url = url
    resp.raise_for_status.return_value = None
    return resp


def test_diagnostico_site_com_checkout_e_whatsapp_e_instagram():
    session = MagicMock()
    session.get.return_value = _resposta(HTML_COMPLETO_COM_CHECKOUT)

    resultado = diagnosticar_site("https://exemplo.com", session=session)

    assert resultado.tem_ssl is True
    assert resultado.tem_meta_tags is True
    assert resultado.tecnologia_desatualizada is False
    assert resultado.tem_botao_whatsapp is True
    assert resultado.tem_checkout is True
    assert resultado.instagram_handle == "lojadaana"
    assert resultado.site_quebrado is False


def test_diagnostico_site_institucional_sem_viewport_e_sem_meta_description():
    session = MagicMock()
    session.get.return_value = _resposta(HTML_INSTITUCIONAL_SEM_VIEWPORT)

    resultado = diagnosticar_site("https://exemplo.com", session=session)

    assert resultado.tem_meta_tags is False
    assert resultado.tecnologia_desatualizada is True
    assert resultado.tem_botao_whatsapp is False
    assert resultado.tem_checkout is False
    assert resultado.instagram_handle is None


def test_diagnostico_site_offline_marca_site_quebrado():
    session = MagicMock()
    session.get.side_effect = requests.RequestException("connection refused")

    resultado = diagnosticar_site("https://site-fora-do-ar.com", session=session)

    assert resultado.site_quebrado is True
    assert resultado.tem_meta_tags is None
    assert resultado.tem_checkout is False


def test_diagnostico_detecta_tecnologia_conhecida():
    html = "<html><head><title>Loja</title></head><body><script src='https://cdn.shopify.com/x.js'></script></body></html>"
    session = MagicMock()
    session.get.return_value = _resposta(html)

    resultado = diagnosticar_site("https://exemplo.com", session=session)

    assert resultado.tecnologia_detectada == "Shopify"
