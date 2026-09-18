from src.phone import normalizar_telefone


def test_celular_com_ddd_e_formatacao():
    assert normalizar_telefone("(11) 98765-4321") == "+5511987654321"


def test_celular_ja_com_ddi_e_simbolos():
    assert normalizar_telefone("+55 11 98765-4321") == "+5511987654321"


def test_celular_so_digitos_sem_ddi():
    assert normalizar_telefone("11987654321") == "+5511987654321"


def test_celular_com_prefixo_tronco_zero():
    assert normalizar_telefone("011987654321") == "+5511987654321"


def test_telefone_fixo_sem_ddi():
    assert normalizar_telefone("1132345678") == "+551132345678"


def test_telefone_fixo_com_ddi():
    assert normalizar_telefone("551132345678") == "+551132345678"


def test_none_retorna_none():
    assert normalizar_telefone(None) is None


def test_string_vazia_retorna_none():
    assert normalizar_telefone("") is None


def test_apenas_letras_retorna_none():
    assert normalizar_telefone("não tem telefone") is None


def test_numero_curto_demais_retorna_none():
    assert normalizar_telefone("1234") is None


def test_ddd_invalido_retorna_none():
    assert normalizar_telefone("0012345678") is None


def test_celular_com_nono_digito_invalido_retorna_none():
    # 9 dígitos no número mas sem começar com '9' não é um celular válido
    assert normalizar_telefone("11812345678") is None
