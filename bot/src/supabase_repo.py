from typing import Optional

from .models import Lead

_INSERT_LEAD_BASE = """
    INSERT INTO leads (
        place_id, telefone_normalizado, nome_loja, nicho, cidade, endereco,
        instagram_handle, site_url, categoria, score, prioridade
    ) VALUES (
        %(place_id)s, %(telefone_normalizado)s, %(nome_loja)s, %(nicho)s, %(cidade)s,
        %(endereco)s, %(instagram_handle)s, %(site_url)s, %(categoria)s, %(score)s,
        %(prioridade)s
    )
    ON CONFLICT ({conflict_target}) DO NOTHING
    RETURNING id
"""

_INSERT_DIAGNOSTICO = """
    INSERT INTO leads_diagnostico (
        lead_id, tem_ssl, pagespeed_mobile, tem_meta_tags, tecnologia_detectada,
        tem_botao_whatsapp, instagram_ativo_30d, tem_checkout
    ) VALUES (
        %(lead_id)s, %(tem_ssl)s, %(pagespeed_mobile)s, %(tem_meta_tags)s,
        %(tecnologia_detectada)s, %(tem_botao_whatsapp)s, %(instagram_ativo_30d)s,
        %(tem_checkout)s
    )
"""


class LeadRepository:
    """Camada de acesso ao Supabase para gravação de leads (bot Python).

    Recebe uma conexão psycopg2 já aberta para facilitar testes com mocks —
    nenhum teste desta camada deve abrir conexão real com o banco.
    """

    def __init__(self, conn):
        self._conn = conn

    def inserir_lead(self, lead: Lead) -> Optional[int]:
        if lead.place_id:
            conflict_target = "place_id"
        elif lead.telefone_normalizado:
            conflict_target = "telefone_normalizado"
        else:
            raise ValueError("Lead precisa de place_id ou telefone_normalizado para dedup")

        query = _INSERT_LEAD_BASE.format(conflict_target=conflict_target)
        params = {
            "place_id": lead.place_id,
            "telefone_normalizado": lead.telefone_normalizado,
            "nome_loja": lead.nome_loja,
            "nicho": lead.nicho,
            "cidade": lead.cidade,
            "endereco": lead.endereco,
            "instagram_handle": lead.instagram_handle,
            "site_url": lead.site_url,
            "categoria": lead.categoria,
            "score": lead.score,
            "prioridade": lead.prioridade,
        }

        with self._conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
        self._conn.commit()

        if row is None:
            return None
        return row[0]

    def inserir_diagnostico(self, lead_id: int, lead: Lead) -> None:
        sinais = lead.sinais
        params = {
            "lead_id": lead_id,
            "tem_ssl": sinais.tem_ssl,
            "pagespeed_mobile": sinais.pagespeed_mobile,
            "tem_meta_tags": sinais.tem_meta_tags,
            "tecnologia_detectada": sinais.tecnologia_detectada,
            "tem_botao_whatsapp": sinais.tem_botao_whatsapp,
            "instagram_ativo_30d": sinais.instagram_ativo_30d,
            "tem_checkout": sinais.tem_checkout,
        }
        with self._conn.cursor() as cur:
            cur.execute(_INSERT_DIAGNOSTICO, params)
        self._conn.commit()
