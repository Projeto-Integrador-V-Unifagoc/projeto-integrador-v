import { ErroPontuacao } from "../models/RegraPontuacao";

export class AvaliacaoError extends ErroPontuacao {
  constructor(message: string, status: number, codigo: string, campo?: string) {
    super(status, codigo, message, campo);
    this.name = new.target.name;
  }
}

export class AvaliacaoValidationError extends AvaliacaoError {
  constructor(message: string, codigo = "VALOR_INVALIDO", campo?: string) { super(message, 400, codigo, campo); }
}

export class AvaliacaoForbiddenError extends AvaliacaoError {
  constructor(message = "Você não tem acesso a esta oferta.", codigo = "ESCOPO_PROIBIDO") { super(message, 403, codigo); }
}

export class AvaliacaoNotFoundError extends AvaliacaoError {
  constructor(message = "Avaliação não encontrada.") { super(message, 404, "REGISTRO_NAO_ENCONTRADO"); }
}

export class AvaliacaoConflictError extends AvaliacaoError {
  constructor(codigo: string, message: string, campo?: string) { super(message, 409, codigo, campo); }
}

/** Não transportar mensagem/detail/SQL do driver, mesmo em erro de constraint. */
export function traduzirErroBancoAvaliacao(erro: unknown): never {
  const falha = erro as { code?: string; message?: string } | null;
  if (falha?.code === "23503") throw new AvaliacaoConflictError("VINCULO_PRESERVADO", "Um vínculo acadêmico impede esta operação.");
  if (falha?.code === "23505") throw new AvaliacaoConflictError("CONFLITO_CONCORRENCIA", "O registro já existe. Recarregue os dados.");
  if (falha?.code === "23514") {
    const motivo = falha.message?.match(/^[A-Z_]+/)?.[0];
    if (motivo === "AVALIACAO_PRESERVADA" || motivo === "AVALIACAO_MARCADOR_IMUTAVEL") {
      throw new AvaliacaoConflictError("AVALIACAO_COM_NOTA", "Avaliação preservada após a primeira nota.");
    }
    if (motivo === "PERIODO_ENCERRADO") throw new AvaliacaoConflictError("PERIODO_FECHADO", "O período letivo está fechado.");
    if (motivo === "REGRA_AUSENTE") throw new AvaliacaoConflictError("REGRA_AUSENTE", "Configure a pontuação antes de criar avaliações.");
    if (motivo === "OFERTA_INATIVA") throw new AvaliacaoConflictError("OFERTA_INATIVA", "A oferta está inativa.");
    if (motivo === "SUBGRUPO_INCOMPATIVEL") throw new AvaliacaoValidationError("O subgrupo não pertence à regra da oferta.", "UUID_INVALIDO", "subgrupo_id");
    if (motivo === "LIMITE_SUBGRUPO_EXCEDIDO") throw new AvaliacaoConflictError("ORCAMENTO_EXCEDIDO", "O orçamento ou a quantidade do subgrupo foi excedido.", "valor");
    if (motivo === "OFERTA_REGRA_INCOMPATIVEL") throw new AvaliacaoConflictError("VINCULO_PRESERVADO", "A oferta mantém sua regra de pontuação original.");
    throw new AvaliacaoValidationError("Os dados da avaliação não atendem ao contrato.");
  }
  throw erro;
}
