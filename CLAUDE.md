# Bot de Prospecção — Lojas sem E-commerce/Site Institucional (São Paulo)

MVP que descobre lojas físicas em São Paulo sem presença digital adequada,
qualifica os leads por score, e dispara prospecção via WhatsApp Cloud API
com deduplicação e follow-up automático.

## Escopo do piloto
- Cidade fixa: São Paulo.
- Nicho aberto/genérico — não restringir a 1 categoria, mas registrar o
  nicho de cada lead no banco para segmentação futura.
- Qualifica como lead tanto quem não tem presença online nenhuma quanto
  quem tem site institucional sem loja/checkout.

## Separação de responsabilidades (regra rígida)
- **Frontend nunca acessa Supabase diretamente.** Toda leitura/escrita
  passa exclusivamente pela API Nest. Nenhuma chave/cliente Supabase no
  frontend, em nenhuma hipótese.
- **Nest é o único cliente do Supabase para fins de dashboard**, expondo
  endpoints REST próprios (`GET /leads`, `PATCH /leads/:id/status`, etc.)
  que internamente consultam/gravam no Supabase.
- **Bot Python grava direto no Supabase** — processo batch desacoplado
  (descoberta/qualificação/scoring). Não passa pela API Nest para isso;
  o Nest apenas lê esses dados depois.
- Responsabilidades por pasta:
  - `bot/`: descoberta, qualificação, scoring, grava leads no
    Supabase, dispara mensagens via WhatsApp Cloud API.
  - `backend/`: única porta de entrada para o frontend; webhook do
    WhatsApp; regras de negócio (transição de status, follow-up); toda
    leitura/escrita do Supabase para fins de dashboard.
  - `frontend/`: consome exclusivamente a API do Nest.

## Estrutura do repositório
Repo único, três pastas independentes na raiz, sem tooling de monorepo
(sem Turborepo/Nx, sem build/cache compartilhado):

```
/bot/       -> script(s) + workflow do GitHub Actions
/backend/   -> API Nest, deploy independente na Vercel
/frontend/  -> dashboard React, deploy independente na Vercel
```

Cada pasta tem dependências e config de deploy próprias. Na Vercel,
`backend/` e `frontend/` são dois projetos distintos apontando
pro mesmo repo (Root Directory de cada um aponta pra sua subpasta). O
GitHub Actions roda o script dentro de `bot/`.

## Stack
- Bot: Python
- Backend: NestJS, hospedado na Vercel (serverless)
- Frontend: React + TypeScript + Tailwind, hospedado na Vercel
- Banco + Auth: Supabase (Postgres) — só Nest e bot Python acessam
- Agendamento do bot: GitHub Actions (scheduled workflow), não processo
  persistente
- WhatsApp: Meta Cloud API (mensagens com botões interativos)
- APIs externas: Google Places API, Google PageSpeed Insights API

### Restrições de infra
- Nest na Vercel é serverless: nenhuma lógica de cron/scheduler interno
  pode depender de processo de longa duração dentro do Nest. Agendamento
  recorrente do bot fica todo no GitHub Actions.
- Endpoints do Nest devem ser rápidos (free tier tem timeout de 10s):
  nenhuma chamada síncrona pesada (ex: PageSpeed API) dentro do handler
  do webhook do WhatsApp.

## Schema do banco (Postgres/Supabase)

```sql
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
```

## Pipeline do bot (execução via GitHub Actions)
1. **Descoberta**: lojas em SP via Google Places API, paginado por
   categoria ampla, sem restringir nicho.
2. **Qualificação**:
   - Sem site + sem Instagram com link de venda → `sem_site`
   - Tem site sem checkout/carrinho → `sem_ecommerce` ou `site_institucional`
   - Tem checkout funcional → descarta (não é lead)
   - Verificar SSL, PageSpeed mobile, meta tags, tecnologia (fingerprint
     básico via headers/HTML), botão de WhatsApp, atividade no Instagram.
3. **Scoring** (ver tabela) define `categoria`, `score`, `prioridade`.
4. **Inserção no banco**: `INSERT ... ON CONFLICT (place_id) DO NOTHING`
   (dedup por `place_id`, fallback por `telefone_normalizado`).
5. **Disparo**: ver regras abaixo.

### Tabela de scoring
| Critério | Peso |
|---|---|
| Não tem site nem Instagram com link de venda | +30 |
| Site sem SSL | +20 |
| PageSpeed mobile < 50 | +20 |
| Sem meta title/description | +10 |
| Tecnologia desatualizada | +10 |
| Sem botão de WhatsApp | +10 |
| Instagram ativo mas site quebrado/inexistente | +10 |
| Site com checkout funcional | -100 (descarta) |

Faixas: 70-100 quente · 40-69 morno · 0-39 baixa prioridade. O score
define o **template da mensagem**, não se ela é enviada.

## Regras de disparo (WhatsApp Cloud API)
- 1ª mensagem sempre automática para todo lead novo, assim que
  qualificado. Template varia por categoria/score.
- Botões interativos (não texto livre):
  - "Quero saber mais" → `status = 'destaque'`
  - "Fale comigo depois" → `status = 'destaque'`
  - "Não tenho interesse" → `status = 'descartado'`, nunca mais contatar.
- Follow-up sem resposta: reenviar a cada 3 dias, máx. 2 mensagens no
  total. Sem resposta após a 2ª → `status = 'esgotado'`.
- Resposta em texto livre: fallback simples por palavras-chave (sem IA
  nesta fase); em caso de dúvida, marcar `destaque`.
- Plano de warm-up (config, não hardcoded):

| Semana | Disparos/dia |
|---|---|
| 1 | 5–10 |
| 2 | 15–20 |
| 3 | 30–40 |
| 4+ | 50–80 (se quality rating do número seguir alto) |

## Testes (obrigatório em cada camada)
- **Bot Python** (pytest): scoring (critérios isolados e combinações),
  qualificação/categoria, normalização de telefone, dedup antes do
  insert. Mockar Google Places, PageSpeed, WhatsApp API — sem rede real.
- **Backend Nest** (Jest): services de negócio (transição de status,
  follow-up se estiver aqui), validação do payload do webhook. Testes de
  integração para `GET /leads`, `PATCH /leads/:id/status`,
  `POST /webhook/whatsapp`, mockando o acesso ao Supabase.
- **Frontend React** (Jest + RTL): componentes isolados (card de lead,
  badge de status/prioridade) e fluxo de listar/filtrar/mudar status,
  mockando a API Nest (nunca o Supabase). Estrutura de pastas preparada
  para Playwright/Cypress no futuro (E2E fora do escopo do MVP).

## Controle de versão e entrega
- Ao finalizar cada etapa da ordem de implementação: commitar com
  mensagens claras em português (ex: "feat: pipeline de descoberta e
  scoring do bot").
- Nunca commitar `.env`, chaves de API, credenciais Supabase/WhatsApp —
  já cobertos pelo `.gitignore` na raiz.
- Repositório remoto ainda não configurado — perguntar a URL antes de
  qualquer push, nunca supor ou criar um novo.

## Fora de escopo neste MVP
- Dashboard completo com todos os gráficos (só lista de leads + status +
  filtro por categoria/score).
- Classificação de sentimento por IA.
- Múltiplos canais além de WhatsApp.
- Testes E2E completos (só a estrutura preparada).

## Ordem de implementação sugerida
1. Schema do banco no Supabase.
2. Pipeline do bot Python (descoberta → qualificação → scoring →
   gravação) + testes unitários + workflow do GitHub Actions.
3. API Nest: endpoints CRUD para leads + webhook do WhatsApp + testes
   unitários/integração.
4. Lógica de disparo (1ª mensagem + follow-up) — decidir se fica no bot
   Python ou no Nest durante a implementação.
5. Dashboard React básico (lista + filtro + status), consumindo somente
   a API Nest + testes unitários e de tela.
