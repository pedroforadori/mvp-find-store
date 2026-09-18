from dataclasses import dataclass
from typing import Optional

import requests

MARCADORES_LINK_VENDA = ["linktr.ee", "linktree", "wa.me/", "shop.instagram", "/loja", "loja.online"]


@dataclass
class DiagnosticoInstagram:
    tem_link_venda: bool
    ativo_30d: bool


def diagnosticar_instagram(handle: Optional[str], session: Optional[requests.Session] = None) -> DiagnosticoInstagram:
    """Heurística best-effort a partir da página pública do perfil.

    O Instagram não expõe de forma confiável, sem login, se houve posts nos
    últimos 30 dias — por isso `ativo_30d` é uma aproximação (perfil público
    e acessível) e deve ser tratada como sinal fraco, não como verdade.
    """
    if not handle:
        return DiagnosticoInstagram(tem_link_venda=False, ativo_30d=False)

    sessao = session or requests.Session()
    url = f"https://www.instagram.com/{handle.lstrip('@')}/"
    try:
        resposta = sessao.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        resposta.raise_for_status()
    except requests.RequestException:
        return DiagnosticoInstagram(tem_link_venda=False, ativo_30d=False)

    html_lower = resposta.text.lower()
    tem_link_venda = any(marcador in html_lower for marcador in MARCADORES_LINK_VENDA)
    return DiagnosticoInstagram(tem_link_venda=tem_link_venda, ativo_30d=True)
