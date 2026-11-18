import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { HorarioOfertaService } from "./HorarioOfertaService";

function criar(overrides: Record<string, any> = {}) {
  const service = new HorarioOfertaService();
  service.repository = {
    criar: async (data: any) => data,
    buscarPorId: async () => ({ id: "h1", turma_disciplina_id: "td1", dia_semana: 1, hora_inicio: "19:00", hora_fim: "20:40", local: "Sala 1", vigencia_inicio: "2026-08-01", vigencia_fim: "2026-12-20", ativo: true }),
    atualizar: async (_id: string, data: any) => data,
    remover: async () => 1,
    listarPorTurma: async () => [], listarPorOferta: async () => [],
    ...overrides,
  } as any;
  return service;
}

const valido = { diaSemana: 1, horaInicio: "19:00", horaFim: "20:40", local: " Sala   1 ", vigenciaInicio: "2026-08-01", vigenciaFim: "2026-12-20" };

describe("HorarioOfertaService", () => {
  it("normaliza e cria um bloco recorrente", async () => {
    const resultado = await criar().criar("td1", valido);
    assert.equal(resultado.turma_disciplina_id, "td1");
    assert.equal(resultado.local, "Sala 1");
    assert.equal(resultado.dia_semana, 1);
  });
  it("rejeita fim anterior ao inicio", async () => {
    await assert.rejects(() => criar().criar("td1", { ...valido, horaFim: "18:00" }), /faixa de horario/i);
  });
  it("rejeita vigencia invertida", async () => {
    await assert.rejects(() => criar().criar("td1", { ...valido, vigenciaFim: "2026-07-01" }), /Fim da vigencia/i);
  });
  it("atualiza parcialmente preservando os dados atuais", async () => {
    const resultado = await criar().atualizar("h1", { horaFim: "21:00" });
    assert.equal(resultado?.hora_inicio, "19:00");
    assert.equal(resultado?.hora_fim, "21:00");
  });
  it("retorna 404 ao remover horario inexistente", async () => {
    await assert.rejects(() => criar({ remover: async () => 0 }).remover("x"), /nao encontrado/i);
  });
});
