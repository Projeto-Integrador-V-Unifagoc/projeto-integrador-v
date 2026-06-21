export class NotaError extends Error {
  constructor(message: string, public readonly status = 400, public readonly codigo = "NOTA_INVALIDA") {
    super(message);
    this.name = "NotaError";
  }
}

export const erroNota = {
  invalido: (mensagem: string) => new NotaError(mensagem, 400, "DADOS_INVALIDOS"),
  proibido: (mensagem = "Você não possui permissão para esta operação.") => new NotaError(mensagem, 403, "ACESSO_NEGADO"),
  naoEncontrado: (mensagem: string) => new NotaError(mensagem, 404, "NAO_ENCONTRADO"),
  conflito: (mensagem: string) => new NotaError(mensagem, 409, "CONFLITO"),
};
