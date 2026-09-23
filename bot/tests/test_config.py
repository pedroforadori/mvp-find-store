import pytest

from src.config import carregar_config


@pytest.fixture(autouse=True)
def _env_minimo(monkeypatch):
    monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://teste")
    monkeypatch.delenv("MODO_DISPARO", raising=False)
    monkeypatch.delenv("DISPAROS_POR_DIA", raising=False)


def test_modo_disparo_padrao_e_manual():
    assert carregar_config().modo_disparo == "manual"


def test_modo_disparo_cloud_api(monkeypatch):
    monkeypatch.setenv("MODO_DISPARO", "cloud_api")

    assert carregar_config().modo_disparo == "cloud_api"


def test_variaveis_vazias_usam_padrao(monkeypatch):
    """No GitHub Actions, `vars.X` não definida chega como string vazia."""
    monkeypatch.setenv("MODO_DISPARO", "")
    monkeypatch.setenv("DISPAROS_POR_DIA", "")

    config = carregar_config()

    assert config.modo_disparo == "manual"
    assert config.disparos_por_dia == 10


def test_modo_disparo_invalido_levanta_erro(monkeypatch):
    monkeypatch.setenv("MODO_DISPARO", "automatico")

    with pytest.raises(ValueError):
        carregar_config()
