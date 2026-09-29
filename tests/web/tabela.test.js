import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';
import { montarTabelaSeries, montarTabelaAlertas } from '../../src/web/tabela.js';

const semanas = [
  { se: 202501, casos: 10, mediaMovel: null, rotuloNivel: 'Verde - condicoes desfavoraveis a transmissao' },
  { se: 202502, casos: 20, mediaMovel: null, rotuloNivel: 'Amarelo - condicoes favoraveis a transmissao' },
  { se: 202503, casos: 30, mediaMovel: 20, rotuloNivel: 'Vermelho - alta incidencia' },
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
    expect(celulaCasos.textContent.trim()).toBe('em consolidacao');
    expect(celulaCasos.textContent.trim()).not.toBe('0');
  });

  it('mostra zero real como zero, nunca como ausencia de dado', () => {
    const comZero = [{ se: 202505, casos: 0, mediaMovel: 0, rotuloNivel: 'Verde - condicoes desfavoraveis a transmissao' }];
    const doc = new JSDOM(`<main>${montarTabelaSeries(comZero)}</main>`).window.document;
    const celulas = doc.querySelectorAll('tbody tr td');

    expect(celulas[0].textContent.trim()).toBe('0');
    expect(celulas[0].textContent.trim()).not.toBe('em consolidacao');
  });

  it('mostra ausencia de nivel como texto, nunca como um nivel falso', () => {
    const doc = new JSDOM(`<main>${montarTabelaSeries(semanas)}</main>`).window.document;
    const ultimaLinha = doc.querySelectorAll('tbody tr')[3];
    const celulaNivel = ultimaLinha.querySelectorAll('td')[2];

    expect(celulaNivel.textContent.trim()).toBe('em consolidacao');
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
    { nivel: 1, rotulo: 'Verde - condicoes desfavoraveis a transmissao', semanas: 40, percentual: 50 },
    { nivel: 2, rotulo: 'Amarelo - condicoes favoraveis a transmissao', semanas: 20, percentual: 25 },
    { nivel: 3, rotulo: 'Laranja - transmissao sustentada', semanas: 12, percentual: 15 },
    { nivel: 4, rotulo: 'Vermelho - alta incidencia', semanas: 8, percentual: 10 }
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
