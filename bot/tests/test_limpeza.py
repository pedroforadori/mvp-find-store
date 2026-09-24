from unittest.mock import MagicMock

from src.limpeza import limpar_descartados


def _repo(ids):
    repo = MagicMock()
    repo.buscar_ids_com_status_descartado.return_value = ids
    repo.descartar_lead.return_value = True
    return repo


def test_simulacao_so_conta_sem_excluir():
    repo = _repo([1, 2, 3])

    contagens = limpar_descartados(repo, aplicar=False)

    assert contagens == {"encontrados": 3, "excluidos": 0}
    repo.descartar_lead.assert_not_called()


def test_aplicar_exclui_cada_lead_descartado():
    repo = _repo([1, 2])

    contagens = limpar_descartados(repo, aplicar=True)

    assert contagens == {"encontrados": 2, "excluidos": 2}
    assert [c.args[0] for c in repo.descartar_lead.call_args_list] == [1, 2]


def test_nao_conta_lead_que_sumiu_no_meio_do_caminho():
    repo = _repo([1, 2])
    repo.descartar_lead.side_effect = [True, False]

    assert limpar_descartados(repo, aplicar=True)["excluidos"] == 1
