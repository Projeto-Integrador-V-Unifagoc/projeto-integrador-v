import jwt from "jsonwebtoken";

/**
 * Helpers de autenticação para os testes de integração (`*.int.test.ts`).
 *
 * O segredo tem de bater com o usado pelo app: `startPgIntegration()` define
 * `process.env.JWT_SECRET` (fallback `"x".repeat(40)`) antes do import de `app.ts`.
 */

const ID_SINTETICO = "00000000-0000-4000-8000-000000000000";

function segredo(): string {
  return process.env.JWT_SECRET || "x".repeat(40);
}

/** Assina um JWT válido para o middleware `autenticar`. */
export function assinarToken(
  tipo_usuario: string,
  id: string = ID_SINTETICO,
): string {
  return jwt.sign({ id, tipo_usuario }, segredo(), { expiresIn: "1h" });
}

/** Valor pronto para `.set("Authorization", bearer("secretaria"))`. */
export function bearer(tipo_usuario: string, id?: string): string {
  return `Bearer ${assinarToken(tipo_usuario, id)}`;
}
