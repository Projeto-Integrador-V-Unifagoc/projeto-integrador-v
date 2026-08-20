import type { Api } from "../helpers/api.js";
import * as ids from "../helpers/ids.js";
import { cadastrarUsuario, login } from "./usuario.factory.js";

/**
 * Factory de professor (spec §4.2, §11.3). O backend valida CPF (checksum), UF
 * coerente com a cidade e relacionamento curso→faculdade.
 */

export interface ProfessorCriado {
  id: string;
  cpf: string;
  ativo: boolean;
}

export async function criarProfessor(
  api: Api,
  runId: string,
  dados: { cursoId: string; cidadeIbge: string; uf: string; cpf?: string },
): Promise<ProfessorCriado> {
  const cpf = dados.cpf ?? ids.cpf();
  const resposta = await api.post("/professores", {
    body: {
      nome: `Professor ${runId}`,
      cpf,
      data_nascimento: "1985-05-10",
      logradouro: "Av. dos Docentes",
      numero: "200",
      bairro: "Centro",
      cidade_id: dados.cidadeIbge,
      estado: dados.uf,
      cep: "35300000",
      curso_id: dados.cursoId,
    },
  });
  if (resposta.status !== 201) {
    throw new Error(`Falha ao criar professor: HTTP ${resposta.status} — ${JSON.stringify(resposta.body)}`);
  }
  const corpo = resposta.body;
  return { id: String(corpo.id), cpf, ativo: corpo.ativo ?? true };
}

/** Cria professor + login e devolve o token autenticado (perfil professor). */
export async function criarProfessorComLogin(
  api: Api,
  runId: string,
  dados: { cursoId: string; cidadeIbge: string; uf: string },
): Promise<{ professor: ProfessorCriado; email: string; senha: string; token: string }> {
  const professor = await criarProfessor(api, runId, dados);
  const email = ids.email("prof", runId);
  const senha = "Professor@123";
  await cadastrarUsuario(api, {
    nome: `Professor ${runId}`,
    email,
    senha,
    tipo_usuario: "professor",
    professor_id: professor.id,
  });
  const token = await login(api, email, senha);
  return { professor, email, senha, token };
}
