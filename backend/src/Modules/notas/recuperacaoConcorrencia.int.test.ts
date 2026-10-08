import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bearer } from "../../test-helpers/httpAuth";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { disputarComBloqueioAcademico } from "../../test-helpers/disputaAcademica";
import { criarAvaliacaoPontuacao, criarNotaPontuacao, criarPontuacaoFixture, type PontuacaoFixture } from "../../test-helpers/pontuacaoFixture";

let pg: PgIntegration;
let app: Express;
let bancoApp: Knex;
beforeAll(async () => {
  pg = await startPgIntegration();
  ({ app } = await import("../../app"));
  ({ db: bancoApp } = await import("../../database/connection"));
}, 180_000);
afterAll(async () => { try { await bancoApp?.destroy(); } finally { await pg?.stop(); } });

type FixtureRecuperacao = PontuacaoFixture & { regulares: string[] };
const token = (f: PontuacaoFixture) => bearer("secretaria", f.usuarioId);
const consultar = (f: PontuacaoFixture) => request(app).get(`/notas/turmas/${f.ofertaId}/recuperacao`).set("Authorization", token(f));
const grade = (f: PontuacaoFixture, avaliacaoId: string) => request(app).get(`/notas/avaliacoes/${avaliacaoId}/lancamento`).set("Authorization", token(f));
const salvar = (f: PontuacaoFixture, avaliacaoId: string, itens: Array<{ alunoId: string; valor: unknown }>) =>
  request(app).put(`/notas/avaliacoes/${avaliacaoId}/lote`).set("Authorization", token(f)).send({ itens, motivo: "Retificação sintética de recuperação" });
const recuperacoes = (f: PontuacaoFixture) => pg.db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId, tipo_avaliacao: "RECUPERACAO" });

async function fixture(total: "120.00" | "300.00" = "120.00", notas: string[] = ["0.00", "0.00"], quantidade = 2): Promise<FixtureRecuperacao> {
  const f = await criarPontuacaoFixture(pg.db, { totalPontos: total, subgrupos: [
    { nome: "Regulares sintéticas", orcamento_pontos: total, modo_quantidade: "FIXA", quantidade_fixa: 2 },
  ] });
  const regulares: string[] = [];
  for (let indice = 0; indice < quantidade; indice++) {
    const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f, { valor: total === "120.00" ? "60.00" : "150.00" });
    regulares.push(avaliacaoId);
    if (notas[indice] !== undefined) {
      const resposta = await salvar(f, avaliacaoId, [{ alunoId: f.alunoId, valor: notas[indice] }]);
      expect(resposta.status).toBe(200);
    }
  }
  return { ...f, regulares };
}

async function definirRecuperacao(f: FixtureRecuperacao) {
  return criarAvaliacaoPontuacao(pg.db, f, { tipo_avaliacao: "RECUPERACAO", subgrupo_id: null, valor: f.totalPontos });
}

async function registrarFrequencia(f: FixtureRecuperacao, presencas: number, faltas: number) {
  const localId = randomUUID();
  const oferta = await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first("professor_id");
  await pg.db.transaction(async (trx) => {
    await trx("piv.local").insert({ id: localId, codigo: localId });
    for (let indice = 0; indice < presencas + faltas; indice++) {
      const aulaId = randomUUID(), data = `2026-09-${String(20 + indice).padStart(2, "0")}`;
      await trx("piv.aula").insert({ id: aulaId, local_id: localId, professor_id: oferta.professor_id,
        turma_disciplina_id: f.ofertaId, data: `${data}T12:00:00-03:00`,
      });
      await trx("piv.frequencia").insert({ aula_id: aulaId, matricula_turma_disciplina_id: f.matriculaDisciplinaId,
        status: indice < presencas ? "PRESENTE" : "AUSENTE", data,
        responsavel_lancamento_usuario_id: f.usuarioId, lancada_em: trx.fn.now(),
      });
    }
  });
}

async function segundaMatricula(f: FixtureRecuperacao) {
  const alunoId = randomUUID(), pessoaId = randomUUID(), matriculaId = randomUUID(), mtdId = randomUUID();
  const pessoa = await pg.db("piv.pessoa").join("piv.aluno", "aluno.pessoa_id", "pessoa.id").where("aluno.id", f.alunoId).select("pessoa.*").first();
  await pg.db.transaction(async (trx) => {
    await trx("piv.pessoa").insert({ ...pessoa, id: pessoaId, nome: "Segundo aluno sintético", cpf: pessoaId.replaceAll("-", "").slice(0, 14) });
    await trx("piv.aluno").insert({ id: alunoId, pessoa_id: pessoaId, curso_id: f.cursoId, periodo: "1" });
    await trx("piv.matricula").insert({ id: matriculaId, aluno_id: alunoId, curso_id: f.cursoId, turma_id: f.turmaId, status: "ativa" });
    await trx("piv.matricula_turma_disciplina").insert({ id: mtdId, matricula_id: matriculaId, turma_disciplina_id: f.ofertaId, status: "ativa" });
  });
  for (const id of f.regulares) expect((await salvar(f, id, [{ alunoId, valor: "0.00" }])).status).toBe(200);
  return { alunoId, mtdId };
}

async function foraDoPrazo(f: FixtureRecuperacao, avaliacaoId: string) {
  const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId, { valor: "30.00", publicada_em: "2026-01-01T12:00:00Z" });
  await pg.db("piv.nota_auditoria").insert({ nota_id: notaId, usuario_id: f.usuarioId, perfil: "secretaria",
    acao: "LANCAMENTO", valor_anterior: null, valor_novo: "30.00", motivo: "Histórico sintético anterior ao prazo",
  });
  const criada = await request(app).post("/notas/autorizacoes-excepcionais").set("Authorization", token(f)).send({
    avaliacaoId, motivo: "Correção histórica sintética autorizada", prazoEmDias: 7,
  });
  expect(criada.status).toBe(201);
  return { notaId, autorizacaoId: criada.body.autorizacao.id };
}

async function estado(avaliacaoId: string) {
  const notas = await pg.db("piv.nota").where({ avaliacao_id: avaliacaoId }).orderBy("id");
  const auditorias = await pg.db("piv.nota_auditoria").whereIn("nota_id", notas.map((n) => n.id)).orderBy("id");
  const autorizacoes = await pg.db("piv.nota_autorizacao_excepcional").where({ avaliacao_id: avaliacaoId }).orderBy("id");
  const avaliacao = await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first();
  return { notas, auditorias, autorizacoes, avaliacao };
}

async function disputa(f: FixtureRecuperacao, operacoes: Array<() => PromiseLike<request.Response>>, mudar?: (trx: Knex.Transaction) => Promise<void>) {
  let bloqueador: Knex.Transaction;
  const prova = await disputarComBloqueioAcademico(pg.db, async (trx) => {
    bloqueador = trx;
    // Antecessor comum da ordem T010: permite modificar filhas sem inverter locks.
    await trx("piv.periodo_letivo").where({ id: f.periodoId }).forUpdate();
  }, operacoes.map((operacao) => async () => await operacao()), {
    aposComprovarBloqueio: mudar ? async () => mudar(bloqueador!) : undefined,
  });
  expect(prova.bloqueios).toHaveLength(operacoes.length);
  expect(prova.bloqueios.every((b) => b.cadeiaAteBloqueador.includes(prova.bloqueadorPid))).toBe(true);
  console.info("T059 barreira PostgreSQL", JSON.stringify({ bloqueadorPid: prova.bloqueadorPid, consultas: prova.consultas,
    esperas: prova.bloqueios.map((b) => ({ pid: b.pid, evento: b.evento, tiposLock: b.tiposLock, cadeia: b.cadeiaAteBloqueador })),
  }));
  return prova.resultados.map((resultado) => {
    if (resultado.status === "rejected") throw resultado.reason;
    return resultado.value;
  });
}

describe("US3: recuperação no total real, elegibilidade e disputa PostgreSQL", () => {
  it.each(["120.00", "300.00"] as const)("GET aplica total%s e conserva uma definição em leituras repetidas", async (total) => {
    const f = await fixture(total);
    const primeiro = await consultar(f);
    expect(primeiro.status).toBe(200);
    expect(primeiro.headers["cache-control"]).toBe("private, no-store");
    expect(primeiro.body.valorMaximoRecuperacao).toBe(total);
    expect(primeiro.body.alunos.map((a: any) => a.alunoId)).toEqual([f.alunoId]);
    expect(primeiro.body.recuperacaoAvaliacaoId).toEqual(expect.any(String));
    const segundo = await consultar(f);
    expect(segundo.status).toBe(200);
    expect(segundo.headers["cache-control"]).toBe("private, no-store");
    expect(segundo.body.recuperacaoAvaliacaoId).toBe(primeiro.body.recuperacaoAvaliacaoId);
    expect(await recuperacoes(f)).toHaveLength(1);
    expect((await recuperacoes(f))[0]).toMatchObject({ valor: total, subgrupo_id: null });
  });

  it("dois GETs aguardam locks e criam somente uma recuperação com máximo120", async () => {
    const f = await fixture();
    const respostas = await disputa(f, [() => consultar(f), () => consultar(f)]);
    expect(respostas.map((r) => r.status)).toEqual([200, 200]);
    expect(respostas[0].body.recuperacaoAvaliacaoId).toBe(respostas[1].body.recuperacaoAvaliacaoId);
    expect(respostas[0].body.valorMaximoRecuperacao).toBe("120.00");
    expect(await recuperacoes(f)).toHaveLength(1);
  });

  it.each(["plano", "nota"])("ausência de%s não autoriza recuperação", async (pendencia) => {
    const f = pendencia === "plano" ? await fixture("120.00", ["0.00"], 1) : await fixture("120.00", ["0.00"]);
    const resposta = await consultar(f);
    expect(resposta.status).toBe(200);
    expect(resposta.body.recuperacaoAvaliacaoId).toBeNull();
    expect(resposta.body.alunos).toEqual([]);
    expect(await recuperacoes(f)).toHaveLength(0);
  });

  it("regular72/120 atinge corte e não cria recuperação", async () => {
    const f = await fixture("120.00", ["60.00", "12.00"]);
    const resposta = await consultar(f);
    expect(resposta.status).toBe(200); expect(resposta.body.alunos).toEqual([]);
    expect(resposta.body.recuperacaoAvaliacaoId).toBeNull(); expect(await recuperacoes(f)).toHaveLength(0);
  });

  it("grade REC conserva aluno abaixo do corte e exclui suficiente da mesma oferta", async () => {
    const f = await fixture("120.00", ["30.00", "30.00"]);
    const suficiente = await segundaMatricula(f);
    expect((await salvar(f, f.regulares[0], [{ alunoId: suficiente.alunoId, valor: "60.00" }])).status).toBe(200);
    expect((await salvar(f, f.regulares[1], [{ alunoId: suficiente.alunoId, valor: "12.00" }])).status).toBe(200);
    const id = await definirRecuperacao(f);
    const resposta = await grade(f, id);
    expect(resposta.status).toBe(200);
    expect(resposta.body.avaliacao).toMatchObject({ id, tipo: "RECUPERACAO", valorMaximo: "120.00" });
    expect(resposta.body.alunos).toEqual([expect.objectContaining({
      alunoId: f.alunoId, matriculaTurmaDisciplinaId: f.matriculaDisciplinaId, valor: null, lancada: false,
      resultadoAcademico: expect.objectContaining({ contratoVersao: 2, turmaDisciplinaId: f.ofertaId,
        matriculaTurmaDisciplinaId: f.matriculaDisciplinaId, totalPontos: "120.00", cortePontos: "72.00",
        etapaRegularCompleta: true, pontosRegularesObtidos: "60.00", elegivelRecuperacaoPorNota: true,
      }),
    })]);
  });

  it("grade REC expõe frequência comum e mantém ausência da nota como null", async () => {
    const f = await fixture(); await registrarFrequencia(f, 3, 1);
    const id = await definirRecuperacao(f);
    const resposta = await grade(f, id);
    expect(resposta.status).toBe(200);
    expect(resposta.body.alunos).toEqual([expect.objectContaining({ alunoId: f.alunoId, valor: null, lancada: false,
      resultadoAcademico: expect.objectContaining({ contratoVersao: 2, pontosRecuperacao: null,
        resultadoPorNota: "EM_RECUPERACAO", aprovacaoDisciplina: "PENDENTE", elegivelRecuperacaoPorNota: true,
        frequencia: { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" },
      }),
    })]);
  });

  it.each(["72.00", "90.00"])("resposta do lote REC%s recompõe pontos e aprovação após salvar", async (valor) => {
    const f = await fixture("120.00", ["30.00", "30.00"]); await registrarFrequencia(f, 3, 1);
    const id = await definirRecuperacao(f);
    const resposta = await salvar(f, id, [{ alunoId: f.alunoId, valor }]);
    expect(resposta.status).toBe(200);
    expect(resposta.body.alunos).toEqual([expect.objectContaining({ alunoId: f.alunoId, valor, lancada: true,
      resultadoAcademico: expect.objectContaining({ contratoVersao: 2, pontosRegularesObtidos: "60.00",
        pontosRecuperacao: valor, pontosEfetivos: valor, percentualResultado: valor === "72.00" ? 60 : 75,
        resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "APROVADA", elegivelRecuperacaoPorNota: true,
        frequencia: { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" },
      }),
    })]);
    const leitura = await grade(f, id);
    expect(leitura.status).toBe(200);
    expect(leitura.body.alunos[0].resultadoAcademico).toEqual(resposta.body.alunos[0].resultadoAcademico);
    expect((await estado(id)).notas[0].valor).toBe(valor);
  });

  it("GET revalida encerramento do período após esperar", async () => {
    const f = await fixture();
    const [resposta] = await disputa(f, [() => consultar(f)], async (trx) => {
      await trx("piv.periodo_letivo").where({ id: f.periodoId }).update({ status: "encerrado" });
    });
    expect(resposta.status).toBe(200); expect(resposta.body.periodoLetivo.fechado).toBe(true);
    expect(resposta.body.recuperacaoAvaliacaoId).toBeNull(); expect(await recuperacoes(f)).toHaveLength(0);
  });

  it("GET revalida cancelamento da matrícula após esperar", async () => {
    const f = await fixture();
    const [resposta] = await disputa(f, [() => consultar(f)], async (trx) => {
      await trx("piv.matricula").where({ id: f.matriculaId }).update({ status: "cancelada" });
    });
    expect(resposta.status).toBe(200); expect(resposta.body.alunos).toEqual([]);
    expect(resposta.body.recuperacaoAvaliacaoId).toBeNull(); expect(await recuperacoes(f)).toHaveLength(0);
  });

  it("GET revalida nota regular que passa a atingir corte durante a espera", async () => {
    const f = await fixture("120.00", ["30.00", "30.00"]);
    const [resposta] = await disputa(f, [() => consultar(f)], async (trx) => {
      await trx("piv.nota").where({ avaliacao_id: f.regulares[0], matricula_turma_disciplina_id: f.matriculaDisciplinaId })
        .update({ valor: "42.00", atualizada_por_usuario_id: f.usuarioId });
    });
    expect(resposta.status).toBe(200); expect(resposta.body.alunos).toEqual([]);
    expect(resposta.body.recuperacaoAvaliacaoId).toBeNull(); expect(await recuperacoes(f)).toHaveLength(0);
  });

  it("GET relê plano e a nota que completam a etapa durante a espera", async () => {
    const f = await fixture("120.00", ["0.00"], 1);
    const [resposta] = await disputa(f, [() => consultar(f)], async (trx) => {
      const id = await criarAvaliacaoPontuacao(trx, f, { valor: "60.00" });
      await criarNotaPontuacao(trx, f, id, { valor: "0.00" });
    });
    expect(resposta.status).toBe(200); expect(resposta.body.alunos.map((a: any) => a.alunoId)).toEqual([f.alunoId]);
    expect(resposta.body.valorMaximoRecuperacao).toBe("120.00"); expect(await recuperacoes(f)).toHaveLength(1);
  });

  it.each(["120.00", "300.00"] as const)("lote aceita máximo%s de recuperação sem teto100", async (total) => {
    const f = await fixture(total); const id = await definirRecuperacao(f);
    const resposta = await salvar(f, id, [{ alunoId: f.alunoId, valor: total }]);
    expect(resposta.status).toBe(200);
    expect((await estado(id)).notas[0].valor).toBe(total);
    expect((await estado(id)).auditorias).toHaveLength(1);
  });

  it("dois lotes expirados disputam a mesma autorização e só um a consome", async () => {
    const f = await fixture(); const id = await definirRecuperacao(f); const antigo = await foraDoPrazo(f, id);
    const antes = await estado(id);
    const respostas = await disputa(f, [
      () => salvar(f, id, [{ alunoId: f.alunoId, valor: "48.00" }]),
      () => salvar(f, id, [{ alunoId: f.alunoId, valor: "120.00" }]),
    ]);
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    const depois = await estado(id);
    expect(depois.notas).toHaveLength(1); expect(depois.notas[0].id).toBe(antigo.notaId);
    expect(depois.notas[0].publicada_em).toEqual(antes.notas[0].publicada_em);
    expect(["48.00", "120.00"]).toContain(depois.notas[0].valor);
    expect(depois.auditorias).toHaveLength(antes.auditorias.length + 1);
    expect(depois.auditorias.find((a) => a.id === antes.auditorias[0].id)).toEqual(antes.auditorias[0]);
    expect(depois.auditorias.filter((a) => a.acao === "RETIFICACAO")).toEqual([
      expect.objectContaining({ usuario_id: f.usuarioId, perfil: "secretaria", acao: "RETIFICACAO" }),
    ]);
    expect(depois.autorizacoes[0].id).toBe(antigo.autorizacaoId);
    expect(depois.autorizacoes[0].consumida_em).not.toBeNull();
  });

  it("item acima do máximo rejeita lote inteiro sem consumir autorização ou marcar outra nota", async () => {
    const f = await fixture(); const outro = await segundaMatricula(f); const id = await definirRecuperacao(f);
    await foraDoPrazo(f, id); const antes = await estado(id);
    const resposta = await salvar(f, id, [{ alunoId: f.alunoId, valor: "48.00" }, { alunoId: outro.alunoId, valor: "120.01" }]);
    expect(resposta.status).toBe(400); expect(resposta.body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ campo: "itens[1].valor" })]));
    expect(await estado(id)).toEqual(antes);
  });

  it("autorização não reabre período e continua disponível após rejeição", async () => {
    const f = await fixture(); const id = await definirRecuperacao(f); await foraDoPrazo(f, id);
    await pg.db("piv.periodo_letivo").where({ id: f.periodoId }).update({ status: "encerrado" });
    const antes = await estado(id);
    const resposta = await salvar(f, id, [{ alunoId: f.alunoId, valor: "48.00" }]);
    expect(resposta.status).toBe(409); expect(resposta.body.codigo).toBe("PERIODO_FECHADO");
    expect(await estado(id)).toEqual(antes);
  });
});
