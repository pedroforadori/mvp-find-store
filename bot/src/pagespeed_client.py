from typing import Optional

import requests

PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


class PageSpeedClient:
    def __init__(self, api_key: str, session: Optional[requests.Session] = None):
        self._api_key = api_key
        self._session = session or requests.Session()

    def obter_score_mobile(self, url: str) -> Optional[int]:
        """Retorna o score de performance mobile (0-100), ou None se falhar."""
        params = {
            "url": url,
            "key": self._api_key,
            "strategy": "mobile",
            "category": "performance",
        }
        try:
            resposta = self._session.get(PAGESPEED_URL, params=params, timeout=30)
            resposta.raise_for_status()
            dados = resposta.json()
            score = dados["lighthouseResult"]["categories"]["performance"]["score"]
            if score is None:
                return None
            return round(score * 100)
        except (requests.RequestException, KeyError, TypeError, ValueError):
            return None
