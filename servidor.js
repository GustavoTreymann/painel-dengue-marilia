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

// A porta abre antes da ingestao: baixar 90 semanas leva segundos, e o
// healthcheck da hospedagem nao pode esperar por isso no primeiro deploy.
app.listen(PORTA, () => console.log(`Painel disponivel em http://localhost:${PORTA}`));

await ingerir();

// Uma vez por dia as 4h. O dado de origem e semanal, entao nao ha ganho em rodar mais.
cron.schedule('0 4 * * *', ingerir);
