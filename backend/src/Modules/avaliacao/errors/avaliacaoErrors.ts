export class AvaliacaoError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = new.target.name;
  }
}

export class AvaliacaoValidationError extends AvaliacaoError {
  constructor(message: string) { super(message, 400); }
}

export class AvaliacaoForbiddenError extends AvaliacaoError {
  constructor(message = "Voce nao possui permissao para esta atribuicao.") { super(message, 403); }
}

export class AvaliacaoNotFoundError extends AvaliacaoError {
  constructor(message = "Avaliacao nao encontrada.") { super(message, 404); }
}
