import fs from "node:fs";
import { config } from "./helpers/config.js";
import { limparBanco, fecharDb } from "./helpers/db.js";

/**
 * Limpeza final (spec §5.3, §15): zera os dados transacionais e remove os
 * arquivos enviados durante a execução, garantindo ausência de órfãos e
 * execução repetível em banco limpo.
 */
export default async function globalTeardown() {
  try {
    await limparBanco();
  } finally {
    await fecharDb();
  }

  if (config.uploadDir && fs.existsSync(config.uploadDir)) {
    for (const arquivo of fs.readdirSync(config.uploadDir)) {
      try {
        fs.rmSync(`${config.uploadDir}/${arquivo}`, { force: true });
      } catch {
        /* limpeza best-effort: uma falha não pode travar a suíte */
      }
    }
  }
}
