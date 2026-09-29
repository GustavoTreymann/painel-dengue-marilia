# Roteiro do vídeo de apresentação (Q7)

Duração-alvo: 5 a 7 minutos. Gravar a tela com o painel publicado aberto; rosto opcional.
Os números abaixo são os da captura de 28/09/2026 — confira no painel no dia da gravação.

| Tempo | Cena | Fala (sugestão) |
|---|---|---|
| 0:00–0:40 | Título do trabalho | Apresentação: nome, curso, polo Marília, tutora. "Este projeto transforma dados abertos da dengue em um painel acessível para Marília." |
| 0:40–1:30 | Notícia da emergência (fev/2025) e alerta verde (jun/2025) | O problema: a cidade decretou emergência e voltou ao alerta verde em quatro meses; os dados existem, mas estão em formato técnico. Pergunta norteadora. |
| 1:30–2:30 | Diagrama de arquitetura (Figura 1 do relatório) | Como funciona: API do InfoDengue → ingestão diária → PostgreSQL → API REST com Express → painel. Nuvem: Render + Neon. Código no GitHub. |
| 2:30–3:45 | Painel: indicadores e série semanal | 36.937 casos em 90 semanas; pico na semana 10 de 2025 com 2.925 casos; tendência atual em retração. Clicar em "Ver dados em tabela". |
| 3:45–4:30 | Painel: níveis de alerta e clima | 24,4% do período em vermelho. Correlação moderada com a temperatura (mínima: r = 0,47). Explicar que não há defasagem preferencial e que correlação não é causalidade. |
| 4:30–5:30 | Acessibilidade ao vivo | Navegar só com Tab e Enter: pular para o conteúdo, abrir a tabela. Mostrar que o alerta é descrito em texto, não só em cor. Citar a verificação de contraste. |
| 5:30–6:15 | Terminal com `npm test` passando | Testes automatizados (unidade, integração, acessibilidade), cobertura de 100% na análise e na API, histórico de commits. |
| 6:15–7:00 | Devolutivas da comunidade e conclusão | O que as pessoas disseram no questionário e o que mudou por causa disso. Limitações e próximos passos. |
