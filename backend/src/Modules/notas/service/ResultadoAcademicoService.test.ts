import { describe, expect, it, vi } from "vitest";
import { ResultadoAcademicoService } from "./ResultadoAcademicoService";

const ofertaId = "11111111-1111-4111-8111-111111111111";
const matriculaId = "22222222-2222-4222-8222-222222222222";
const alunoId = "33333333-3333-4333-8333-333333333333";
const avaliacaoId = "44444444-4444-4444-8444-444444444444";
const regraId = "55555555-5555-4555-8555-555555555555";
const ctx = { usuarioId: "u", perfil: "professor", professorId: "p" } as const;
const req = { user: { id: "u", tipo_usuario: "professor" } } as any;
const trx = Object.freeze({ identificador: "snapshot-comum" }) as any;

function cenario(quantidade = 1) {
  const eventos: string[] = [];
  const ofertas = [{ id: ofertaId }];
  const matriculas = Array.from({ length: quantidade }, (_, i) => ({
    matricula_turma_disciplina_id: i === 0 ? matriculaId : `matricula-${i}`,
    turma_disciplina_id: ofertaId, aluno_id: alunoId,
  }));
  const banco = { transaction: vi.fn(async (callback: any, _opcoes: any) => callback(trx)) } as any;
  const auth = { obterContexto: vi.fn(async (_req: any, _executor: any) => { eventos.push("auth"); return ctx; }) };
  const estrutura = { carregar: vi.fn(async (_filtros: any, _contexto: any, _executor: any) => {
    eventos.push("estrutura"); return { ofertas, matriculas };
  }) };
  const plano = { turmaDisciplinaId: ofertaId, regraPontuacaoId: regraId, totalPontos: "120.00",
    planoCompleto: true, podeCriarRegular: false, motivosBloqueio: [], subgrupos: [] };
  const planos = { carregar: vi.fn(async (_ofertas: any, _executor: any) => {
    eventos.push("planos"); return new Map([[ofertaId, { plano,
      avaliacoes: [{ id: avaliacaoId, tipo: "REGULAR", valor: "120.00", descricao: "Regular" }] }]]);
  }) };
  const notas = { listarNotasEmLote: vi.fn(async (_ids: any, _executor: any) => {
    eventos.push("notas"); return matriculas.map((m) => ({
      matricula_turma_disciplina_id: m.matricula_turma_disciplina_id,
      turma_disciplina_id: ofertaId, avaliacao_id: avaliacaoId, valor: "72.00",
    }));
  }) };
  const frequencia = { carregar: vi.fn(async (_ids: any, _executor: any) => {
    eventos.push("frequencia"); return new Map(matriculas.map((m) => [m.matricula_turma_disciplina_id,
      { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" }]));
  }) };
  const deps = { banco, auth, estrutura, planos, notas, frequencia };
  return { ...deps, ofertas, matriculas, eventos, plano, service: new ResultadoAcademicoService(deps as any) };
}

describe("ResultadoAcademicoService - composição única e autorizada", () => {
  it("abre um snapshot read-only REPEATABLE READ e compartilha executor/contexto", async () => {
    const c = cenario();
    const filtros = { ofertaIds: [ofertaId], alunoId };
    const resposta = await c.service.consultar(filtros, req);
    expect(c.banco.transaction).toHaveBeenCalledTimes(1);
    expect(c.banco.transaction.mock.calls[0][1]).toEqual({ isolationLevel: "repeatable read", readOnly: true });
    expect(c.auth.obterContexto).toHaveBeenCalledWith(req, trx);
    expect(c.estrutura.carregar).toHaveBeenCalledWith(filtros, ctx, trx);
    expect(c.planos.carregar).toHaveBeenCalledWith(c.ofertas, trx);
    expect(c.notas.listarNotasEmLote).toHaveBeenCalledWith([matriculaId], trx);
    expect(c.frequencia.carregar).toHaveBeenCalledWith([matriculaId], trx);
    expect(c.eventos).toEqual(["auth", "estrutura", "planos", "notas", "frequencia"]);
    expect(resposta.matriculas[0].resultadoAcademico).toMatchObject({ contratoVersao: 2,
      totalPontos: "120.00", cortePontos: "72.00", pontosEfetivos: "72.00",
      resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "APROVADA",
      frequencia: { situacao: "ALERTA", requisito: "SUFICIENTE" } });
  });

  it("recompõe dentro de executor de escrita explícito sem abrir outra transação", async () => {
    const c = cenario();
    await c.service.compor({ ofertaIds: [ofertaId] }, ctx, trx);
    expect(c.banco.transaction).not.toHaveBeenCalled();
    expect(c.auth.obterContexto).not.toHaveBeenCalled();
    expect(c.eventos).toEqual(["estrutura", "planos", "notas", "frequencia"]);
  });

  it("consulta em lote com quantidade constante de gateways para 200 matrículas", async () => {
    const c = cenario(200);
    const resposta = await c.service.consultar({}, req);
    expect(resposta.matriculas).toHaveLength(200);
    for (const consulta of [c.planos.carregar, c.notas.listarNotasEmLote, c.frequencia.carregar]) {
      expect(consulta).toHaveBeenCalledTimes(1);
    }
    expect(c.notas.listarNotasEmLote.mock.calls[0][0]).toHaveLength(200);
  });

  it("não consulta notas/frequência/plano antes de oferta autorizada", async () => {
    const c = cenario();
    const proibido = Object.assign(new Error("Oferta fora do escopo."), { status: 403 });
    c.estrutura.carregar.mockRejectedValueOnce(proibido);
    await expect(c.service.consultar({ ofertaIds: [ofertaId] }, req)).rejects.toBe(proibido);
    expect(c.planos.carregar).not.toHaveBeenCalled();
    expect(c.notas.listarNotasEmLote).not.toHaveBeenCalled();
    expect(c.frequencia.carregar).not.toHaveBeenCalled();
  });

  it.each(["planos", "notas", "frequencia"] as const)("propaga falha de %s sem simular ausência/aprovação", async (nome) => {
    const c = cenario();
    const erro = new Error(`Falha sintética em ${nome}`);
    const consulta = nome === "notas" ? c.notas.listarNotasEmLote : c[nome].carregar;
    consulta.mockRejectedValueOnce(erro);
    await expect(c.service.consultar({}, req)).rejects.toBe(erro);
  });

  it("não amplia listas fornecidas pela estrutura autorizada", async () => {
    const c = cenario();
    await c.service.consultar({ alunoId }, req);
    expect(c.notas.listarNotasEmLote.mock.calls[0][0]).toEqual([matriculaId]);
    expect(c.frequencia.carregar.mock.calls[0][0]).toEqual([matriculaId]);
    expect(c.planos.carregar.mock.calls[0][0]).toEqual(c.ofertas);
  });

  it("rejeita matrícula de oferta fora da estrutura antes de consultar outros gateways", async () => {
    const c = cenario();
    c.estrutura.carregar.mockResolvedValueOnce({ ofertas: c.ofertas,
      matriculas: [{ ...c.matriculas[0], turma_disciplina_id: "oferta-alheia" }] });
    await expect(c.service.consultar({}, req)).rejects.toThrow(/incompatível/i);
    expect(c.planos.carregar).not.toHaveBeenCalled();
    expect(c.notas.listarNotasEmLote).not.toHaveBeenCalled();
    expect(c.frequencia.carregar).not.toHaveBeenCalled();
  });

  it("rejeita nota cuja matrícula/oferta/avaliação não pertence ao lote autorizado", async () => {
    const c = cenario();
    c.notas.listarNotasEmLote.mockResolvedValueOnce([{ matricula_turma_disciplina_id: matriculaId,
      turma_disciplina_id: "outra-oferta", avaliacao_id: avaliacaoId, valor: "72.00" }]);
    await expect(c.service.consultar({}, req)).rejects.toThrow(/incompatível/i);
  });

  it("nota suficiente com frequência pendente permanece aprovação pendente", async () => {
    const c = cenario();
    c.frequencia.carregar.mockResolvedValueOnce(new Map([[matriculaId,
      { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" }]]) as any);
    const resposta = await c.service.consultar({}, req);
    expect(resposta.matriculas[0].resultadoAcademico).toMatchObject({ resultadoPorNota: "SUFICIENTE",
      elegivelRecuperacaoPorNota: false, aprovacaoDisciplina: "PENDENTE", motivos: ["FREQUENCIA_PENDENTE"] });
  });

  it("frequência insuficiente não impede elegibilidade por nota", async () => {
    const c = cenario();
    c.notas.listarNotasEmLote.mockResolvedValueOnce([{ matricula_turma_disciplina_id: matriculaId,
      turma_disciplina_id: ofertaId, avaliacao_id: avaliacaoId, valor: "60.00" }]);
    c.frequencia.carregar.mockResolvedValueOnce(new Map([[matriculaId,
      { presencas: 1, faltas: 1, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" }]]) as any);
    const resposta = await c.service.consultar({}, req);
    expect(resposta.matriculas[0].resultadoAcademico).toMatchObject({ resultadoPorNota: "EM_RECUPERACAO",
      elegivelRecuperacaoPorNota: true, aprovacaoDisciplina: "NAO_APROVADA" });
  });

  it("ausência de resultado de frequência ou plano no lote é falha de contrato", async () => {
    const c = cenario();
    c.frequencia.carregar.mockResolvedValueOnce(new Map());
    await expect(c.service.consultar({}, req)).rejects.toThrow(/incompleto/i);
    c.planos.carregar.mockResolvedValueOnce(new Map());
    await expect(c.service.consultar({}, req)).rejects.toThrow(/incompleto/i);
  });
});
