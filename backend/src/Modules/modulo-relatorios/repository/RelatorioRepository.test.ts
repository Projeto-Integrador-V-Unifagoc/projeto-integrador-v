import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RelatorioRepository } from "./RelatorioRepository";
const mocks = vi.hoisted(() => ({ consultar: vi.fn() }));
vi.mock("../../../database/connection", () => ({ db: vi.fn(() => { throw new Error("SQL real proibido nesta unidade."); }) }));
vi.mock("../../notas/service/criarResultadoAcademicoService", () => ({ criarResultadoAcademicoService: () => ({ consultar: mocks.consultar }) }));
const id = "aaaaaaaa-aaaa-bbbb-cccc-aaaaaaaaaaaa";
const req = { user: { id, tipo_usuario: "professor" } } as unknown as Request;
beforeEach(() => { vi.clearAllMocks(); mocks.consultar.mockResolvedValue({ contexto: {}, ofertas: [], matriculas: [] }); });
describe("Repositório de relatórios usa apenas o resultado comum autorizado", () => {
  it("passa filtros UUID e req original em uma consulta, sem confiar em perfil/lista do payload", async () => {
    await new RelatorioRepository().carregarResultadoAcademico({ alunoId: id.toUpperCase(), turmaId: id,
      periodoLetivoId: id, perfil: "Secretaria", turmaIdsPermitidos: ["terceiro"], busca: "Termo" }, req);
    expect(mocks.consultar).toHaveBeenCalledTimes(1);
    expect(mocks.consultar).toHaveBeenCalledWith({ alunoId: id, ofertaIds: [id], periodoLetivoId: id }, req);
  });
  it.each(["alunoId", "turmaId", "periodoLetivoId", "cursoId", "disciplinaId"])("recusa UUID inválido em %s antes da composição", async campo => {
    await expect(new RelatorioRepository().carregarResultadoAcademico({ [campo]: "inválido" }, req)).rejects.toMatchObject({ status: 400, codigo: "UUID_INVALIDO" });
    expect(mocks.consultar).not.toHaveBeenCalled();
  });
  it("não converte arrays ou números de filtros em texto", async () => {
    await expect(new RelatorioRepository().carregarResultadoAcademico({ busca: ["ampliar"] } as any, req)).rejects.toMatchObject({ status: 400 });
    expect(mocks.consultar).not.toHaveBeenCalled();
  });
  it("falha do snapshot comum é propagada sem consulta alternativa", async () => {
    const erro = new Error("Falha sintética"); mocks.consultar.mockRejectedValueOnce(erro);
    await expect(new RelatorioRepository().carregarResultadoAcademico({}, req)).rejects.toBe(erro);
    expect(mocks.consultar).toHaveBeenCalledTimes(1);
  });
});
