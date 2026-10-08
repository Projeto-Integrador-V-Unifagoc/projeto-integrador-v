import type { Express } from "express";
import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bearer } from "../../test-helpers/httpAuth";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { disputarComBloqueioAcademico } from "../../test-helpers/disputaAcademica";
import { criarAvaliacaoPontuacao, criarContextoPontuacao, criarPontuacaoFixture, type PontuacaoFixture } from "../../test-helpers/pontuacaoFixture";

let pg: PgIntegration;
let app: Express;
let bancoApp: Knex;
beforeAll(async () => {
  pg = await startPgIntegration();
  ({ app } = await import("../../app"));
  ({ db: bancoApp } = await import("../../database/connection"));
}, 180_000);
afterAll(async () => { try { await bancoApp?.destroy(); } finally { await pg?.stop(); } });

const token = (f: { usuarioId: string }) => bearer("secretaria", f.usuarioId);
const payload = (f: PontuacaoFixture, valor = "18.00", ofertaId = f.ofertaId) => ({
  tipo_avaliacao: "REGULAR", subgrupo_id: f.subgrupos[0].id, valor,
  turma_disciplina_id: ofertaId, descricao_avaliacao: "Disputa sintética",
  data_lancamento: "2026-09-28", data_devolucao: "2026-10-01",
});
async function disputar(f: PontuacaoFixture, operacoes: Array<() => Promise<request.Response>>) {
  const resultado = await disputarComBloqueioAcademico(pg.db, async (trx) => {
    await trx("piv.periodo_letivo").where({ id: f.periodoId }).forUpdate();
  }, operacoes);
  expect(resultado.bloqueios).toHaveLength(operacoes.length);
  expect(resultado.bloqueios.every((b) => b.cadeiaAteBloqueador.includes(resultado.bloqueadorPid))).toBe(true);
  return resultado.resultados.map((r) => {
    if (r.status === "rejected") throw r.reason;
    return r.value;
  });
}
async function estado(f: PontuacaoFixture) {
  const avaliacoes = await pg.db("piv.avaliacao").whereIn("turma_disciplina_id", [f.ofertaId, f.outraOfertaId]).orderBy("id");
  const notas = await pg.db("piv.nota").whereIn("avaliacao_id", avaliacoes.map((a) => a.id));
  const auditorias = await pg.db("piv.nota_auditoria").whereIn("nota_id", notas.map((n) => n.id));
  const regra = await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first();
  for (const oferta of [f.ofertaId, f.outraOfertaId]) {
    const agregados = await pg.db("piv.avaliacao").where({ turma_disciplina_id: oferta, subgrupo_id: f.subgrupos[0].id })
      .count("id as quantidade").sum("valor as pontos").first();
    expect(BigInt(String(agregados?.quantidade ?? 0))).toBeLessThanOrEqual(BigInt(f.subgrupos[0].quantidade_fixa!));
    expect(Number(agregados?.pontos ?? 0)).toBeLessThanOrEqual(Number(f.subgrupos[0].orcamento_pontos));
  }
  return { avaliacoes, notas, auditorias, regra };
}

describe("US2: escritores reais sob disputa com guards ativos", () => {
  it("regular sem regra retorna conflito de domínio, sem criar avaliação", async () => {
    const f = await criarContextoPontuacao(pg.db);
    const resposta = await request(app).post("/avaliacoes").set("Authorization", token(f)).send({
      turma_disciplina_id: f.ofertaId, tipo_avaliacao: "REGULAR", valor: "18.00", data_lancamento: "2026-09-28",
      subgrupo_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(resposta.status).toBe(409);
    expect(resposta.body.codigo).toBe("REGRA_AUSENTE");
    expect(await pg.db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId })).toEqual([]);
  });
  it("duas criações disputam a última vaga e o saldo sem ultrapassá-los", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    for (let i = 0; i < 3; i++) await criarAvaliacaoPontuacao(pg.db, f);
    const respostas = await disputar(f, [0, 1].map(() => () => request(app).post("/avaliacoes").set("Authorization", token(f)).send(payload(f))));
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
    const atual = await estado(f);
    expect(atual.avaliacoes).toHaveLength(4);
    expect(atual.regra.usada_em).not.toBeNull();
    expect(respostas.find((r) => r.status === 409)!.body.codigo).toMatch(/QUANTIDADE|ORCAMENTO/);
  });
  it("edição da regra e primeira avaliação relêem a definição vencedora", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    const respostas = await disputar(f, [
      () => request(app).put(`/regras-pontuacao/cursos/${f.cursoId}/periodos/${f.periodoId}`).set("Authorization", token(f)).send({
        versaoEsperada: 1, totalPontos: "120.00", subgrupos: f.subgrupos.map((g) => ({ id: g.id, nome: g.nome,
          orcamentoPontos: g.orcamento_pontos, modoQuantidade: g.modo_quantidade, quantidadeFixa: g.quantidade_fixa, ordem: g.ordem })),
      }),
      () => request(app).post("/avaliacoes").set("Authorization", token(f)).send(payload(f)),
    ]);
    expect(respostas[1].status).toBe(201);
    expect([200, 409]).toContain(respostas[0].status);
    const atual = await estado(f);
    expect(atual.avaliacoes).toHaveLength(1);
    expect(atual.regra.usada_em).not.toBeNull();
    const eventos = await pg.db("piv.regra_pontuacao_auditoria").where({ regra_pontuacao_id: f.regraId });
    expect(eventos.filter((e) => e.acao === "PRIMEIRO_USO")).toHaveLength(1);
    expect(eventos.filter((e) => e.acao === "PRIMEIRO_USO")[0].novo.turmaDisciplinaId).toBe(f.ofertaId);
    expect(atual.regra.versao).toBe(respostas[0].status === 200 ? 2 : 1);
  });
  it.each(["maximo", "subgrupo", "oferta", "exclusao"])("primeira nota zero versus %s conserva identidade, marcador e auditoria", async (mudanca) => {
    const f = await criarPontuacaoFixture(pg.db);
    const id = await criarAvaliacaoPontuacao(pg.db, f);
    const dados = mudanca === "maximo" ? { valor: "19.00" }
      : mudanca === "subgrupo" ? { subgrupo_id: f.subgrupos[2].id }
      : { turma_disciplina_id: f.outraOfertaId };
    const respostas = await disputar(f, [
      () => request(app).put(`/notas/avaliacoes/${id}/lote`).set("Authorization", token(f)).send({ itens: [{ alunoId: f.alunoId, valor: "0.00" }] }),
      () => mudanca === "exclusao"
        ? request(app).delete(`/avaliacoes/${id}`).set("Authorization", token(f))
        : request(app).put(`/avaliacoes/${id}`).set("Authorization", token(f)).send(dados),
    ]);
    expect(respostas.every((r) => r.status < 500)).toBe(true);
    const atual = await estado(f);
    const nota = await pg.db("piv.nota").where({ avaliacao_id: id }).first();
    const avaliacao = await pg.db("piv.avaliacao").where({ id }).first();
    if (nota) {
      expect(respostas[0].status).toBe(200);
      expect(nota.valor).toBe("0.00");
      expect(avaliacao.primeira_nota_em).not.toBeNull();
      expect(atual.auditorias).toHaveLength(1);
      expect(atual.auditorias[0]).toMatchObject({ perfil: "secretaria", acao: "LANCAMENTO", valor_anterior: null, valor_novo: "0.00" });
      const tentativa = mudanca === "exclusao"
        ? await request(app).delete(`/avaliacoes/${id}`).set("Authorization", token(f))
        : await request(app).put(`/avaliacoes/${id}`).set("Authorization", token(f)).send(mudanca === "maximo" ? { valor: "20.00" }
          : mudanca === "subgrupo" ? { subgrupo_id: avaliacao.subgrupo_id === f.subgrupos[0].id ? f.subgrupos[2].id : f.subgrupos[0].id }
          : { turma_disciplina_id: avaliacao.turma_disciplina_id === f.ofertaId ? f.outraOfertaId : f.ofertaId });
      expect(tentativa.status).toBe(409);
      expect(tentativa.body.codigo).toBe("AVALIACAO_COM_NOTA");
    } else {
      expect([400, 403, 404, 409]).toContain(respostas[0].status);
      expect([200, 204]).toContain(respostas[1].status);
      expect(atual.auditorias).toEqual([]);
    }
    expect(atual.regra.usada_em).not.toBeNull();
  });
  it("movimentos opostos não perdem avaliações e revalidam ambos os orçamentos", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    const a = await criarAvaliacaoPontuacao(pg.db, f);
    const b = await criarAvaliacaoPontuacao(pg.db, f, { turma_disciplina_id: f.outraOfertaId });
    const respostas = await disputar(f, [
      () => request(app).put(`/avaliacoes/${a}`).set("Authorization", token(f)).send({ turma_disciplina_id: f.outraOfertaId }),
      () => request(app).put(`/avaliacoes/${b}`).set("Authorization", token(f)).send({ turma_disciplina_id: f.ofertaId }),
    ]);
    expect(respostas.map((r) => r.status)).toEqual([200, 200]);
    const atual = await estado(f);
    expect(atual.avaliacoes.map((r) => r.id).sort()).toEqual([a, b].sort());
    expect(atual.avaliacoes.find((r) => r.id === a).turma_disciplina_id).toBe(f.outraOfertaId);
    expect(atual.avaliacoes.find((r) => r.id === b).turma_disciplina_id).toBe(f.ofertaId);
    expect(atual.notas).toEqual([]);
    const guards = await pg.db.raw("SELECT count(*)::int AS total FROM pg_trigger WHERE tgrelid = 'piv.avaliacao'::regclass AND NOT tgisinternal AND tgenabled <> 'D'");
    expect(guards.rows[0].total).toBeGreaterThan(0);
  });
  it("nota de outra oferta termina enquanto a primeira permanece comprovadamente bloqueada", async () => {
    const f = await criarPontuacaoFixture(pg.db);
    const a = await criarAvaliacaoPontuacao(pg.db, f);
    const b = await criarAvaliacaoPontuacao(pg.db, f, { turma_disciplina_id: f.outraOfertaId });
    let respostaB!: Promise<request.Response>;
    const inicio = performance.now();
    let duracaoB = 0;
    const resultado = await disputarComBloqueioAcademico(pg.db, async (trx) => {
      await trx("piv.turma_disciplina").where({ id: f.ofertaId }).forUpdate();
    }, [() => {
      const respostaA = Promise.resolve(request(app).put(`/notas/avaliacoes/${a}/lote`).set("Authorization", token(f))
        .send({ itens: [{ alunoId: f.alunoId, valor: "0.00" }] }));
      respostaB = Promise.resolve(request(app).put(`/notas/avaliacoes/${b}/lote`).set("Authorization", token(f))
        .send({ itens: [{ alunoId: f.alunoId, valor: "1.00" }] }).timeout({ response: 2_000, deadline: 3_000 }));
      return respostaA;
    }], { aposComprovarBloqueio: async (bloqueios) => {
      expect(bloqueios).toHaveLength(1);
      // Ainda não ocorreu COMMIT do bloqueador: B precisa terminar sem liberar A.
      expect((await respostaB).status).toBe(200);
      duracaoB = performance.now() - inicio;
      expect(await pg.db("piv.nota").where({ avaliacao_id: a })).toEqual([]);
      expect(await pg.db("piv.nota").where({ avaliacao_id: b })).toHaveLength(1);
    } });
    expect(resultado.resultados[0].status).toBe("fulfilled");
    if (resultado.resultados[0].status === "fulfilled") expect(resultado.resultados[0].value.status).toBe(200);
    expect(await pg.db("piv.nota").whereIn("avaliacao_id", [a, b])).toHaveLength(2);
    process.stdout.write(`T051 ofertas distintas ${JSON.stringify({ duracaoBMs: Math.round(duracaoB), consultasBarreira: resultado.consultas,
      bloqueios: resultado.bloqueios.map((r) => ({ pid: r.pid, cadeia: r.cadeiaAteBloqueador, evento: r.evento, tiposLock: r.tiposLock })) })}\n`);
  });
});
