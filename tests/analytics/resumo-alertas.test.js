import { describe, it, expect } from 'vitest';
import { resumoAlertas } from '../../src/analytics/index.js';

describe('resumoAlertas', () => {
  it('conta semanas por nivel e calcula percentual', () => {
    const registros = [{ nivel: 1 }, { nivel: 1 }, { nivel: 4 }, { nivel: 2 }];
    const resumo = resumoAlertas(registros);

    expect(resumo).toHaveLength(4);
    expect(resumo[0]).toEqual({
      nivel: 1,
      rotulo: 'Verde - sem indicio de risco',
      semanas: 2,
      percentual: 50
    });
    expect(resumo[3].semanas).toBe(1);
    expect(resumo[2].semanas).toBe(0);
  });

  it('sempre devolve os quatro niveis, mesmo sem ocorrencia', () => {
    const resumo = resumoAlertas([{ nivel: 2 }]);
    expect(resumo.map((r) => r.nivel)).toEqual([1, 2, 3, 4]);
  });

  it('ignora registros sem nivel', () => {
    const resumo = resumoAlertas([{ nivel: 1 }, { nivel: null }]);
    expect(resumo[0].percentual).toBe(100);
  });

  it('devolve percentual zero para lista vazia', () => {
    expect(resumoAlertas([]).every((r) => r.percentual === 0)).toBe(true);
  });
});
