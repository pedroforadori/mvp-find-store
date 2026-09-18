from typing import List, Optional, Tuple

import requests

GRAPH_API_VERSION = "v20.0"

# IDs precisam ficar em sincronia com backend/src/whatsapp/whatsapp.service.ts,
# que é quem interpreta o clique do botão recebido no webhook.
BOTAO_QUERO_SABER_MAIS = ("quero_saber_mais", "Quero saber mais")
BOTAO_FALAR_DEPOIS = ("falar_depois", "Fale comigo depois")
BOTAO_NAO_TENHO_INTERESSE = ("nao_tenho_interesse", "Não tenho interesse")

BOTOES_PADRAO: List[Tuple[str, str]] = [BOTAO_QUERO_SABER_MAIS, BOTAO_FALAR_DEPOIS, BOTAO_NAO_TENHO_INTERESSE]


class WhatsAppClient:
    def __init__(self, token: str, phone_number_id: str, session: Optional[requests.Session] = None):
        self._token = token
        self._phone_number_id = phone_number_id
        self._session = session or requests.Session()

    def enviar_mensagem_interativa(
        self, telefone_e164: str, corpo: str, botoes: Optional[List[Tuple[str, str]]] = None
    ) -> bool:
        """Envia mensagem com botões interativos. Retorna True se a API aceitou o envio."""
        botoes = botoes or BOTOES_PADRAO
        url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{self._phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": telefone_e164.lstrip("+"),
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": corpo},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": id_botao, "title": titulo}}
                        for id_botao, titulo in botoes
                    ]
                },
            },
        }
        headers = {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}

        try:
            resposta = self._session.post(url, json=payload, headers=headers, timeout=15)
            resposta.raise_for_status()
            return True
        except requests.RequestException:
            return False
