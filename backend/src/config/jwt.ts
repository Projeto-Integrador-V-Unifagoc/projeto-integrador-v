const TAMANHO_MINIMO_SEGREDO = 32;
const JWT_SECRET_DESENVOLVIMENTO = "segredo-desenvolvimento-unieduca-local-32";

export function obterJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret && process.env.NODE_ENV !== "production") {
    return JWT_SECRET_DESENVOLVIMENTO;
  }

  if (!secret || secret.length < TAMANHO_MINIMO_SEGREDO) {
    throw new Error(`JWT_SECRET deve ser definido com pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres.`);
  }

  return secret;
}
