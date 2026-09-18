from unittest.mock import MagicMock

import pytest

from src.models import Lead, SinaisLead
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
