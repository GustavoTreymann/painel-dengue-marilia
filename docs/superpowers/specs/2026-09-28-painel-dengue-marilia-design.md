# Painel web de vigilância da dengue em Marília — Design

**Projeto Integrador em Computação II (PJI240) — DRP07 — Turma 002 — A2026S2**
**Autor:** Luiz Gustavo Jacobuce Treymann — Bacharelado em Ciência de Dados
**Tutora:** Jessica Caroline Pena Alves Da Silva — Polo Marília
**Data:** 28/09/2026

---

## 1. Contexto e objetivo

O tema fechado do semestre exige "desenvolver um software com framework web que utilize banco de dados, inclua script web (JavaScript), nuvem, uso de API, acessibilidade, controle de versão e testes", com análise de dados como item opcional.

Este projeto entrega um painel web público que consome dados abertos de vigilância da dengue para o município de Marília-SP, armazena a série histórica em banco próprio e apresenta indicadores epidemiológicos e a relação entre variáveis climáticas e incidência.

A análise de dados, opcional no enunciado, é tratada aqui como núcleo — é o diferencial esperado de um aluno de Ciência de Dados e o que separa este trabalho de um CRUD.

**Pergunta norteadora:** de que forma a apresentação de dados abertos de arboviroses em um painel acessível pode apoiar a percepção de risco e a antecipação de períodos críticos de dengue em Marília?

**Restrição de equipe:** o Grupo 1 tem um único integrante. O escopo foi dimensionado para uma pessoa: corta-se largura (um só município, três visualizações, sem autenticação), preserva-se profundidade (ingestão real, análise estatística, acessibilidade, testes).

## 2. Mapeamento dos requisitos obrigatórios

| Exigência do enunciado | Como é atendida |
|---|---|
| Framework web | Express (Node.js) servindo API REST e a interface |
| Banco de dados | PostgreSQL com série histórica semanal |
| Script web (JavaScript) | JavaScript no cliente para consumo da API e renderização dos gráficos |
| Nuvem | Aplicação no Render, banco no Neon (planos gratuitos) |
| Uso de API | Consome a API pública do InfoDengue **e** expõe API REST própria |
| Acessibilidade | WCAG 2.1 nível AA, verificado com axe-core na suíte de testes |
| Controle de versão | Git desde o primeiro commit, repositório público no GitHub |
| Testes | Vitest (unitários), Supertest (integração), axe-core (acessibilidade) |
| Análise de dados (opcional) | Média móvel, tendência de Rt e correlação defasada clima × incidência |

## 3. Fonte de dados

**API InfoDengue** — `https://info.dengue.mat.br/api/alertcity`

Parâmetros: `geocode=3529005` (Marília), `disease=dengue`, `format=json`, `ew_start`, `ew_end`, `ey_start`, `ey_end`.

Verificado em 28/09/2026: resposta HTTP 200 com 90 semanas epidemiológicas (202501 a 202637), 30 campos por registro, 36.937 casos notificados no período e pico de 2.925 casos na SE 202510. Os quatro níveis de alerta ocorrem na série.

Campos utilizados: `SE`, `data_iniSE`, `casos`, `casos_est`, `casos_est_min`, `casos_est_max`, `Rt`, `p_inc100k`, `nivel`, `tempmin`, `tempmed`, `tempmax`, `umidmin`, `umidmed`, `umidmax`, `pop`. Os demais campos são ignorados.

A API é pública e não exige chave. Não há dado pessoal envolvido: os registros são agregados por município e semana.

## 4. Arquitetura

```
API InfoDengue  ──►  ingest/  ──►  PostgreSQL  ──►  api/  ──►  web/
   (externa)          (ETL)                        (REST)     (painel)
                                        ▲
                                    analytics/
                                  (funções puras)
```

Processo único em Node. A ingestão roda no boot da aplicação e depois a cada 24 horas via `node-cron`, no mesmo processo — solução adequada porque o dado de origem é semanal, então atraso de horas é irrelevante.

## 5. Modelo de dados

```sql
CREATE TABLE semana_epidemiologica (
  se             INTEGER PRIMARY KEY,   -- formato AAAASS, ex.: 202510
  data_inicio    DATE        NOT NULL,
  casos          INTEGER,               -- nulo quando ainda não consolidado
  casos_est      NUMERIC(10,2),
  casos_est_min  INTEGER,
  casos_est_max  INTEGER,
  rt             NUMERIC(10,6),
  inc_100k       NUMERIC(10,4),
  nivel          SMALLINT CHECK (nivel BETWEEN 1 AND 4),
  temp_min       NUMERIC(6,2),
  temp_med       NUMERIC(6,2),
  temp_max       NUMERIC(6,2),
  umid_min       NUMERIC(6,2),
  umid_med       NUMERIC(6,2),
  umid_max       NUMERIC(6,2),
  populacao      INTEGER,
  parcial        BOOLEAN     NOT NULL DEFAULT FALSE,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE execucao_ingestao (
  id             SERIAL PRIMARY KEY,
  iniciada_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluida_em   TIMESTAMPTZ,
  semanas_lidas  INTEGER,
  sucesso        BOOLEAN     NOT NULL DEFAULT FALSE,
  erro           TEXT
);
```

A gravação usa `INSERT ... ON CONFLICT (se) DO UPDATE`, o que torna a ingestão idempotente: reprocessar as mesmas semanas atualiza os valores em vez de duplicar linhas. Isso importa porque as semanas recentes são revisadas pela fonte depois de publicadas.

`parcial` marca semanas ainda em consolidação (`casos` nulo na origem). Essas semanas aparecem nos gráficos com estilo distinto e são **excluídas** dos cálculos de correlação.

**Verificado em 28/09/2026:** na captura real das 90 semanas de Marília, nenhuma semana veio com `casos` nulo — nem com zero casos. A semana mais recente disponível (SE 202637) trazia 11 casos. O tratamento de semana parcial é portanto **defensivo**: existe porque a fonte documenta a correção estatística do atraso de notificação e pode devolver nulo em outros municípios ou períodos, mas não é um fenômeno observado neste recorte. O relatório não deve afirmar que as semanas recentes chegam incompletas.

## 6. Módulos e interfaces

| Módulo | O que faz | Interface pública | Depende de |
|---|---|---|---|
| `src/ingest/infodengue.js` | Busca e normaliza a resposta da API externa | `buscarSemanas({de, ate})` | HTTP |
| `src/ingest/index.js` | Orquestra ingestão e registra execução | `executarIngestao()` | `infodengue`, `db` |
| `src/db/index.js` | Pool, migração e acesso | `salvarSemanas()`, `listarSemanas()`, `ultimaExecucao()` | PostgreSQL |
| `src/analytics/index.js` | Métricas derivadas | `mediaMovel()`, `tendenciaRt()`, `correlacaoDefasada()`, `resumoAlertas()` | nada |
| `src/api/rotas.js` | Rotas REST | router Express | `db`, `analytics` |
| `src/web/` | Interface acessível | arquivos estáticos | `api` via fetch |

`analytics/` não tem dependência alguma e opera sobre arrays simples. É onde está a lógica que interessa ao curso e, por ser pura, concentra a maior parte da cobertura de testes com o menor esforço. Nenhum módulo acessa o banco diretamente exceto `db/`.

## 7. API REST própria

| Rota | Retorna |
|---|---|
| `GET /api/series?de=&ate=` | Série semanal: casos, casos estimados, incidência, nível, clima |
| | `de` e `ate` são semanas epidemiológicas no formato `AAAASS` (ex.: `202501`), opcionais; omitidos, retornam a série completa |
| `GET /api/indicadores` | Total do período, semana de pico, Rt atual, tendência, nível vigente |
| `GET /api/clima` | Correlação defasada entre temperatura/umidade e incidência |
| `GET /api/status` | Data da última ingestão bem-sucedida e nº de semanas em base |
| `GET /healthz` | Verificação de saúde para o Render |

Respostas em JSON, com `Cache-Control` de 1 hora — o dado muda uma vez por semana.

## 8. Análise de dados

1. **Média móvel de 3 semanas** dos casos notificados, para suavizar ruído de notificação.
2. **Incidência por 100 mil habitantes** (`p_inc100k` da fonte), que permite comparação entre períodos independentemente de variação populacional.
3. **Tendência de transmissão** pelo Rt: `Rt > 1` por duas semanas consecutivas é classificado como crescimento; `Rt < 1` por duas semanas, como retração; caso contrário, estável.
4. **Correlação defasada clima × incidência**: coeficiente de Pearson entre `temp_med` e `umid_med` e a incidência, com defasagens de 0 a 6 semanas, reportando a defasagem de maior correlação. É a análise central do trabalho — a hipótese é que calor e umidade antecedem o aumento de casos em algumas semanas, o que dá ao painel caráter antecipatório.
5. **Distribuição de semanas por nível de alerta**, em tabela.

O relatório declara explicitamente que correlação não estabelece causalidade e que a série de 90 semanas é curta para conclusão sazonal robusta. Reconhecer o limite do dado vale mais em banca do que afirmar mais do que ele sustenta.

## 9. Interface e acessibilidade

Página única com três visualizações em Chart.js: série de casos com média móvel, nível de alerta ao longo do tempo, e dispersão clima × incidência na defasagem de maior correlação.

Critérios adotados:

- HTML semântico (`main`, `section`, `h1`–`h3`, `table` com `caption` e `th scope`)
- **Tabela equivalente para cada gráfico**, alternável por botão. Gráfico em `<canvas>` é opaco para leitor de tela; sem a tabela, o painel é inacessível na prática
- Navegação completa por teclado, com foco visível e ordem de tabulação previsível
- Contraste mínimo de 4,5:1 para texto e 3:1 para elementos gráficos (WCAG 2.1 AA)
- Informação nunca transmitida só por cor: o nível de alerta traz rótulo textual além da cor
- `prefers-reduced-motion` desliga as animações dos gráficos
- `lang="pt-BR"` e títulos descritivos

## 10. Tratamento de erros

| Situação | Comportamento |
|---|---|
| API externa fora do ar | Ingestão registra falha; painel serve o último estado do banco e exibe a data da última atualização |
| Banco indisponível | `/healthz` falha, rotas retornam 503 com mensagem legível |
| `casos` nulo na origem | Semana marcada `parcial`; nunca convertida para zero; excluída da correlação |
| Base vazia no primeiro boot | Painel exibe estado inicial explicando que a carga está em andamento |
| Parâmetro de data inválido | 400 com mensagem indicando o formato esperado |

A regra que não pode ser violada: dado ausente nunca vira zero. Zero significa "nenhum caso notificado", e confundir os dois falsearia a série.

## 11. Testes

- **Unitários (Vitest)** sobre `analytics/`: média móvel com série curta e com lacunas, classificação de tendência nos três casos, correlação contra valores calculados à mão, comportamento com semanas parciais.
- **Integração (Supertest)** sobre as rotas: forma da resposta, filtro por período, 400 em parâmetro inválido, 503 com banco fora.
- **Contrato** do cliente InfoDengue contra uma resposta real salva em `tests/fixtures/infodengue.json`, para a suíte não depender da API externa estar no ar.
- **Acessibilidade** com axe-core sobre o HTML renderizado em jsdom, falhando o build em violação de nível A ou AA.

Meta: cobertura acima de 80% em `analytics/` e `api/`. O relatório final traz o relatório de cobertura como evidência.

## 12. Nuvem e ambiente

- **Produção:** aplicação no Render (web service gratuito), banco no Neon (Postgres gratuito).
- **Desenvolvimento:** Postgres em Docker via `docker-compose.yml`.
- **Configuração:** `DATABASE_URL`, `PORT` e `GEOCODE` por variável de ambiente; `.env` fora do versionamento, com `.env.example` versionado.

Limitação conhecida e documentada no relatório: o plano gratuito do Render suspende o serviço após inatividade, então o primeiro acesso depois de um período ocioso é lento e dispara a ingestão no boot. Aceitável para projeto acadêmico, e é honesto registrar em vez de omitir.

## 13. Controle de versão

Repositório Git local desde o design, publicado no GitHub. Commits pequenos e descritivos em português, refletindo a evolução real do trabalho. O README traz objetivo, stack, instruções de execução local, variáveis de ambiente e link do painel publicado.

## 14. Fora de escopo (deliberadamente)

Autenticação e cadastro de usuários; comparação entre municípios; previsão por machine learning; aplicativo móvel; notificações por e-mail ou push; painel administrativo. Nenhum deles é exigido pelo enunciado, e cada um consumiria dias que o prazo não tem.

## 15. Entregáveis acadêmicos

**Relatório Parcial — vence 30/09/2026, 23:59** (3 tentativas permitidas). Segue o modelo oficial: Times New Roman 12, espaçamento 1,5, margens 3cm superior/esquerda e 2cm inferior/direita, numeração no canto superior direito a partir da Introdução.

| Seção | Conteúdo |
|---|---|
| 1 Introdução | Dengue como problema de saúde pública, recorte Marília, objeto do trabalho |
| 2.1 Objetivos | Geral: disponibilizar painel acessível de vigilância. Específicos: levantar a série, calcular indicadores, analisar relação clima × incidência, publicar em nuvem |
| 2.2 Justificativa | Relevância social, dado aberto subutilizado, pergunta norteadora |
| 2.3 Fundamentação teórica | Arboviroses e vigilância; dados abertos em saúde; visualização e acessibilidade digital |
| 2.4 Metodologia | Ouvir: coleta com moradores/agente de saúde. Criar: arquitetura e protótipo. Implementar: ingestão e painel |
| 2.5 Resultados preliminares | Protótipo funcional com dados reais, prints, modelo de dados, primeiros achados da série |

**Cronograma:** protótipo mínimo e relatório parcial até 30/09; sistema completo, deploy, acessibilidade validada e testes até 19/10 (Q6); relatório final e vídeo na Q7, a partir de 02/11.

**Pendências do autor:** o Plano de Ação da Q2 não foi enviado e está zerado; cabe consultar a tutora sobre envio em atraso. A coleta de campo (8 a 10 respostas) também depende do autor e precisa ocorrer antes da redação da seção 2.4.

## 16. Riscos

| Risco | Mitigação |
|---|---|
| Prazo de 2 dias para o relatório parcial | Protótipo mínimo primeiro, relatório em cima do que existe; 3 tentativas de envio permitem melhorar |
| API externa mudar ou sair do ar | Fixture versionada; banco preserva o já ingerido |
| Coleta de campo não acontecer a tempo | Reduzir a 3 entrevistas curtas; metodologia descreve o método aplicado, não uma amostra grande |
| Trabalho solo sem revisor | Testes automatizados como rede de segurança; tutora informada da composição do grupo |
