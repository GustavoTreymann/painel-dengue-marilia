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
