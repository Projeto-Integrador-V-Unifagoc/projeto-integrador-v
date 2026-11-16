import { describe, expect, it } from "vitest";
import { CalendarioAcademicoService } from "./CalendarioAcademicoService";

const periodo = { id: "p1", codigo: "2026/2", data_inicio: "2026-11-01", data_fim: "2026-11-30", status: "ativo" };
const horario = {
  id: "h1", turma_disciplina_id: "td1", professor_id: "prof1", dia_semana: 1,
  hora_inicio: "19:00:00", hora_fim: "20:40:00", local: "Sala 1",
  vigencia_inicio: "2026-11-01", vigencia_fim: "2026-11-30", ativo: true,
};

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    buscarPeriodo: async () => periodo,
    listarEventos: async () => [],
    listarHorarios: async () => [horario],
    listarAulasGeradas: async () => [],
    sincronizarAulas: async () => ({ criadas: 4, reativadas: 0, canceladas: 0, preservadasComChamada: 0 }),
    criarEvento: async (data: any) => data,
    buscarEvento: async () => null,
    atualizarEvento: async () => null,
    removerEvento: async () => 0,
    ...overrides,
  };
  const service = new CalendarioAcademicoService();
  service.repository = repository as any;
  return { service, repository };
}

describe("CalendarioAcademicoService", () => {
  it("expande horario recorrente e exclui feriado bloqueante", () => {
    const { ocorrencias, excluidas } = criar().service.calcularOcorrencias(
      [horario],
      [{ data_inicio: "2026-11-09", data_fim: "2026-11-09", bloqueia_aulas: true }],
      "2026-11-01",
      "2026-11-30",
    );
    expect(ocorrencias.map((item) => item.data)).toEqual(["2026-11-02", "2026-11-16", "2026-11-23", "2026-11-30"]);
    expect(excluidas).toBe(1);
  });

  it("na simulacao informa novas ocorrencias sem persistir", async () => {
    let sincronizou = false;
    const { service } = criar({ sincronizarAulas: async () => { sincronizou = true; return {}; } });
    const resultado = await service.gerarAulas("p1", { simular: true });
    expect(resultado).toMatchObject({ simulado: true, ocorrenciasPrevistas: 5, novas: 5, existentes: 0 });
    expect(sincronizou).toBe(false);
  });

  it("gera de forma controlada depois da confirmacao", async () => {
    let intervaloRecebido: any;
    const { service } = criar({
      sincronizarAulas: async (_periodoId: string, _ocorrencias: any[], intervalo: any) => {
        intervaloRecebido = intervalo;
        return { criadas: 4, reativadas: 0, canceladas: 0, preservadasComChamada: 0 };
      },
    });
    const resultado = await service.gerarAulas("p1", { simular: false });
    expect(resultado).toMatchObject({ simulado: false, ocorrenciasPrevistas: 5, criadas: 4 });
    expect(intervaloRecebido).toEqual({ inicio: "2026-11-01", fim: "2026-11-30" });
  });

  it("rejeita evento fora do periodo", async () => {
    await expect(criar().service.criarEvento("p1", {
      tipo: "FERIADO", titulo: "Feriado local", dataInicio: "2026-12-01", dataFim: "2026-12-01",
    })).rejects.toMatchObject({ status: 400 });
  });

  it("rejeita datas inexistentes sem normalizacao silenciosa", async () => {
    await expect(criar().service.criarEvento("p1", {
      tipo: "FERIADO", titulo: "Data inexistente", dataInicio: "2026-11-31", dataFim: "2026-11-31",
    })).rejects.toMatchObject({ status: 400 });
  });
});
