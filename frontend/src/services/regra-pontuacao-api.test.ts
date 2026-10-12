import { beforeEach, describe, expect, it, vi } from "vitest";
import { regraPontuacaoApi } from "./regra-pontuacao-api";
import type { RegraPontuacao, SalvarRegraPontuacaoRequest } from "../models/regra-pontuacao-model";

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("../lib/axios", () => ({ api: http }));

const cursoId = "10000000-0000-4000-8000-000000000001";
const periodoId = "20000000-0000-4000-8000-000000000001";
const caminho = `/regras-pontuacao/cursos/${cursoId}/periodos/${periodoId}`;
const payload: SalvarRegraPontuacaoRequest = {
  versaoEsperada: null,
  totalPontos: "9007199254740993.01",
  subgrupos: [{ nome: "Projetos", orcamentoPontos: "9007199254740993.01", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 0 }],
};
const regra: RegraPontuacao = {
  id: "30000000-0000-4000-8000-000000000001",
  cursoId, periodoLetivoId: periodoId, totalPontos: payload.totalPontos,
  origem: "CONFIGURADA", versao: 1, estado: "DISPONIVEL", usadaEm: null,
  criadaEm: "2026-09-28T12:00:00Z", atualizadaEm: "2026-09-28T12:00:00Z",
  criadaPorUsuarioId: "50000000-0000-4000-8000-000000000001",
  atualizadaPorUsuarioId: "50000000-0000-4000-8000-000000000001",
  subgrupos: [{ ...payload.subgrupos[0], id: "40000000-0000-4000-8000-000000000001" }],
};

function erro(status: number, codigo?: string) {
  return { isAxiosError: true, response: { status, data: { codigo, mensagem: "Falha sintética." } } };
}

beforeEach(() => vi.resetAllMocks());

describe("regraPontuacaoApi - contrato HTTP", () => {
  it("consulta o par institucional e preserva o DTO textual recebido", async () => {
    http.get.mockResolvedValueOnce({ data: regra });
    expect(await regraPontuacaoApi.buscarRegra(cursoId, periodoId)).toBe(regra);
    expect(http.get).toHaveBeenCalledWith(caminho);
  });

  it("converte somente 404 REGRA_AUSENTE em ausência de configuração", async () => {
    http.get.mockRejectedValueOnce(erro(404, "REGRA_AUSENTE"));
    expect(await regraPontuacaoApi.buscarRegra(cursoId, periodoId)).toBeNull();
  });

  it.each(["REGISTRO_NAO_ENCONTRADO", undefined, "OUTRO_CODIGO"])("mantém 404 %s como falha de contexto", async (codigo) => {
    const falha = erro(404, codigo);
    http.get.mockRejectedValueOnce(falha);
    await expect(regraPontuacaoApi.buscarRegra(cursoId, periodoId)).rejects.toBe(falha);
  });

  it.each([401, 403, 409, 500])("propaga falha HTTP %d sem criar ausência ou regra padrão", async (status) => {
    const falha = erro(status, "FALHA_SINTETICA");
    http.get.mockRejectedValueOnce(falha);
    await expect(regraPontuacaoApi.buscarRegra(cursoId, periodoId)).rejects.toBe(falha);
    expect(http.put).not.toHaveBeenCalled();
  });

  it("envia pontos grandes em texto e devolve a versão do servidor", async () => {
    http.put.mockResolvedValueOnce({ data: regra });
    expect(await regraPontuacaoApi.salvarRegra(cursoId, periodoId, payload)).toBe(regra);
    expect(http.put).toHaveBeenCalledWith(caminho, payload);
    expect(payload.totalPontos).toBe("9007199254740993.01");
  });

  it("propaga 409 sem recarga automática nem alteração do payload", async () => {
    const falha = erro(409, "VERSAO_OBSOLETA");
    const anterior = JSON.stringify(payload);
    http.put.mockRejectedValueOnce(falha);
    await expect(regraPontuacaoApi.salvarRegra(cursoId, periodoId, payload)).rejects.toBe(falha);
    expect(http.get).not.toHaveBeenCalled();
    expect(http.put).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(payload)).toBe(anterior);
  });
});
