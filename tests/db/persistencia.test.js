import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { criarPool, migrar, salvarSemanas, listarSemanas, registrarExecucao, ultimaExecucao } from '../../src/db/index.js';

const URL = process.env.DATABASE_URL ?? 'postgres://painel:painel@localhost:5432/dengue';
let pool;

const registro = (se, extras = {}) => ({
  se, dataInicio: '2025-01-05', casos: 10, casosEst: 12, casosEstMin: 9, casosEstMax: 15,
  rt: 1.1, inc100k: 4.2, nivel: 2, tempMin: 15, tempMed: 20, tempMax: 25,
  umidMin: 60, umidMed: 70, umidMax: 80, populacao: 238605, parcial: false, ...extras
});

beforeAll(async () => {
  pool = criarPool(URL);
  await migrar(pool);
  await pool.query('TRUNCATE semana_epidemiologica, execucao_ingestao');
});

afterAll(async () => { await pool.end(); });

describe('persistencia', () => {
  it('grava e le semanas', async () => {
    await salvarSemanas(pool, [registro(202501), registro(202502)]);
    const lidas = await listarSemanas(pool, {});
    expect(lidas).toHaveLength(2);
    expect(lidas[0].se).toBe(202501);
    expect(lidas[0].casos).toBe(10);
  });

  it('atualiza em vez de duplicar ao reprocessar a mesma semana', async () => {
    await salvarSemanas(pool, [registro(202501, { casos: 99 })]);
    const lidas = await listarSemanas(pool, {});
    expect(lidas).toHaveLength(2);
    expect(lidas.find((r) => r.se === 202501).casos).toBe(99);
  });

  it('preserva nulo em semana parcial', async () => {
    await salvarSemanas(pool, [registro(202503, { casos: null, parcial: true })]);
    const lidas = await listarSemanas(pool, {});
    const parcial = lidas.find((r) => r.se === 202503);
    expect(parcial.casos).toBeNull();
    expect(parcial.parcial).toBe(true);
  });

  it('filtra por intervalo de semanas', async () => {
    const lidas = await listarSemanas(pool, { de: 202502, ate: 202502 });
    expect(lidas).toHaveLength(1);
    expect(lidas[0].se).toBe(202502);
  });

  it('registra e recupera a ultima execucao bem sucedida', async () => {
    await registrarExecucao(pool, { semanasLidas: 3, sucesso: true, erro: null });
    const ultima = await ultimaExecucao(pool);
    expect(ultima.sucesso).toBe(true);
    expect(ultima.semanasLidas).toBe(3);
  });
});
