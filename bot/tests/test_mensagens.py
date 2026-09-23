from dataclasses import dataclass
from typing import Optional

import pytest

from src.mensagens import extrair_bairro, montar_mensagem_followup, montar_mensagem_primeiro_contato


@dataclass
class _LeadFake:
    nome_loja: str
    categoria: str = "sem_site"
    nicho: Optional[str] = "loja de calçados"
    endereco: Optional[str] = "R. Teodoro Sampaio, 1806 - Pinheiros, São Paulo - SP, 05405-150, Brazil"
    cidade: str = "São Paulo"


def test_primeiro_contato_com_remetente_loja_nicho_e_bairro():
    mensagem = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Sasha Calçados"), "Pedro")

    assert mensagem == (
        "Oi! Sou Pedro. Ajudo lojas físicas a venderem também pela internet. "
        "A Sasha Calçados apareceu na minha busca por loja de calçados em Pinheiros, "
        "mas sem link de loja online — é algo que vocês já pensaram em ter?"
    )


def test_primeiro_contato_e_igual_para_todas_as_categorias():
    sem_site = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Loja X", categoria="sem_site"))
    institucional = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Loja X", categoria="site_institucional"))

    assert sem_site == institucional


def test_primeiro_contato_sem_remetente_omite_apresentacao():
    mensagem = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Loja X"), "  ")

    assert mensagem.startswith("Oi! Ajudo lojas físicas")


def test_primeiro_contato_sem_nicho_nem_endereco_usa_padroes():
    mensagem = montar_mensagem_primeiro_contato(_LeadFake(nome_loja="Loja X", nicho=None, endereco=None))

    assert "na minha busca por lojas em São Paulo" in mensagem


@pytest.mark.parametrize("endereco,bairro", [
    ("R. Teodoro Sampaio, 1806 - Pinheiros, São Paulo - SP, 05405-150, Brazil", "Pinheiros"),
    ("Av. Paulista, 486 - Lj A - Bela Vista, São Paulo - SP, 01311-200, Brazil", "Bela Vista"),
    ("Shopping Vista 14 - R. Santa Ifigênia, 190 - Santa Ifigênia, São Paulo - SP, 01207-000, Brazil",
     "Santa Ifigênia"),
    ("R. São Paulo, 1969 - Cerâmica, São Caetano do Sul - SP, 09530-210, Brazil", "Cerâmica"),
    (None, "São Paulo"),
    ("Rua sem bairro 123", "São Paulo"),
])
def test_extrair_bairro(endereco, bairro):
    assert extrair_bairro(endereco, "São Paulo") == bairro


def test_mensagem_de_followup_menciona_o_nome_da_loja():
    mensagem = montar_mensagem_followup(_LeadFake(nome_loja="Loja Y"))
    assert "Loja Y" in mensagem
