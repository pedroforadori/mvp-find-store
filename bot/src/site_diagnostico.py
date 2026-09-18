import re
from dataclasses import dataclass
from typing import Optional

import requests
from bs4 import BeautifulSoup

_REGEX_INSTAGRAM = re.compile(r"instagram\.com/([a-zA-Z0-9_.]+)", re.IGNORECASE)
_SEGMENTOS_IGNORADOS = {"p", "reel", "reels", "stories", "explore", "accounts", "tv"}

TECNOLOGIAS_ECOMMERCE = {
    "cdn.shopify.com": "Shopify",
    "vteximg.com.br": "VTEX",
    "vtexassets.com": "VTEX",
    "cdn.nuvemshop.com.br": "Nuvemshop/Tiendanube",
    "woocommerce": "WooCommerce",
    "wp-content": "WordPress",
    "cdn.shoppub.io": "Shoppub",
}

PALAVRAS_CHECKOUT = [
    "adicionar ao carrinho",
    "finalizar compra",
    "meu carrinho",
    "carrinho de compras",
    "ir para o checkout",
]

PALAVRAS_CATALOGO = [
    "nossos produtos",
    "nossa loja",
    "ver produto",
    "comprar agora",
]


@dataclass
class DiagnosticoSite:
    tem_ssl: Optional[bool]
    tem_meta_tags: Optional[bool]
    tecnologia_detectada: Optional[str]
    tecnologia_desatualizada: bool
    tem_botao_whatsapp: bool
    tem_checkout: bool
    tem_catalogo_produtos: bool
    site_quebrado: bool
    instagram_handle: Optional[str]


def _extrair_instagram_handle(html: str) -> Optional[str]:
    match = _REGEX_INSTAGRAM.search(html)
    if not match:
        return None
    handle = match.group(1).strip("/.")
    if not handle or handle.lower() in _SEGMENTOS_IGNORADOS:
        return None
    return handle


def _detectar_tecnologia(html_lower: str) -> Optional[str]:
    for marcador, nome in TECNOLOGIAS_ECOMMERCE.items():
        if marcador in html_lower:
            return nome
    return None


def diagnosticar_site(url: str, session: Optional[requests.Session] = None) -> DiagnosticoSite:
    """Baixa a home do site e extrai sinais usados no scoring/qualificação.

    Em caso de falha de rede (timeout, DNS, 4xx/5xx), marca `site_quebrado`
    e retorna os demais campos como indisponíveis, sem levantar exceção —
    um site fora do ar é, em si, um sinal de qualificação válido.
    """
    sessao = session or requests.Session()
    try:
        resposta = sessao.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        resposta.raise_for_status()
    except requests.RequestException:
        return DiagnosticoSite(
            tem_ssl=url.strip().lower().startswith("https://"),
            tem_meta_tags=None,
            tecnologia_detectada=None,
            tecnologia_desatualizada=False,
            tem_botao_whatsapp=False,
            tem_checkout=False,
            tem_catalogo_produtos=False,
            site_quebrado=True,
            instagram_handle=None,
        )

    html = resposta.text
    html_lower = html.lower()
    soup = BeautifulSoup(html, "html.parser")

    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    meta_description = soup.find("meta", attrs={"name": "description"})
    descricao = (meta_description.get("content") or "").strip() if meta_description else ""
    tem_meta_tags = bool(title) and bool(descricao)

    tem_viewport = soup.find("meta", attrs={"name": "viewport"}) is not None

    tecnologia_detectada = _detectar_tecnologia(html_lower)

    return DiagnosticoSite(
        tem_ssl=resposta.url.strip().lower().startswith("https://"),
        tem_meta_tags=tem_meta_tags,
        tecnologia_detectada=tecnologia_detectada,
        tecnologia_desatualizada=not tem_viewport,
        tem_botao_whatsapp=("wa.me/" in html_lower or "api.whatsapp.com/send" in html_lower),
        tem_checkout=any(p in html_lower for p in PALAVRAS_CHECKOUT),
        tem_catalogo_produtos=any(p in html_lower for p in PALAVRAS_CATALOGO),
        site_quebrado=False,
        instagram_handle=_extrair_instagram_handle(html),
    )
