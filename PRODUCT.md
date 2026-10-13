# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the Univesp evaluators of Projeto Integrador II (PJI240, Ciência de Dados), the tutor and the grading panel, who open the public URL to judge whether the student delivered a real, working, accessible data product. The page must read as a genuine public surveillance panel for the population of Marília-SP, because that is the scenario the project claims to serve.

Secondary (the scenario the product represents): residents of Marília checking whether dengue transmission is high right now, with no epidemiology background.

## Product Purpose

A public panel for dengue surveillance in Marília-SP (IBGE geocode 3529005). It ingests weekly open data from the InfoDengue API, keeps the historical series in its own PostgreSQL database, and shows epidemiological indicators plus the relationship between climate and incidence. Guiding question: how can an accessible panel built on open arbovirus data support risk perception and anticipation of critical dengue periods in Marília.

Success: the evaluator understands within seconds what the current situation is, sees that the data is real and current, and finds the analysis (moving average, Rt trend, lagged climate correlation) honest and readable.

## Positioning

A single-municipality panel built by one student that treats data analysis as the core, not decoration: lagged correlation between temperature and incidence, Rt trend, and explicit handling of weeks still being consolidated. Every chart has an equivalent data table for screen readers.

## Operating Context

- Express serves the static interface from `src/web/` and a REST API (`/api/series`, `/api/indicadores`, `/api/clima`, `/api/status`).
- Hosted on Render (Ohio) with Neon PostgreSQL; no auto-deploy, manual deploy from the public GitHub repo.
- Ingestion runs at boot and daily at 04:00; source data is weekly.
- The partial report (already submitted) cites the panel, Chart.js, and the section titles.

## Capabilities and Constraints

- No build step: plain HTML, CSS, and JavaScript modules served by Express. No new framework.
- Chart.js stays as the chart library (cited in the report).
- Factual copy stays: section titles, the h1 "Painel de vigilância da dengue em Marília", chart descriptions, the climate summary wording, and the footer credit to InfoDengue and Univesp. Tests assert some of these strings.
- `tests/web/pagina.test.js` requires: one h1, a `main`, exactly four `section[aria-labelledby]`, every canvas with `role="img"` and `aria-label`, the climate table toggle (`button.alternar[data-alvo="tabela-clima"]` and `#tabela-clima`), and zero axe-core A/AA violations.
- Alert levels come from InfoDengue: 1 Verde (condições desfavoráveis), 2 Amarelo (condições favoráveis), 3 Laranja (transmissão sustentada), 4 Vermelho (alta incidência). Level is always conveyed by text, never by color alone.
- Weeks with null cases show "em consolidação", never zero.

## Evidence on Hand

- Real data: InfoDengue series for Marília, 90 weeks (SE 202501 to 202637 at capture), 36.937 notified cases, peak 2.925 cases in SE 202510; snapshot in `dados/infodengue_marilia.json`.
- Report figures in `docs/relatorio/figuras/`.
- No logo, no brand assets, no testimonials. Do not invent institutional endorsement (no Prefeitura or Secretaria de Saúde affiliation).

## Product Principles

1. Truth over drama: never imply a number the source did not report, and never imply causation from correlation.
2. The current situation first: what is happening now matters more than the archive.
3. Every visual has a textual equivalent.
4. Scope fits one developer: depth over breadth.

## Accessibility & Inclusion

WCAG 2.1 AA is a graded requirement, verified by axe-core in the test suite and manually with NVDA. Portuguese (pt-BR) throughout, Brazilian number formatting, reduced-motion respected.
