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

  /** Falha do acesso a dados vira 503; qualquer outra e erro nosso e vira 500. */
  const comBanco = async (operacao) => {
    try {
      return await operacao();
    } catch (falha) {
      throw Object.assign(
        new Error(`dados indisponiveis: ${falha.message}`), { status: 503 }
      );
    }
  };

  // O manipulador devolve o corpo em vez de escrever na resposta. Assim o
  // cabecalho de cache so e aplicado no caminho de sucesso: um 503 cacheado
  // por uma hora manteria o erro no ar muito depois de o banco voltar.
  const responder = (manipulador) => async (req, res) => {
    try {
      const corpo = await manipulador(req);
      res.set('Cache-Control', 'public, max-age=3600');
      res.json(corpo);
    } catch (falha) {
      res.status(falha.status ?? 500).json({ erro: falha.message });
    }
  };

  rotas.get('/api/series', responder(async (req) => {
    const filtro = {
      de: lerSemana(req.query.de, 'de'),
      ate: lerSemana(req.query.ate, 'ate')
    };
    const semanas = await comBanco(() => listar(filtro));
    const suavizado = mediaMovel(semanas.map((s) => s.casos), 3);

    return {
      // O rotulo do nivel vai pronto para o cliente: assim o texto existe
      // em um lugar so, e o navegador nao precisa do modulo do servidor.
      semanas: semanas.map((s, i) => ({
        ...s,
        mediaMovel: suavizado[i],
        rotuloNivel: s.nivel ? ROTULOS_NIVEL[s.nivel] : null
      }))
    };
  }));

  rotas.get('/api/indicadores', responder(async () => {
    const semanas = await comBanco(() => listar({}));

    // Semana sem casos nao entra na soma nem disputa o pico. Trata-la como
    // zero inventaria um numero que a vigilancia nunca informou, e no pico
    // chegaria a devolver uma "semana recorde" sem dado nenhum.
    const consolidadas = semanas.filter(
      (s) => !s.parcial && s.casos !== null && s.casos !== undefined
    );
    const pico = consolidadas.reduce(
      (a, s) => (a === null || s.casos > a.casos ? s : a), null
    );

    return {
      totalCasos: consolidadas.reduce((a, s) => a + s.casos, 0),
      semanasEmBase: semanas.length,
      semanaPico: pico ? { se: pico.se, casos: pico.casos } : null,
      rtAtual: consolidadas.length ? consolidadas[consolidadas.length - 1].rt : null,
      tendencia: tendenciaRt(consolidadas.map((s) => s.rt)),
      nivelVigente: consolidadas.length ? consolidadas[consolidadas.length - 1].nivel : null,
      alertas: resumoAlertas(consolidadas)
    };
  }));

  rotas.get('/api/clima', responder(async () => {
    const semanas = await comBanco(() => listar({}));
    return {
      temperatura: correlacaoDefasada(semanas, 'tempMed', MAX_DEFASAGEM),
      umidade: correlacaoDefasada(semanas, 'umidMed', MAX_DEFASAGEM)
    };
  }));

  rotas.get('/api/status', responder(async () => {
    const [semanas, execucao] = await Promise.all([
      comBanco(() => listar({})),
      comBanco(() => ultima())
    ]);
    return {
      semanasEmBase: semanas.length,
      ultimaAtualizacao: execucao ? execucao.concluidaEm : null
    };
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
