import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Knex } from "knex";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { criarContextoPontuacao, criarPontuacaoFixture, criarAvaliacaoPontuacao, criarNotaPontuacao } from "../../test-helpers/pontuacaoFixture";
import { ResultadoAcademicoService, type DependenciasResultadoAcademico } from "./service/ResultadoAcademicoService";
import { EstruturaAcademicaGateway } from "./gateways/EstruturaAcademicaGateway";
import { PlanoAvaliacaoGateway } from "../avaliacao/gateways/PlanoAvaliacaoGateway";
import { FrequenciaConsolidadaGateway } from "../frequencia/gateways/FrequenciaConsolidadaGateway";
import { AuthContextGateway } from "./gateways/AuthContextGateway";

let pg: PgIntegration;
let bancoGlobal: Knex;
let deps: DependenciasResultadoAcademico;
beforeAll(async () => {
  pg = await startPgIntegration();
  const { NotaRepository } = await import("./repository/NotaRepository");
  const { FrequenciaRepository } = await import("../frequencia/repository/FrequenciaRepository");
  const { avaliacaoRepository } = await import("../avaliacao/repository/avaliacaoRepository");
  ({ db: bancoGlobal } = await import("../../database/connection"));
  const repository = new NotaRepository(pg.db);
  deps = { banco: pg.db, auth: new AuthContextGateway(repository), estrutura: new EstruturaAcademicaGateway(),
    planos: new PlanoAvaliacaoGateway((ids, ex) => avaliacaoRepository.listarEmLote(ids, ex)),
    notas: repository, frequencia: new FrequenciaConsolidadaGateway(new FrequenciaRepository()) };
}, 180_000);
afterAll(async () => { try { await bancoGlobal?.destroy(); } finally { await pg?.stop(); } });
const req = (id: string, tipo_usuario = "secretaria") => ({ user: { id, tipo_usuario } }) as any;
const service = () => new ResultadoAcademicoService(deps);

async function completo(valor = "72.00") {
  const fixture = await criarPontuacaoFixture(pg.db, { totalPontos: "120.00", subgrupos: [
    { nome: "Regular", orcamento_pontos: "120.00", modo_quantidade: "FIXA", quantidade_fixa: 1 },
  ] });
  const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, fixture, { valor: "120.00" });
  const notaId = await criarNotaPontuacao(pg.db, fixture, avaliacaoId, { valor });
  return { ...fixture, avaliacaoId, notaId };
}

describe("resultado acadêmico em PostgreSQL - lote, escopo e snapshot", () => {
  it("plano120+nota72 e frequência75 aprovam com alerta; outra matrícula sem frequência fica pendente", async () => {
    const f = await completo();
    const oferta = await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first();
    const localId = randomUUID();
    await pg.db("piv.local").insert({ id: localId, codigo: localId });
    for (let i = 0; i < 4; i++) {
      const aulaId = randomUUID();
      await pg.db("piv.aula").insert({ id: aulaId, data: `2026-09-${20 + i}T12:00:00Z`, local_id: localId,
        professor_id: oferta.professor_id, turma_disciplina_id: f.ofertaId });
      await pg.db("piv.frequencia").insert({ aula_id: aulaId, matricula_turma_disciplina_id: f.matriculaDisciplinaId,
        data: `2026-09-${20 + i}`, status: i === 3 ? "AUSENTE" : "PRESENTE",
        lancada_em: pg.db.fn.now(), responsavel_lancamento_usuario_id: f.usuarioId });
    }
    const consulta = await service().consultar({ alunoId: f.alunoId }, req(f.usuarioId));
    const resultado = consulta.matriculas.find((m) => m.turma_disciplina_id === f.ofertaId)!.resultadoAcademico;
    expect(resultado).toMatchObject({ totalPontos: "120.00", cortePontos: "72.00", pontosEfetivos: "72.00",
      etapaRegularCompleta: true, resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "APROVADA",
      frequencia: { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" } });
    expect(consulta.matriculas.find((m) => m.turma_disciplina_id === f.outraOfertaId)!.resultadoAcademico)
      .toMatchObject({ etapaRegularCompleta: false, pontosEfetivos: null, aprovacaoDisciplina: "PENDENTE" });
  });

  it("par sem regra permanece sem configuração, sem default100", async () => {
    const f = await criarContextoPontuacao(pg.db);
    const consulta = await service().consultar({ ofertaIds: [f.ofertaId] }, req(f.usuarioId));
    expect(consulta.matriculas[0].resultadoAcademico).toMatchObject({ regraPontuacaoId: null, totalPontos: null,
      cortePontos: null, resultadoPorNota: "NAO_LANCADA", aprovacaoDisciplina: "PENDENTE" });
    expect(consulta.matriculas[0].resultadoAcademico.motivos).toContain("REGRA_AUSENTE");
  });

  it("professor com aluno compartilhado lê somente sua oferta e não toca notas/frequência alheias", async () => {
    const f = await completo();
    const usuarioId = randomUUID();
    await pg.db("piv.usuario").insert({ id: usuarioId, nome: "Professor sintético", email: `${usuarioId}@example.test`,
      senha: "fixture-sem-autenticacao", tipo_usuario: "professor" });
    const oferta = await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first();
    await pg.db("piv.professor").where({ id: oferta.professor_id }).update({ usuario_id: usuarioId });
    const professor = await pg.db("piv.professor").where({ id: oferta.professor_id }).first();
    const outroProfessorId = randomUUID();
    const pessoa = await pg.db("piv.pessoa").where({ id: professor.pessoa_id }).first();
    const outraPessoaId = randomUUID();
    await pg.db("piv.pessoa").insert({ ...pessoa, id: outraPessoaId, cpf: outraPessoaId.replaceAll("-", "").slice(0, 14) });
    await pg.db("piv.professor").insert({ id: outroProfessorId, pessoa_id: outraPessoaId,
      curso_id: f.cursoId, faculdade_id: f.faculdadeId, ativo: true });
    await pg.db("piv.turma_disciplina").where({ id: f.outraOfertaId }).update({ professor_id: outroProfessorId });
    const consulta = await service().consultar({ alunoId: f.alunoId }, req(usuarioId, "professor"));
    expect(consulta.ofertas.map((o) => o.id)).toEqual([f.ofertaId]);
    expect(consulta.matriculas.map((m) => m.matricula_turma_disciplina_id)).toEqual([f.matriculaDisciplinaId]);
    const queries: string[] = [];
    const registrar = (q: any) => queries.push(q.sql);
    pg.db.on("query", registrar);
    try { await expect(service().consultar({ ofertaIds: [f.outraOfertaId] }, req(usuarioId, "professor")))
      .rejects.toMatchObject({ status: 403, codigo: "ESCOPO_PROIBIDO" }); }
    finally { pg.db.off("query", registrar); }
    expect(queries.some((sql) => sql.includes('"piv"."nota"') || sql.includes('from "frequencia"'))).toBe(false);
  });

  it("escrita entre plano e notas não mistura versões no snapshot e aparece na consulta seguinte", async () => {
    const f = await completo();
    let escrita = false;
    const svc = new ResultadoAcademicoService({ ...deps, planos: { carregar: async (ofertas, executor) => {
      const planos = await deps.planos.carregar(ofertas, executor);
      if (!escrita) { escrita = true; await pg.db("piv.nota").where({ id: f.notaId }).update({ valor: "90.00" }); }
      return planos;
    } } });
    const antes = await svc.consultar({ ofertaIds: [f.ofertaId] }, req(f.usuarioId));
    expect(antes.matriculas[0].resultadoAcademico.pontosEfetivos).toBe("72.00");
    const depois = await service().consultar({ ofertaIds: [f.ofertaId] }, req(f.usuarioId));
    expect(depois.matriculas[0].resultadoAcademico.pontosEfetivos).toBe("90.00");
  });

  it("falha PostgreSQL de frequência é propagada, sem frequência/resultado substitutos", async () => {
    const f = await completo();
    const svc = new ResultadoAcademicoService({ ...deps, frequencia: { carregar: async (_ids, executor) => {
      await executor.raw('SELECT * FROM piv.tabela_sintetica_inexistente'); return new Map();
    } } });
    await expect(svc.consultar({ ofertaIds: [f.ofertaId] }, req(f.usuarioId))).rejects.toMatchObject({ code: "42P01" });
  });
});
