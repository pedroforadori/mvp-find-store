from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class SinaisLead:
    """Sinais brutos coletados sobre uma loja, usados para qualificação e scoring."""

    tem_site: bool
    tem_instagram_link_venda: bool = False
    tem_ssl: Optional[bool] = None
    pagespeed_mobile: Optional[int] = None
    tem_meta_tags: Optional[bool] = None
    tecnologia_detectada: Optional[str] = None
    tecnologia_desatualizada: bool = False
    tem_botao_whatsapp: Optional[bool] = None
    instagram_ativo_30d: bool = False
    tem_checkout: bool = False
    tem_catalogo_produtos: bool = False
    site_quebrado: bool = False


@dataclass
class Lead:
    place_id: Optional[str]
    telefone_normalizado: Optional[str]
    nome_loja: str
    nicho: Optional[str]
    endereco: Optional[str]
    instagram_handle: Optional[str]
    site_url: Optional[str]
    categoria: str
    score: int
    prioridade: str
    sinais: SinaisLead
    cidade: str = "São Paulo"


@dataclass
class LeadArmazenado:
    """Projeção de `leads` + `leads_diagnostico` usada para recalcular o score."""

    id: int
    place_id: Optional[str]
    telefone_normalizado: Optional[str]
    nome_loja: str
    nicho: Optional[str]
    cidade: str
    endereco: Optional[str]
    site_url: Optional[str]
    instagram_handle: Optional[str]
    categoria: Optional[str]
    score: int
    prioridade: Optional[str]
    status: str
    pagespeed_mobile: Optional[int]


@dataclass
class LeadParaContato:
    """Projeção de `leads` usada pela lógica de disparo (1º contato/follow-up)."""

    id: int
    telefone_normalizado: Optional[str]
    nome_loja: str
    categoria: str
    status: str
    tentativas: int
    data_ultimo_contato: Optional[datetime]
    nicho: Optional[str] = None
    endereco: Optional[str] = None
    cidade: str = "São Paulo"
