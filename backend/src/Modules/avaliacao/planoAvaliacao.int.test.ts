import type { Express } from "express";
import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { bearer } from "../../test-helpers/httpAuth";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { criarContextoPontuacao, criarPontuacaoFixture, criarRegraPontuacao, criarAvaliacaoPontuacao, type PontuacaoFixture } from "../../test-helpers/pontuacaoFixture";
import { transacaoAcademica } from "../modulo-estrutura-academica/gateways/TransacaoAcademica";
import { RegraPontuacaoRepository } from "./repository/RegraPontuacaoRepository";

let pg: PgIntegration;
let app: Express;
let bancoApp: Knex;
beforeAll(async () => {
  pg = await startPgIntegration();
  ({ app } = await import("../../app"));
  ({ db: bancoApp } = await import("../../database/connection"));
}, 180_000);
afterAll(async () => { try { await bancoApp?.destroy(); } finally { await pg?.stop(); } });

async function usar(f: PontuacaoFixture, ofertaId = f.ofertaId, falhar = false) {
  const repo = new RegraPontuacaoRepository(pg.db);
  return transacaoAcademica(pg.db, { descobrir: async (trx) => {
    const oferta = (await repo.auth.buscarOferta(trx, ofertaId))!;
    return { periodos: [oferta.periodo_letivo_id], turmas: [oferta.turma_id],
      cursosDisciplinas: [oferta.curso_disciplina_id], professores: oferta.professor_id ? [oferta.professor_id] : [],
      regras: [f.regraId], ofertas: [ofertaId] };
  } }, async (trx) => {
    const regra = await repo.vincularPrimeiroUso(trx, ofertaId, { usuarioId: f.usuarioId, tipoUsuario: "administrador" });
    if (falhar) throw new Error("Falha sintética após vínculo");
    return regra;
  });
}

describe("Plano autorizado e vínculo auditado T026/T027", () => {
  it("sem regra lê plano bloqueado sem produzir definição, evento ou vínculo", async () => {
    const f = await criarContextoPontuacao(pg.db);
    const res = await request(app).get(`/avaliacoes/plano/${f.ofertaId}`).set("Authorization", bearer("secretaria", f.usuarioId));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ turmaDisciplinaId: f.ofertaId, regraPontuacaoId: null, totalPontos: null,
      planoCompleto: false, podeCriarRegular: false, motivosBloqueio: ["REGRA_AUSENTE"], subgrupos: [] });
    expect(await pg.db("piv.regra_pontuacao").where({ curso_id: f.cursoId })).toEqual([]);
  });
  it("dois planos partilham regra mas descontam somente as avaliações da própria oferta", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    await criarAvaliacaoPontuacao(pg.db, f);
    const ler = (id: string) => request(app).get(`/avaliacoes/plano/${id}`).set("Authorization", bearer("secretaria", f.usuarioId));
    const primeiro = await ler(f.ofertaId);
    const segundo = await ler(f.outraOfertaId);
    expect(primeiro.status).toBe(200);
    expect(segundo.status).toBe(200);
    expect(primeiro.body).toMatchObject({ regraPontuacaoId: f.regraId, totalPontos: "120.00", podeCriarRegular: true });
    expect(primeiro.body.subgrupos[0]).toMatchObject({ pontosDistribuidos: "18.00", saldoPontos: "54.00", quantidadeAtual: 1, quantidadeDisponivel: 3 });
    expect(segundo.body.subgrupos[0]).toMatchObject({ pontosDistribuidos: "0.00", saldoPontos: "72.00", quantidadeAtual: 0, quantidadeDisponivel: 4 });
  });
  it("professor alheio e aluno são recusados antes de expor qualquer composição", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    for (const perfil of ["professor", "aluno"] as const) {
      const res = await request(app).get(`/avaliacoes/plano/${f.ofertaId}`).set("Authorization", bearer(perfil, f.usuarioId));
      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe(perfil === "aluno" ? "PERFIL_PROIBIDO" : "ESCOPO_PROIBIDO");
      expect(res.body).not.toHaveProperty("subgrupos");
      expect(JSON.stringify(res.body)).not.toContain(f.regraId);
    }
  });
  it("vínculo é auditado uma vez por oferta, conserva perfil e o primeiro marcador", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    const primeira = await usar(f);
    const segunda = await usar(f);
    await usar(f, f.outraOfertaId);
    expect(primeira.estado).toBe("PRESERVADA");
    expect(segunda.usadaEm).toBe(primeira.usadaEm);
    const eventos = await pg.db("piv.regra_pontuacao_auditoria").where({ regra_pontuacao_id: f.regraId }).orderBy("criado_em");
    expect(eventos).toHaveLength(2);
    expect(eventos.every((e) => e.usuario_id === f.usuarioId && e.perfil === "administrador" && e.acao === "PRIMEIRO_USO")).toBe(true);
    expect(new Set(eventos.map((e) => e.novo.turmaDisciplinaId))).toEqual(new Set([f.ofertaId, f.outraOfertaId]));
    expect(eventos[0].anterior.usadaEm).toBeNull();
    expect(eventos[1].anterior.usadaEm).toBe(primeira.usadaEm);
  });
  it("falha posterior desfaz juntos marcador, vínculo e evento", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    await expect(usar(f, f.ofertaId, true)).rejects.toThrow("Falha sintética");
    expect(await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first("usada_em")).toEqual({ usada_em: null });
    expect(await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first("regra_pontuacao_id", "pontuacao_vinculada_em"))
      .toEqual({ regra_pontuacao_id: null, pontuacao_vinculada_em: null });
    expect(await pg.db("piv.regra_pontuacao_auditoria").where({ regra_pontuacao_id: f.regraId })).toEqual([]);
  });
  it("regra surgida depois da descoberta exige recomeço antes de validar uma versão sem lock", async () => {
    const f = await criarContextoPontuacao(pg.db);
    const repo = new RegraPontuacaoRepository(pg.db);
    let liberarAutorizacao!: () => void;
    let avisarAutorizacao!: () => void;
    let liberarLeitura!: () => void;
    let avisarLeitura!: () => void;
    const autorizando = new Promise<void>((resolve) => { avisarAutorizacao = resolve; });
    const continuarAutorizacao = new Promise<void>((resolve) => { liberarAutorizacao = resolve; });
    const leu = new Promise<void>((resolve) => { avisarLeitura = resolve; });
    const continuarLeitura = new Promise<void>((resolve) => { liberarLeitura = resolve; });
    const autorizar = repo.auth.autorizarPar.bind(repo.auth);
    vi.spyOn(repo.auth, "autorizarPar").mockImplementationOnce(async (...args) => {
      await autorizar(...args); avisarAutorizacao(); await continuarAutorizacao;
    });
    const ler = repo.lerPorPar.bind(repo);
    vi.spyOn(repo, "lerPorPar").mockImplementationOnce(async (...args) => {
      const regra = await ler(...args); avisarLeitura(); await continuarLeitura; return regra;
    });
    const dados = { versaoEsperada: 1, totalPontos: "120.00", subgrupos: [
      { nome: "Tentativa obsoleta", orcamentoPontos: "120.00", modoQuantidade: "SEM_LIMITE" as const, quantidadeFixa: null, ordem: 0 },
    ] };
    const operacao = repo.salvar(f.cursoId, f.periodoId, dados, { usuarioId: f.usuarioId, tipoUsuario: "secretaria" });
    try {
      await autorizando;
      await criarRegraPontuacao(pg.db, f);
      liberarAutorizacao();
      await leu;
      const vencedora = await request(app).put(`/regras-pontuacao/cursos/${f.cursoId}/periodos/${f.periodoId}`)
        .set("Authorization", bearer("secretaria", f.usuarioId)).send({ ...dados, subgrupos: [{ ...dados.subgrupos[0], nome: "Edição vencedora" }] });
      expect(vencedora.status).toBe(200);
      expect(vencedora.body.versao).toBe(2);
      liberarLeitura();
      await expect(operacao).rejects.toMatchObject({ status: 409, codigo: "VERSAO_OBSOLETA" });
      const atual = await repo.buscar(f.cursoId, f.periodoId, { usuarioId: f.usuarioId, tipoUsuario: "secretaria" });
      expect(atual).toEqual(vencedora.body);
    } finally {
      liberarAutorizacao(); liberarLeitura(); await operacao.catch(() => {});
    }
  });
  it("UUIDs conservados em maiúsculas identificam o mesmo grupo sem duplicação", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    const consulta = await request(app).get(`/regras-pontuacao/cursos/${f.cursoId}/periodos/${f.periodoId}`)
      .set("Authorization", bearer("secretaria", f.usuarioId));
    const resposta = await request(app).put(`/regras-pontuacao/cursos/${f.cursoId}/periodos/${f.periodoId}`)
      .set("Authorization", bearer("secretaria", f.usuarioId)).send({ versaoEsperada: 1, totalPontos: "120.00",
        subgrupos: consulta.body.subgrupos.map((g: { id: string }) => ({ ...g, id: g.id.toUpperCase() })) });
    expect(resposta.status).toBe(200);
    expect(resposta.body.subgrupos.map((g: { id: string }) => g.id)).toEqual(consulta.body.subgrupos.map((g: { id: string }) => g.id));
  });
});
