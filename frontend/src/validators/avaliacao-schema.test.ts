import { describe, expect, it } from "vitest";
import { avaliacaoSchema } from "./avaliacao-schema";

const payload = {
  turma_disciplina_id: "10000000-0000-4000-8000-000000000001",
  subgrupo_id: "30000000-0000-4000-8000-000000000001",
  tipo_avaliacao: "REGULAR", valor: "24.00", descricao_avaliacao: "Avaliação sintética",
  data_lancamento: "2026-09-28", data_devolucao: "2026-10-01",
};

describe("UUIDs canônicos PostgreSQL no formulário de avaliação", () => {
  for (const campo of ["turma_disciplina_id", "subgrupo_id"] as const) {
    it.each(["11111111-1111-1111-1111-111111111111", "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF"])(
      `aceita ${campo} all-hex %s sem exigir versão ou variante RFC`, async (id) => {
        const entrada = { ...payload, [campo]: id };
        await expect(avaliacaoSchema.validate(entrada)).resolves.toEqual(entrada);
      },
    );
    it.each([`${payload[campo]}\n`, `\n${payload[campo]}`, ` ${payload[campo]}`, `{${payload[campo]}}`, "f".repeat(32), "uuid-invalido", 42])(
      `rejeita ${campo} não canônico %j sem coerção`, async (id) => {
        await expect(avaliacaoSchema.validate({ ...payload, [campo]: id })).rejects.toMatchObject({ path: campo });
      },
    );
  }
});
