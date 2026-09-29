import { describe, it, expect } from 'vitest';
import { tendenciaRt } from '../../src/analytics/index.js';

describe('tendenciaRt', () => {
  it('classifica como crescimento com duas semanas acima de 1', () => {
    expect(tendenciaRt([0.8, 1.2, 1.5])).toBe('crescimento');
  });

  it('classifica como retracao com duas semanas abaixo de 1', () => {
    expect(tendenciaRt([1.4, 0.9, 0.7])).toBe('retracao');
  });

  it('classifica como estavel quando as duas ultimas discordam', () => {
    expect(tendenciaRt([1.4, 0.9, 1.3])).toBe('estavel');
  });

  it('ignora semanas sem Rt', () => {
    expect(tendenciaRt([1.2, 1.5, null, null])).toBe('crescimento');
  });

  it('devolve indefinida com menos de duas semanas com dado', () => {
    expect(tendenciaRt([null, 1.2])).toBe('indefinida');
    expect(tendenciaRt([])).toBe('indefinida');
  });
});
