import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';
import { montarTabelaSeries, montarTabelaAlertas, montarTabelaClima, pontosClima } from '../../src/web/tabela.js';

const semanas = [
  { se: 202501, casos: 10, mediaMovel: null, rotuloNivel: 'Verde - condições desfavoráveis à transmissão' },
  { se: 202502, casos: 20, mediaMovel: null, rotuloNivel: 'Amarelo - condições favoráveis à transmissão' },
  { se: 202503, casos: 30, mediaMovel: 20, rotuloNivel: 'Vermelho - alta incidência' },
  { se: 202504, casos: null, mediaMovel: null, rotuloNivel: null, parcial: true }
];

describe('montarTabelaSeries', () => {
  it('gera uma linha por semana com legenda e cabecalhos de escopo', () => {
    const dom = new JSDOM(`<main>${montarTabelaSeries(semanas)}</main>`);
    const doc = dom.window.document;

    expect(doc.querySelector('caption')).toBeTruthy();
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(doc.querySelectorAll('thead th[scope="col"]')).toHaveLength(4);
  });

  it('mostra semana sem dado como texto explicito, nunca como zero', () => {
    const dom = new JSDOM(`<main>${montarTabelaSeries(semanas)}</main>`);
    const ultimaLinha = dom.window.document.querySelectorAll('tbody tr')[3];
    const celulaCasos = ultimaLinha.querySelectorAll('td')[0];
    expect(celulaCasos.textContent.trim()).toBe('em consolidação');
    expect(celulaCasos.textContent.trim()).not.toBe('0');
  });

  it('mostra zero real como zero, nunca como ausencia de dado', () => {
    const comZero = [{ se: 202505, casos: 0, mediaMovel: 0, rotuloNivel: 'Verde - condições desfavoráveis à transmissão' }];
    const doc = new JSDOM(`<main>${montarTabelaSeries(comZero)}</main>`).window.document;
    const celulas = doc.querySelectorAll('tbody tr td');

    expect(celulas[0].textContent.trim()).toBe('0');
    expect(celulas[0].textContent.trim()).not.toBe('em consolidação');
  });

  it('mostra ausencia de nivel como texto, nunca como um nivel falso', () => {
    const doc = new JSDOM(`<main>${montarTabelaSeries(semanas)}</main>`).window.document;
    const ultimaLinha = doc.querySelectorAll('tbody tr')[3];
    const celulaNivel = ultimaLinha.querySelectorAll('td')[2];

    expect(celulaNivel.textContent.trim()).toBe('em consolidação');
  });

  it('descreve o nivel de alerta por texto, nao so por cor', () => {
    const dom = new JSDOM(`<main>${montarTabelaSeries(semanas)}</main>`);
    expect(dom.window.document.body.textContent).toContain('Vermelho');
  });

  it('passa na verificacao do axe sem violacao A ou AA', async () => {
    const dom = new JSDOM(
      `<!DOCTYPE html><html lang="pt-BR"><body><main>${montarTabelaSeries(semanas)}</main></body></html>`
    );
    const resultado = await axe.run(dom.window.document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    });
    expect(resultado.violations).toEqual([]);
  });
});

describe('montarTabelaAlertas', () => {
  const alertas = [
    { nivel: 1, rotulo: 'Verde - condições desfavoráveis à transmissão', semanas: 40, percentual: 50 },
    { nivel: 2, rotulo: 'Amarelo - condições favoráveis à transmissão', semanas: 20, percentual: 25 },
    { nivel: 3, rotulo: 'Laranja - transmissão sustentada', semanas: 12, percentual: 15 },
    { nivel: 4, rotulo: 'Vermelho - alta incidência', semanas: 8, percentual: 10 }
  ];

  it('gera uma linha por nivel com contagem e percentual', () => {
    const doc = new JSDOM(`<main>${montarTabelaAlertas(alertas)}</main>`).window.document;
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(doc.body.textContent).toContain('10%');
  });

  it('passa na verificacao do axe sem violacao A ou AA', async () => {
    const dom = new JSDOM(
      `<!DOCTYPE html><html lang="pt-BR"><body><main>${montarTabelaAlertas(alertas)}</main></body></html>`
    );
    const resultado = await axe.run(dom.window.document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    });
    expect(resultado.violations).toEqual([]);
  });
});

describe('pontosClima', () => {
  it('descarta semana parcial e semana sem temperatura ou incidencia', () => {
    const pontos = pontosClima([
      { se: 202501, tempMed: 24.5, inc100k: 3.2 },
      { se: 202502, tempMed: null, inc100k: 4.1 },
      { se: 202503, tempMed: 25.1, inc100k: null },
      { se: 202504, tempMed: 26, inc100k: 5, parcial: true },
      { se: 202505, tempMed: 22, inc100k: 0 }
    ]);
    expect(pontos).toEqual([
      { se: 202501, tempMed: 24.5, inc100k: 3.2 },
      { se: 202505, tempMed: 22, inc100k: 0 }
    ]);
  });
});

describe('montarTabelaClima', () => {
  const semanasClima = [
    { se: 202501, tempMed: 24.56, inc100k: 3.21 },
    { se: 202502, tempMed: null, inc100k: 4.1 },
    { se: 202503, tempMed: 22, inc100k: 0 }
  ];

  it('gera uma linha por ponto do grafico de dispersao, com legenda e cabecalhos', () => {
    const doc = new JSDOM(`<main>${montarTabelaClima(semanasClima)}</main>`).window.document;
    expect(doc.querySelector('caption').textContent).toContain('Temperatura média');
    expect(doc.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
    const linhas = doc.querySelectorAll('tbody tr');
    expect(linhas).toHaveLength(2);
    expect(linhas[0].querySelector('th').textContent.trim()).toBe('202501');
    expect([...linhas[0].querySelectorAll('td')].map((c) => c.textContent.trim())).toEqual(['24.6', '3.21']);
  });

  it('mostra zero real de incidencia como zero', () => {
    const doc = new JSDOM(`<main>${montarTabelaClima(semanasClima)}</main>`).window.document;
    const celulas = doc.querySelectorAll('tbody tr')[1].querySelectorAll('td');
    expect(celulas[1].textContent.trim()).toBe('0.00');
  });

  it('passa na verificacao do axe sem violacao A ou AA', async () => {
    const dom = new JSDOM(
      `<!DOCTYPE html><html lang="pt-BR"><body><main>${montarTabelaClima(semanasClima)}</main></body></html>`
    );
    const resultado = await axe.run(dom.window.document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    });
    expect(resultado.violations).toEqual([]);
  });
});
