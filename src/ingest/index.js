import { buscarSemanas } from './infodengue.js';
import { salvarSemanas, registrarExecucao } from '../db/index.js';

/** Nem tudo que e lancado em JavaScript e um Error; `null.message` explodiria. */
function mensagemDe(falha) {
  return falha instanceof Error ? falha.message : String(falha);
}

export async function executarIngestao({
  pool, geocode, anoInicio, anoFim,
  buscar = buscarSemanas, salvar = salvarSemanas, registrar = registrarExecucao
}) {
  // Registrar a execucao usa o mesmo banco que pode ter acabado de falhar.
  // Se essa gravacao tambem falhar, a falha morre aqui: o proposito da funcao
  // e nao derrubar o servidor, e uma falha de log nao pode contrariar isso.
  const registrarComSeguranca = async (dados) => {
    try {
      await registrar(pool, dados);
    } catch (falhaDeRegistro) {
      console.error('Nao foi possivel registrar a execucao:', mensagemDe(falhaDeRegistro));
    }
  };

  try {
    const registros = await buscar({ geocode, anoInicio, anoFim });
    const semanasLidas = await salvar(pool, registros);
    await registrarComSeguranca({ semanasLidas, sucesso: true, erro: null });
    return { sucesso: true, semanasLidas, erro: null };
  } catch (falha) {
    const erro = mensagemDe(falha);
    await registrarComSeguranca({ semanasLidas: 0, sucesso: false, erro });
    return { sucesso: false, semanasLidas: 0, erro };
  }
}
