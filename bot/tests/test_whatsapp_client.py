from unittest.mock import MagicMock

import requests

from src.whatsapp_client import BOTAO_NAO_TENHO_INTERESSE, WhatsAppClient


def test_enviar_mensagem_interativa_monta_payload_correto():
    session = MagicMock()
    resposta = MagicMock()
    resposta.raise_for_status.return_value = None
    session.post.return_value = resposta

    client = WhatsAppClient(token="fake-token", phone_number_id="123456", session=session)
    sucesso = client.enviar_mensagem_interativa("+5511987654321", "Olá!")

    assert sucesso is True
    _, kwargs = session.post.call_args
    assert kwargs["json"]["to"] == "5511987654321"
    assert kwargs["json"]["interactive"]["body"]["text"] == "Olá!"
    ids_botoes = [b["reply"]["id"] for b in kwargs["json"]["interactive"]["action"]["buttons"]]
    assert ids_botoes == ["quero_saber_mais", "falar_depois", "nao_tenho_interesse"]
    assert kwargs["headers"]["Authorization"] == "Bearer fake-token"


def test_enviar_mensagem_interativa_permite_botoes_customizados():
    session = MagicMock()
    resposta = MagicMock()
    resposta.raise_for_status.return_value = None
    session.post.return_value = resposta

    client = WhatsAppClient(token="fake-token", phone_number_id="123456", session=session)
    client.enviar_mensagem_interativa("+5511987654321", "Olá!", botoes=[BOTAO_NAO_TENHO_INTERESSE])

    _, kwargs = session.post.call_args
    assert len(kwargs["json"]["interactive"]["action"]["buttons"]) == 1


def test_enviar_mensagem_interativa_retorna_false_em_erro_de_rede():
    session = MagicMock()
    session.post.side_effect = requests.RequestException("timeout")

    client = WhatsAppClient(token="fake-token", phone_number_id="123456", session=session)
    sucesso = client.enviar_mensagem_interativa("+5511987654321", "Olá!")

    assert sucesso is False


def test_enviar_mensagem_interativa_retorna_false_em_resposta_de_erro():
    session = MagicMock()
    resposta = MagicMock()
    resposta.raise_for_status.side_effect = requests.HTTPError("400")
    session.post.return_value = resposta

    client = WhatsAppClient(token="fake-token", phone_number_id="123456", session=session)
    sucesso = client.enviar_mensagem_interativa("+5511987654321", "Olá!")

    assert sucesso is False
