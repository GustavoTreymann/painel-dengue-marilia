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

  // Verifica o banco de verdade: um healthz que responde ok com o banco fora
  // faria a hospedagem considerar saudavel uma instancia que nao serve dados.
  rotas.get('/healthz', async (_req, res) => {
    try {
      await ultima();
      res.json({ ok: true });
    } catch (falha) {
      res.status(503).json({ ok: false, erro: falha.message });
    }
  });

  return rotas;
}
