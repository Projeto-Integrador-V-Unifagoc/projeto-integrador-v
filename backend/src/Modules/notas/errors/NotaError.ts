export interface CampoErroNota { campo: string; codigo: string; mensagem: string }

export class NotaError extends Error {
  constructor(message: string, public readonly status = 400, public readonly codigo = "NOTA_INVALIDA", public readonly campos: CampoErroNota[] = []) {
    super(message);
    this.name = "NotaError";
  }
}

export const erroNota = {
  invalido: (mensagem: string, codigo = "LOTE_INVALIDO", campos: CampoErroNota[] = []) => new NotaError(mensagem, 400, codigo, campos),
  proibido: (mensagem = "Você não possui permissão para esta operação.", codigo = "PERFIL_PROIBIDO") => new NotaError(mensagem, 403, codigo),
  naoEncontrado: (mensagem: string) => new NotaError(mensagem, 404, "REGISTRO_NAO_ENCONTRADO"),
  conflito: (mensagem: string, codigo = "CONFLITO_CONCORRENCIA") => new NotaError(mensagem, 409, codigo),
};
