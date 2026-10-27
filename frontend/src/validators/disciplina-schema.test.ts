import { describe, expect, it } from "vitest";
import { disciplinaSchema } from "./disciplina-schema";

const valida = {
  codigo: "ALG101", nome: "Algoritmos", areaConhecimento: "COMPUTACAO", ementa: "Fundamentos",
  cargaHoraria: 60, cargaHorariaTeorica: 40, cargaHorariaPratica: 10,
  cargaHorariaLaboratorio: 10, cargaHorariaExtensao: 0,
};

describe("disciplinaSchema", () => {
  it("aceita composicao completa", async () => {
    await expect(disciplinaSchema.validate(valida)).resolves.toBeTruthy();
  });

  it("rejeita soma diferente da carga total", async () => {
    await expect(disciplinaSchema.validate({ ...valida, cargaHorariaTeorica: 30 })).rejects.toThrow(/distribui/i);
  });

  it("rejeita carga negativa", async () => {
    await expect(disciplinaSchema.validate({ ...valida, cargaHorariaPratica: -1 })).rejects.toThrow(/negativa/i);
  });
});
