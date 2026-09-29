import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizarRegistro, buscarSemanas } from '../../src/ingest/infodengue.js';

const bruto = JSON.parse(readFileSync('tests/fixtures/infodengue.json', 'utf8'));

describe('normalizarRegistro', () => {
  it('converte os campos de texto da origem em numero', () => {
    const r = normalizarRegistro({
      SE: 202510, data_iniSE: 1740873600000, casos: 2925, casos_est: 2930.0,
      casos_est_min: 2900, casos_est_max: 2960, Rt: 0.99, p_inc100k: 1226.2,
      nivel: 4, tempmin: '14.69', tempmed: '18.02', tempmax: '21.90',
      umidmin: '70.30', umidmed: '86.89', umidmax: '97.17', pop: '238605'
    });

    expect(r.se).toBe(202510);
    expect(r.tempMed).toBeCloseTo(18.02, 2);
    expect(r.umidMax).toBeCloseTo(97.17, 2);
    expect(r.populacao).toBe(238605);
    expect(typeof r.populacao).toBe('number');
  });

  it('converte data_iniSE em data ISO', () => {
    const r = normalizarRegistro({ SE: 202501, data_iniSE: 1735603200000, casos: 1 });
    expect(r.dataInicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('marca como parcial a semana sem casos consolidados', () => {
    const r = normalizarRegistro({ SE: 202637, data_iniSE: 1789257600000, casos: null });
    expect(r.parcial).toBe(true);
    expect(r.casos).toBeNull();
  });

  it('nao converte ausencia em zero', () => {
    const r = normalizarRegistro({ SE: 202637, data_iniSE: 1789257600000, casos: null, tempmed: null });
    expect(r.casos).not.toBe(0);
    expect(r.tempMed).toBeNull();
  });

  it('trata string vazia em casos como ausencia, nunca como zero', () => {
    const r = normalizarRegistro({ SE: 202601, data_iniSE: 1735603200000, casos: '' });
    expect(r.casos).toBeNull();
    expect(r.parcial).toBe(true);
  });

  it('trata valor nao numerico em casos como ausencia, nunca como NaN', () => {
    const r = normalizarRegistro({ SE: 202602, data_iniSE: 1735603200000, casos: 'indisponivel' });
    expect(r.casos).toBeNull();
    expect(r.parcial).toBe(true);
  });

  it('preserva zero legitimo de casos como zero, nao como ausencia', () => {
    const r = normalizarRegistro({ SE: 202603, data_iniSE: 1735603200000, casos: 0 });
    expect(r.casos).toBe(0);
    expect(r.parcial).toBe(false);
  });

  it('normaliza toda a fixture sem lancar erro', () => {
    const todos = bruto.map(normalizarRegistro);
    expect(todos).toHaveLength(90);
    expect(todos.every((r) => Number.isInteger(r.se))).toBe(true);
  });
});

describe('buscarSemanas', () => {
  it('monta a URL com os parametros esperados', async () => {
    let urlChamada = '';
    const fetchFalso = async (url) => {
      urlChamada = url;
      return { ok: true, status: 200, json: async () => bruto.slice(0, 2) };
    };

    await buscarSemanas({ geocode: 3529005, anoInicio: 2025, anoFim: 2026, fetchImpl: fetchFalso });

    expect(urlChamada).toContain('geocode=3529005');
    expect(urlChamada).toContain('disease=dengue');
    expect(urlChamada).toContain('ey_start=2025');
    expect(urlChamada).toContain('ey_end=2026');
  });

  it('devolve registros normalizados em ordem crescente de semana', async () => {
    const fetchFalso = async () => ({ ok: true, status: 200, json: async () => bruto });
    const registros = await buscarSemanas({ geocode: 3529005, anoInicio: 2025, anoFim: 2026, fetchImpl: fetchFalso });

    expect(registros).toHaveLength(90);
    expect(registros[0].se).toBeLessThan(registros[registros.length - 1].se);
  });

  it('lanca erro legivel quando a API responde com falha', async () => {
    const fetchFalso = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await expect(
      buscarSemanas({ geocode: 3529005, anoInicio: 2025, anoFim: 2026, fetchImpl: fetchFalso })
    ).rejects.toThrow('InfoDengue respondeu 503');
  });
});
