// Serve o painel com a serie real em memoria, sem PostgreSQL.
// Uso: node scripts/demo-sem-banco.js [caminho do JSON bruto do InfoDengue]
// Serve para demonstracao e para capturar telas; producao usa servidor.js.
import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizarRegistro } from '../src/ingest/infodengue.js';
import { criarRotas } from '../src/api/rotas.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const arquivo = process.argv[2] ?? join(RAIZ, 'dados', 'infodengue_marilia.json');
const PORTA = Number(process.env.PORT ?? 3000);

const semanas = JSON.parse(readFileSync(arquivo, 'utf8'))
  .map(normalizarRegistro)
  .sort((a, b) => a.se - b.se);
const carregadoEm = new Date();

const app = express();
app.use(criarRotas({
  listar: async ({ de, ate } = {}) => semanas.filter(
    (s) => (de == null || s.se >= de) && (ate == null || s.se <= ate)
  ),
  ultima: async () => ({ concluidaEm: carregadoEm, semanasLidas: semanas.length, sucesso: true })
}));
app.use(express.static(join(RAIZ, 'src', 'web')));

app.listen(PORTA, () => console.log(
  `Demonstracao sem banco em http://localhost:${PORTA} (${semanas.length} semanas de ${arquivo})`
));
