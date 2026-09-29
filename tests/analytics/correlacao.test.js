import { describe, it, expect } from 'vitest';
import { correlacaoPearson, correlacaoDefasada } from '../../src/analytics/index.js';

const registro = (tempMed, inc100k, parcial = false) => ({ tempMed, inc100k, parcial });

describe('correlacaoPearson', () => {
  it('devolve 1 para relacao linear crescente perfeita', () => {
    expect(correlacaoPearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });

  it('devolve -1 para relacao linear decrescente perfeita', () => {
    expect(correlacaoPearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
  });

  it('devolve valor conhecido calculado a mao', () => {
    // x = [1,2,3], y = [2,4,5]: r = 3 / sqrt(2 * 4.6667) = 0.98198
    expect(correlacaoPearson([1, 2, 3], [2, 4, 5])).toBeCloseTo(0.98198, 4);
  });

  it('devolve nulo quando uma das series nao varia', () => {
    expect(correlacaoPearson([5, 5, 5], [1, 2, 3])).toBeNull();
  });

  it('devolve nulo com menos de tres pares', () => {
    expect(correlacaoPearson([1, 2], [3, 4])).toBeNull();
  });

  it('rejeita series de tamanhos diferentes', () => {
    expect(() => correlacaoPearson([1, 2, 3], [1, 2])).toThrow('mesmo tamanho');
  });
});

describe('correlacaoDefasada', () => {
  it('encontra a defasagem de maior correlacao', () => {
    // O clima lidera a incidencia em uma semana. A primeira incidencia e um
    // valor destoante de proposito: sem ele, a defasagem 0 empataria com a 1
    // e o teste nao provaria que a busca de defasagem funciona.
    const registros = [
      registro(10, 99), registro(20, 10), registro(30, 20),
      registro(40, 30), registro(50, 40), registro(60, 50)
    ];
    const resultado = correlacaoDefasada(registros, 'tempMed', 3);
    expect(resultado.defasagem).toBe(1);
    expect(resultado.coeficiente).toBeCloseTo(1, 10);
    expect(resultado.n).toBe(5);
  });

  it('exclui semanas parciais do calculo', () => {
    const registros = [
      registro(10, 1), registro(20, 2), registro(30, 3),
      registro(40, 4), registro(999, 999, true)
    ];
    const resultado = correlacaoDefasada(registros, 'tempMed', 0);
    expect(resultado.n).toBe(4);
    expect(resultado.coeficiente).toBeCloseTo(1, 10);
  });

  it('exclui pares com valor ausente', () => {
    const registros = [
      registro(10, 1), registro(null, 2), registro(30, 3),
      registro(40, 4), registro(50, null)
    ];
    const resultado = correlacaoDefasada(registros, 'tempMed', 0);
    expect(resultado.n).toBe(3);
  });

  it('reporta o coeficiente de cada defasagem testada', () => {
    const registros = Array.from({ length: 10 }, (_, i) => registro(i, i));
    const resultado = correlacaoDefasada(registros, 'tempMed', 2);
    expect(resultado.porDefasagem).toHaveLength(3);
    expect(resultado.porDefasagem.map((d) => d.defasagem)).toEqual([0, 1, 2]);
  });
});
