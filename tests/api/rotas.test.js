import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { criarRotas } from '../../src/api/rotas.js';

const semanas = Array.from({ length: 12 }, (_, i) => ({
  se: 202501 + i,
  dataInicio: '2025-01-05',
  casos: 10 + i * 5,
  casosEst: 12 + i * 5,
  rt: i < 6 ? 0.9 : 1.2,
  inc100k: (10 + i * 5) / 2.386,
  nivel: i > 8 ? 4 : 1,
  tempMed: 18 + i,
  umidMed: 70 + i,
  populacao: 238605,
  parcial: false
}));

function app({ listar = async () => semanas, ultima = async () => ({ concluidaEm: new Date('2026-09-28T12:00:00Z'), semanasLidas: 12, sucesso: true }) } = {}) {
  const servidor = express();
  servidor.use(criarRotas({ listar, ultima }));
  return servidor;
}

describe('GET /api/series', () => {
  it('devolve a serie completa', async () => {
    const resposta = await request(app()).get('/api/series');
    expect(resposta.status).toBe(200);
    expect(resposta.body.semanas).toHaveLength(12);
    expect(resposta.body.semanas[0]).toHaveProperty('mediaMovel');
  });

  it('envia o rotulo textual do nivel junto de cada semana', async () => {
    const resposta = await request(app()).get('/api/series');
    expect(resposta.body.semanas[0].rotuloNivel).toBe('Verde - condições desfavoráveis à transmissão');
    expect(resposta.body.semanas[11].rotuloNivel).toBe('Vermelho - alta incidência');
  });

  it('repassa o filtro de periodo', async () => {
    let recebido;
    await request(app({ listar: async (filtro) => { recebido = filtro; return semanas; } }))
      .get('/api/series?de=202505&ate=202510');
    expect(recebido).toEqual({ de: 202505, ate: 202510 });
  });

  it('recusa semana epidemiologica fora do formato', async () => {
    const resposta = await request(app()).get('/api/series?de=janeiro');
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toContain('AAAASS');
  });

  it('devolve 503 quando o banco falha', async () => {
    const resposta = await request(app({ listar: async () => { throw new Error('sem banco'); } }))
      .get('/api/series');
    expect(resposta.status).toBe(503);
    expect(resposta.body.erro).toBeTruthy();
  });
});

describe('GET /api/indicadores', () => {
  it('devolve total, pico, tendencia e nivel vigente', async () => {
    const resposta = await request(app()).get('/api/indicadores');
    expect(resposta.status).toBe(200);
    expect(resposta.body.totalCasos).toBe(semanas.reduce((a, s) => a + s.casos, 0));
    expect(resposta.body.semanaPico.se).toBe(202512);
    expect(resposta.body.tendencia).toBe('crescimento');
    expect(resposta.body.nivelVigente).toBe(4);
    expect(resposta.body.alertas).toHaveLength(4);
  });
});

describe('respostas de erro', () => {
  it('nao marca resposta de erro como cacheavel', async () => {
    const resposta = await request(app({ listar: async () => { throw new Error('sem banco'); } }))
      .get('/api/series');
    expect(resposta.status).toBe(503);
    expect(resposta.headers['cache-control']).toBeUndefined();
  });

  it('devolve 500, e nao 503, quando o erro nao e do banco', async () => {
    // listar resolve com sucesso (nao e falha de acesso a dados), mas devolve
    // um valor sem forma de lista: o bug esta no processamento, nao no banco.
    const resposta = await request(app({ listar: async () => null }))
      .get('/api/indicadores');
    expect(resposta.status).toBe(500);
  });
});

describe('GET /api/indicadores com semana sem casos', () => {
  it('nao conta semana sem casos como zero nem deixa ela vencer o pico', async () => {
    const comLacuna = [
      { se: 202501, casos: null, rt: 1.1, nivel: 2, parcial: false },
      { se: 202502, casos: 7, rt: 1.1, nivel: 2, parcial: false }
    ];
    const resposta = await request(app({ listar: async () => comLacuna })).get('/api/indicadores');

    expect(resposta.status).toBe(200);
    expect(resposta.body.totalCasos).toBe(7);
    expect(resposta.body.semanaPico).toEqual({ se: 202502, casos: 7 });
  });
});

describe('GET /api/clima', () => {
  it('devolve a defasagem de maior correlacao para temperatura e umidade', async () => {
    const resposta = await request(app()).get('/api/clima');
    expect(resposta.status).toBe(200);
    expect(resposta.body.temperatura).toHaveProperty('defasagem');
    expect(resposta.body.temperatura).toHaveProperty('coeficiente');
    expect(resposta.body.umidade.porDefasagem.length).toBe(7);
  });
});

describe('GET /api/status e /healthz', () => {
  it('informa a ultima ingestao', async () => {
    const resposta = await request(app()).get('/api/status');
    expect(resposta.status).toBe(200);
    expect(resposta.body.semanasEmBase).toBe(12);
    expect(resposta.body.ultimaAtualizacao).toBeTruthy();
  });

  it('responde ok no healthz', async () => {
    const resposta = await request(app()).get('/healthz');
    expect(resposta.status).toBe(200);
  });

  it('devolve 503 no healthz quando o banco nao responde', async () => {
    const resposta = await request(app({ ultima: async () => { throw new Error('sem banco'); } }))
      .get('/healthz');
    expect(resposta.status).toBe(503);
  });
});

describe('mensagens de erro publicas', () => {
  const segredo = 'password authentication failed for user "painel_prod" at ep-segredo.neon.tech';
  const falhaBanco = async () => { throw new Error(segredo); };

  it('nao repassa ao cliente o detalhe da falha do banco nas rotas da API', async () => {
    const resposta = await request(app({ listar: falhaBanco })).get('/api/series');
    expect(resposta.status).toBe(503);
    expect(resposta.body.erro).toBe('dados indisponiveis no momento');
    expect(JSON.stringify(resposta.body)).not.toContain('painel_prod');
  });

  it('nao repassa ao cliente o detalhe da falha do banco no healthz', async () => {
    const resposta = await request(app({ ultima: falhaBanco })).get('/healthz');
    expect(resposta.status).toBe(503);
    expect(JSON.stringify(resposta.body)).not.toContain('neon.tech');
  });

  it('nao repassa ao cliente o detalhe de um erro interno', async () => {
    const resposta = await request(app({ listar: async () => null })).get('/api/indicadores');
    expect(resposta.status).toBe(500);
    expect(resposta.body.erro).toBe('erro interno');
  });
});
