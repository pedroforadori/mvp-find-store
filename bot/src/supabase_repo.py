from typing import List, Optional

from .models import Lead, LeadParaContato

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

_SELECT_LEADS_POR_STATUS = """
    SELECT id, telefone_normalizado, nome_loja, categoria, status, tentativas, data_ultimo_contato
    FROM leads
    WHERE status = %(status)s
"""

_UPDATE_STATUS = """
    UPDATE leads SET status = %(status)s, atualizado_em = now() WHERE id = %(id)s
"""

_INSERT_HISTORICO = """
    INSERT INTO historico_contatos (lead_id, canal, mensagem_enviada, resultado)
    VALUES (%(lead_id)s, 'whatsapp', %(mensagem)s, %(resultado)s)
"""

_UPDATE_PRIMEIRO_CONTATO = """
    UPDATE leads
    SET status = %(status)s, tentativas = tentativas + 1,
        data_primeiro_contato = COALESCE(data_primeiro_contato, now()),
        data_ultimo_contato = now(), atualizado_em = now()
    WHERE id = %(id)s
"""

_UPDATE_FOLLOWUP = """
    UPDATE leads
    SET status = %(status)s, tentativas = tentativas + 1,
        data_ultimo_contato = now(), atualizado_em = now()
    WHERE id = %(id)s
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

    def buscar_leads_por_status(self, status: str) -> List[LeadParaContato]:
        with self._conn.cursor() as cur:
            cur.execute(_SELECT_LEADS_POR_STATUS, {"status": status})
            rows = cur.fetchall()
        return [
            LeadParaContato(
                id=row[0],
                telefone_normalizado=row[1],
                nome_loja=row[2],
                categoria=row[3],
                status=row[4],
                tentativas=row[5],
                data_ultimo_contato=row[6],
            )
            for row in rows
        ]

    def atualizar_status(self, lead_id: int, status: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute(_UPDATE_STATUS, {"status": status, "id": lead_id})
        self._conn.commit()

    def registrar_envio(self, lead: LeadParaContato, mensagem: str, tipo: str, sucesso: bool) -> None:
        """Grava o histórico de contato e, se enviado com sucesso, avança o status do lead.

        Em caso de falha de envio não avançamos tentativas/status — o lead volta a
        ser candidato na próxima execução do pipeline, em vez de "queimar" uma
        tentativa por um erro transitório da API do WhatsApp.
        """
        resultado = "entregue" if sucesso else "falhou"
        with self._conn.cursor() as cur:
            cur.execute(_INSERT_HISTORICO, {"lead_id": lead.id, "mensagem": mensagem, "resultado": resultado})

            if sucesso:
                if tipo == "primeiro_contato":
                    cur.execute(_UPDATE_PRIMEIRO_CONTATO, {"status": "contatado", "id": lead.id})
                else:
                    cur.execute(_UPDATE_FOLLOWUP, {"status": "aguardando_followup", "id": lead.id})
        self._conn.commit()
