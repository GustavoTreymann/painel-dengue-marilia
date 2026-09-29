# Resultados preliminares — insumo para a seção 2.5 do relatório parcial

Gerado em 28/09/2026 rodando `src/analytics/` sobre as 90 semanas reais capturadas da API
do InfoDengue para Marília-SP (geocode 3529005), SE 202501 a 202637.

Reproduzível: o script está em `docs/` como referência e opera sobre
`dados/infodengue_marilia.json`.

## Caracterização do período

| Indicador | Valor |
|---|---|
| Período analisado | SE 202501 a SE 202637 (90 semanas) |
| População de referência | 238.605 habitantes |
| Casos notificados no período | 36.937 |
| Semana de pico | SE 202510 |
| Casos na semana de pico | 2.925 |
| Incidência no pico | 1.225,9 por 100 mil habitantes |
| Rt na última semana | 0,993 |
| Tendência de transmissão | Retração |

Nenhuma semana veio com dado ausente ou com zero casos notificados.

## Distribuição dos níveis de alerta

| Nível | Semanas | Percentual |
|---|---|---|
| Verde — condições desfavoráveis à transmissão | 62 | 68,9% |
| Amarelo — condições favoráveis à transmissão | 1 | 1,1% |
| Laranja — transmissão sustentada | 5 | 5,6% |
| Vermelho — alta incidência | 22 | 24,4% |

Quase um quarto do período em nível vermelho. Isso é coerente com o registro público de
que o município chegou a declarar situação de emergência por epidemia de dengue, e serve
de ponte entre o dado e a justificativa da seção 2.2.

## Correlação entre clima e incidência

Coeficiente de Pearson entre a variável climática na semana *i* e a incidência por 100 mil
na semana *i + k*, testando defasagens de 0 a 6 semanas.

| Variável | Coeficiente máximo | Defasagem do máximo | n |
|---|---|---|---|
| Temperatura mínima | 0,474 | 3 semanas | 87 |
| Temperatura média | 0,426 | 3 semanas | 87 |
| Temperatura máxima | 0,322 | 0 semanas | 90 |
| Umidade média | 0,222 | 4 semanas | 86 |

Curva completa por defasagem:

```
temp. média  0:0,42  1:0,42  2:0,42  3:0,43  4:0,41  5:0,39  6:0,37
temp. mínima 0:0,46  1:0,47  2:0,47  3:0,47  4:0,45  5:0,43  6:0,41
temp. máxima 0:0,32  1:0,32  2:0,31  3:0,32  4:0,30  5:0,29  6:0,28
umidade méd. 0:0,12  1:0,16  2:0,20  3:0,22  4:0,22  5:0,21  6:0,21
```

## Leitura honesta desses números

**O que os dados sustentam:**

1. Existe correlação positiva moderada entre temperatura e incidência de dengue em
   Marília no período, com coeficientes entre 0,32 e 0,47 conforme a medida de
   temperatura adotada.
2. A temperatura **mínima** correlaciona mais fortemente que a máxima (0,474 contra
   0,322). Isso dialoga com a literatura: o estudo de Uberlândia destaca temperatura
   mínima acima de 18 °C como associada ao aumento de casos.
3. A umidade correlaciona mais fracamente que a temperatura nesta série (0,22).
4. A ordem de grandeza é compatível com a literatura brasileira. O estudo de Foz do
   Iguaçu reporta r = 0,288 para temperatura e r = 0,276 para umidade. Os valores obtidos
   aqui estão na mesma faixa, o que sugere um resultado plausível e não um artefato.

**O que os dados NÃO sustentam — e não pode ser escrito:**

1. **Não há defasagem estatisticamente distinguível.** A curva da temperatura média vai de
   0,42 na defasagem 0 a 0,43 na defasagem 3: uma diferença de 0,01, dentro do ruído de
   uma série de 87 pares. Afirmar que "o clima antecede os casos em três semanas" é ir
   além do dado. A formulação correta é que a correlação se mantém estável em todas as
   defasagens testadas, sem pico definido.
2. **Correlação não é causalidade.** Temperatura e incidência compartilham sazonalidade;
   nada aqui isola o efeito climático de outros fatores sazonais.
3. **A série é curta.** Noventa semanas cobrem aproximadamente dois ciclos sazonais, o que
   é pouco para conclusão sazonal robusta.
4. **Autocorrelação não foi tratada.** Séries temporais epidemiológicas são
   autocorrelacionadas, o que infla a significância aparente de um Pearson simples. O
   coeficiente é descritivo, não inferencial, e o relatório deve dizer isso.

## Sugestão de redação para a seção 2.5

> A aplicação dos indicadores sobre as 90 semanas epidemiológicas disponíveis revelou um
> período marcado por um surto expressivo, com pico na SE 202510 (2.925 casos notificados,
> incidência de 1.225,9 por 100 mil habitantes) e 22 semanas classificadas em nível
> vermelho de alerta, o equivalente a 24,4% do período. O número reprodutivo efetivo na
> última semana disponível (Rt = 0,993) indica tendência de retração da transmissão.
>
> A análise de correlação entre variáveis climáticas e incidência apontou associação
> positiva moderada, mais forte para a temperatura mínima (r = 0,474) do que para a
> temperatura máxima (r = 0,322), resultado convergente com a literatura que identifica a
> temperatura mínima como fator associado à proliferação do vetor. Os coeficientes obtidos
> situam-se na mesma ordem de grandeza reportada por estudos brasileiros anteriores.
>
> Cabe registrar que a variação do coeficiente entre as defasagens testadas foi pequena
> (0,42 a 0,43 para a temperatura média), o que não permite identificar uma defasagem
> preferencial com segurança nesta série. Ressalta-se ainda que correlação não estabelece
> causalidade e que a extensão da série limita conclusões de natureza sazonal.

Ajuste o texto à sua voz antes de entregar — e confira os números contra a saída do
sistema no dia da entrega, porque a API é atualizada semanalmente.
