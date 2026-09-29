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
