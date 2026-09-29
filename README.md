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

Para demonstrar sem Docker nem banco, com a série real salva em `dados/infodengue_marilia.json`:

```bash
node scripts/demo-sem-banco.js
```

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

A meta é o nível AA da WCAG 2.1. A verificação foi feita em camadas, porque nenhuma ferramenta
cobre tudo sozinha.

- **Testes automatizados (axe-core em jsdom):** o esqueleto da página e cada tabela gerada não têm
  violações A/AA. Sem renderização, essa etapa não mede contraste.
- **Página renderizada no navegador (axe-core, regras WCAG 2.0/2.1 A e AA):** com dados reais e todas
  as tabelas abertas, nenhuma violação.
- **Contraste medido:** textos entre 7,2:1 e 17,4:1 (mínimo AA 4,5:1); cores dos gráficos com no
  mínimo 4,9:1 contra o fundo (mínimo 3:1 para elementos não textuais).
- **Teclado:** link para pular ao conteúdo, botões de tabela operáveis por Enter com `aria-expanded`,
  foco visível de 3px.
- **Celular (375px):** sem rolagem horizontal.
- **Pendente:** teste com usuários de leitor de tela.

Cada gráfico tem tabela equivalente com os mesmos dados, e os níveis de alerta são sempre descritos
por texto, nunca só por cor.

## Limitações conhecidas

- Semanas com casos nulos na origem são marcadas como parciais, nunca convertidas em zero, e ficam
  fora dos cálculos de correlação. Na captura de 28/09/2026 nenhuma semana de Marília veio nula;
  o tratamento é defensivo.
- Correlação não estabelece causalidade. A série disponível é curta para conclusões sazonais.
- No plano gratuito de hospedagem o serviço hiberna após inatividade, então o primeiro
  acesso depois de um período ocioso é lento.
