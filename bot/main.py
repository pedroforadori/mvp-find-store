import logging

import psycopg2

from src.config import carregar_config
from src.disparo import executar_disparo
from src.pagespeed_client import PageSpeedClient
from src.pipeline import executar_pipeline
from src.places_client import GooglePlacesClient
from src.supabase_repo import LeadRepository
from src.whatsapp_client import WhatsAppClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    config = carregar_config()

    places_client = GooglePlacesClient(config.google_places_api_key)
    pagespeed_client = PageSpeedClient(config.google_pagespeed_api_key)

    whatsapp_client = WhatsAppClient(config.whatsapp_token, config.whatsapp_phone_number_id)

    conn = psycopg2.connect(config.supabase_db_url)
    try:
        repositorio = LeadRepository(conn)

        contagens_descoberta = executar_pipeline(places_client, pagespeed_client, repositorio, config.cidade)
        logger.info("Descoberta concluída: %s", contagens_descoberta)

        contagens_disparo = executar_disparo(repositorio, whatsapp_client, config.disparos_por_dia)
        logger.info("Disparo concluído: %s", contagens_disparo)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
