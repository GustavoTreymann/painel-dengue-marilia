const BASE = 'https://info.dengue.mat.br/api/alertcity';

/** A origem devolve varios numeros como texto; aqui viram numero ou nulo. */
function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const convertido = Number(valor);
  return Number.isNaN(convertido) ? null : convertido;
}

/** Converte o registro bruto da API no formato usado em todo o projeto. */
export function normalizarRegistro(bruto) {
  // Passa pelo mesmo helper dos demais campos: sem isso, uma string vazia
  // viraria 0 e o painel mostraria uma queda de casos que nunca existiu.
  const casos = numero(bruto.casos);

  return {
    se: Number(bruto.SE),
    dataInicio: new Date(bruto.data_iniSE).toISOString().slice(0, 10),
    casos,
    casosEst: numero(bruto.casos_est),
    casosEstMin: numero(bruto.casos_est_min),
    casosEstMax: numero(bruto.casos_est_max),
    rt: numero(bruto.Rt),
    inc100k: numero(bruto.p_inc100k),
    nivel: numero(bruto.nivel),
    tempMin: numero(bruto.tempmin),
    tempMed: numero(bruto.tempmed),
    tempMax: numero(bruto.tempmax),
    umidMin: numero(bruto.umidmin),
    umidMed: numero(bruto.umidmed),
    umidMax: numero(bruto.umidmax),
    populacao: numero(bruto.pop),
    // Semana sem casos consolidados ainda esta sendo fechada pela vigilancia.
    parcial: casos === null
  };
}

/** Busca a serie semanal do municipio e devolve registros normalizados. */
export async function buscarSemanas({ geocode, anoInicio, anoFim, fetchImpl = fetch }) {
  const parametros = new URLSearchParams({
    geocode: String(geocode),
    disease: 'dengue',
    format: 'json',
    ew_start: '1',
    ew_end: '53',
    ey_start: String(anoInicio),
    ey_end: String(anoFim)
  });

  const resposta = await fetchImpl(`${BASE}?${parametros}`);
  if (!resposta.ok) {
    throw new Error(`InfoDengue respondeu ${resposta.status}`);
  }

  const bruto = await resposta.json();
  return bruto.map(normalizarRegistro).sort((a, b) => a.se - b.se);
}
