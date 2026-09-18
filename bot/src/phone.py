import re
from typing import Optional

_DDD_VALIDOS = {str(d) for d in range(11, 100)}


def normalizar_telefone(bruto: Optional[str]) -> Optional[str]:
    """Normaliza um telefone brasileiro para o formato E.164 (+55DDNNNNNNNNN).

    Aceita formatos comuns: com/sem DDI, com/sem parênteses e traços, com
    prefixo de tronco '0'. Retorna None se não for possível reconhecer um
    número válido (DDD + 8 ou 9 dígitos).
    """
    if not bruto:
        return None

    digitos = re.sub(r"\D", "", bruto)
    if not digitos:
        return None

    if digitos.startswith("55") and len(digitos) in (12, 13):
        digitos_sem_ddi = digitos[2:]
    elif digitos.startswith("0") and len(digitos) in (11, 12):
        digitos_sem_ddi = digitos.lstrip("0")
    elif len(digitos) in (10, 11):
        digitos_sem_ddi = digitos
    else:
        return None

    if len(digitos_sem_ddi) not in (10, 11):
        return None

    ddd = digitos_sem_ddi[:2]
    numero = digitos_sem_ddi[2:]
    if ddd not in _DDD_VALIDOS:
        return None
    if len(numero) == 9 and numero[0] != "9":
        return None

    return f"+55{ddd}{numero}"
