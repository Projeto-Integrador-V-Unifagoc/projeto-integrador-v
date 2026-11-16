export class ConteudoError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly codigo = "CONTEUDO_INVALIDO",
    public readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = "ConteudoError";
  }
}

export const erroConteudo = {
  invalido: (mensagem: string) => new ConteudoError(mensagem, 400, "DADOS_INVALIDOS"),
  proibido: (mensagem = "Você não possui permissão para esta operação.") => new ConteudoError(mensagem, 403, "ACESSO_NEGADO"),
  naoEncontrado: (mensagem: string) => new ConteudoError(mensagem, 404, "NAO_ENCONTRADO"),
  conflito: (mensagem: string, detalhes?: unknown) => new ConteudoError(mensagem, 409, "CONFLITO", detalhes),
  // Versão da página mudou entre a abertura e o salvamento (outra aba ou outra pessoa).
  versaoDesatualizada: (detalhes: unknown) =>
    new ConteudoError("Esta página foi alterada enquanto você editava.", 409, "VERSAO_DESATUALIZADA", detalhes),
  limite: (mensagem: string, detalhes?: unknown) => new ConteudoError(mensagem, 422, "LIMITE_EXCEDIDO", detalhes),
};
