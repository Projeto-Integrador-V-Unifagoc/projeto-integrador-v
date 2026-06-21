const TAMANHO_MINIMO_SEGREDO = 32;

export function obterJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || secret.length < TAMANHO_MINIMO_SEGREDO) {
    throw new Error(`JWT_SECRET deve ser definido com pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres.`);
  }

  return secret;
}
