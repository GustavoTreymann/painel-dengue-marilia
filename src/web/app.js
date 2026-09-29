import { montarTabelaSeries, montarTabelaAlertas, montarTabelaClima, pontosClima, formatarNumero } from './tabela.js';

const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A API devolve a tendencia como codigo estavel; aqui vira texto para leitura.
const TEXTO_TENDENCIA = {
  crescimento: 'em crescimento',
  retracao: 'em retração',
  estavel: 'estável',
  indefinida: 'indefinida'
};

async function buscar(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`falha ao carregar ${caminho}`);
  return resposta.json();
}

function preencherIndicadores(dados) {
  const itens = [
    ['Casos no período', formatarNumero(dados.totalCasos)],
    ['Semana de pico', dados.semanaPico ? `${dados.semanaPico.se} (${formatarNumero(dados.semanaPico.casos)} casos)` : 'sem dado'],
    ['Tendência de transmissão', TEXTO_TENDENCIA[dados.tendencia] ?? dados.tendencia],
    ['Nível de alerta vigente', dados.alertas.find((a) => a.nivel === dados.nivelVigente)?.rotulo ?? 'sem dado']
  ];
  document.getElementById('indicadores').innerHTML = itens
    .map(([rotulo, valor]) => `<dt>${rotulo}</dt><dd>${valor}</dd>`).join('');
}

function desenharSerie(semanas) {
  new Chart(document.getElementById('grafico-serie'), {
    type: 'line',
    data: {
      labels: semanas.map((s) => s.se),
      datasets: [
        { label: 'Casos notificados', data: semanas.map((s) => s.casos), borderColor: '#0b5c8a' },
        { label: 'Média móvel (3 semanas)', data: semanas.map((s) => s.mediaMovel), borderColor: '#8a3b0b', borderDash: [6, 4] }
      ]
    },
    options: { animation: !semAnimacao, scales: { y: { beginAtZero: true } } }
  });
}

function desenharAlertas(alertas) {
  document.getElementById('tabela-alertas').innerHTML = montarTabelaAlertas(alertas);

  new Chart(document.getElementById('grafico-alertas'), {
    type: 'bar',
    data: {
      labels: alertas.map((a) => a.rotulo),
      datasets: [{
        label: 'Semanas no nível',
        data: alertas.map((a) => a.semanas),
        // Cores do protocolo de alerta, sempre acompanhadas do rotulo textual:
        // a informacao nunca depende so da cor.
        backgroundColor: ['#1b7a3d', '#8a6d00', '#8a4b00', '#9c1c1c']
      }]
    },
    options: { animation: !semAnimacao, scales: { y: { beginAtZero: true } } }
  });
}

function desenharClima(semanas) {
  const pontos = pontosClima(semanas).map((s) => ({ x: s.tempMed, y: s.inc100k }));

  new Chart(document.getElementById('grafico-clima'), {
    type: 'scatter',
    data: { datasets: [{ label: 'Semana', data: pontos, backgroundColor: '#0b5c8a' }] },
    options: {
      animation: !semAnimacao,
      scales: {
        x: { title: { display: true, text: 'Temperatura média (°C)' } },
        y: { title: { display: true, text: 'Incidência por 100 mil habitantes' } }
      }
    }
  });
}

function ligarAlternadores(tabelas) {
  document.querySelectorAll('button.alternar').forEach((botao) => {
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
  try {
    const [serie, indicadores, clima, status] = await Promise.all([
      buscar('/api/series'), buscar('/api/indicadores'), buscar('/api/clima'), buscar('/api/status')
    ]);

    document.getElementById('atualizacao').textContent = status.ultimaAtualizacao
      ? `Dados atualizados em ${new Date(status.ultimaAtualizacao).toLocaleString('pt-BR')} - ${status.semanasEmBase} semanas em base.`
      : 'Carga inicial em andamento. Recarregue em alguns instantes.';

    preencherIndicadores(indicadores);
    desenharSerie(serie.semanas);
    desenharAlertas(indicadores.alertas);
    desenharClima(serie.semanas);
    ligarAlternadores({
      serie: montarTabelaSeries(serie.semanas),
      'tabela-clima': montarTabelaClima(serie.semanas)
    });

    const t = clima.temperatura;
    document.getElementById('resumo-clima').textContent = t.coeficiente === null
      ? 'Ainda não há dados suficientes para calcular a correlação.'
      : resumirClima(t);
  } catch (falha) {
    document.getElementById('atualizacao').textContent =
      'Não foi possível carregar os dados agora. Tente novamente em instantes.';
  }
}

iniciar();
