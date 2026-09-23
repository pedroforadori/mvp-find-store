import re
from typing import Optional

# Espelhado em backend/src/leads/contato-manual.ts (modo manual). Um único
# texto para todas as categorias: todo lead qualificado ainda não tem loja online.
MENSAGEM_PRIMEIRO_CONTATO = (
    "Oi! {apresentacao}Ajudo lojas físicas a venderem também pela internet. "
    "A {nome_loja} apareceu na minha busca por {nicho} em {bairro}, mas sem link "
    "de loja online — é algo que vocês já pensaram em ter?"
)

NICHO_PADRAO = "lojas"

MENSAGEM_FOLLOWUP = (
    "Olá, {nome_loja}! Só retomando o contato — ainda faz sentido conversarmos "
    "sobre melhorar a presença online de vocês?"
)

# Endereço do Google Places: "Rua X, 100 - Bairro, Cidade - UF, CEP, Brazil".
_REGEX_BAIRRO = re.compile(r"(?:^|- )([^,-]+), [^,]+ - [A-Z]{2}(?:,|$)")


def extrair_bairro(endereco: Optional[str], cidade: str) -> str:
    """Bairro a partir do endereço formatado do Google; sem padrão reconhecível, usa a cidade."""
    match = _REGEX_BAIRRO.search(endereco or "")
    bairro = match.group(1).strip() if match else ""
    return bairro or cidade


def montar_mensagem_primeiro_contato(lead, nome_remetente: str = "") -> str:
    nome = nome_remetente.strip()
    return MENSAGEM_PRIMEIRO_CONTATO.format(
        apresentacao=f"Sou {nome}. " if nome else "",
        nome_loja=lead.nome_loja,
        nicho=(lead.nicho or "").strip() or NICHO_PADRAO,
        bairro=extrair_bairro(lead.endereco, lead.cidade),
    )


def montar_mensagem_followup(lead) -> str:
    return MENSAGEM_FOLLOWUP.format(nome_loja=lead.nome_loja)
