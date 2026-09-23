"""Recalcula categoria/score/prioridade dos leads já gravados com as regras atuais.

Uso (de dentro de bot/):
    python recalcular.py            # simulação: só mostra o que mudaria
    python recalcular.py --aplicar  # grava no banco
"""
import argparse
import logging

import psycopg2

from src.config import carregar_config
from src.recalculo import executar_recalculo
from src.supabase_repo import LeadRepository

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--aplicar", action="store_true", help="grava as mudanças (padrão: só simula)")
    args = parser.parse_args()

    config = carregar_config()
    conn = psycopg2.connect(config.supabase_db_url)
    try:
        contagens = executar_recalculo(LeadRepository(conn), aplicar=args.aplicar)
    finally:
        conn.close()

    modo = "APLICADO" if args.aplicar else "SIMULAÇÃO (use --aplicar para gravar)"
    logger.info("%s: %s", modo, contagens)


if __name__ == "__main__":
    main()
