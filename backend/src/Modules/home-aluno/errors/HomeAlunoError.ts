export class HomeAlunoError extends Error {
  constructor(message: string, public readonly status = 400, public readonly codigo = "HOME_ALUNO_INVALIDO") {
    super(message);
    this.name = "HomeAlunoError";
  }
}

export const erroHomeAluno = {
  invalido: (mensagem: string) => new HomeAlunoError(mensagem, 400, "DADOS_INVALIDOS"),
  proibido: (mensagem = "Você não possui permissão para esta operação.") => new HomeAlunoError(mensagem, 403, "ACESSO_NEGADO"),
  naoEncontrado: (mensagem: string) => new HomeAlunoError(mensagem, 404, "NAO_ENCONTRADO"),
};
