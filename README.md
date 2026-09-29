# Painel de vigilância da dengue em Marília

Projeto Integrador em Computação II — Bacharelado em Ciência de Dados — Univesp.

Painel web que consome dados abertos de vigilância de arboviroses, calcula indicadores
epidemiológicos e analisa a relação defasada entre variáveis climáticas e incidência
no município de Marília-SP.

## Funcionalidades

- Ingestão automática da API pública do InfoDengue, idempotente e agendada
- Série semanal de casos com média móvel de três semanas
- Indicadores: total do período, semana de pico, Rt, tendência e nível de alerta vigente
- Correlação de Pearson entre temperatura/umidade e incidência, com defasagem de 0 a 6 semanas
- Interface pensada para acessibilidade, com tabela equivalente para cada gráfico

## Stack

Node.js · Express · PostgreSQL · Chart.js · Vitest · Supertest · axe-core · Docker

## Execução local

```bash
cp .env.example .env
docker compose up -d
npm install
npm start
```

O painel fica em http://localhost:3000.

## Testes

```bash
npm test          # suíte completa (os testes de persistência precisam do PostgreSQL do docker compose)
npm run cobertura # relatório de cobertura
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | Conexão PostgreSQL | `postgres://painel:painel@localhost:5432/dengue` |
| `PORT` | Porta do servidor | `3000` |
| `GEOCODE` | Código IBGE do município | `3529005` (Marília-SP) |

## Fonte de dados

[InfoDengue](https://info.dengue.mat.br) — dados agregados por município e semana
epidemiológica, sem informação pessoal.

## Acessibilidade: o que está verificado e como

O objetivo é o nível AA da WCAG 2.1. O que está comprovado automaticamente e o que foi
verificado por inspeção estão separados abaixo, porque a ferramenta automática não cobre tudo.

- **Verificado pelo axe-core (testes automatizados):** o esqueleto da página (`index.html`) e cada
  tabela gerada, isoladamente, não têm violações das regras A e AA que o axe consegue avaliar.
- **Não coberto pelo axe nestes testes:** o axe roda em jsdom, sem renderização, então não avalia
  contraste de cores; também não vê a página já preenchida, porque as tabelas são injetadas por
  JavaScript depois do carregamento.
- **Verificado por inspeção:** cada gráfico tem tabela equivalente com os mesmos dados; os níveis
  de alerta são descritos por texto e não apenas por cor; o painel respeita `prefers-reduced-motion`.

## Limitações conhecidas

- Semanas com casos nulos na origem são marcadas como parciais, nunca convertidas em zero, e ficam
  fora dos cálculos de correlação. Na captura de 28/09/2026 nenhuma semana de Marília veio nula;
  o tratamento é defensivo.
- Correlação não estabelece causalidade. A série disponível é curta para conclusões sazonais.
- No plano gratuito de hospedagem o serviço hiberna após inatividade, então o primeiro
  acesso depois de um período ocioso é lento.
