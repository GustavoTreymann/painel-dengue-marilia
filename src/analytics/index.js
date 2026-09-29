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
