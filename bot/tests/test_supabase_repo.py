from datetime import datetime
from unittest.mock import MagicMock

import psycopg2.errors
import pytest

from src.models import Lead, LeadParaContato, SinaisLead
from src.supabase_repo import LeadRepository


def _lead(**overrides):
    base = dict(
        place_id="place-123",
        telefone_normalizado="+5511987654321",
        nome_loja="Loja Teste",
        nicho="papelaria",
        endereco="Rua Teste, 123",
        instagram_handle=None,
        site_url=None,
        categoria="sem_site",
        score=30,
        prioridade="baixa",
        sinais=SinaisLead(tem_site=False),
    )
    base.update(overrides)
    return Lead(**base)


def _mock_conn(fetchone_retorno):
    conn = MagicMock()
    cursor = MagicMock()
    cursor.fetchone.return_value = fetchone_retorno
    conn.cursor.return_value.__enter__.return_value = cursor
    return conn, cursor


def test_inserir_lead_novo_retorna_id_e_usa_conflict_por_place_id():
    conn, cursor = _mock_conn((42,))
    repo = LeadRepository(conn)

    lead_id = repo.inserir_lead(_lead())

    assert lead_id == 42
    query_executada = cursor.execute.call_args[0][0]
    assert "ON CONFLICT (place_id)" in query_executada
    conn.commit.assert_called_once()


def test_inserir_lead_duplicado_retorna_none():
    conn, _ = _mock_conn(None)
    repo = LeadRepository(conn)

    lead_id = repo.inserir_lead(_lead())

    assert lead_id is None


def test_inserir_lead_sem_place_id_usa_conflict_por_telefone():
    conn, cursor = _mock_conn((7,))
    repo = LeadRepository(conn)

    lead_id = repo.inserir_lead(_lead(place_id=None))

    assert lead_id == 7
    query_executada = cursor.execute.call_args[0][0]
    assert "ON CONFLICT (telefone_normalizado)" in query_executada


def test_inserir_lead_sem_place_id_nem_telefone_levanta_erro():
    conn, _ = _mock_conn((1,))
    repo = LeadRepository(conn)

    with pytest.raises(ValueError):
        repo.inserir_lead(_lead(place_id=None, telefone_normalizado=None))


def test_inserir_lead_com_place_id_novo_mas_telefone_ja_existente_retorna_none():
    """place_id não colide (ON CONFLICT não é acionado), mas telefone_normalizado
    também é UNIQUE no schema — a UniqueViolation dessa outra coluna deve ser
    tratada como duplicata (mesmo comportamento de ON CONFLICT DO NOTHING),
    não deixar a exceção propagar e derrubar o pipeline."""
    conn = MagicMock()
    cursor = MagicMock()
    cursor.execute.side_effect = psycopg2.errors.UniqueViolation(
        'duplicate key value violates unique constraint "leads_telefone_normalizado_key"'
    )
    conn.cursor.return_value.__enter__.return_value = cursor
    repo = LeadRepository(conn)

    lead_id = repo.inserir_lead(_lead())

    assert lead_id is None
    conn.rollback.assert_called_once()
    conn.commit.assert_not_called()


def test_inserir_diagnostico_grava_campos_da_leads_diagnostico():
    conn, cursor = _mock_conn(None)
    repo = LeadRepository(conn)
    lead = _lead(
        sinais=SinaisLead(
            tem_site=True,
            tem_ssl=True,
            pagespeed_mobile=80,
            tem_meta_tags=True,
            tecnologia_detectada="WordPress",
            tem_botao_whatsapp=False,
            instagram_ativo_30d=True,
            tem_checkout=False,
        )
    )

    repo.inserir_diagnostico(99, lead)

    params = cursor.execute.call_args[0][1]
    assert params["lead_id"] == 99
    assert params["tecnologia_detectada"] == "WordPress"
    assert params["tem_botao_whatsapp"] is False
    conn.commit.assert_called_once()


def _mock_conn_fetchall(fetchall_retorno):
    conn = MagicMock()
    cursor = MagicMock()
    cursor.fetchall.return_value = fetchall_retorno
    conn.cursor.return_value.__enter__.return_value = cursor
    return conn, cursor


def test_buscar_leads_por_status_mapeia_linhas_para_lead_para_contato():
    agora = datetime(2026, 1, 15, 12, 0, 0)
    conn, cursor = _mock_conn_fetchall([(1, "+5511987654321", "Loja Teste", "sem_site", "novo", 0, None)])
    repo = LeadRepository(conn)

    resultado = repo.buscar_leads_por_status("novo")

    params = cursor.execute.call_args[0][1]
    assert params == {"status": "novo"}
    assert resultado == [
        LeadParaContato(
            id=1,
            telefone_normalizado="+5511987654321",
            nome_loja="Loja Teste",
            categoria="sem_site",
            status="novo",
            tentativas=0,
            data_ultimo_contato=None,
        )
    ]


def test_atualizar_status_executa_update_e_commit():
    conn, cursor = _mock_conn_fetchall([])
    repo = LeadRepository(conn)

    repo.atualizar_status(5, "esgotado")

    params = cursor.execute.call_args[0][1]
    assert params == {"status": "esgotado", "id": 5}
    conn.commit.assert_called_once()


def _lead_para_contato(**overrides):
    base = dict(
        id=1,
        telefone_normalizado="+5511987654321",
        nome_loja="Loja Teste",
        categoria="sem_site",
        status="novo",
        tentativas=0,
        data_ultimo_contato=None,
    )
    base.update(overrides)
    return LeadParaContato(**base)


def test_registrar_envio_com_sucesso_grava_historico_e_avanca_status_primeiro_contato():
    conn, cursor = _mock_conn_fetchall([])
    repo = LeadRepository(conn)

    repo.registrar_envio(_lead_para_contato(), "Olá!", "primeiro_contato", True)

    queries = [call[0][0] for call in cursor.execute.call_args_list]
    assert any("INSERT INTO historico_contatos" in q for q in queries)
    assert any("data_primeiro_contato" in q for q in queries)
    conn.commit.assert_called_once()


def test_registrar_envio_com_sucesso_de_followup_atualiza_para_aguardando_followup():
    conn, cursor = _mock_conn_fetchall([])
    repo = LeadRepository(conn)

    repo.registrar_envio(_lead_para_contato(), "Olá de novo!", "followup", True)

    ultima_query_update = [c for c in cursor.execute.call_args_list if "UPDATE leads" in c[0][0]][-1]
    assert ultima_query_update[0][1]["status"] == "aguardando_followup"


def test_registrar_envio_com_falha_nao_atualiza_status_do_lead():
    conn, cursor = _mock_conn_fetchall([])
    repo = LeadRepository(conn)

    repo.registrar_envio(_lead_para_contato(), "Olá!", "primeiro_contato", False)

    queries = [call[0][0] for call in cursor.execute.call_args_list]
    assert not any("UPDATE leads" in q for q in queries)
    params_historico = cursor.execute.call_args_list[0][0][1]
    assert params_historico["resultado"] == "falhou"


def test_buscar_leads_para_recalculo_mapeia_join_com_diagnostico():
    linha = (1, "place-1", "+5511987654321", "Loja", "papelaria", "São Paulo", None,
             "https://loja.com.br", None, "sem_site", 30, "baixa", "novo", 45)
    conn, _ = _mock_conn_fetchall([linha])
    repo = LeadRepository(conn)

    [registro] = repo.buscar_leads_para_recalculo()

    assert registro.id == 1
    assert registro.site_url == "https://loja.com.br"
    assert registro.pagespeed_mobile == 45


def test_atualizar_recalculo_grava_lead_e_upsert_do_diagnostico_na_mesma_transacao():
    conn, cursor = _mock_conn_fetchall([])
    repo = LeadRepository(conn)

    repo.atualizar_recalculo(5, _lead(categoria="descartado", score=0), descartar_se_novo=True)

    [(update_sql, update_params), (diag_sql, diag_params)] = [c[0] for c in cursor.execute.call_args_list]
    assert "UPDATE leads" in update_sql and "status = 'novo' THEN 'descartado'" in update_sql
    assert update_params["id"] == 5 and update_params["descartar_se_novo"] is True
    assert "ON CONFLICT (lead_id) DO UPDATE" in diag_sql
    assert diag_params["lead_id"] == 5
    conn.commit.assert_called_once()
