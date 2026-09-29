# Fontes para a fundamentação teórica (seção 2.3)

Levantamento documental feito em 28/09/2026. **Nada aqui é entrevista.** São fontes
publicadas, para citação em ABNT na fundamentação teórica. A metodologia do relatório
deve declarar pesquisa documental, não coleta de campo.

> **Antes de citar:** abra cada link e confira autor, ano, periódico, volume e páginas.
> O que está abaixo veio de resultados de busca, o que é suficiente para saber *o que
> procurar*, mas não para montar a referência ABNT. Números marcados com **[CONFERIR]**
> não tiveram data ou contexto confirmados.

---

## 1. Relação clima × dengue — o que sustenta a análise central do projeto

O achado mais importante para o trabalho: a literatura já documenta o efeito **defasado**
que o sistema calcula. Isso transforma a escolha de método de "ideia nossa" em decisão
fundamentada.

**Foz do Iguaçu (2006–2016), Revista Ciência, Cuidado e Saúde / SciELO**
Correlação positiva da incidência de dengue com:
- umidade relativa média — r = 0,276 (p = 0,025)
- temperatura média **até dois meses antes** — r = 0,288 (p = 0,014)
- pluviosidade **até três meses antes** — r = 0,308 (p = 0,008)

https://www.scielo.br/j/cenf/a/5RNNYq6ZPwzpfGbFwSgK9nd/abstract/?format=html&lang=pt

Use esta fonte para justificar por que o painel testa defasagens de 0 a 6 semanas em vez
de correlacionar só a semana corrente. Os coeficientes dela também dão uma régua: valores
na faixa de 0,3 são o que a literatura encontra, então um resultado muito acima disso no
seu dado pede desconfiança, não comemoração.

**Uberlândia-MG, Revista Brasileira de Geografia Física**
Aumento de casos associado a temperatura mínima acima de 18 °C, temperatura média entre
26 °C e 28 °C, e umidade relativa acima de 70%.
https://periodicos.ufpe.br/revistas/index.php/rbgfe/article/view/256934

**Revisão sistemática nacional, Revista Brasileira de Epidemiologia / SciELO**
A variação sazonal de temperatura e pluviosidade influenciou a dinâmica do vetor e a
incidência em todo o país, independentemente do compartimento climático.
http://www.scielo.br/j/rbepid/a/TcbcTTkMKgRTnQySbSnpsCh/?lang=pt

Fonte ideal para a frase de abertura da seção 2.3: é revisão, então resume o consenso.

**Maceió, João Pessoa e Salvador, Revista de Geografia (UFPE)**
Relação entre precipitação e registros de casos, com aumento coincidindo com a quadra
chuvosa.
https://periodicos.ufpe.br/revistas/revistageografia/article/view/229408

**Quixadá-CE (2016–2019), Revista Brasileira de Meteorologia / SciELO**
Climatologia e condições sanitárias associadas à ocorrência de dengue e chikungunya.
https://www.scielo.br/j/rbmet/a/nhj6GhqGDnz9JwRCD3WKfcB/?format=html&lang=pt

---

## 2. InfoDengue — a fonte de dados do projeto

Citar a metodologia do sistema, e não apenas o site, é o que diferencia um trabalho que
consome uma API de um que entende o que está consumindo.

**Autoria e coordenação:** Flavio C. Coelho (FGV-EMAp), Cláudia T. Codeço (Fiocruz),
Oswaldo G. Cruz (Fiocruz). Sistema iniciado em 2015 no Rio de Janeiro, nacional em 2021.

**Artigo metodológico principal:**
"InfoDengue: a nowcasting system for the surveillance of dengue fever transmission"
https://www.biorxiv.org/content/10.1101/046193.full.pdf
Versão publicada: https://www.sciencedirect.com/science/article/abs/pii/S0398762018311088

**O que o sistema faz, em termos citáveis:**
- pipeline semi-automatizado de coleta, harmonização e análise, com relatórios semanais
- correção estatística da incidência para remover o efeito do atraso de notificação —
  é exatamente por isso que as semanas recentes vêm com `casos` nulo no seu sistema, e
  é o argumento técnico para nunca tratá-las como zero
- estimativa do número reprodutivo efetivo (Rt) por modelos bayesianos
- classificação semanal em níveis de alerta

**Definição oficial dos níveis** (o painel agora usa exatamente estes):
| Nível | Significado |
|---|---|
| Verde | condições desfavoráveis à transmissão |
| Amarelo | condições favoráveis à transmissão |
| Laranja | transmissão sustentada |
| Vermelho | alta incidência |

**Rt:** número médio de casos secundários gerados por um caso primário no tempo t.
Rt > 1 implica transmissão sustentada. O InfoDengue atribui alerta laranja quando
**Rt > 1 por mais de três semanas**.

> ⚠️ **Divergência a decidir:** a função `tendenciaRt` do seu sistema classifica
> "crescimento" com **duas** semanas consecutivas de Rt > 1, enquanto o InfoDengue usa
> **três** para transmissão sustentada. São indicadores diferentes — o seu é uma
> tendência de curto prazo, o deles é um critério de alerta — mas isso precisa estar
> escrito no relatório, ou soa como erro de implementação. Ver decisão pendente ao final.

**Glossário do InfoDengue** (útil para definir termos na fundamentação):
https://lac.tghn.org/recursos/glossario-infodengue/

---

## 3. Contexto local — justificativa da seção 2.2

**[CONFERIR datas de todas as notícias abaixo antes de citar.]**

**Prefeitura de Marília declarou Situação de Emergência por epidemia de dengue** e
instituiu um Centro de Operações de Emergência (COE).
https://www.marilia.sp.gov.br/portal/noticias/0/3/14247/

**Números citados pela Vigilância Epidemiológica de Marília [CONFERIR período]:**
- 1.879 casos confirmados, 82 com sinais de alarme, 5 casos de dengue grave,
  2 óbitos confirmados e 3 em investigação
- em outro momento, 5.991 casos confirmados

**Queda e retorno ao Alerta Verde:** notificações caíram de 4.781 em abril para 723 em
maio (−84,87%); redução de 73,20% levou o município ao Alerta Verde segundo o InfoDengue.
https://www.marilia.sp.gov.br/portal/noticias/0/3/14963/
https://www.marilia.sp.gov.br/portal/noticias/0/3/14880/

Essa oscilação é um ótimo argumento de justificativa: o município saiu de emergência
declarada para alerta verde em poucos meses, e um painel que mostra essa variação semana
a semana serve justamente para acompanhar esse tipo de virada.

**Contexto estadual:** com 300 casos por 100 mil habitantes, São Paulo entrou em epidemia
de dengue (Agência Brasil, fev/2025).
https://agenciabrasil.ebc.com.br/saude/noticia/2025-02/com-300-casos-por-100-mil-habitantes-sp-entra-em-epidemia-de-dengue

---

## 4. O que ainda falta e só você pode fazer

A fundamentação teórica (2.3) está resolvida com o material acima. A **metodologia (2.4)**
não está: ela precisa dizer como as informações foram levantadas. Dois caminhos honestos:

1. **Declarar pesquisa documental.** A seção 2.4 descreve o levantamento em bases
   científicas e fontes oficiais, sem alegar entrevista. É legítimo e é o que de fato
   aconteceu até agora.
2. **Fazer uma coleta real, ainda que pequena.** Uma conversa com um agente de combate a
   endemias ou um profissional de UBS, ou um formulário curto com 8 a 10 moradores. Aí a
   2.4 ganha o componente empírico que a metodologia da Univesp valoriza.

O caminho 1 já sustenta a entrega de quarta. O caminho 2 pode entrar até o relatório final.

---

## Decisão pendente

**`tendenciaRt` usa 2 semanas; o InfoDengue usa 3 para transmissão sustentada.**
Opções: (a) manter 2 e explicar no relatório que é um indicador próprio de tendência de
curto prazo, distinto do critério de alerta da fonte; (b) mudar para 3 e alinhar à
literatura. A (a) é defensável e não custa retrabalho; a (b) custa uma alteração pequena
no código e nos testes, e fecha a questão antes que alguém pergunte.
