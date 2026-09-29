import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';

const html = readFileSync('src/web/index.html', 'utf8');

describe('index.html', () => {
  it('declara o idioma como portugues do Brasil', () => {
    const doc = new JSDOM(html).window.document;
    expect(doc.documentElement.lang).toBe('pt-BR');
  });

  it('tem um unico h1 e regioes semanticas', () => {
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('main')).toBeTruthy();
    expect(doc.querySelectorAll('section[aria-labelledby]').length).toBe(4);
  });

  it('descreve cada grafico por texto alternativo', () => {
    const doc = new JSDOM(html).window.document;
    doc.querySelectorAll('canvas').forEach((c) => {
      expect(c.getAttribute('aria-label')).toBeTruthy();
      expect(c.getAttribute('role')).toBe('img');
    });
  });

  it('passa na verificacao do axe sem violacao A ou AA', async () => {
    const dom = new JSDOM(html);
    const resultado = await axe.run(dom.window.document.documentElement, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    });
    const descricao = resultado.violations.map((v) => `${v.id}: ${v.description}`).join('\n');
    expect(descricao).toBe('');
  });
});
