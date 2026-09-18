import time
from typing import Iterator, List, Optional

import requests

TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

# Google exige um pequeno atraso antes que um next_page_token fique válido.
ATRASO_PROXIMA_PAGINA_SEGUNDOS = 2


class GooglePlacesClient:
    def __init__(self, api_key: str, session: Optional[requests.Session] = None,
                 sleep_fn=time.sleep):
        self._api_key = api_key
        self._session = session or requests.Session()
        self._sleep = sleep_fn

    def buscar_lojas(self, query: str, cidade: str, max_paginas: int = 3) -> Iterator[dict]:
        """Busca lojas via Text Search, seguindo paginação (até max_paginas)."""
        params = {"query": f"{query} em {cidade}", "key": self._api_key}
        paginas = 0

        while True:
            resposta = self._session.get(TEXT_SEARCH_URL, params=params, timeout=10)
            resposta.raise_for_status()
            dados = resposta.json()

            for resultado in dados.get("results", []):
                yield resultado

            paginas += 1
            next_token = dados.get("next_page_token")
            if not next_token or paginas >= max_paginas:
                break

            self._sleep(ATRASO_PROXIMA_PAGINA_SEGUNDOS)
            params = {"pagetoken": next_token, "key": self._api_key}

    def obter_detalhes(self, place_id: str) -> dict:
        params = {
            "place_id": place_id,
            "fields": "name,formatted_phone_number,website,formatted_address",
            "key": self._api_key,
        }
        resposta = self._session.get(DETAILS_URL, params=params, timeout=10)
        resposta.raise_for_status()
        return resposta.json().get("result", {})


CATEGORIAS_BUSCA_PADRAO: List[str] = [
    "loja de roupas",
    "loja de calçados",
    "papelaria",
    "loja de presentes",
    "pet shop",
    "loja de móveis",
    "loja de eletrônicos",
    "mercearia",
]
