CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    place_id TEXT UNIQUE,
    telefone_normalizado TEXT UNIQUE,
    nome_loja TEXT NOT NULL,
    nicho TEXT,
    cidade TEXT DEFAULT 'São Paulo',
    endereco TEXT,
    instagram_handle TEXT,
    site_url TEXT,
    categoria TEXT, -- 'sem_site' | 'sem_ecommerce' | 'site_institucional' | 'site_desatualizado' | 'descartado'
    score INT DEFAULT 0,
    prioridade TEXT, -- 'quente' | 'morno' | 'baixa'
    status TEXT DEFAULT 'novo', -- 'novo' | 'contatado' | 'aguardando_followup' | 'esgotado' | 'descartado' | 'destaque'
    tentativas INT DEFAULT 0,
    data_primeiro_contato TIMESTAMP,
    data_ultimo_contato TIMESTAMP,
    resposta_sentimento TEXT, -- 'positiva' | 'negativa' | null
    criado_em TIMESTAMP DEFAULT now(),
    atualizado_em TIMESTAMP DEFAULT now(),
    CONSTRAINT unique_lead CHECK (place_id IS NOT NULL OR telefone_normalizado IS NOT NULL)
);

CREATE TABLE leads_diagnostico (
    lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
    tem_ssl BOOLEAN,
    pagespeed_mobile INT,
    tem_meta_tags BOOLEAN,
    tecnologia_detectada TEXT,
    tem_botao_whatsapp BOOLEAN,
    instagram_ativo_30d BOOLEAN,
    tem_checkout BOOLEAN,
    verificado_em TIMESTAMP DEFAULT now(),
    PRIMARY KEY (lead_id)
);

CREATE TABLE historico_contatos (
    id SERIAL PRIMARY KEY,
    lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
    canal TEXT,
    mensagem_enviada TEXT,
    enviado_em TIMESTAMP DEFAULT now(),
    resultado TEXT -- 'entregue' | 'lido' | 'respondido' | 'falhou'
);
