import { montarTabelaSeries, montarTabelaAlertas, montarTabelaClima, pontosClima, formatarNumero, formatarSE } from './tabela.js';

const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A API devolve a tendencia como codigo estavel; aqui vira texto para leitura.
const TEXTO_TENDENCIA = {
  crescimento: 'em crescimento',
  retracao: 'em retração',
  estavel: 'estável',
  indefinida: 'indefinida'
};

// Le as cores da folha de estilo: a paleta existe em um lugar so.
const css = getComputedStyle(document.documentElement);
const cor = (nome) => css.getPropertyValue(`--${nome}`).trim();
const COR = {
  tinta: cor('tinta'),
  tintaSuave: cor('tinta-suave'),
  caneta: cor('caneta'),
  canetaRecuo: cor('caneta-recuo'),
  grafite: cor('grafite'),
  fileteClaro: cor('filete-claro'),
  niveis: [cor('nivel-1'), cor('nivel-2'), cor('nivel-3'), cor('nivel-4')]
};

// Semanas finais com tinta cheia; o historico fica um tom atras.
const SEMANAS_EM_DESTAQUE = 8;
// Tracejado da semana em consolidacao; a legenda desenha o mesmo traco.
const TRACO_CONSOLIDACAO = [3, 4];

Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
Chart.defaults.font.size = 13;
Chart.defaults.color = COR.tintaSuave;
Chart.defaults.borderColor = COR.fileteClaro;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = COR.tinta;
Chart.defaults.plugins.tooltip.cornerRadius = 0;
Chart.defaults.plugins.tooltip.padding = 10;
// O unico movimento da pagina e a escrita das caselas; os graficos chegam prontos.
Chart.defaults.animation = false;

async function buscar(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`falha ao carregar ${caminho}`);
  return resposta.json();
}

/** Primeira parte do rotulo do nivel: "Verde - condicoes..." vira "Verde". */
const corDoNivel = (rotulo) => rotulo?.split(' - ')[0] ?? rotulo;

/** Algarismos em caselas; leitor de tela recebe o numero inteiro. */
function caselas(texto, falado = texto) {
  let i = 0;
  const caixas = [...texto].map((c) => (/\d/.test(c)
    ? `<span style="--i:${i++}">${c}</span>`
    : '<span class="sep"></span>')).join('');
  return `<span class="pente" aria-hidden="true">${caixas}</span><span class="sr">${falado}</span>`;
}

/**
 * Caselas em branco: o campo existe, so ainda nao foi preenchido. O modelo
 * repete o agrupamento do valor final para a ficha nao mudar de forma ao carregar.
 */
const caselasVazias = (modelo) => `<span class="pente vazio" aria-hidden="true">${
  [...modelo].map((c) => (/\d/.test(c) ? '<span></span>' : '<span class="sep"></span>')).join('')}</span>`;

const campo = (rotulo, valor) => `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`;

function mostrarCarregando() {
  document.getElementById('indicadores').innerHTML = [
    campo('Nível de alerta vigente', '<span class="aguardando">Carregando dados...</span>'),
    campo('Tendência de transmissão', '<span class="aguardando">Carregando dados...</span>'),
    campo('Casos no período', caselasVazias('00.000')),
    campo('Semana de pico', caselasVazias('0000/00'))
  ].join('');
}

function mostrarFalha() {
  const lista = document.getElementById('indicadores');
  lista.innerHTML = campo('Situação dos dados',
    '<span class="falha">Não foi possível carregar os dados agora.</span>'
    + '<button type="button" class="alternar" id="tentar-novamente">Tentar novamente</button>');
  document.getElementById('tentar-novamente').addEventListener('click', () => {
    document.getElementById('atualizacao').textContent = 'Carregando dados...';
    iniciar();
  });
}

function preencherIndicadores(dados) {
  const vigente = dados.alertas.find((a) => a.nivel === dados.nivelVigente);
  const rt = dados.rtAtual === null || dados.rtAtual === undefined
    ? '' : `<span class="nota">Rt da última semana consolidada: <span class="anotado">${formatarNumero(dados.rtAtual, 2)}</span></span>`;

  // A situacao atual vem antes do historico do periodo.
  const itens = [
    campo('Nível de alerta vigente', vigente
      ? `<span class="nivel"><span class="amostra" data-nivel="${vigente.nivel}"></span><span>${vigente.rotulo}</span></span>`
      : 'sem dado'),
    campo('Tendência de transmissão',
      `<span class="anotado">${TEXTO_TENDENCIA[dados.tendencia] ?? dados.tendencia}</span>${rt}`),
    campo('Casos no período', `${caselas(formatarNumero(dados.totalCasos))}`
      + `<span class="nota">${formatarNumero(dados.semanasEmBase)} semanas em base</span>`),
    campo('Semana de pico', dados.semanaPico
      ? `${caselas(formatarSE(dados.semanaPico.se), `semana ${formatarSE(dados.semanaPico.se)}`)}`
        + `<span class="nota">${formatarNumero(dados.semanaPico.casos)} casos</span>`
      : 'sem dado')
  ];

  const lista = document.getElementById('indicadores');
  lista.innerHTML = itens.join('');
  if (!semAnimacao) lista.classList.add('escrita');
}

/**
 * Faixa com uma celula de largura exata por semana, colorida pelo nivel.
 * E um controle deslizante: ponteiro ou setas escolhem a semana, e a mesma
 * semana acende na curva.
 */
function desenharFaixa(semanas, grafico) {
  const faixa = document.getElementById('faixa-alerta');
  const leitura = document.getElementById('faixa-leitura');
  faixa.innerHTML = semanas.map((s) => `<span data-nivel="${s.nivel ?? ''}"></span>`).join('');

  const niveis = [1, 2, 3, 4].map((n) => `<span><i style="background:${COR.niveis[n - 1]}"></i>${
    corDoNivel(semanas.find((s) => s.nivel === n)?.rotuloNivel) ?? ['Verde', 'Amarelo', 'Laranja', 'Vermelho'][n - 1]}</span>`).join('');
  document.getElementById('faixa-legenda').innerHTML = semanas.length
    ? `<span>SE ${formatarSE(semanas[0].se)}</span><span class="faixa-niveis">${niveis}</span><span>SE ${formatarSE(semanas[semanas.length - 1].se)}</span>`
    : '';

  const descrever = (s) => `SE ${formatarSE(s.se)} · ${corDoNivel(s.rotuloNivel) ?? 'nível em consolidação'} · `
    + `${s.casos === null ? 'casos em consolidação' : `${formatarNumero(s.casos)} casos`}`;

  const celulas = [...faixa.children];
  const ultima = semanas.length - 1;
  let atual = null;

  faixa.setAttribute('aria-valuemax', String(Math.max(ultima, 0)));
  const definirValor = (i) => {
    faixa.setAttribute('aria-valuenow', String(i));
    faixa.setAttribute('aria-valuetext', descrever(semanas[i]));
  };
  if (semanas.length) {
    definirValor(ultima);
    leitura.textContent = descrever(semanas[ultima]);
  }

  const focar = (indice) => {
    atual = indice;
    faixa.classList.toggle('focada', indice !== null);
    celulas.forEach((c, i) => c.classList.toggle('ativa', i === indice));
    // Em repouso, a leitura mostra a semana mais recente.
    leitura.textContent = semanas.length ? descrever(semanas[indice ?? ultima]) : '';
    if (indice !== null) definirValor(indice);
    const ativos = indice === null || semanas[indice].casos === null
      ? [] : [{ datasetIndex: 0, index: indice }];
    grafico.setActiveElements(ativos);
    grafico.tooltip.setActiveElements(ativos, { x: 0, y: 0 });
    grafico.update('none');
  };

  faixa.addEventListener('pointermove', (e) => {
    const i = celulas.indexOf(e.target);
    if (i >= 0) focar(i);
  });
  faixa.addEventListener('pointerleave', () => {
    if (document.activeElement !== faixa) focar(null);
  });
  faixa.addEventListener('focus', () => focar(atual ?? ultima));
  faixa.addEventListener('blur', () => focar(null));
  faixa.addEventListener('keydown', (e) => {
    const passos = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -4, PageUp: 4 };
    let destino = null;
    if (e.key in passos) destino = (atual ?? ultima) + passos[e.key];
    else if (e.key === 'Home') destino = 0;
    else if (e.key === 'End') destino = ultima;
    if (destino === null) return;
    e.preventDefault();
    focar(Math.min(ultima, Math.max(0, destino)));
  });

  // A faixa ocupa a mesma largura da area de plotagem: cada celula fica
  // em cima da sua semana na curva.
  const alinhar = () => {
    const { left, right } = grafico.chartArea;
    const recuo = { marginLeft: `${left}px`, marginRight: `${grafico.width - right}px` };
    Object.assign(faixa.style, recuo);
    Object.assign(document.getElementById('faixa-legenda').style, recuo);
    Object.assign(leitura.style, recuo);
  };
  alinhar();
  grafico.options.onResize = () => requestAnimationFrame(alinhar);
}

function desenharSerie(semanas) {
  const total = semanas.length;
  const recente = (i) => i >= total - SEMANAS_EM_DESTAQUE;
  document.getElementById('legenda-consolidacao').hidden = !semanas.some((s) => s.casos === null);

  return new Chart(document.getElementById('grafico-serie'), {
    type: 'line',
    data: {
      labels: semanas.map((s) => s.se),
      datasets: [
        {
          label: 'Casos notificados',
          data: semanas.map((s) => s.casos),
          borderColor: COR.caneta,
          borderWidth: 2.5,
          pointRadius: semanas.map((_, i) => (i === total - 1 ? 5 : 0)),
          pointBackgroundColor: COR.caneta,
          pointHoverRadius: 5,
          spanGaps: true,
          // Semana em consolidacao e tracejada: a linha cruza o vazio sem inventar valor.
          segment: {
            borderColor: (ctx) => (ctx.p0.skip || ctx.p1.skip || !recente(ctx.p1DataIndex)
              ? COR.canetaRecuo : COR.caneta),
            borderDash: (ctx) => (ctx.p0.skip || ctx.p1.skip ? TRACO_CONSOLIDACAO : undefined)
          }
        },
        {
          label: 'Média móvel (3 semanas)',
          data: semanas.map((s) => s.mediaMovel),
          borderColor: COR.grafite,
          borderWidth: 2,
          borderDash: [7, 5],
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: 0,
            autoSkipPadding: 24,
            callback(valor) { return formatarSE(this.getLabelForValue(valor)); }
          }
        },
        y: { beginAtZero: true, ticks: { callback: (v) => formatarNumero(v) } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (itens) => `SE ${formatarSE(itens[0].label)}`,
            label: (item) => `${item.dataset.label}: ${item.raw === null ? 'em consolidação' : formatarNumero(item.raw, item.datasetIndex ? 1 : 0)}`
          }
        }
      }
    }
  });
}

function desenharAlertas(alertas) {
  document.getElementById('tabela-alertas').innerHTML = montarTabelaAlertas(alertas);

  new Chart(document.getElementById('grafico-alertas'), {
    type: 'bar',
    data: {
      labels: alertas.map((a) => corDoNivel(a.rotulo)),
      datasets: [{
        label: 'Semanas no nível',
        data: alertas.map((a) => a.semanas),
        // Cores do protocolo de alerta, sempre acompanhadas do rotulo textual:
        // a informacao nunca depende so da cor.
        backgroundColor: alertas.map((a) => COR.niveis[a.nivel - 1]),
        borderColor: COR.tinta,
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.9
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { color: COR.tinta, font: { weight: 600 } } }
      }
    }
  });
}

function desenharClima(semanas) {
  const pontos = pontosClima(semanas).map((s) => ({ x: s.tempMed, y: s.inc100k, se: s.se }));

  new Chart(document.getElementById('grafico-clima'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Semana',
        data: pontos,
        backgroundColor: `${COR.caneta}8C`, // caneta com 55% de opacidade
        borderColor: COR.caneta,
        borderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Temperatura média na mesma semana (°C)', color: COR.tinta } },
        y: { beginAtZero: true, title: { display: true, text: 'Incidência por 100 mil habitantes', color: COR.tinta } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (itens) => `SE ${formatarSE(itens[0].raw.se)}`,
            label: (item) => `${formatarNumero(item.raw.x, 1)} °C · ${formatarNumero(item.raw.y, 2)} por 100 mil`
          }
        }
      }
    }
  });
}

function ligarAlternadores(tabelas) {
  document.querySelectorAll('button.alternar[data-alvo]').forEach((botao) => {
    const alvo = document.getElementById(botao.dataset.alvo);
    alvo.innerHTML = tabelas[botao.dataset.alvo];
    botao.addEventListener('click', () => {
      const aberto = botao.getAttribute('aria-expanded') === 'true';
      botao.setAttribute('aria-expanded', String(!aberto));
      botao.textContent = aberto ? 'Ver dados em tabela' : 'Ocultar tabela';
      alvo.hidden = aberto;
    });
  });
}

// Mostra a faixa entre defasagens junto do maximo: se a faixa e estreita,
// o "melhor" atraso nao se distingue dos demais e o texto nao deve sugerir o contrario.
function resumirClima(t) {
  const validos = t.porDefasagem.filter((d) => d.coeficiente !== null).map((d) => d.coeficiente);
  const menor = Math.min(...validos);
  return `A correlação entre temperatura média e incidência variou de ${formatarNumero(menor, 2)} a ${formatarNumero(t.coeficiente, 2)} `
    + `entre as defasagens de 0 a ${t.porDefasagem.length - 1} semanas; o maior valor ocorre com ${t.defasagem} semana(s), sobre ${t.n} semanas. `
    + 'Correlação não estabelece causalidade.';
}

async function iniciar() {
  const conteudo = document.getElementById('conteudo');
  conteudo.setAttribute('aria-busy', 'true');
  mostrarCarregando();
  try {
    // O canvas nao redesenha quando a fonte chega: espera por ela antes dos graficos.
    const [serie, indicadores, clima, status] = await Promise.all([
      buscar('/api/series'), buscar('/api/indicadores'), buscar('/api/clima'), buscar('/api/status'),
      document.fonts.ready
    ]);

    document.getElementById('atualizacao').textContent = status.ultimaAtualizacao
      ? `Dados atualizados em ${new Date(status.ultimaAtualizacao).toLocaleString('pt-BR')} - ${status.semanasEmBase} semanas em base.`
      : 'Carga inicial em andamento. Recarregue em alguns instantes.';

    const semanas = serie.semanas;
    if (semanas.length) {
      document.getElementById('semana-atual').textContent = `SE ${formatarSE(semanas[semanas.length - 1].se)}`;
    }

    preencherIndicadores(indicadores);
    const grafico = desenharSerie(semanas);
    desenharFaixa(semanas, grafico);
    desenharAlertas(indicadores.alertas);
    desenharClima(semanas);
    ligarAlternadores({
      serie: montarTabelaSeries(semanas),
      'tabela-clima': montarTabelaClima(semanas)
    });

    const t = clima.temperatura;
    document.getElementById('resumo-clima').textContent = t.coeficiente === null
      ? 'Ainda não há dados suficientes para calcular a correlação.'
      : resumirClima(t);
  } catch (falha) {
    document.getElementById('atualizacao').textContent =
      'Não foi possível carregar os dados agora. Tente novamente em instantes.';
    mostrarFalha();
  } finally {
    conteudo.removeAttribute('aria-busy');
  }
}

iniciar();
