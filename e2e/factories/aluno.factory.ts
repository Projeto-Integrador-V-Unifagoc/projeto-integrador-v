import type { Api } from "../helpers/api.js";
import * as ids from "../helpers/ids.js";
import { cadastrarUsuario, login } from "./usuario.factory.js";

/**
 * Factory de aluno (spec §4.2, §11.3). Cria pessoa + aluno atomicamente via API.
 */

export interface AlunoCriado {
  id: string;
  matricula: number | null;
  cpf: string;
}

export async function criarAluno(
  api: Api,
  runId: string,
  dados: { cursoId: string; cidadeIbge: string; uf: string; periodo?: string; cpf?: string },
): Promise<AlunoCriado> {
  const cpf = dados.cpf ?? ids.cpf();
  const resposta = await api.post("/alunos", {
    body: {
      pessoa: {
        cpf,
        nome: `Aluno ${runId}`,
        dataNascimento: "2002-03-15",
        logradouro: "Rua dos Estudantes",
        numero: "300",
        bairro: "Centro",
        cidadeIbge: dados.cidadeIbge,
        estado: dados.uf,
        cep: "35300000",
      },
      periodo: dados.periodo ?? "1",
      curso: dados.cursoId,
    },
  });
  if (resposta.status !== 201) {
    throw new Error(`Falha ao criar aluno: HTTP ${resposta.status} — ${JSON.stringify(resposta.body)}`);
  }
  const corpo = resposta.body;
  return {
    id: String(corpo.id),
    matricula: corpo.matricula ?? null,
    cpf,
  };
}

/** Cria aluno + login e devolve o token autenticado (perfil aluno). */
export async function criarAlunoComLogin(
  api: Api,
  runId: string,
  dados: { cursoId: string; cidadeIbge: string; uf: string; periodo?: string },
): Promise<{ aluno: AlunoCriado; email: string; senha: string; token: string }> {
  const aluno = await criarAluno(api, runId, dados);
  const email = ids.email("aluno", runId);
  const senha = "Aluno@1234";
  await cadastrarUsuario(api, {
    nome: `Aluno ${runId}`,
    email,
    senha,
    tipo_usuario: "aluno",
    aluno_id: aluno.id,
  });
  const token = await login(api, email, senha);
  return { aluno, email, senha, token };
}
