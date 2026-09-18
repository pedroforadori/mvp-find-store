from datetime import datetime, timedelta
from typing import List

from .mensagens import montar_mensagem_followup, montar_mensagem_primeiro_contato
from .models import LeadParaContato

DIAS_ENTRE_FOLLOWUP = 3
MAX_TENTATIVAS = 2


def leads_para_primeiro_contato(repositorio) -> List[LeadParaContato]:
    return repositorio.buscar_leads_por_status("novo")


def leads_para_followup(repositorio, agora: datetime) -> List[LeadParaContato]:
    limite = agora - timedelta(days=DIAS_ENTRE_FOLLOWUP)
    candidatos = repositorio.buscar_leads_por_status("contatado")
    return [
        lead
        for lead in candidatos
        if lead.tentativas < MAX_TENTATIVAS and lead.data_ultimo_contato and lead.data_ultimo_contato <= limite
    ]


def leads_para_esgotar(repositorio, agora: datetime) -> List[LeadParaContato]:
    limite = agora - timedelta(days=DIAS_ENTRE_FOLLOWUP)
    candidatos = repositorio.buscar_leads_por_status("aguardando_followup")
    return [
        lead
        for lead in candidatos
        if lead.tentativas >= MAX_TENTATIVAS and lead.data_ultimo_contato and lead.data_ultimo_contato <= limite
    ]


def executar_disparo(repositorio, whatsapp_client, limite_disparos_dia: int,
                      agora: datetime = None) -> dict:
    """Roda o ciclo diário de disparo: esgota quem já bateu o teto, envia
    follow-up para quem está no prazo e faz o 1º contato de leads novos,
    respeitando o limite diário do plano de warm-up.
    """
    agora = agora or datetime.utcnow()
    contagens = {"primeiro_contato": 0, "followup": 0, "esgotados": 0}

    for lead in leads_para_esgotar(repositorio, agora):
        repositorio.atualizar_status(lead.id, "esgotado")
        contagens["esgotados"] += 1

    fila = [("followup", lead) for lead in leads_para_followup(repositorio, agora)]
    fila += [("primeiro_contato", lead) for lead in leads_para_primeiro_contato(repositorio)]

    enviados = 0
    for tipo, lead in fila:
        if enviados >= limite_disparos_dia:
            break
        if not lead.telefone_normalizado:
            continue

        mensagem = montar_mensagem_followup(lead) if tipo == "followup" else montar_mensagem_primeiro_contato(lead)
        sucesso = whatsapp_client.enviar_mensagem_interativa(lead.telefone_normalizado, mensagem)
        repositorio.registrar_envio(lead, mensagem, tipo, sucesso)

        if sucesso:
            enviados += 1
            contagens[tipo] += 1

    return contagens
