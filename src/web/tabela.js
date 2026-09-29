const SEM_DADO = 'em consolidacao';

function celula(valor, casas = 0) {
  if (valor === null || valor === undefined) return SEM_DADO;
  return Number(valor).toFixed(casas);
}

/**
 * Tabela equivalente ao grafico de series. Existe para que quem usa
 * leitor de tela tenha acesso ao mesmo dado: canvas nao e legivel.
 */
export function montarTabelaSeries(semanas) {
  const linhas = semanas.map((s) => `
      <tr>
        <th scope="row">${s.se}</th>
        <td>${celula(s.casos)}</td>
        <td>${celula(s.mediaMovel, 1)}</td>
        <td>${s.rotuloNivel ?? SEM_DADO}</td>
      </tr>`).join('');

  return `
    <table>
      <caption>Casos de dengue por semana epidemiologica em Marilia, com media movel de tres semanas e nivel de alerta</caption>
      <thead>
        <tr>
          <th scope="col">Semana</th>
          <th scope="col">Casos notificados</th>
          <th scope="col">Media movel (3 semanas)</th>
          <th scope="col">Nivel de alerta</th>
        </tr>
      </thead>
      <tbody>${linhas}
      </tbody>
    </table>`;
}

/** Tabela equivalente ao grafico de barras de niveis de alerta. */
export function montarTabelaAlertas(alertas) {
  const linhas = alertas.map((a) => `
      <tr>
        <th scope="row">${a.rotulo}</th>
        <td>${a.semanas}</td>
        <td>${a.percentual}%</td>
      </tr>`).join('');

  return `
    <table>
      <caption>Quantidade de semanas epidemiologicas em cada nivel de alerta</caption>
      <thead>
        <tr>
          <th scope="col">Nivel de alerta</th>
          <th scope="col">Semanas</th>
          <th scope="col">Percentual do periodo</th>
        </tr>
      </thead>
      <tbody>${linhas}
      </tbody>
    </table>`;
}
