-- Lead descartado é excluído da base. Para o bot não redescobrir a mesma loja
-- no Google Places e contatá-la de novo ("nunca mais contatar"), o place_id e
-- o telefone ficam guardados aqui e bloqueiam uma nova inserção.
CREATE TABLE leads_bloqueados (
    id SERIAL PRIMARY KEY,
    place_id TEXT UNIQUE,
    telefone_normalizado TEXT UNIQUE,
    nome_loja TEXT,
    bloqueado_em TIMESTAMP DEFAULT now(),
    CONSTRAINT bloqueio_identificado CHECK (place_id IS NOT NULL OR telefone_normalizado IS NOT NULL)
);

-- Bloqueia e exclui o lead numa única transação (usado pelo Nest via rpc e
-- pelo bot Python). Retorna false se o lead não existe.
CREATE OR REPLACE FUNCTION descartar_lead(p_lead_id INT) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    v_lead leads%ROWTYPE;
    v_place_id TEXT;
    v_telefone TEXT;
BEGIN
    DELETE FROM leads WHERE id = p_lead_id RETURNING * INTO v_lead;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Uma loja já bloqueada pelo place_id pode trazer um telefone novo (e
    -- vice-versa): grava só o que ainda não está bloqueado.
    v_place_id := v_lead.place_id;
    IF EXISTS (SELECT 1 FROM leads_bloqueados WHERE place_id = v_place_id) THEN
        v_place_id := NULL;
    END IF;
    v_telefone := v_lead.telefone_normalizado;
    IF EXISTS (SELECT 1 FROM leads_bloqueados WHERE telefone_normalizado = v_telefone) THEN
        v_telefone := NULL;
    END IF;

    IF v_place_id IS NOT NULL OR v_telefone IS NOT NULL THEN
        INSERT INTO leads_bloqueados (place_id, telefone_normalizado, nome_loja)
        VALUES (v_place_id, v_telefone, v_lead.nome_loja)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN true;
END;
$$;
