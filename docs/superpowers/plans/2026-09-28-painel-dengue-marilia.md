# Painel de Vigilância da Dengue em Marília — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar um painel web acessível que ingere dados abertos de dengue de Marília, calcula indicadores epidemiológicos e mostra a relação defasada entre clima e incidência.

**Architecture:** Processo único em Node. Um ETL consome a API do InfoDengue e grava semanas epidemiológicas no PostgreSQL de forma idempotente. Um módulo de análise sem dependências calcula as métricas derivadas sobre arrays simples. Express expõe uma API REST própria e serve um painel estático que consome essa API.

**Tech Stack:** Node 24 (ESM), Express, PostgreSQL (`pg`), node-cron, Chart.js via CDN, Vitest, Supertest, jsdom, axe-core, Docker Compose para o banco local.

**Spec:** `docs/superpowers/specs/2026-09-28-painel-dengue-marilia-design.md`

## Global Constraints

- Módulos ESM (`"type": "module"` no `package.json`). Sem TypeScript, sem bundler.
- Identificadores, mensagens e comentários em português. Interface com `lang="pt-BR"`.
- Geocode fixo de Marília: `3529005`. Fonte: `https://info.dengue.mat.br/api/alertcity`.
- Semana epidemiológica no formato inteiro `AAAASS` (ex.: `202510`).
- **Dado ausente nunca vira zero.** `casos` nulo na origem significa semana em consolidação, marcada `parcial: true`, excluída de correlações.
- Acessibilidade WCAG 2.1 nível AA. Toda visualização gráfica tem tabela equivalente.
- Cobertura mínima de 80% em `src/analytics/` e `src/api/`.
- A API do InfoDengue devolve números como **string** em `tempmin`, `tempmed`, `tempmax`, `umidmin`, `umidmed`, `umidmax` e `pop`. Converter sempre.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json` | Dependências e scripts |
| `vitest.config.js` | Configuração de teste e cobertura |
| `docker-compose.yml` | PostgreSQL local |
| `.env.example` | Variáveis de ambiente documentadas |
| `src/analytics/index.js` | Métricas derivadas — funções puras |
| `src/ingest/infodengue.js` | Cliente e normalização da API externa |
| `src/ingest/index.js` | Orquestração da ingestão |
| `src/db/index.js` | Pool, migração e acesso a dados |
| `src/api/rotas.js` | Rotas REST |
| `src/web/index.html` | Estrutura do painel |
| `src/web/tabela.js` | Geração das tabelas equivalentes |
| `src/web/app.js` | Consumo da API e gráficos |
| `src/web/estilos.css` | Estilos e contraste |
| `servidor.js` | Composição: Express, rotas, estáticos, agendamento |
| `tests/fixtures/infodengue.json` | Resposta real congelada da API |

---

### Task 1: Fundação do projeto e média móvel

**Files:**
- Create: `package.json`, `vitest.config.js`, `src/analytics/index.js`, `tests/analytics/media-movel.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `mediaMovel(valores: (number|null)[], janela: number) => (number|null)[]`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "painel-dengue-marilia",
  "version": "1.0.0",
  "type": "module",
  "description": "Painel de vigilancia da dengue em Marilia - Projeto Integrador II Univesp",
  "scripts": {
    "dev": "node --watch servidor.js",
    "start": "node servidor.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "cobertura": "vitest run --coverage"
  },
  "dependencies": {
    "express": "^4.21.2",
    "node-cron": "^3.0.3",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^2.1.8",
    "axe-core": "^4.10.2",
    "jsdom": "^25.0.1",
    "supertest": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Criar `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/analytics/**', 'src/api/**'],
      thresholds: { lines: 80, functions: 80, branches: 70 }
    }
  }
});
```

- [ ] **Step 3: Instalar dependências**

Run: `npm install`
Expected: `node_modules/` criado, sem erro.

- [ ] **Step 4: Escrever o teste que falha**

Create `tests/analytics/media-movel.test.js`:

```js
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
```

- [ ] **Step 5: Rodar o teste e confirmar que falha**

Run: `npx vitest run tests/analytics/media-movel.test.js`
Expected: FAIL — não consegue resolver `src/analytics/index.js`.

- [ ] **Step 6: Implementar o mínimo**

Create `src/analytics/index.js`:

```js
/**
 * Media movel simples. Devolve nulo nas posicoes sem janela completa
 * e tambem quando a janela contem semana sem dado consolidado,
 * porque tratar ausencia como zero falsearia a serie.
 */
export function mediaMovel(valores, janela) {
  if (janela < 1) throw new Error('janela deve ser maior que zero');

  return valores.map((_, indice) => {
    if (indice + 1 < janela) return null;
    const trecho = valores.slice(indice + 1 - janela, indice + 1);
    if (trecho.some((v) => v === null || v === undefined)) return null;
    return trecho.reduce((soma, v) => soma + v, 0) / janela;
  });
}
```

- [ ] **Step 7: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/analytics/media-movel.test.js`
Expected: PASS, 6 testes.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/analytics/index.js tests/analytics/media-movel.test.js
git commit -m "Adiciona fundacao do projeto e calculo de media movel"
```

---

### Task 2: Tendência de transmissão pelo Rt

**Files:**
- Modify: `src/analytics/index.js`
- Create: `tests/analytics/tendencia-rt.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `tendenciaRt(rts: (number|null)[]) => 'crescimento' | 'retracao' | 'estavel' | 'indefinida'`

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/analytics/tendencia-rt.test.js`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run tests/analytics/tendencia-rt.test.js`
Expected: FAIL — `tendenciaRt is not a function`.

- [ ] **Step 3: Implementar**

Append to `src/analytics/index.js`:

```js
/**
 * Classifica a tendencia de transmissao pelas duas ultimas semanas com Rt.
 * Rt acima de 1 significa que cada caso gera mais de um novo caso.
 */
export function tendenciaRt(rts) {
  const validos = rts.filter((v) => v !== null && v !== undefined);
  if (validos.length < 2) return 'indefinida';

  const [penultimo, ultimo] = validos.slice(-2);
  if (penultimo > 1 && ultimo > 1) return 'crescimento';
  if (penultimo < 1 && ultimo < 1) return 'retracao';
  return 'estavel';
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/analytics/tendencia-rt.test.js`
Expected: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/index.js tests/analytics/tendencia-rt.test.js
git commit -m "Adiciona classificacao de tendencia de transmissao pelo Rt"
```

---

### Task 3: Correlação de Pearson e defasagem clima × incidência

Esta é a análise central do trabalho. É o que sustenta a seção 2.5 do relatório.

**Files:**
- Modify: `src/analytics/index.js`
- Create: `tests/analytics/correlacao.test.js`

**Interfaces:**
- Consumes: nada
- Produces:
  - `correlacaoPearson(x: number[], y: number[]) => number | null`
  - `correlacaoDefasada(registros, campoClima: string, maxDefasagem: number) => { defasagem: number, coeficiente: number, n: number, porDefasagem: Array<{defasagem, coeficiente, n}> }`
  - Cada `registro` tem ao menos `{ inc100k: number|null, parcial: boolean, [campoClima]: number|null }`

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/analytics/correlacao.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { correlacaoPearson, correlacaoDefasada } from '../../src/analytics/index.js';

const registro = (tempMed, inc100k, parcial = false) => ({ tempMed, inc100k, parcial });

describe('correlacaoPearson', () => {
  it('devolve 1 para relacao linear crescente perfeita', () => {
    expect(correlacaoPearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });

  it('devolve -1 para relacao linear decrescente perfeita', () => {
    expect(correlacaoPearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
  });

  it('devolve valor conhecido calculado a mao', () => {
    // x = [1,2,3], y = [2,4,5]: r = 3 / sqrt(2 * 4.6667) = 0.98198
    expect(correlacaoPearson([1, 2, 3], [2, 4, 5])).toBeCloseTo(0.98198, 4);
  });

  it('devolve nulo quando uma das series nao varia', () => {
    expect(correlacaoPearson([5, 5, 5], [1, 2, 3])).toBeNull();
  });

  it('devolve nulo com menos de tres pares', () => {
    expect(correlacaoPearson([1, 2], [3, 4])).toBeNull();
  });

  it('rejeita series de tamanhos diferentes', () => {
    expect(() => correlacaoPearson([1, 2, 3], [1, 2])).toThrow('mesmo tamanho');
  });
});

describe('correlacaoDefasada', () => {
  it('encontra a defasagem de maior correlacao', () => {
    // clima cresce uma semana antes da incidencia
    const registros = [
      registro(10, 0), registro(20, 5), registro(30, 10),
      registro(40, 15), registro(50, 20), registro(60, 25)
    ];
    const resultado = correlacaoDefasada(registros, 'tempMed', 3);
    expect(resultado.defasagem).toBe(1);
    expect(resultado.coeficiente).toBeCloseTo(1, 10);
    expect(resultado.n).toBe(5);
  });

  it('exclui semanas parciais do calculo', () => {
    const registros = [
      registro(10, 1), registro(20, 2), registro(30, 3),
      registro(40, 4), registro(999, 999, true)
    ];
    const resultado = correlacaoDefasada(registros, 'tempMed', 0);
    expect(resultado.n).toBe(4);
    expect(resultado.coeficiente).toBeCloseTo(1, 10);
  });

  it('exclui pares com valor ausente', () => {
    const registros = [
      registro(10, 1), registro(null, 2), registro(30, 3),
      registro(40, 4), registro(50, null)
    ];
    const resultado = correlacaoDefasada(registros, 'tempMed', 0);
    expect(resultado.n).toBe(3);
  });

  it('reporta o coeficiente de cada defasagem testada', () => {
    const registros = Array.from({ length: 10 }, (_, i) => registro(i, i));
    const resultado = correlacaoDefasada(registros, 'tempMed', 2);
    expect(resultado.porDefasagem).toHaveLength(3);
    expect(resultado.porDefasagem.map((d) => d.defasagem)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run tests/analytics/correlacao.test.js`
Expected: FAIL — `correlacaoPearson is not a function`.

- [ ] **Step 3: Implementar**

Append to `src/analytics/index.js`:

```js
/**
 * Coeficiente de correlacao linear de Pearson.
 * Devolve nulo quando nao ha variacao em uma das series ou quando
 * ha menos de tres pares, casos em que o coeficiente nao tem sentido.
 */
export function correlacaoPearson(x, y) {
  if (x.length !== y.length) throw new Error('as series devem ter o mesmo tamanho');
  const n = x.length;
  if (n < 3) return null;

  const mediaX = x.reduce((a, b) => a + b, 0) / n;
  const mediaY = y.reduce((a, b) => a + b, 0) / n;

  let covariancia = 0;
  let variaciaX = 0;
  let variaciaY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - mediaX;
    const dy = y[i] - mediaY;
    covariancia += dx * dy;
    variaciaX += dx * dx;
    variaciaY += dy * dy;
  }

  if (variaciaX === 0 || variaciaY === 0) return null;
  return covariancia / Math.sqrt(variaciaX * variaciaY);
}

/**
 * Correlaciona uma variavel climatica com a incidencia em varias defasagens
 * e devolve a defasagem de maior correlacao em modulo.
 * A hipotese e que calor e umidade antecedem o aumento de casos.
 */
export function correlacaoDefasada(registros, campoClima, maxDefasagem) {
  const porDefasagem = [];

  for (let defasagem = 0; defasagem <= maxDefasagem; defasagem += 1) {
    const clima = [];
    const incidencia = [];

    for (let i = 0; i + defasagem < registros.length; i += 1) {
      const origem = registros[i];
      const alvo = registros[i + defasagem];
      const valorClima = origem[campoClima];
      const valorIncidencia = alvo.inc100k;

      const utilizavel =
        !origem.parcial && !alvo.parcial &&
        valorClima !== null && valorClima !== undefined &&
        valorIncidencia !== null && valorIncidencia !== undefined;

      if (utilizavel) {
        clima.push(valorClima);
        incidencia.push(valorIncidencia);
      }
    }

    porDefasagem.push({
      defasagem,
      coeficiente: correlacaoPearson(clima, incidencia),
      n: clima.length
    });
  }

  const comCoeficiente = porDefasagem.filter((d) => d.coeficiente !== null);
  const melhor = comCoeficiente.length
    ? comCoeficiente.reduce((a, b) => (Math.abs(b.coeficiente) > Math.abs(a.coeficiente) ? b : a))
    : { defasagem: 0, coeficiente: null, n: 0 };

  return { ...melhor, porDefasagem };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/analytics/correlacao.test.js`
Expected: PASS, 10 testes.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/index.js tests/analytics/correlacao.test.js
git commit -m "Adiciona correlacao de Pearson e busca de defasagem clima x incidencia"
```

---

### Task 4: Resumo de níveis de alerta

**Files:**
- Modify: `src/analytics/index.js`
- Create: `tests/analytics/resumo-alertas.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `resumoAlertas(registros) => Array<{ nivel: 1|2|3|4, rotulo: string, semanas: number, percentual: number }>`
- Rótulos fixos: 1 `'Verde - sem indicio de risco'`, 2 `'Amarelo - alerta de transmissao'`, 3 `'Laranja - transmissao sustentada'`, 4 `'Vermelho - risco de epidemia'`

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/analytics/resumo-alertas.test.js`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run tests/analytics/resumo-alertas.test.js`
Expected: FAIL — `resumoAlertas is not a function`.

- [ ] **Step 3: Implementar**

Append to `src/analytics/index.js`:

```js
export const ROTULOS_NIVEL = {
  1: 'Verde - sem indicio de risco',
  2: 'Amarelo - alerta de transmissao',
  3: 'Laranja - transmissao sustentada',
  4: 'Vermelho - risco de epidemia'
};

/** Distribuicao de semanas por nivel de alerta, sempre com os quatro niveis. */
export function resumoAlertas(registros) {
  const comNivel = registros.filter((r) => r.nivel !== null && r.nivel !== undefined);
  const total = comNivel.length;

  return [1, 2, 3, 4].map((nivel) => {
    const semanas = comNivel.filter((r) => r.nivel === nivel).length;
    return {
      nivel,
      rotulo: ROTULOS_NIVEL[nivel],
      semanas,
      percentual: total === 0 ? 0 : Number(((semanas / total) * 100).toFixed(1))
    };
  });
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/analytics/resumo-alertas.test.js`
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/index.js tests/analytics/resumo-alertas.test.js
git commit -m "Adiciona resumo de distribuicao dos niveis de alerta"
```

---

### Task 5: Cliente da API InfoDengue

**Files:**
- Create: `src/ingest/infodengue.js`, `tests/ingest/infodengue.test.js`, `tests/fixtures/infodengue.json`

**Interfaces:**
- Consumes: nada
- Produces:
  - `normalizarRegistro(bruto) => Registro`
  - `buscarSemanas({ geocode, anoInicio, anoFim, fetchImpl }) => Promise<Registro[]>`
  - `Registro = { se, dataInicio, casos, casosEst, casosEstMin, casosEstMax, rt, inc100k, nivel, tempMin, tempMed, tempMax, umidMin, umidMed, umidMax, populacao, parcial }`
  - `dataInicio` é string `AAAA-MM-DD`; campos numéricos são `number|null`; `parcial` é `boolean`

- [ ] **Step 1: Congelar a resposta real como fixture**

```bash
mkdir -p tests/fixtures
cp dados/infodengue_marilia.json tests/fixtures/infodengue.json
```

O arquivo `dados/infodengue_marilia.json` já existe no projeto com 90 semanas reais. A fixture entra no versionamento (o `.gitignore` ignora `dados/*.json`, não `tests/`), para a suíte não depender da API externa estar no ar.

- [ ] **Step 2: Escrever o teste que falha**

Create `tests/ingest/infodengue.test.js`:

```js
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
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx vitest run tests/ingest/infodengue.test.js`
Expected: FAIL — não consegue resolver `src/ingest/infodengue.js`.

- [ ] **Step 4: Implementar**

Create `src/ingest/infodengue.js`:

```js
const BASE = 'https://info.dengue.mat.br/api/alertcity';

/** A origem devolve varios numeros como texto; aqui viram numero ou nulo. */
function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const convertido = Number(valor);
  return Number.isNaN(convertido) ? null : convertido;
}

/** Converte o registro bruto da API no formato usado em todo o projeto. */
export function normalizarRegistro(bruto) {
  const casos = bruto.casos === null || bruto.casos === undefined ? null : Number(bruto.casos);

  return {
    se: Number(bruto.SE),
    dataInicio: new Date(bruto.data_iniSE).toISOString().slice(0, 10),
    casos,
    casosEst: numero(bruto.casos_est),
    casosEstMin: numero(bruto.casos_est_min),
    casosEstMax: numero(bruto.casos_est_max),
    rt: numero(bruto.Rt),
    inc100k: numero(bruto.p_inc100k),
    nivel: numero(bruto.nivel),
    tempMin: numero(bruto.tempmin),
    tempMed: numero(bruto.tempmed),
    tempMax: numero(bruto.tempmax),
    umidMin: numero(bruto.umidmin),
    umidMed: numero(bruto.umidmed),
    umidMax: numero(bruto.umidmax),
    populacao: numero(bruto.pop),
    // Semana sem casos consolidados ainda esta sendo fechada pela vigilancia.
    parcial: casos === null
  };
}

/** Busca a serie semanal do municipio e devolve registros normalizados. */
export async function buscarSemanas({ geocode, anoInicio, anoFim, fetchImpl = fetch }) {
  const parametros = new URLSearchParams({
    geocode: String(geocode),
    disease: 'dengue',
    format: 'json',
    ew_start: '1',
    ew_end: '53',
    ey_start: String(anoInicio),
    ey_end: String(anoFim)
  });

  const resposta = await fetchImpl(`${BASE}?${parametros}`);
  if (!resposta.ok) {
    throw new Error(`InfoDengue respondeu ${resposta.status}`);
  }

  const bruto = await resposta.json();
  return bruto.map(normalizarRegistro).sort((a, b) => a.se - b.se);
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run tests/ingest/infodengue.test.js`
Expected: PASS, 8 testes.

- [ ] **Step 6: Commit**

```bash
git add src/ingest/infodengue.js tests/ingest/infodengue.test.js tests/fixtures/infodengue.json
git commit -m "Adiciona cliente e normalizacao da API InfoDengue"
```

---

### Task 6: Banco de dados e persistência

**Files:**
- Create: `docker-compose.yml`, `.env.example`, `src/db/index.js`, `tests/db/persistencia.test.js`

**Interfaces:**
- Consumes: `Registro` da Task 5
- Produces:
  - `criarPool(urlConexao) => Pool`
  - `migrar(pool) => Promise<void>`
  - `salvarSemanas(pool, registros) => Promise<number>` — devolve quantidade gravada
  - `listarSemanas(pool, { de, ate }) => Promise<Registro[]>` — ordem crescente de `se`
  - `registrarExecucao(pool, { semanasLidas, sucesso, erro }) => Promise<void>`
  - `ultimaExecucao(pool) => Promise<{ concluidaEm, semanasLidas, sucesso } | null>`

- [ ] **Step 1: Criar `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: painel
      POSTGRES_PASSWORD: painel
      POSTGRES_DB: dengue
    ports:
      - "5432:5432"
    volumes:
      - dados_postgres:/var/lib/postgresql/data

volumes:
  dados_postgres:
```

- [ ] **Step 2: Criar `.env.example`**

```bash
# Conexao com o PostgreSQL. Local usa o docker-compose deste repositorio.
DATABASE_URL=postgres://painel:painel@localhost:5432/dengue
# Porta do servidor web
PORT=3000
# Codigo IBGE do municipio (3529005 = Marilia-SP)
GEOCODE=3529005
```

- [ ] **Step 3: Subir o banco**

Run: `docker compose up -d`
Expected: container `postgres` em execução. Confirmar com `docker compose ps`.

- [ ] **Step 4: Escrever o teste que falha**

Create `tests/db/persistencia.test.js`:

```js
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
```

- [ ] **Step 5: Rodar e confirmar a falha**

Run: `npx vitest run tests/db/persistencia.test.js`
Expected: FAIL — não consegue resolver `src/db/index.js`.

- [ ] **Step 6: Implementar**

Create `src/db/index.js`:

```js
import pg from 'pg';

const { Pool } = pg;

export function criarPool(urlConexao) {
  return new Pool({
    connectionString: urlConexao,
    ssl: urlConexao.includes('localhost') ? false : { rejectUnauthorized: false }
  });
}

export async function migrar(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS semana_epidemiologica (
      se             INTEGER PRIMARY KEY,
      data_inicio    DATE        NOT NULL,
      casos          INTEGER,
      casos_est      NUMERIC(10,2),
      casos_est_min  INTEGER,
      casos_est_max  INTEGER,
      rt             NUMERIC(10,6),
      inc_100k       NUMERIC(10,4),
      nivel          SMALLINT CHECK (nivel BETWEEN 1 AND 4),
      temp_min       NUMERIC(6,2),
      temp_med       NUMERIC(6,2),
      temp_max       NUMERIC(6,2),
      umid_min       NUMERIC(6,2),
      umid_med       NUMERIC(6,2),
      umid_max       NUMERIC(6,2),
      populacao      INTEGER,
      parcial        BOOLEAN     NOT NULL DEFAULT FALSE,
      atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS execucao_ingestao (
      id             SERIAL PRIMARY KEY,
      iniciada_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
      concluida_em   TIMESTAMPTZ,
      semanas_lidas  INTEGER,
      sucesso        BOOLEAN     NOT NULL DEFAULT FALSE,
      erro           TEXT
    );
  `);
}

/** Grava de forma idempotente: reprocessar a mesma semana atualiza a linha. */
export async function salvarSemanas(pool, registros) {
  for (const r of registros) {
    await pool.query(
      `INSERT INTO semana_epidemiologica
         (se, data_inicio, casos, casos_est, casos_est_min, casos_est_max, rt, inc_100k,
          nivel, temp_min, temp_med, temp_max, umid_min, umid_med, umid_max, populacao, parcial)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (se) DO UPDATE SET
         data_inicio = EXCLUDED.data_inicio, casos = EXCLUDED.casos,
         casos_est = EXCLUDED.casos_est, casos_est_min = EXCLUDED.casos_est_min,
         casos_est_max = EXCLUDED.casos_est_max, rt = EXCLUDED.rt,
         inc_100k = EXCLUDED.inc_100k, nivel = EXCLUDED.nivel,
         temp_min = EXCLUDED.temp_min, temp_med = EXCLUDED.temp_med,
         temp_max = EXCLUDED.temp_max, umid_min = EXCLUDED.umid_min,
         umid_med = EXCLUDED.umid_med, umid_max = EXCLUDED.umid_max,
         populacao = EXCLUDED.populacao, parcial = EXCLUDED.parcial,
         atualizado_em = now()`,
      [r.se, r.dataInicio, r.casos, r.casosEst, r.casosEstMin, r.casosEstMax, r.rt,
       r.inc100k, r.nivel, r.tempMin, r.tempMed, r.tempMax, r.umidMin, r.umidMed,
       r.umidMax, r.populacao, r.parcial]
    );
  }
  return registros.length;
}

function paraRegistro(linha) {
  const num = (v) => (v === null ? null : Number(v));
  return {
    se: linha.se,
    dataInicio: linha.data_inicio.toISOString().slice(0, 10),
    casos: linha.casos,
    casosEst: num(linha.casos_est),
    casosEstMin: linha.casos_est_min,
    casosEstMax: linha.casos_est_max,
    rt: num(linha.rt),
    inc100k: num(linha.inc_100k),
    nivel: linha.nivel,
    tempMin: num(linha.temp_min),
    tempMed: num(linha.temp_med),
    tempMax: num(linha.temp_max),
    umidMin: num(linha.umid_min),
    umidMed: num(linha.umid_med),
    umidMax: num(linha.umid_max),
    populacao: linha.populacao,
    parcial: linha.parcial
  };
}

export async function listarSemanas(pool, { de, ate }) {
  const condicoes = [];
  const valores = [];
  if (de !== undefined && de !== null) { valores.push(de); condicoes.push(`se >= $${valores.length}`); }
  if (ate !== undefined && ate !== null) { valores.push(ate); condicoes.push(`se <= $${valores.length}`); }
  const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT * FROM semana_epidemiologica ${onde} ORDER BY se ASC`, valores
  );
  return rows.map(paraRegistro);
}

export async function registrarExecucao(pool, { semanasLidas, sucesso, erro }) {
  await pool.query(
    `INSERT INTO execucao_ingestao (concluida_em, semanas_lidas, sucesso, erro)
     VALUES (now(), $1, $2, $3)`,
    [semanasLidas, sucesso, erro]
  );
}

export async function ultimaExecucao(pool) {
  const { rows } = await pool.query(
    `SELECT concluida_em, semanas_lidas, sucesso FROM execucao_ingestao
     WHERE sucesso = TRUE ORDER BY concluida_em DESC LIMIT 1`
  );
  if (!rows.length) return null;
  return {
    concluidaEm: rows[0].concluida_em,
    semanasLidas: rows[0].semanas_lidas,
    sucesso: rows[0].sucesso
  };
}
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `npx vitest run tests/db/persistencia.test.js`
Expected: PASS, 5 testes.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .env.example src/db/index.js tests/db/persistencia.test.js
git commit -m "Adiciona schema, persistencia idempotente e registro de ingestao"
```

---

### Task 7: Orquestração da ingestão

**Files:**
- Create: `src/ingest/index.js`, `tests/ingest/orquestracao.test.js`

**Interfaces:**
- Consumes: `buscarSemanas` (Task 5), `salvarSemanas` / `registrarExecucao` (Task 6)
- Produces: `executarIngestao({ pool, geocode, anoInicio, anoFim, buscar, salvar, registrar }) => Promise<{ sucesso: boolean, semanasLidas: number, erro: string|null }>`
- As dependências são injetadas para o teste não precisar de rede nem de banco.

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/ingest/orquestracao.test.js`:

```js
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
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run tests/ingest/orquestracao.test.js`
Expected: FAIL — não consegue resolver `src/ingest/index.js`.

- [ ] **Step 3: Implementar**

Create `src/ingest/index.js`:

```js
import { buscarSemanas } from './infodengue.js';
import { salvarSemanas, registrarExecucao } from '../db/index.js';

/**
 * Executa o ciclo completo de ingestao. Nunca lanca: uma falha da API externa
 * nao pode derrubar o servidor, so fica registrada para o painel avisar
 * que os dados estao desatualizados.
 */
export async function executarIngestao({
  pool, geocode, anoInicio, anoFim,
  buscar = buscarSemanas, salvar = salvarSemanas, registrar = registrarExecucao
}) {
  try {
    const registros = await buscar({ geocode, anoInicio, anoFim });
    const semanasLidas = await salvar(pool, registros);
    await registrar(pool, { semanasLidas, sucesso: true, erro: null });
    return { sucesso: true, semanasLidas, erro: null };
  } catch (falha) {
    await registrar(pool, { semanasLidas: 0, sucesso: false, erro: falha.message });
    return { sucesso: false, semanasLidas: 0, erro: falha.message };
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/ingest/orquestracao.test.js`
Expected: PASS, 3 testes.

- [ ] **Step 5: Commit**

```bash
git add src/ingest/index.js tests/ingest/orquestracao.test.js
git commit -m "Adiciona orquestracao da ingestao com registro de falhas"
```

---

### Task 8: API REST

**Files:**
- Create: `src/api/rotas.js`, `tests/api/rotas.test.js`

**Interfaces:**
- Consumes: `listarSemanas` / `ultimaExecucao` (Task 6), todo o `src/analytics/index.js`
- Produces: `criarRotas({ listar, ultima }) => Router` — dependências injetadas, sem banco nos testes
- Rotas: `GET /api/series`, `GET /api/indicadores`, `GET /api/clima`, `GET /api/status`, `GET /healthz`

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/api/rotas.test.js`:

```js
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
    expect(resposta.body.semanas[0].rotuloNivel).toBe('Verde - sem indicio de risco');
    expect(resposta.body.semanas[11].rotuloNivel).toBe('Vermelho - risco de epidemia');
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
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run tests/api/rotas.test.js`
Expected: FAIL — não consegue resolver `src/api/rotas.js`.

- [ ] **Step 3: Implementar**

Create `src/api/rotas.js`:

```js
import { Router } from 'express';
import { mediaMovel, tendenciaRt, correlacaoDefasada, resumoAlertas, ROTULOS_NIVEL } from '../analytics/index.js';

const FORMATO_SE = /^\d{6}$/;
const MAX_DEFASAGEM = 6;

function lerSemana(valor, nome) {
  if (valor === undefined) return null;
  if (!FORMATO_SE.test(valor)) {
    throw Object.assign(
      new Error(`parametro "${nome}" deve ser uma semana epidemiologica no formato AAAASS`),
      { status: 400 }
    );
  }
  return Number(valor);
}

export function criarRotas({ listar, ultima }) {
  const rotas = Router();

  const responder = (manipulador) => async (req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=3600');
      await manipulador(req, res);
    } catch (falha) {
      const status = falha.status ?? 503;
      res.status(status).json({ erro: falha.message });
    }
  };

  rotas.get('/api/series', responder(async (req, res) => {
    const filtro = {
      de: lerSemana(req.query.de, 'de'),
      ate: lerSemana(req.query.ate, 'ate')
    };
    const semanas = await listar(filtro);
    const suavizado = mediaMovel(semanas.map((s) => s.casos), 3);
    res.json({
      // O rotulo do nivel vai pronto para o cliente: assim o texto existe
      // em um lugar so, e o navegador nao precisa do modulo do servidor.
      semanas: semanas.map((s, i) => ({
        ...s,
        mediaMovel: suavizado[i],
        rotuloNivel: s.nivel ? ROTULOS_NIVEL[s.nivel] : null
      }))
    });
  }));

  rotas.get('/api/indicadores', responder(async (_req, res) => {
    const semanas = await listar({});
    const consolidadas = semanas.filter((s) => !s.parcial);
    const pico = consolidadas.reduce(
      (a, s) => ((s.casos ?? 0) > (a?.casos ?? -1) ? s : a), null
    );

    res.json({
      totalCasos: consolidadas.reduce((a, s) => a + (s.casos ?? 0), 0),
      semanasEmBase: semanas.length,
      semanaPico: pico ? { se: pico.se, casos: pico.casos } : null,
      rtAtual: consolidadas.length ? consolidadas[consolidadas.length - 1].rt : null,
      tendencia: tendenciaRt(consolidadas.map((s) => s.rt)),
      nivelVigente: consolidadas.length ? consolidadas[consolidadas.length - 1].nivel : null,
      alertas: resumoAlertas(consolidadas)
    });
  }));

  rotas.get('/api/clima', responder(async (_req, res) => {
    const semanas = await listar({});
    res.json({
      temperatura: correlacaoDefasada(semanas, 'tempMed', MAX_DEFASAGEM),
      umidade: correlacaoDefasada(semanas, 'umidMed', MAX_DEFASAGEM)
    });
  }));

  rotas.get('/api/status', responder(async (_req, res) => {
    const [semanas, execucao] = await Promise.all([listar({}), ultima()]);
    res.json({
      semanasEmBase: semanas.length,
      ultimaAtualizacao: execucao ? execucao.concluidaEm : null
    });
  }));

  rotas.get('/healthz', (_req, res) => res.json({ ok: true }));

  return rotas;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/api/rotas.test.js`
Expected: PASS, 10 testes.

- [ ] **Step 5: Commit**

```bash
git add src/api/rotas.js tests/api/rotas.test.js
git commit -m "Adiciona API REST com series, indicadores, clima e status"
```

---

### Task 9: Tabelas equivalentes acessíveis

Sem esta task o requisito de acessibilidade não se cumpre: gráfico em `<canvas>` é opaco para leitor de tela.

**Files:**
- Create: `src/web/tabela.js`, `tests/web/tabela.test.js`

**Interfaces:**
- Consumes: formato de semana da Task 8 (`{ se, casos, mediaMovel, rotuloNivel, parcial, ... }`). O rótulo chega pronto da API — o texto dos níveis vive só em `src/analytics/index.js`.
- Produces:
  - `montarTabelaSeries(semanas) => string` (HTML de uma `<table>` completa com `<caption>`)
  - `montarTabelaAlertas(alertas) => string` — recebe a saída de `resumoAlertas`

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/web/tabela.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';
import { montarTabelaSeries, montarTabelaAlertas } from '../../src/web/tabela.js';

const semanas = [
  { se: 202501, casos: 10, mediaMovel: null, rotuloNivel: 'Verde - sem indicio de risco' },
  { se: 202502, casos: 20, mediaMovel: null, rotuloNivel: 'Amarelo - alerta de transmissao' },
  { se: 202503, casos: 30, mediaMovel: 20, rotuloNivel: 'Vermelho - risco de epidemia' },
  { se: 202504, casos: null, mediaMovel: null, rotuloNivel: null, parcial: true }
];

describe('montarTabelaSeries', () => {
  it('gera uma linha por semana com legenda e cabecalhos de escopo', () => {
    const dom = new JSDOM(`<main>${montarTabelaSeries(semanas)}</main>`);
    const doc = dom.window.document;

    expect(doc.querySelector('caption')).toBeTruthy();
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(doc.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
  });

  it('mostra semana sem dado como texto explicito, nunca como zero', () => {
    const dom = new JSDOM(`<main>${montarTabelaSeries(semanas)}</main>`);
    const ultimaLinha = dom.window.document.querySelectorAll('tbody tr')[3];
    expect(ultimaLinha.textContent).toContain('em consolidacao');
    expect(ultimaLinha.textContent).not.toContain('>0<');
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
    { nivel: 1, rotulo: 'Verde - sem indicio de risco', semanas: 40, percentual: 50 },
    { nivel: 2, rotulo: 'Amarelo - alerta de transmissao', semanas: 20, percentual: 25 },
    { nivel: 3, rotulo: 'Laranja - transmissao sustentada', semanas: 12, percentual: 15 },
    { nivel: 4, rotulo: 'Vermelho - risco de epidemia', semanas: 8, percentual: 10 }
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
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run tests/web/tabela.test.js`
Expected: FAIL — não consegue resolver `src/web/tabela.js`.

- [ ] **Step 3: Implementar**

Create `src/web/tabela.js`:

```js
const SEM_DADO = 'em consolidacao';

function celula(valor, casas = 0) {
  if (valor === null || valor === undefined) return SEM_DADO;
  return Number(valor).toFixed(casas);
}

/**
 * Tabela equivalente ao grafico de series. Existe para que quem usa
 * leitor de tela tenha acesso ao mesmo dado: canvas nao e legivel.
 */
export function montarTabelaSeries(semanas) {
  const linhas = semanas.map((s) => `
      <tr>
        <th scope="row">${s.se}</th>
        <td>${celula(s.casos)}</td>
        <td>${celula(s.mediaMovel, 1)}</td>
        <td>${s.rotuloNivel ?? SEM_DADO}</td>
      </tr>`).join('');

  return `
    <table>
      <caption>Casos de dengue por semana epidemiologica em Marilia, com media movel de tres semanas e nivel de alerta</caption>
      <thead>
        <tr>
          <th scope="col">Semana</th>
          <th scope="col">Casos notificados</th>
          <th scope="col">Media movel (3 semanas)</th>
          <th scope="col">Nivel de alerta</th>
        </tr>
      </thead>
      <tbody>${linhas}
      </tbody>
    </table>`;
}

/** Tabela equivalente ao grafico de barras de niveis de alerta. */
export function montarTabelaAlertas(alertas) {
  const linhas = alertas.map((a) => `
      <tr>
        <th scope="row">${a.rotulo}</th>
        <td>${a.semanas}</td>
        <td>${a.percentual}%</td>
      </tr>`).join('');

  return `
    <table>
      <caption>Quantidade de semanas epidemiologicas em cada nivel de alerta</caption>
      <thead>
        <tr>
          <th scope="col">Nivel de alerta</th>
          <th scope="col">Semanas</th>
          <th scope="col">Percentual do periodo</th>
        </tr>
      </thead>
      <tbody>${linhas}
      </tbody>
    </table>`;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/web/tabela.test.js`
Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/web/tabela.js tests/web/tabela.test.js
git commit -m "Adiciona tabela equivalente acessivel para a serie semanal"
```

---

### Task 10: Painel web e servidor

**Files:**
- Create: `src/web/index.html`, `src/web/estilos.css`, `src/web/app.js`, `servidor.js`, `tests/web/pagina.test.js`

**Interfaces:**
- Consumes: `criarRotas` (Task 8), `montarTabelaSeries` (Task 9), `criarPool`/`migrar`/`listarSemanas`/`ultimaExecucao` (Task 6), `executarIngestao` (Task 7)
- Produces: aplicação executável por `npm start`

- [ ] **Step 1: Criar `src/web/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Painel de vigilancia da dengue em Marilia</title>
  <link rel="stylesheet" href="estilos.css">
</head>
<body>
  <a class="pular" href="#conteudo">Pular para o conteudo</a>

  <header>
    <h1>Painel de vigilancia da dengue em Marilia</h1>
    <p id="atualizacao" role="status">Carregando dados...</p>
  </header>

  <main id="conteudo">
    <section aria-labelledby="titulo-indicadores">
      <h2 id="titulo-indicadores">Indicadores do periodo</h2>
      <dl id="indicadores"></dl>
    </section>

    <section aria-labelledby="titulo-serie">
      <h2 id="titulo-serie">Casos por semana epidemiologica</h2>
      <button type="button" class="alternar" data-alvo="serie" aria-expanded="false">
        Ver dados em tabela
      </button>
      <canvas id="grafico-serie" role="img"
              aria-label="Grafico de linha com casos de dengue por semana e media movel de tres semanas"></canvas>
      <div id="serie" hidden></div>
    </section>

    <section aria-labelledby="titulo-alertas">
      <h2 id="titulo-alertas">Distribuicao dos niveis de alerta</h2>
      <canvas id="grafico-alertas" role="img"
              aria-label="Grafico de barras com a quantidade de semanas em cada nivel de alerta"></canvas>
      <div id="tabela-alertas"></div>
    </section>

    <section aria-labelledby="titulo-clima">
      <h2 id="titulo-clima">Relacao entre clima e incidencia</h2>
      <p id="resumo-clima"></p>
      <canvas id="grafico-clima" role="img"
              aria-label="Grafico de dispersao relacionando temperatura media e incidencia por cem mil habitantes"></canvas>
    </section>
  </main>

  <footer>
    <p>
      Dados: <a href="https://info.dengue.mat.br">InfoDengue</a>.
      Projeto Integrador II - Universidade Virtual do Estado de Sao Paulo.
    </p>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `src/web/estilos.css`**

Contraste verificado: texto `#1a1a1a` sobre `#ffffff` dá 17:1; `#0b5c8a` sobre branco dá 5,9:1. Ambos acima do mínimo AA de 4,5:1.

```css
:root {
  --texto: #1a1a1a;
  --fundo: #ffffff;
  --destaque: #0b5c8a;
  --borda: #767676;
}

body {
  margin: 0 auto;
  max-width: 60rem;
  padding: 1rem;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: var(--texto);
  background: var(--fundo);
}

a { color: var(--destaque); }

.pular {
  position: absolute;
  left: -100vw;
}
.pular:focus {
  position: static;
  display: inline-block;
  padding: 0.5rem;
}

:focus-visible {
  outline: 3px solid var(--destaque);
  outline-offset: 2px;
}

button.alternar {
  padding: 0.5rem 1rem;
  border: 2px solid var(--destaque);
  background: var(--fundo);
  color: var(--destaque);
  font-size: 1rem;
  cursor: pointer;
}

table { border-collapse: collapse; width: 100%; }
caption { text-align: left; padding-bottom: 0.5rem; font-weight: 600; }
th, td { border: 1px solid var(--borda); padding: 0.4rem 0.6rem; text-align: left; }

dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1rem; }
dt { font-weight: 600; }
dd { margin: 0; font-size: 1.5rem; }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 3: Criar `src/web/app.js`**

```js
import { montarTabelaSeries, montarTabelaAlertas } from './tabela.js';

const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function buscar(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`falha ao carregar ${caminho}`);
  return resposta.json();
}

function preencherIndicadores(dados) {
  const itens = [
    ['Casos no periodo', dados.totalCasos],
    ['Semana de pico', dados.semanaPico ? `${dados.semanaPico.se} (${dados.semanaPico.casos} casos)` : 'sem dado'],
    ['Tendencia de transmissao', dados.tendencia],
    ['Nivel de alerta vigente', dados.alertas.find((a) => a.nivel === dados.nivelVigente)?.rotulo ?? 'sem dado']
  ];
  document.getElementById('indicadores').innerHTML = itens
    .map(([rotulo, valor]) => `<dt>${rotulo}</dt><dd>${valor}</dd>`).join('');
}

function desenharSerie(semanas) {
  new Chart(document.getElementById('grafico-serie'), {
    type: 'line',
    data: {
      labels: semanas.map((s) => s.se),
      datasets: [
        { label: 'Casos notificados', data: semanas.map((s) => s.casos), borderColor: '#0b5c8a' },
        { label: 'Media movel (3 semanas)', data: semanas.map((s) => s.mediaMovel), borderColor: '#8a3b0b', borderDash: [6, 4] }
      ]
    },
    options: { animation: !semAnimacao, scales: { y: { beginAtZero: true } } }
  });
}

function desenharAlertas(alertas) {
  document.getElementById('tabela-alertas').innerHTML = montarTabelaAlertas(alertas);

  new Chart(document.getElementById('grafico-alertas'), {
    type: 'bar',
    data: {
      labels: alertas.map((a) => a.rotulo),
      datasets: [{
        label: 'Semanas no nivel',
        data: alertas.map((a) => a.semanas),
        // Cores do protocolo de alerta, sempre acompanhadas do rotulo textual:
        // a informacao nunca depende so da cor.
        backgroundColor: ['#1b7a3d', '#8a6d00', '#8a4b00', '#9c1c1c']
      }]
    },
    options: { animation: !semAnimacao, scales: { y: { beginAtZero: true } } }
  });
}

function desenharClima(semanas) {
  const pontos = semanas
    .filter((s) => !s.parcial && s.tempMed !== null && s.inc100k !== null)
    .map((s) => ({ x: s.tempMed, y: s.inc100k }));

  new Chart(document.getElementById('grafico-clima'), {
    type: 'scatter',
    data: { datasets: [{ label: 'Semana', data: pontos, backgroundColor: '#0b5c8a' }] },
    options: {
      animation: !semAnimacao,
      scales: {
        x: { title: { display: true, text: 'Temperatura media (C)' } },
        y: { title: { display: true, text: 'Incidencia por 100 mil habitantes' } }
      }
    }
  });
}

function ligarAlternadores(semanas) {
  document.querySelectorAll('button.alternar').forEach((botao) => {
    const alvo = document.getElementById(botao.dataset.alvo);
    alvo.innerHTML = montarTabelaSeries(semanas);
    botao.addEventListener('click', () => {
      const aberto = botao.getAttribute('aria-expanded') === 'true';
      botao.setAttribute('aria-expanded', String(!aberto));
      botao.textContent = aberto ? 'Ver dados em tabela' : 'Ocultar tabela';
      alvo.hidden = aberto;
    });
  });
}

async function iniciar() {
  try {
    const [serie, indicadores, clima, status] = await Promise.all([
      buscar('/api/series'), buscar('/api/indicadores'), buscar('/api/clima'), buscar('/api/status')
    ]);

    document.getElementById('atualizacao').textContent = status.ultimaAtualizacao
      ? `Dados atualizados em ${new Date(status.ultimaAtualizacao).toLocaleString('pt-BR')} - ${status.semanasEmBase} semanas em base.`
      : 'Carga inicial em andamento. Recarregue em alguns instantes.';

    preencherIndicadores(indicadores);
    desenharSerie(serie.semanas);
    desenharAlertas(indicadores.alertas);
    desenharClima(serie.semanas);
    ligarAlternadores(serie.semanas);

    const t = clima.temperatura;
    document.getElementById('resumo-clima').textContent = t.coeficiente === null
      ? 'Ainda nao ha dados suficientes para calcular a correlacao.'
      : `A maior correlacao entre temperatura media e incidencia ocorre com defasagem de ${t.defasagem} semana(s), com coeficiente de ${t.coeficiente.toFixed(2)} sobre ${t.n} semanas. Correlacao nao estabelece causalidade.`;
  } catch (falha) {
    document.getElementById('atualizacao').textContent =
      'Nao foi possivel carregar os dados agora. Tente novamente em instantes.';
  }
}

iniciar();
```

- [ ] **Step 4: Criar `servidor.js`**

```js
import express from 'express';
import cron from 'node-cron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { criarPool, migrar, listarSemanas, ultimaExecucao } from './src/db/index.js';
import { executarIngestao } from './src/ingest/index.js';
import { criarRotas } from './src/api/rotas.js';

const PASTA = dirname(fileURLToPath(import.meta.url));
const PORTA = Number(process.env.PORT ?? 3000);
const GEOCODE = Number(process.env.GEOCODE ?? 3529005);
const URL_BANCO = process.env.DATABASE_URL ?? 'postgres://painel:painel@localhost:5432/dengue';

const pool = criarPool(URL_BANCO);
const anoAtual = new Date().getFullYear();

const app = express();
app.use(criarRotas({
  listar: (filtro) => listarSemanas(pool, filtro),
  ultima: () => ultimaExecucao(pool)
}));
app.use(express.static(join(PASTA, 'src', 'web')));

async function ingerir() {
  const resultado = await executarIngestao({
    pool, geocode: GEOCODE, anoInicio: anoAtual - 1, anoFim: anoAtual
  });
  console.log(resultado.sucesso
    ? `Ingestao concluida: ${resultado.semanasLidas} semanas.`
    : `Ingestao falhou: ${resultado.erro}`);
}

await migrar(pool);
await ingerir();

// Uma vez por dia as 4h. O dado de origem e semanal, entao nao ha ganho em rodar mais.
cron.schedule('0 4 * * *', ingerir);

app.listen(PORTA, () => console.log(`Painel disponivel em http://localhost:${PORTA}`));
```

- [ ] **Step 5: Escrever o teste de acessibilidade da página**

Create `tests/web/pagina.test.js`:

```js
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
```

- [ ] **Step 6: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS em todos os arquivos. Se o axe apontar violação, corrigir o HTML — a mensagem do teste nomeia a regra violada.

- [ ] **Step 7: Subir a aplicação e conferir**

Run: `docker compose up -d && npm start`
Expected: log `Ingestao concluida: N semanas.` e o painel respondendo em `http://localhost:3000` com os três blocos preenchidos.

- [ ] **Step 8: Commit**

```bash
git add src/web/ servidor.js tests/web/pagina.test.js
git commit -m "Adiciona painel web acessivel e servidor com ingestao agendada"
```

---

### Task 11: Cobertura, README e publicação em nuvem

**Files:**
- Create: `README.md`, `render.yaml`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: aplicação completa das tasks anteriores
- Produces: repositório público no GitHub e painel publicado com URL acessível

- [ ] **Step 1: Verificar a cobertura**

Run: `npm run cobertura`
Expected: `src/analytics/` e `src/api/` acima de 80% em linhas e funções. Se ficar abaixo, escrever testes para os ramos descobertos antes de seguir — não baixar o limiar.

- [ ] **Step 2: Criar `render.yaml`**

```yaml
services:
  - type: web
    name: painel-dengue-marilia
    runtime: node
    plan: free
    buildCommand: npm ci
    startCommand: npm start
    healthCheckPath: /healthz
    envVars:
      - key: GEOCODE
        value: "3529005"
      - key: DATABASE_URL
        sync: false
```

- [ ] **Step 3: Criar `README.md`**

```markdown
# Painel de vigilância da dengue em Marília

Projeto Integrador em Computação II — Bacharelado em Ciência de Dados — Univesp.

Painel web que consome dados abertos de vigilância de arboviroses, calcula indicadores
epidemiológicos e analisa a relação defasada entre variáveis climáticas e incidência
no município de Marília-SP.

## Funcionalidades

- Ingestão automática da API pública do InfoDengue, idempotente e agendada
- Série semanal de casos com média móvel de três semanas
- Indicadores: total do período, semana de pico, Rt, tendência e nível de alerta vigente
- Correlação de Pearson entre temperatura/umidade e incidência, com defasagem de 0 a 6 semanas
- Interface acessível (WCAG 2.1 AA) com tabela equivalente para cada gráfico

## Stack

Node.js · Express · PostgreSQL · Chart.js · Vitest · Supertest · axe-core · Docker

## Execução local

```bash
cp .env.example .env
docker compose up -d
npm install
npm start
```

O painel fica em http://localhost:3000.

## Testes

```bash
npm test          # suíte completa
npm run cobertura # relatório de cobertura
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | Conexão PostgreSQL | `postgres://painel:painel@localhost:5432/dengue` |
| `PORT` | Porta do servidor | `3000` |
| `GEOCODE` | Código IBGE do município | `3529005` (Marília-SP) |

## Fonte de dados

[InfoDengue](https://info.dengue.mat.br) — dados agregados por município e semana
epidemiológica, sem informação pessoal.

## Limitações conhecidas

- As semanas mais recentes vêm com casos ainda em consolidação e são marcadas como parciais;
  elas não entram nos cálculos de correlação.
- Correlação não estabelece causalidade. A série disponível é curta para conclusões sazonais.
- No plano gratuito de hospedagem o serviço hiberna após inatividade, então o primeiro
  acesso depois de um período ocioso é lento.
```

- [ ] **Step 4: Publicar no GitHub**

```bash
gh repo create painel-dengue-marilia --public --source=. --remote=origin --push
```

Se o `gh` não estiver autenticado, criar o repositório pela interface do GitHub e então:
`git remote add origin <url> && git push -u origin main`

- [ ] **Step 5: Provisionar banco e aplicação**

1. Criar um projeto gratuito no Neon e copiar a string de conexão.
2. No Render, criar um Web Service a partir do repositório, definindo `DATABASE_URL` com a string do Neon.
3. Aguardar o deploy e abrir a URL pública; confirmar que `/healthz` responde e que o painel carrega.

- [ ] **Step 6: Registrar a URL publicada no README**

Adicionar no topo do `README.md`: `**Painel publicado:** <url do Render>`

- [ ] **Step 7: Commit final**

```bash
git add README.md render.yaml
git commit -m "Adiciona documentacao e configuracao de publicacao em nuvem"
git push
```

---

## Ordem recomendada dado o prazo

O relatório parcial vence em 30/09/2026. As Tasks 1 a 8 já produzem números reais para a
seção 2.5 — média móvel, semana de pico, tendência e a correlação clima × incidência saem
todos da suíte de testes e da API, sem depender do painel estar bonito. Se o tempo apertar,
fazer 1 a 8 e capturar as telas na entrega seguinte; as Tasks 9 a 11 têm até 19/10 (Q6).
