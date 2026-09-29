import { montarTabelaSeries, montarTabelaAlertas } from './tabela.js';

const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function buscar(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`falha ao carregar ${caminho}`);
  return resposta.json();
}

function preencherIndicadores(dados) {
  const itens = [
    ['Casos no periodo', dados.totalCasos],
    ['Semana de pico', dados.semanaPico ? `${dados.semanaPico.se} (${dados.semanaPico.casos} casos)` : 'sem dado'],
    ['Tendencia de transmissao', dados.tendencia],
    ['Nivel de alerta vigente', dados.alertas.find((a) => a.nivel === dados.nivelVigente)?.rotulo ?? 'sem dado']
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
        { label: 'Media movel (3 semanas)', data: semanas.map((s) => s.mediaMovel), borderColor: '#8a3b0b', borderDash: [6, 4] }
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
        label: 'Semanas no nivel',
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
  const pontos = semanas
    .filter((s) => !s.parcial && s.tempMed !== null && s.inc100k !== null)
    .map((s) => ({ x: s.tempMed, y: s.inc100k }));

  new Chart(document.getElementById('grafico-clima'), {
    type: 'scatter',
    data: { datasets: [{ label: 'Semana', data: pontos, backgroundColor: '#0b5c8a' }] },
    options: {
      animation: !semAnimacao,
      scales: {
        x: { title: { display: true, text: 'Temperatura media (C)' } },
        y: { title: { display: true, text: 'Incidencia por 100 mil habitantes' } }
      }
    }
  });
}

function ligarAlternadores(semanas) {
  document.querySelectorAll('button.alternar').forEach((botao) => {
    const alvo = document.getElementById(botao.dataset.alvo);
    alvo.innerHTML = montarTabelaSeries(semanas);
    botao.addEventListener('click', () => {
      const aberto = botao.getAttribute('aria-expanded') === 'true';
      botao.setAttribute('aria-expanded', String(!aberto));
      botao.textContent = aberto ? 'Ver dados em tabela' : 'Ocultar tabela';
      alvo.hidden = aberto;
    });
  });
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
    ligarAlternadores(serie.semanas);

    const t = clima.temperatura;
    document.getElementById('resumo-clima').textContent = t.coeficiente === null
      ? 'Ainda nao ha dados suficientes para calcular a correlacao.'
      : `A maior correlacao entre temperatura media e incidencia ocorre com defasagem de ${t.defasagem} semana(s), com coeficiente de ${t.coeficiente.toFixed(2)} sobre ${t.n} semanas. Correlacao nao estabelece causalidade.`;
  } catch (falha) {
    document.getElementById('atualizacao').textContent =
      'Nao foi possivel carregar os dados agora. Tente novamente em instantes.';
  }
}

iniciar();
