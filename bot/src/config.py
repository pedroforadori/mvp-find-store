import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

# 'manual': o bot só descobre/qualifica/grava; o envio é feito pelo número
# pessoal a partir do dashboard. 'cloud_api': disparo automático via
# WhatsApp Cloud API.
MODOS_DISPARO = ("manual", "cloud_api")


@dataclass
class Config:
    supabase_db_url: str
    google_places_api_key: str
    google_pagespeed_api_key: str
    whatsapp_token: str
    whatsapp_phone_number_id: str
    cidade: str = "São Paulo"
    disparos_por_dia: int = 10
    modo_disparo: str = "manual"


def carregar_config() -> Config:
    # `or` em vez de default do .get: no GitHub Actions uma variável não
    # definida (vars.X) chega como string vazia, não como ausente.
    modo_disparo = os.environ.get("MODO_DISPARO") or "manual"
    if modo_disparo not in MODOS_DISPARO:
        raise ValueError(f"MODO_DISPARO inválido: {modo_disparo!r} (use {' ou '.join(MODOS_DISPARO)})")

    return Config(
        supabase_db_url=os.environ["SUPABASE_DB_URL"],
        google_places_api_key=os.environ.get("GOOGLE_PLACES_API_KEY", ""),
        google_pagespeed_api_key=os.environ.get("GOOGLE_PAGESPEED_API_KEY", ""),
        whatsapp_token=os.environ.get("WHATSAPP_TOKEN", ""),
        whatsapp_phone_number_id=os.environ.get("WHATSAPP_PHONE_NUMBER_ID", ""),
        disparos_por_dia=int(os.environ.get("DISPAROS_POR_DIA") or "10"),
        modo_disparo=modo_disparo,
    )
