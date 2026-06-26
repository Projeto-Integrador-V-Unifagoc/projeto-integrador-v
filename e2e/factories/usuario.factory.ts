import type { Api } from "../helpers/api.js";

/**
 * Factory de usuários/autenticação (spec §4.2, §11.1). O cadastro exige perfil
 * secretaria; o login é público.
 */

export interface CadastroUsuario {
  nome: string;
  email: string;
  senha: string;
  tipo_usuario: "aluno" | "professor" | "secretaria" | "administrador";
  aluno_id?: string;
  professor_id?: string;
}

export async function cadastrarUsuario(apiSecretaria: Api, dados: CadastroUsuario) {
  const resposta = await apiSecretaria.post("/cadastro", { body: dados });
  if (resposta.status !== 201) {
    throw new Error(
      `Falha ao cadastrar usuário (${dados.tipo_usuario}): HTTP ${resposta.status} — ${JSON.stringify(resposta.body)}`,
    );
  }
  return resposta.body.usuario as { id: string; nome: string; email: string; tipo_usuario: string };
}

export async function login(api: Api, email: string, senha: string): Promise<string> {
  const resposta = await api.post("/login", { body: { email, senha } });
  if (resposta.status !== 200 || !resposta.body?.token) {
    throw new Error(`Falha no login de ${email}: HTTP ${resposta.status} — ${JSON.stringify(resposta.body)}`);
  }
  return resposta.body.token as string;
}
