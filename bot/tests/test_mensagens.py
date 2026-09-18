from dataclasses import dataclass

from src.mensagens import montar_mensagem_followup, montar_mensagem_primeiro_contato


@dataclass
class _LeadFake:
    nome_loja: str
    categoria: str


def test_mensagem_sem_site_menciona_o_nome_da_loja():
    mensagem = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Papelaria Ana", categoria="sem_site"))
    assert "Papelaria Ana" in mensagem


def test_mensagem_varia_por_categoria():
    msg_sem_site = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Loja X", categoria="sem_site"))
    msg_institucional = montar_mensagem_primeiro_contato(
        _LeadFake(nome_loja="Loja X", categoria="site_institucional")
    )
    assert msg_sem_site != msg_institucional


def test_categoria_desconhecida_usa_template_padrao():
    mensagem = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Loja X", categoria="categoria_inexistente"))
    esperado = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Loja X", categoria="sem_site"))
    assert mensagem == esperado


def test_mensagem_de_followup_menciona_o_nome_da_loja():
    mensagem = montar_mensagem_followup(_LeadFake(nome_loja="Loja Y", categoria="sem_site"))
    assert "Loja Y" in mensagem
