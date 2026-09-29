/**
 * Media movel simples. Devolve nulo nas posicoes sem janela completa
 * e tambem quando a janela contem semana sem dado consolidado,
 * porque tratar ausencia como zero falsearia a serie.
 */
export function mediaMovel(valores, janela) {
  if (janela < 1) throw new Error('janela deve ser maior que zero');

  return valores.map((_, indice) => {
    if (indice + 1 < janela) return null;
    const trecho = valores.slice(indice + 1 - janela, indice + 1);
    if (trecho.some((v) => v === null || v === undefined)) return null;
    return trecho.reduce((soma, v) => soma + v, 0) / janela;
  });
}

/**
 * Classifica a tendencia de transmissao pelas duas ultimas semanas com Rt.
 * Rt acima de 1 significa que cada caso gera mais de um novo caso.
 */
export function tendenciaRt(rts) {
  const validos = rts.filter((v) => v !== null && v !== undefined);
  if (validos.length < 2) return 'indefinida';

  const [penultimo, ultimo] = validos.slice(-2);
  if (penultimo > 1 && ultimo > 1) return 'crescimento';
  if (penultimo < 1 && ultimo < 1) return 'retracao';
  return 'estavel';
}

/**
 * Coeficiente de correlacao linear de Pearson.
 * Devolve nulo quando nao ha variacao em uma das series ou quando
 * ha menos de tres pares, casos em que o coeficiente nao tem sentido.
 */
export function correlacaoPearson(x, y) {
  if (x.length !== y.length) throw new Error('as series devem ter o mesmo tamanho');
  const n = x.length;
  if (n < 3) return null;

  const mediaX = x.reduce((a, b) => a + b, 0) / n;
  const mediaY = y.reduce((a, b) => a + b, 0) / n;

  let covariancia = 0;
  let variaciaX = 0;
  let variaciaY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - mediaX;
    const dy = y[i] - mediaY;
    covariancia += dx * dy;
    variaciaX += dx * dx;
    variaciaY += dy * dy;
  }

  if (variaciaX === 0 || variaciaY === 0) return null;
  return covariancia / Math.sqrt(variaciaX * variaciaY);
}

/**
 * Correlaciona uma variavel climatica com a incidencia em varias defasagens
 * e devolve a defasagem de maior correlacao em modulo.
 * A hipotese e que calor e umidade antecedem o aumento de casos.
 */
export function correlacaoDefasada(registros, campoClima, maxDefasagem) {
  const porDefasagem = [];

  for (let defasagem = 0; defasagem <= maxDefasagem; defasagem += 1) {
    const clima = [];
    const incidencia = [];

    for (let i = 0; i + defasagem < registros.length; i += 1) {
      const origem = registros[i];
      const alvo = registros[i + defasagem];
      const valorClima = origem[campoClima];
      const valorIncidencia = alvo.inc100k;

      const utilizavel =
        !origem.parcial && !alvo.parcial &&
        valorClima !== null && valorClima !== undefined &&
        valorIncidencia !== null && valorIncidencia !== undefined;

      if (utilizavel) {
        clima.push(valorClima);
        incidencia.push(valorIncidencia);
      }
    }

    porDefasagem.push({
      defasagem,
      coeficiente: correlacaoPearson(clima, incidencia),
      n: clima.length
    });
  }

  // Empate entre defasagens resolve pela menor: o `>` estrito mantem a
  // primeira, que e a explicacao mais parcimoniosa.
  const comCoeficiente = porDefasagem.filter((d) => d.coeficiente !== null);
  const melhor = comCoeficiente.length
    ? comCoeficiente.reduce((a, b) => (Math.abs(b.coeficiente) > Math.abs(a.coeficiente) ? b : a))
    : { defasagem: 0, coeficiente: null, n: 0 };

  return { ...melhor, porDefasagem };
}

export const ROTULOS_NIVEL = {
  1: 'Verde - condições desfavoráveis à transmissão',
  2: 'Amarelo - condições favoráveis à transmissão',
  3: 'Laranja - transmissão sustentada',
  4: 'Vermelho - alta incidência'
};

/** Distribuicao de semanas por nivel de alerta, sempre com os quatro niveis. */
export function resumoAlertas(registros) {
  const comNivel = registros.filter((r) => r.nivel !== null && r.nivel !== undefined);
  const total = comNivel.length;

  return [1, 2, 3, 4].map((nivel) => {
    const semanas = comNivel.filter((r) => r.nivel === nivel).length;
    return {
      nivel,
      rotulo: ROTULOS_NIVEL[nivel],
      semanas,
      percentual: total === 0 ? 0 : Number(((semanas / total) * 100).toFixed(1))
    };
  });
}
