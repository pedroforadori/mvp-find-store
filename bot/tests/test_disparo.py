from datetime import datetime, timedelta
from unittest.mock import MagicMock

from src.disparo import (
    esgotar_leads,
    executar_disparo,
    leads_para_esgotar,
    leads_para_followup,
    leads_para_primeiro_contato,
)
from src.models import LeadParaContato

AGORA = datetime(2026, 1, 15, 12, 0, 0)


def _lead(**overrides):
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


def test_leads_para_primeiro_contato_busca_por_status_novo():
    repo = MagicMock()
    repo.buscar_leads_por_status.return_value = [_lead()]

    resultado = leads_para_primeiro_contato(repo)

    repo.buscar_leads_por_status.assert_called_once_with("novo")
    assert resultado == [_lead()]


def test_leads_para_followup_filtra_por_tentativas_e_prazo():
    dentro_do_prazo = _lead(id=1, tentativas=1, data_ultimo_contato=AGORA - timedelta(days=4))
    fora_do_prazo = _lead(id=2, tentativas=1, data_ultimo_contato=AGORA - timedelta(days=1))
    ja_no_limite = _lead(id=3, tentativas=2, data_ultimo_contato=AGORA - timedelta(days=4))
    repo = MagicMock()
    repo.buscar_leads_por_status.return_value = [dentro_do_prazo, fora_do_prazo, ja_no_limite]

    resultado = leads_para_followup(repo, AGORA)

    repo.buscar_leads_por_status.assert_called_once_with("contatado")
    assert resultado == [dentro_do_prazo]


def test_leads_para_esgotar_filtra_por_tentativas_e_prazo():
    esgotavel = _lead(id=1, tentativas=2, data_ultimo_contato=AGORA - timedelta(days=4))
    ainda_no_prazo = _lead(id=2, tentativas=2, data_ultimo_contato=AGORA - timedelta(days=1))
    repo = MagicMock()
    repo.buscar_leads_por_status.return_value = [esgotavel, ainda_no_prazo]

    resultado = leads_para_esgotar(repo, AGORA)

    repo.buscar_leads_por_status.assert_called_once_with("aguardando_followup")
    assert resultado == [esgotavel]


def test_esgotar_leads_marca_esgotado_sem_enviar_mensagem():
    """Usado no modo manual: só avança status, sem depender de cliente WhatsApp."""
    esgotavel = _lead(id=1, status="aguardando_followup", tentativas=2, data_ultimo_contato=AGORA - timedelta(days=4))
    ainda_no_prazo = _lead(id=2, status="aguardando_followup", tentativas=2, data_ultimo_contato=AGORA - timedelta(days=1))
    repo = MagicMock()
    repo.buscar_leads_por_status.return_value = [esgotavel, ainda_no_prazo]

    esgotados = esgotar_leads(repo, AGORA)

    assert esgotados == 1
    repo.atualizar_status.assert_called_once_with(1, "esgotado")
    repo.registrar_envio.assert_not_called()


def _repo_vazio():
    repo = MagicMock()
    repo.buscar_leads_por_status.return_value = []
    return repo


def test_executar_disparo_envia_primeiro_contato_para_lead_novo():
    repo = _repo_vazio()
    repo.buscar_leads_por_status.side_effect = lambda status: [_lead()] if status == "novo" else []
    whatsapp = MagicMock()
    whatsapp.enviar_mensagem_interativa.return_value = True

    contagens = executar_disparo(repo, whatsapp, limite_disparos_dia=10, agora=AGORA)

    assert contagens == {"primeiro_contato": 1, "followup": 0, "esgotados": 0}
    whatsapp.enviar_mensagem_interativa.assert_called_once()
    repo.registrar_envio.assert_called_once_with(_lead(), whatsapp.enviar_mensagem_interativa.call_args[0][1], "primeiro_contato", True)


def test_executar_disparo_respeita_limite_diario():
    leads_novos = [_lead(id=i) for i in range(5)]
    repo = _repo_vazio()
    repo.buscar_leads_por_status.side_effect = lambda status: leads_novos if status == "novo" else []
    whatsapp = MagicMock()
    whatsapp.enviar_mensagem_interativa.return_value = True

    contagens = executar_disparo(repo, whatsapp, limite_disparos_dia=2, agora=AGORA)

    assert contagens["primeiro_contato"] == 2
    assert whatsapp.enviar_mensagem_interativa.call_count == 2


def test_executar_disparo_prioriza_followup_sobre_primeiro_contato():
    lead_novo = _lead(id=1, status="novo")
    lead_followup = _lead(id=2, status="contatado", tentativas=1, data_ultimo_contato=AGORA - timedelta(days=4))
    repo = _repo_vazio()
    repo.buscar_leads_por_status.side_effect = lambda status: {
        "novo": [lead_novo],
        "contatado": [lead_followup],
    }.get(status, [])
    whatsapp = MagicMock()
    whatsapp.enviar_mensagem_interativa.return_value = True

    contagens = executar_disparo(repo, whatsapp, limite_disparos_dia=1, agora=AGORA)

    assert contagens == {"primeiro_contato": 0, "followup": 1, "esgotados": 0}


def test_executar_disparo_nao_conta_envio_com_falha():
    repo = _repo_vazio()
    repo.buscar_leads_por_status.side_effect = lambda status: [_lead()] if status == "novo" else []
    whatsapp = MagicMock()
    whatsapp.enviar_mensagem_interativa.return_value = False

    contagens = executar_disparo(repo, whatsapp, limite_disparos_dia=10, agora=AGORA)

    assert contagens == {"primeiro_contato": 0, "followup": 0, "esgotados": 0}
    repo.registrar_envio.assert_called_once()


def test_executar_disparo_respeita_limite_diario_mesmo_com_falhas():
    """O limite diário existe pra controlar volume de tentativas/exposição
    do número (warm-up), não só envios entregues — numa falha sistêmica da
    API (ex: conta restrita), o bot não pode tentar todos os leads elegíveis
    sem limite."""
    leads_novos = [_lead(id=i) for i in range(5)]
    repo = _repo_vazio()
    repo.buscar_leads_por_status.side_effect = lambda status: leads_novos if status == "novo" else []
    whatsapp = MagicMock()
    whatsapp.enviar_mensagem_interativa.return_value = False

    contagens = executar_disparo(repo, whatsapp, limite_disparos_dia=2, agora=AGORA)

    assert contagens == {"primeiro_contato": 0, "followup": 0, "esgotados": 0}
    assert whatsapp.enviar_mensagem_interativa.call_count == 2


def test_executar_disparo_ignora_lead_sem_telefone():
    repo = _repo_vazio()
    repo.buscar_leads_por_status.side_effect = lambda status: [_lead(telefone_normalizado=None)] if status == "novo" else []
    whatsapp = MagicMock()

    contagens = executar_disparo(repo, whatsapp, limite_disparos_dia=10, agora=AGORA)

    assert contagens == {"primeiro_contato": 0, "followup": 0, "esgotados": 0}
    whatsapp.enviar_mensagem_interativa.assert_not_called()


def test_executar_disparo_esgota_sem_consumir_limite_diario():
    lead_esgotavel = _lead(id=1, status="aguardando_followup", tentativas=2, data_ultimo_contato=AGORA - timedelta(days=4))
    lead_novo = _lead(id=2, status="novo")
    repo = _repo_vazio()
    repo.buscar_leads_por_status.side_effect = lambda status: {
        "aguardando_followup": [lead_esgotavel],
        "novo": [lead_novo],
    }.get(status, [])
    whatsapp = MagicMock()
    whatsapp.enviar_mensagem_interativa.return_value = True

    contagens = executar_disparo(repo, whatsapp, limite_disparos_dia=1, agora=AGORA)

    repo.atualizar_status.assert_called_once_with(1, "esgotado")
    assert contagens == {"primeiro_contato": 1, "followup": 0, "esgotados": 1}
