TEMPLATES_PRIMEIRO_CONTATO = {
    "sem_site": (
        "Olá! Vi que a {nome_loja} ainda não tem um site ou loja online. "
        "Muita gente busca vocês no Google antes de comprar — posso te mostrar "
        "como resolver isso rapidinho?"
    ),
    "sem_ecommerce": (
        "Olá! Notei que o site da {nome_loja} não tem uma loja virtual pra vender "
        "online. Dá pra ativar isso sem dor de cabeça — quer entender como?"
    ),
    "site_institucional": (
        "Olá! O site da {nome_loja} é só institucional, sem vender online. "
        "Se quiser transformar visitas em vendas, posso te ajudar com isso."
    ),
    "site_desatualizado": (
        "Olá! O site da {nome_loja} parece estar desatualizado (lento ou sem "
        "versão para celular). Isso afasta clientes — posso te mostrar uma solução rápida?"
    ),
}

CATEGORIA_PADRAO = "sem_site"

MENSAGEM_FOLLOWUP = (
    "Olá, {nome_loja}! Só retomando o contato — ainda faz sentido conversarmos "
    "sobre melhorar a presença online de vocês?"
)


def montar_mensagem_primeiro_contato(lead) -> str:
    template = TEMPLATES_PRIMEIRO_CONTATO.get(lead.categoria, TEMPLATES_PRIMEIRO_CONTATO[CATEGORIA_PADRAO])
    return template.format(nome_loja=lead.nome_loja)


def montar_mensagem_followup(lead) -> str:
    return MENSAGEM_FOLLOWUP.format(nome_loja=lead.nome_loja)
