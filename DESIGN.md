---
name: Painel de vigilância da dengue em Marília
description: Ficha de campo do agente de endemias preenchida à mão, com dados abertos do InfoDengue.
colors:
  via: "#F3DC4E"
  papel: "#FFFFFF"
  tinta: "#123F36"
  tinta-suave: "#4F5F58"
  caneta: "#2140B4"
  caneta-recuo: "#6F80C8"
  grafite: "#5E6660"
  filete: "#123F36"
  filete-claro: "#C9D3CE"
  nivel-1: "#1B7A3D"
  nivel-2: "#D4A900"
  nivel-3: "#D2600C"
  nivel-4: "#A31D1D"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.1rem + 2.1vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 88"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.1
    fontFeature: "'tnum'"
  casela:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 600
    fontFeature: "'tnum'"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "'tnum'"
  body-anotacao:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label-campo:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 800
    letterSpacing: "0.12em"
    fontVariation: "'wdth' 70"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    letterSpacing: "0.12em"
    fontVariation: "'wdth' 70"
  label-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.12em"
    fontVariation: "'wdth' 70"
rounded:
  none: "0px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  campos: "2.75rem"
  calha: "3rem"
  margem: "clamp(1rem, 3.9vw, 3.5rem)"
components:
  button-alternar:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "0.4375rem 0.875rem"
    height: "2.75rem"
  button-alternar-hover:
    backgroundColor: "{colors.via}"
    textColor: "{colors.tinta}"
  button-alternar-aberto:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
  casela:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.caneta}"
    typography: "{typography.casela}"
    rounded: "{rounded.none}"
    width: "2.75rem"
    height: "3.625rem"
  amostra-nivel:
    rounded: "{rounded.none}"
    width: "1.375rem"
    height: "1.375rem"
  faixa-alerta:
    backgroundColor: "{colors.filete-claro}"
    rounded: "{rounded.none}"
    height: "1.75rem"
  via:
    backgroundColor: "{colors.via}"
    textColor: "{colors.tinta}"
    padding: "1.5rem clamp(1rem, 3.9vw, 3.5rem) 1.25rem"
---

# Design System: Painel de vigilância da dengue em Marília

## Overview

**Creative North Star: "A Ficha de Campo"**

O painel é a 2ª via amarela de um formulário de vigilância preenchido à mão pelo agente de combate às endemias. O formulário (impresso) e o que foi anotado nele (à caneta) são duas camadas que nunca se confundem: tudo o que é estrutura, rótulo e texto sai em tinta verde de impressão; tudo o que é dado medido sai em azul de esferográfica. A faixa amarela de carbono no topo é a casca; o resto é folha branca dividida por filetes.

A densidade é de formulário, não de dashboard: campos numerados (01 a 04) separados por filetes, sem cartões, sem sombras, sem cantos arredondados. A hierarquia vem de uma família só (Archivo), modulada pelo eixo de largura: rótulos de campo em versalete condensado, título em largura 88%, corpo em largura normal, números sempre tabulares. Os números principais ficam em caselas, uma caixa por algarismo, como num formulário preenchido a lápis.

O único movimento da página é a escrita das caselas; os gráficos chegam prontos. As cores oficiais de alerta do InfoDengue nunca aparecem sem o rótulo de texto correspondente.

**Key Characteristics:**
- Duas tintas: verde de impressão para o formulário, azul de caneta para o dado anotado.
- Filetes de 1px fazem toda a divisão; 2px só nas bordas da folha (faixa e rodapé).
- Uma família (Archivo), hierarquia pelo eixo de largura; numerais tabulares alinhados à direita.
- Caselas (caixas por algarismo) carregam os números de destaque.
- Plano, sem sombra, sem raio.
- Semana em consolidação é tracejada, nunca um valor.

## Colors

Paleta de papel e tinta: um amarelo de carbono, branco, um verde de impressão quase preto, um azul de esferográfica e quatro cores oficiais de alerta.

### Primary
- **Azul de Esferográfica** (caneta): a voz do dado. Valores anotados nos campos, dígitos das caselas, semana atual na faixa amarela, células de tabela numéricas, a série de casos recente no gráfico, a dispersão clima x incidência, links e o anel de foco (3px). Nunca em rótulo, título ou estrutura.
- **Azul Recuado** (caneta-recuo): o histórico um tom atrás. Série de casos fora das 8 semanas mais recentes e o traço da semana em consolidação.

### Secondary
- **Amarelo de Carbono** (via): a casca. Fundo da faixa de topo, `theme-color`, seleção de texto e o hover do botão de alternar. Não é o amarelo de alerta e não substitui o nível 2.

### Neutral
- **Verde de Impressão** (tinta; também filete): todo o texto, títulos, rótulos, bordas de casela, filetes estruturais, cabeçalho de tabela, contorno das amostras de nível, fundo do tooltip e do botão aberto.
- **Verde de Impressão Suave** (tinta-suave): rótulos secundários (dt dos indicadores, numeração dos campos, legendas, notas), ticks dos gráficos. 6,6:1 sobre branco.
- **Grafite** (grafite): marcas de apoio, a média móvel tracejada.
- **Filete Claro** (filete-claro): divisões internas (entre indicadores, entre linhas de tabela), grade dos gráficos, fundo da faixa vazia.
- **Papel** (papel): a folha.

### Tertiary: níveis de alerta (InfoDengue)
- **Verde de Alerta** (nivel-1), **Amarelo de Alerta** (nivel-2), **Laranja de Alerta** (nivel-3), **Vermelho de Alerta** (nivel-4): somente para nível de alerta, nas amostras, na faixa semanal, nos quadradinhos da legenda e nas barras de distribuição, sempre com contorno em tinta.

### Named Rules
**The Two Inks Rule.** Tinta verde é o formulário; caneta azul é o que foi anotado nele. Se o valor veio dos dados, é azul; se o texto estaria impresso na ficha em branco, é verde.

**The Label-Before-Colour Rule.** Cor de alerta nunca aparece sozinha: amostra ao lado do nome do nível, faixa com legenda nomeada e leitura em texto da semana focada, barras com o rótulo no eixo.

**The Paleta Única Rule.** As cores existem só nas custom properties de `:root`; os gráficos as leem de lá em tempo de execução.

## Typography

**Display Font:** Archivo (com system-ui, sans-serif)
**Body Font:** Archivo
**Label/Mono Font:** Archivo condensado (eixo `wdth` 70)

**Character:** Uma grotesca de formulário oficial, usada inteira: o eixo de largura faz o papel que outra família faria. Versaletes condensados e espaçados soam como campos impressos; o peso 600 a 650 dos números soa como escrita firme.

### Hierarchy
- **Display** (800, clamp 1,75 a 2,75rem, 1,05, largura 88%, -0,01em, máx. 18ch, `text-wrap: balance`): só o h1 na faixa amarela.
- **Headline** (650, 2rem, 1,1): a semana epidemiológica atual, em caneta, à direita da faixa.
- **Casela** (600, 2,125rem; 1,75rem abaixo de 40rem; 1,5rem abaixo de 22,5rem): dígitos dentro das caselas, em caneta.
- **Title** (650, 1,25rem, 1,3): valor de cada indicador (dd).
- **Body** (400, 1rem, 1,55): texto corrido; anotações analíticas a 1,0625rem / 1,6, máx. 62ch. Tabelas a 0,9375rem.
- **Label de campo** (800, 0,9375rem, 0,12em, versal, largura 70%): títulos numerados dos campos (h2), número em tinta-suave peso 600.
- **Label** (700, 0,8125rem, 0,12em, versal, largura 70%): rótulo da faixa, legendas, cabeçalhos de coluna; 0,75rem nos dt dos indicadores.

### Named Rules
**The One Family Rule.** Só Archivo. Hierarquia por peso e largura, nunca por uma segunda família.

**The Tabular Rule.** `tabular-nums` no corpo inteiro; colunas numéricas alinham à direita, colunas de texto à esquerda.

## Layout

Folha centralizada com largura máxima de 90rem e margem lateral fluida (clamp 1rem a 3,5rem), repetida na faixa, na folha e no rodapé. Acima de 72rem a folha tem duas colunas: indicadores à esquerda (17 a 27,5rem) e a série à direita; campos 03 e 04 ocupam a largura toda. Espaço entre campos: 2,75rem vertical, 3rem de calha. Dentro dos campos 03 e 04, texto e gráfico lado a lado (2:3 e 1:2).

Responsivo: abaixo de 72rem a folha vira uma coluna e os indicadores se distribuem em 2 colunas; abaixo de 60rem os pares lado a lado empilham; abaixo de 40rem indicadores em 1 coluna, a faixa amarela alinha à esquerda e as caselas encolhem; abaixo de 22,5rem as tabelas apertam para caber em 320px sem rolagem lateral. Ritmo de espaçamento em passos de 0,25rem a 3rem; alvos de toque com no mínimo 2,75rem.

## Elevation & Depth

Totalmente plano. Não há sombra em lugar nenhum; a profundidade é só a camada da faixa amarela sobre a folha, fechada por um filete de 2px. Foco e seleção são contornos, não elevação (anel de 3px em caneta com offset de 2px; célula ativa da faixa com contorno de 2px em tinta).

**The Flat Sheet Rule.** Papel não flutua. Nada de `box-shadow`, nada de cartões; separação é filete ou espaço.

## Shapes

Raio zero em tudo, inclusive no tooltip do Chart.js (`cornerRadius: 0`). A forma recorrente é a caixa retangular de contorno fino: casela, amostra de nível (2px), quadradinho de legenda (1px), célula da faixa. Filetes: 1px em tinta no topo de cada campo e nas bordas das tabelas; 1px em filete-claro entre itens; 2px em tinta só na base da faixa amarela e no topo do rodapé. Traços de legenda reproduzem os traços dos gráficos: contínuo 3px (casos), tracejado 2px (média), tracejado 3px recuado (consolidação).

**The Filete Rule.** Toda divisão é um filete horizontal ou uma caixa de contorno fino. Nenhum fundo colorido delimita área, exceto a faixa amarela.

## Components

### Buttons
Um único botão, de formulário: retângulo branco de contorno 1px em tinta.
- **Shape:** sem raio, altura mínima 2,75rem.
- **Primary (alternar tabela):** papel com texto em tinta, 0,9375rem peso 600, padding 0,4375rem 0,875rem. Fica no cabeçalho do campo, à direita do título.
- **Hover / Focus:** fundo amarelo de carbono (transição de 140ms ease-out); foco com o anel global em caneta.
- **Aberto (`aria-expanded="true"`):** inverte para fundo tinta e texto papel.

### Cards / Containers
Não há cartões. O contêiner é o **campo**: filete de 1px em tinta no topo, 0,625rem de respiro, título numerado. Indicadores são pares rótulo/valor separados por filete-claro, com padding 1rem / 1,25rem.

### Navigation
Só o link "Pular para o conteúdo", fora da tela até receber foco, então fixo no canto com contorno em tinta. Links em caneta, sublinhado de 1px que engrossa para 2px no hover.

### Caselas (componente assinatura)
Números de destaque (casos no período, semana de pico) escritos um algarismo por caixa: 2,75 x 3,625rem, contorno 1px em tinta, dígito em caneta. Separadores de grupo são caixas estreitas (1rem) sem borda superior e inferior. Ao carregar, cada dígito é "escrito" da esquerda para a direita (clip-path, 420ms `cubic-bezier(0.16, 1, 0.3, 1)`, 55ms de atraso por caixa). Estado vazio: caixas sem dígito. O valor falado vai em texto oculto; as caixas são `aria-hidden`.

### Faixa de alerta
Uma célula de largura exata por semana, colorida pelo nível, dentro de um contorno de 1px em tinta, 1,75rem de altura. É um slider acessível: setas percorrem as semanas, a célula ativa ganha contorno de 2px, as demais caem para 35% de opacidade (160ms), e uma linha de leitura em caneta diz semana, nível e casos. Legenda abaixo: semana inicial, quadradinhos nomeados dos níveis, semana final.

### Gráficos (Chart.js)
Fonte da página a 13px, ticks em tinta-suave, grade em filete-claro, sem grade vertical, sem legenda nativa (a legenda é HTML), tooltip em tinta sem raio, sem animação. Série de casos em caneta 2,5px com ponto de 5px só na última semana; histórico em caneta-recuo; média móvel em grafite tracejada [7, 5]; consolidação tracejada [3, 4] cruzando o vazio sem inventar valor. Barras de nível com contorno 1px em tinta.

### Tabelas
Cabeçalho de coluna em label condensado, fixo no topo da rolagem, filete de 1px em tinta abaixo. Linhas separadas por filete-claro; valores numéricos em caneta, à direita; primeira coluna e colunas de texto à esquerda, em tinta. Rolagem limitada a 30rem entre dois filetes em tinta.

## Do's and Don'ts

### Do:
- **Do** escrever todo valor vindo dos dados em caneta (#2140B4) e todo texto de formulário em tinta (#123F36).
- **Do** dividir com filetes: 1px em tinta no topo de cada campo, 1px em filete-claro entre itens, 2px só nas bordas da folha.
- **Do** numerar os campos (01, 02...) no título em versalete condensado, número em tinta-suave.
- **Do** acompanhar toda cor de alerta com o nome do nível em texto.
- **Do** desenhar a semana em consolidação como traço tracejado e escrever "em consolidação" no lugar do número.
- **Do** dar a cada gráfico a sua tabela equivalente, aberta pelo botão de alternar.
- **Do** ler as cores dos gráficos das custom properties de `:root`.

### Don't:
- **Don't** usar sombra, cartão ou canto arredondado em nenhum elemento.
- **Don't** usar caneta azul em títulos, rótulos ou estrutura; ela é só para dado anotado.
- **Don't** usar o amarelo de carbono (#F3DC4E) como cor de alerta nem o amarelo de alerta (#D4A900) como fundo.
- **Don't** introduzir uma segunda família tipográfica.
- **Don't** animar os gráficos; o único movimento de entrada é a escrita das caselas, e tudo cai com `prefers-reduced-motion`.
