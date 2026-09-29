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
