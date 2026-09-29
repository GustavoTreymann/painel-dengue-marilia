import { describe, it, expect } from 'vitest';
import { mediaMovel } from '../../src/analytics/index.js';

describe('mediaMovel', () => {
  it('calcula a media dos ultimos N valores', () => {
    expect(mediaMovel([3, 6, 9, 12], 3)).toEqual([null, null, 6, 9]);
  });

  it('devolve nulo enquanto nao ha janela completa', () => {
    expect(mediaMovel([10, 20], 3)).toEqual([null, null]);
  });

  it('devolve nulo quando a janela contem semana sem dado', () => {
    expect(mediaMovel([3, null, 9, 12], 3)).toEqual([null, null, null, null]);
  });

  it('volta a calcular depois que a lacuna sai da janela', () => {
    expect(mediaMovel([null, 3, 6, 9], 3)).toEqual([null, null, null, 6]);
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(mediaMovel([], 3)).toEqual([]);
  });

  it('rejeita janela menor que 1', () => {
    expect(() => mediaMovel([1, 2], 0)).toThrow('janela deve ser maior que zero');
  });
});
