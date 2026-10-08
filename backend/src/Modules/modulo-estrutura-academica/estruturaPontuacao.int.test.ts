import type { Express } from "express";
import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { bearer } from "../../test-helpers/httpAuth";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { criarAvaliacaoPontuacao, criarNotaPontuacao, criarPontuacaoFixture, type PontuacaoFixture } from "../../test-helpers/pontuacaoFixture";
import { descobrirEstrutura } from "./gateways/EscritaEstruturaAcademica";

let pg: PgIntegration;
let app: Express;
let bancoApp: Knex;
beforeAll(async () => {
  pg = await startPgIntegration();
  ({ app } = await import("../../app"));
  ({ db: bancoApp } = await import("../../database/connection"));
}, 180_000);
afterAll(async () => { try { await bancoApp?.destroy(); } finally { await pg?.stop(); } });
async function snapshot(f: PontuacaoFixture) {
  const tabelas = ["regra_pontuacao", "subgrupo_avaliacao", "regra_pontuacao_auditoria", "avaliacao", "nota", "nota_auditoria", "turma_disciplina", "turma", "curso_disciplina", "curso", "periodo_letivo"];
  const dados: Record<string, unknown> = {};
  for (const tabela of tabelas) dados[tabela] = await pg.db(`piv.${tabela}`).select("*").orderBy("id");
  // Fixture própria em banco exclusivo. Comparar tudo também detecta uma cascata alheia ao alvo.
  expect((dados.regra_pontuacao as Array<{ id: string }>).some((r) => r.id === f.regraId)).toBe(true);
  return dados;
}
describe("Pais da identidade acadêmica preservada", () => {
  it.each(["curso", "disciplinas", "periodo_letivo"] as const)("%s enumera os pais de filhas ainda sem oferta", async (entidade) => {
    const f = await criarPontuacaoFixture(pg.db);
    const turmaId = randomUUID();
    await pg.db("piv.turma").insert({ id: turmaId, periodo_letivo_id: f.outroPeriodoId, curso_id: f.outroCursoId,
      periodo_curricular: 1, descricao: "Turma sintética sem oferta", sigla: turmaId, capacidade_alunos: 20, turno: "NOITE", status: "ativa" });
    const id = entidade === "curso" ? f.outroCursoId : entidade === "disciplinas" ? f.outraDisciplinaId : f.outroPeriodoId;
    const alvos = await pg.db.transaction((trx) => descobrirEstrutura(trx, entidade, id));
    expect(alvos.cursos).toContain(f.outroCursoId);
    if (entidade !== "periodo_letivo") {
      expect(alvos.disciplinas).toContain(f.outraDisciplinaId);
      expect(alvos.cursosDisciplinas).toContain(f.outroCursoDisciplinaId);
    }
    if (entidade !== "disciplinas") {
      expect(alvos.periodos).toContain(f.outroPeriodoId);
      expect(alvos.turmas).toContain(turmaId);
    }
  });
  it.each(["oferta", "turma", "matriz", "curso", "disciplina", "periodo"])("exclusão por %s retorna conflito seguro e conserva o grafo", async (alvo) => {
    const f = await criarPontuacaoFixture(pg.db);
    const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
    await criarNotaPontuacao(pg.db, f, avaliacaoId);
    const antes = await snapshot(f);
    const caminhos: Record<string, string> = { oferta: `/turmas/${f.turmaId}/disciplinas/${f.ofertaId}`, turma: `/turmas/${f.turmaId}`,
      matriz: `/curso-disciplina/${f.cursoDisciplinaId}`, curso: `/cursos/${f.cursoId}`, disciplina: `/disciplinas/${f.disciplinaId}`, periodo: `/periodos-letivos/${f.periodoId}` };
    const res = await request(app).delete(caminhos[alvo]).set("Authorization", bearer("secretaria", f.usuarioId));
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe("ESTRUTURA_PRESERVADA");
    expect(JSON.stringify(res.body)).not.toMatch(/SELECT|DELETE|UPDATE|constraint|piv\.|stack/i);
    expect(await snapshot(f)).toEqual(antes);
  });
  it.each(["curso", "periodo"])("trocar %s de turma vinculada não reinterpreta o histórico", async (alvo) => {
    const f = await criarPontuacaoFixture(pg.db);
    await criarAvaliacaoPontuacao(pg.db, f);
    const antes = await snapshot(f);
    const res = await request(app).put(`/turmas/${f.turmaId}`).set("Authorization", bearer("secretaria", f.usuarioId))
      .send(alvo === "curso" ? { cursoId: f.outroCursoId } : { periodoLetivoId: f.outroPeriodoId });
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe("ESTRUTURA_PRESERVADA");
    expect(await snapshot(f)).toEqual(antes);
  });
  it("metadados da turma e encerramento do período permanecem possíveis sem apagar a nota zero", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    const id = await criarAvaliacaoPontuacao(pg.db, f);
    await criarNotaPontuacao(pg.db, f, id);
    const token = bearer("secretaria", f.usuarioId);
    const turma = await request(app).put(`/turmas/${f.turmaId}`).set("Authorization", token).send({ descricao: "Descrição atualizada" });
    expect(turma.status).toBe(200);
    const periodo = await request(app).put(`/periodos-letivos/${f.periodoId}`).set("Authorization", token).send({ status: "encerrado" });
    expect(periodo.status).toBe(200);
    expect((await pg.db("piv.nota").where({ avaliacao_id: id }).first()).valor).toBe("0.00");
    expect((await pg.db("piv.avaliacao").where({ id }).first()).primeira_nota_em).not.toBeNull();
    expect((await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first()).regra_pontuacao_id).toBe(f.regraId);
  });
  it.each(["periodo", "turma"])("metadados atrasados não reabrem %s encerrado/inativo", async (entidade) => {
    const f = await criarPontuacaoFixture(pg.db);
    await criarAvaliacaoPontuacao(pg.db, f);
    const { PeriodoLetivoRepository } = await import("./repository/PeriodoLetivoRepository");
    const { TurmaRepository } = await import("./repository/TurmaRepository");
    let liberar!: () => void;
    let avisar!: () => void;
    const esperando = new Promise<void>((resolve) => { avisar = resolve; });
    const continuar = new Promise<void>((resolve) => { liberar = resolve; });
    const prototype = entidade === "periodo" ? PeriodoLetivoRepository.prototype : TurmaRepository.prototype;
    const metodo = entidade === "periodo" ? "buscarPeriodoLetivoPorId" : "buscarTurmaPorId";
    const original = (prototype as any)[metodo];
    const espiao = vi.spyOn(prototype as any, metodo).mockImplementationOnce(async function (this: unknown, ...args: unknown[]) {
      const antigo = await original.apply(this, args); avisar(); await continuar; return antigo;
    });
    const caminho = entidade === "periodo" ? `/periodos-letivos/${f.periodoId}` : `/turmas/${f.turmaId}`;
    const token = bearer("secretaria", f.usuarioId);
    const atrasada = Promise.resolve(request(app).put(caminho).set("Authorization", token)
      .send(entidade === "periodo" ? { codigo: `METADADO-${f.periodoId}` } : { descricao: "Metadado atrasado" }));
    try {
      await esperando;
      const encerramento = await request(app).put(caminho).set("Authorization", token)
        .send(entidade === "periodo" ? { status: "encerrado", ativo: false } : { status: "inativa" });
      expect(encerramento.status).toBe(200);
      liberar(); expect((await atrasada).status).toBe(200);
      const registro = await pg.db(entidade === "periodo" ? "piv.periodo_letivo" : "piv.turma")
        .where({ id: entidade === "periodo" ? f.periodoId : f.turmaId }).first();
      expect(registro.status).toBe(entidade === "periodo" ? "encerrado" : "inativa");
      if (entidade === "periodo") expect(registro.ativo).toBe(false);
    } finally { liberar(); await atrasada.catch(() => {}); espiao.mockRestore(); }
  });
});
