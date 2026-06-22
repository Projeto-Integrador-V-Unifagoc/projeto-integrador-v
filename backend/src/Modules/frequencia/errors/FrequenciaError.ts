export class FrequenciaError extends Error {
  constructor(message: string, public readonly status = 400, public readonly codigo = "FREQUENCIA_INVALIDA") {
    super(message);
    this.name = "FrequenciaError";
  }
}

export const erroFrequencia = {
  invalido: (mensagem: string) => new FrequenciaError(mensagem, 400, "DADOS_INVALIDOS"),
  proibido: (mensagem = "Você não possui permissão para esta operação.") => new FrequenciaError(mensagem, 403, "ACESSO_NEGADO"),
  naoEncontrado: (mensagem: string) => new FrequenciaError(mensagem, 404, "NAO_ENCONTRADO"),
  conflito: (mensagem: string) => new FrequenciaError(mensagem, 409, "CONFLITO"),
};
