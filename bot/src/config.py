import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    supabase_db_url: str
    google_places_api_key: str
    google_pagespeed_api_key: str
    whatsapp_token: str
    whatsapp_phone_number_id: str
    cidade: str = "São Paulo"
    disparos_por_dia: int = 10


def carregar_config() -> Config:
    return Config(
        supabase_db_url=os.environ["SUPABASE_DB_URL"],
        google_places_api_key=os.environ.get("GOOGLE_PLACES_API_KEY", ""),
        google_pagespeed_api_key=os.environ.get("GOOGLE_PAGESPEED_API_KEY", ""),
        whatsapp_token=os.environ.get("WHATSAPP_TOKEN", ""),
        whatsapp_phone_number_id=os.environ.get("WHATSAPP_PHONE_NUMBER_ID", ""),
        disparos_por_dia=int(os.environ.get("DISPAROS_POR_DIA", "10")),
    )
