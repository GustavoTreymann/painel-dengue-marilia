---
version: 1
slug: "src-web-index-html"
primary_target: "src/web/index.html"
related_targets: []
---

# Painel (src/web/index.html)

Scope: the single public page of the panel. Visitor mode: Operate (the visitor reads the current dengue situation and the analysis). Audience: Univesp evaluators judging a real public panel for Marília residents. Task: know the current alert level and trend in seconds, then read the series, the alert distribution and the climate correlation, each with an equivalent table. Constraints: no build step, Chart.js, factual copy unchanged, test-asserted structure (one h1, four labelled sections, canvases with role=img, table toggles), WCAG 2.1 AA.

## Direction contract

THESIS: The panel is a surveillance field form filled in by hand: real figures written into numbered fields. It refuses the category default of a white page of same-size KPI cards with a blue header.

OWN-WORLD: Canary-yellow carbon-copy band (#F3DC4E) as the shell, white sheet, form-print green ink (#123F36) for all rules, labels and text, ballpoint blue (#2140B4) only for figures written in by the "agent" (data values, the live series), graphite (#5E6660) for secondary marks. One family, Archivo, condensed caps for field labels, tabular numerals right-aligned. 1px green rules do all dividing; no cards, no shadows, no radius. Official alert colours appear only with their text label.

STORY: The visitor sees the current alert level and trend first, then the whole 90-week history as an alert strip and an epidemic curve, then how often each level occurred, then the climate correlation with its honest caveat. Every chart opens into its table.

FIRST VIEWPORT: Yellow carbon band across the top with the h1 and the current epidemiological week at right. Below, a two-column sheet: left a 440px column of numbered fields (alert level with swatch, total cases in comb-box digits, peak week in comb boxes, transmission trend); right the series field: a 90-cell alert strip of exact-width weeks above the epidemic curve, live series in blue ink, history receding, moving average dashed graphite. The table toggle sits in the field header.

FORM: Ficha de campo do agente de combate às endemias, candidate 5 of 7 on my ordered list; seed key 557703c4. Signature move: comb-box digit fields (caselas) carrying the headline figures in ballpoint blue. Raises: one family and 1px rules only (plate annual); in-consolidation drawn dashed, never a value (emission rail); exact-width week cells in the alert strip (labanotation); only the latest week in full ink (transit); tabular numerals right-aligned (j-card); focusing a strip cell highlights that week on the curve (streaming wall).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
