def limpar_descartados(repositorio, aplicar: bool = False) -> dict:
    """Exclui (e bloqueia) os leads que ainda estão com status 'descartado'.
    Sem `aplicar`, só conta quantos sairiam."""
    ids = repositorio.buscar_ids_com_status_descartado()
    excluidos = 0
    if aplicar:
        excluidos = sum(1 for lead_id in ids if repositorio.descartar_lead(lead_id))
    return {"encontrados": len(ids), "excluidos": excluidos}
