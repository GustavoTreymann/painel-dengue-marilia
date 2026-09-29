const SEM_DADO = 'em consolidação';

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
      <caption>Casos de dengue por semana epidemiológica em Marília, com média móvel de três semanas e nível de alerta</caption>
      <thead>
        <tr>
          <th scope="col">Semana</th>
          <th scope="col">Casos notificados</th>
          <th scope="col">Média móvel (3 semanas)</th>
          <th scope="col">Nível de alerta</th>
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
      <caption>Quantidade de semanas epidemiológicas em cada nível de alerta</caption>
      <thead>
        <tr>
          <th scope="col">Nível de alerta</th>
          <th scope="col">Semanas</th>
          <th scope="col">Percentual do período</th>
        </tr>
      </thead>
      <tbody>${linhas}
      </tbody>
    </table>`;
}

/**
 * Semanas que entram no grafico de dispersao. Grafico e tabela usam o
 * mesmo filtro para que a tabela seja de fato equivalente ao grafico.
 */
export function pontosClima(semanas) {
  return semanas.filter((s) => !s.parcial
    && s.tempMed !== null && s.tempMed !== undefined
    && s.inc100k !== null && s.inc100k !== undefined);
}

/** Tabela equivalente ao grafico de dispersao clima x incidencia. */
export function montarTabelaClima(semanas) {
  const linhas = pontosClima(semanas).map((s) => `
      <tr>
        <th scope="row">${s.se}</th>
        <td>${celula(s.tempMed, 1)}</td>
        <td>${celula(s.inc100k, 2)}</td>
      </tr>`).join('');

  return `
    <table>
      <caption>Temperatura média e incidência de dengue por semana epidemiológica consolidada</caption>
      <thead>
        <tr>
          <th scope="col">Semana</th>
          <th scope="col">Temperatura média (°C)</th>
          <th scope="col">Incidência por 100 mil habitantes</th>
        </tr>
      </thead>
      <tbody>${linhas}
      </tbody>
    </table>`;
}
