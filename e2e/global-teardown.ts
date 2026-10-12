import { fecharDb } from "./helpers/db.js";

/**
 * Conserva registros, auditorias e arquivos de evidência. O provisionador
 * descarta exclusivamente seu próprio container após concluir a verificação.
 */
export default async function globalTeardown() {
  await fecharDb();
}
