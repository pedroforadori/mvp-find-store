"""Exclui os leads que ainda estão com status 'descartado' (de antes da
exclusão automática), bloqueando place_id/telefone para o bot não
redescobri-los. Requer a migration 0002_descarte_exclui_lead.sql aplicada.

Uso (de dentro de bot/):
    python limpar_descartados.py            # simulação: só mostra quantos sairiam
    python limpar_descartados.py --aplicar  # exclui do banco
"""
import argparse
import logging

import psycopg2

from src.config import carregar_config
from src.limpeza import limpar_descartados
from src.supabase_repo import LeadRepository

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--aplicar", action="store_true", help="exclui do banco (padrão: só simula)")
    args = parser.parse_args()

    config = carregar_config()
    conn = psycopg2.connect(config.supabase_db_url)
    try:
        contagens = limpar_descartados(LeadRepository(conn), aplicar=args.aplicar)
    finally:
        conn.close()

    modo = "APLICADO" if args.aplicar else "SIMULAÇÃO (use --aplicar para excluir)"
    logger.info("%s: %s", modo, contagens)


if __name__ == "__main__":
    main()
