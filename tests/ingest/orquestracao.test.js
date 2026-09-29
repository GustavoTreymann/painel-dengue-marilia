import { describe, it, expect } from 'vitest';
import { executarIngestao } from '../../src/ingest/index.js';

const semanas = [{ se: 202501 }, { se: 202502 }];

describe('executarIngestao', () => {
  it('busca, salva e registra sucesso', async () => {
    const registros = [];
    const resultado = await executarIngestao({
      pool: {}, geocode: 3529005, anoInicio: 2025, anoFim: 2026,
      buscar: async () => semanas,
      salvar: async (_pool, dados) => dados.length,
      registrar: async (_pool, dados) => registros.push(dados)
    });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.semanasLidas).toBe(2);
    expect(registros[0]).toEqual({ semanasLidas: 2, sucesso: true, erro: null });
  });

  it('registra a falha sem derrubar o processo quando a API cai', async () => {
    const registros = [];
    const resultado = await executarIngestao({
      pool: {}, geocode: 3529005, anoInicio: 2025, anoFim: 2026,
      buscar: async () => { throw new Error('InfoDengue respondeu 503'); },
      salvar: async () => 0,
      registrar: async (_pool, dados) => registros.push(dados)
    });

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toBe('InfoDengue respondeu 503');
    expect(registros[0].sucesso).toBe(false);
  });

  it('registra falha quando a gravacao no banco falha', async () => {
    const resultado = await executarIngestao({
      pool: {}, geocode: 3529005, anoInicio: 2025, anoFim: 2026,
      buscar: async () => semanas,
      salvar: async () => { throw new Error('banco indisponivel'); },
      registrar: async () => {}
    });

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toBe('banco indisponivel');
  });

  it('nao lanca quando o registro da falha tambem falha', async () => {
    const resultado = await executarIngestao({
      pool: {}, geocode: 3529005, anoInicio: 2025, anoFim: 2026,
      buscar: async () => { throw new Error('banco fora'); },
      salvar: async () => 0,
      registrar: async () => { throw new Error('banco fora'); }
    });

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toBe('banco fora');
  });

  it('reporta sucesso quando so o registro da execucao falha', async () => {
    const resultado = await executarIngestao({
      pool: {}, geocode: 3529005, anoInicio: 2025, anoFim: 2026,
      buscar: async () => semanas,
      salvar: async (_pool, dados) => dados.length,
      registrar: async () => { throw new Error('log indisponivel'); }
    });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.semanasLidas).toBe(2);
  });

  it('nao lanca quando a rejeicao nao e um Error', async () => {
    const resultado = await executarIngestao({
      pool: {}, geocode: 3529005, anoInicio: 2025, anoFim: 2026,
      buscar: async () => { throw null; },
      salvar: async () => 0,
      registrar: async () => {}
    });

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toBe('null');
  });
});
