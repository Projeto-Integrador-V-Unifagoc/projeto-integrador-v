import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { down as retornarExpansao, up as expandir } from "../../../migrations/20260928000100_expande_pontuacao_dinamica";
import { down as retornarGuards, up as proteger } from "../../../migrations/20260928000300_protege_pontuacao_dinamica";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import {
  criarAvaliacaoPontuacao,
  criarContextoPontuacao,
  criarNotaPontuacao,
  criarPontuacaoFixture,
  criarRegraPontuacao,
  type PontuacaoFixture,
} from "../../test-helpers/pontuacaoFixture";

/**
 * Fronteira aprovada em T011: SQL direto contra PostgreSQL 15, com guards ativos.
 * Não usa serviços, mocks, trigger desativado ou nomes gerados de constraints.
 * Cada caso cria IDs próprios; o container completo é descartado ao terminar.
 * RED anterior à expansão é ausência do schema da feature, não prova de guards.
 */
let pg: PgIntegration;

beforeAll(async () => {
  pg = await startPgIntegration();
}, 180_000);

afterAll(async () => {
  await pg?.stop();
});

class EscritaInvalidaAceita extends Error {
  constructor() { super("Escrita inválida foi aceita pelos guards do PostgreSQL"); }
}

/** Também desfaz a escrita quando a proteção falta, para manter os casos isolados. */
async function rejeitaSql(
  escrever: (trx: Knex.Transaction) => Promise<unknown>,
  codigos: string[] = ["23514"],
): Promise<void> {
  let erro: unknown;
  try {
    await pg.db.transaction(async (trx) => {
      await escrever(trx);
      await trx.raw("SET CONSTRAINTS ALL IMMEDIATE");
      throw new EscritaInvalidaAceita();
    });
  } catch (falha) { erro = falha; }
  expect(erro).toBeDefined();
  expect(codigos).toContain((erro as { code?: string })?.code);
}

async function auditarNota(trx: Knex | Knex.Transaction, f: PontuacaoFixture, notaId: string, dados: Record<string, unknown> = {}) {
  const id = randomUUID();
  await trx("piv.nota_auditoria").insert({
    id, nota_id: notaId, usuario_id: f.usuarioId, perfil: "secretaria", acao: "RETIFICACAO",
    valor_anterior: "0.00", valor_novo: "0.00", motivo: "Fixture de integridade", ...dados,
  });
  return id;
}

async function auditarRegra(f: PontuacaoFixture): Promise<string> {
  const id = randomUUID();
  await pg.db("piv.regra_pontuacao_auditoria").insert({
    id, regra_pontuacao_id: f.regraId, usuario_id: f.usuarioId, perfil: "secretaria",
    acao: "CRIACAO", anterior: null, novo: { totalPontos: "120.00" },
  });
  return id;
}

type CampoPonto = "total" | "orcamento" | "maximo" | "nota" | "auditoria_anterior" | "auditoria_novo";
const camposPonto: CampoPonto[] = ["total", "orcamento", "maximo", "nota", "auditoria_anterior", "auditoria_novo"];

async function rejeitaPonto(campo: CampoPonto, valor: string): Promise<void> {
  const f = await criarPontuacaoFixture(pg.db);
  const avaliacaoId = ["nota", "auditoria_anterior", "auditoria_novo"].includes(campo)
    ? await criarAvaliacaoPontuacao(pg.db, f) : null;
  const notaId = campo.startsWith("auditoria_")
    ? await criarNotaPontuacao(pg.db, f, avaliacaoId!) : null;
  await rejeitaSql(async (trx) => {
    switch (campo) {
      case "total": return trx("piv.regra_pontuacao").where({ id: f.regraId }).update({ total_pontos: valor });
      case "orcamento": return trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update({ orcamento_pontos: valor });
      case "maximo": return criarAvaliacaoPontuacao(trx, f, { valor });
      case "nota": return criarNotaPontuacao(trx, f, avaliacaoId!, { valor });
      case "auditoria_anterior": return auditarNota(trx, f, notaId!, { valor_anterior: valor });
      case "auditoria_novo": return auditarNota(trx, f, notaId!, { valor_novo: valor });
    }
  });
}

async function prepararRegularCompleto(f: PontuacaoFixture): Promise<void> {
  for (const [subgrupo, valor] of [[0, "12.00"], [0, "18.00"], [0, "18.00"], [0, "24.00"], [1, "6.00"], [2, "42.00"]] as const) {
    const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f, { subgrupo_id: f.subgrupos[subgrupo].id, valor });
    await criarNotaPontuacao(pg.db, f, avaliacaoId, { valor: "0.00" });
  }
}

describe("Pontuação - invariantes no PostgreSQL real @int", () => {
  it("ensaia retorno antes das novas escritas sem tocar migrations antigas", async () => {
    await pg.db.transaction(async (trx) => {
      await retornarGuards(trx);
      await retornarExpansao(trx);
    });
    expect(await pg.db.schema.withSchema("piv").hasTable("regra_pontuacao")).toBe(false);
    const coluna = await pg.db.raw(`SELECT numeric_precision,numeric_scale FROM information_schema.columns
      WHERE table_schema='piv' AND table_name='nota' AND column_name='valor'`);
    expect(coluna.rows).toEqual([{ numeric_precision: 6, numeric_scale: 2 }]);
    await pg.db.transaction(async (trx) => { await expandir(trx); await proteger(trx); });
  });

  it("instala o esquema da feature sem inventar regra default para ofertas novas", async () => {
    expect(await pg.db.schema.withSchema("piv").hasTable("regra_pontuacao")).toBe(true);
    expect(await pg.db.schema.withSchema("piv").hasTable("subgrupo_avaliacao")).toBe(true);
    expect(await pg.db.schema.withSchema("piv").hasTable("regra_pontuacao_auditoria")).toBe(true);
    const c = await criarContextoPontuacao(pg.db);
    const oferta = await pg.db("piv.turma_disciplina").where({ id: c.ofertaId }).first();
    expect(oferta.regra_pontuacao_id).toBeNull();
    expect(oferta.pontuacao_vinculada_em).toBeNull();
    expect(await pg.db("piv.regra_pontuacao").where({ curso_id: c.cursoId, periodo_letivo_id: c.periodoId })).toEqual([]);
  });

  describe("precisão, finitude e sinal", () => {
    it.each(camposPonto)("rejeita três casas decimais em %s sem arredondar", async (campo) => {
      await rejeitaPonto(campo, "1.001");
    });

    it.each(camposPonto)("rejeita precisão textual excedente com zeros em %s", async (campo) => {
      const valor = campo === "total" ? "120.000" : campo === "orcamento" ? "72.000" : "1.000";
      await rejeitaPonto(campo, valor);
    });

    it.each(camposPonto.flatMap((campo) => ["NaN", "Infinity", "-Infinity"].map((valor) => ({ campo, valor }))))(
      "rejeita $valor em $campo", async ({ campo, valor }) => { await rejeitaPonto(campo, valor); },
    );

    it.each(camposPonto)("rejeita negativo em %s", async (campo) => { await rejeitaPonto(campo, "-0.01"); });

    it.each(["total", "orcamento", "maximo"] as const)("rejeita zero em %s", async (campo) => {
      await rejeitaPonto(campo, "0.00");
    });

    it("aceita nota zero, centésimos, máximo inclusivo e valores de auditoria opcionais", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f, { valor: "18.01" });
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId);
      expect((await pg.db("piv.nota").where({ id: notaId }).first()).valor).toBe("0.00");
      await pg.db("piv.nota").where({ id: notaId }).update({ valor: "18.01" });
      const auditoriaId = await auditarNota(pg.db, f, notaId, { valor_anterior: null, valor_novo: "18.01" });
      expect((await pg.db("piv.nota_auditoria").where({ id: auditoriaId }).first()).valor_anterior).toBeNull();
      expect((await pg.db("piv.nota").where({ id: notaId }).first()).valor).toBe("18.01");
    });

    it("conserva numeric sem typmod e não impõe teto acadêmico arbitrário", async () => {
      const total = "123456789012345678901234567890.12";
      const f = await criarPontuacaoFixture(pg.db, {
        totalPontos: total,
        subgrupos: [{ nome: "Livre", orcamento_pontos: total, modo_quantidade: "SEM_LIMITE", quantidade_fixa: null }],
      });
      const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f, { valor: total });
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId, { valor: total });
      const auditoriaId = await auditarNota(pg.db, f, notaId, { valor_novo: total });
      expect((await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first()).total_pontos).toBe(total);
      expect((await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first()).valor).toBe(total);
      expect((await pg.db("piv.nota_auditoria").where({ id: auditoriaId }).first()).valor_novo).toBe(total);
      const colunas = await pg.db.raw(`
        SELECT table_name, column_name, numeric_precision, numeric_scale
        FROM information_schema.columns WHERE table_schema = 'piv'
          AND ((table_name = 'regra_pontuacao' AND column_name = 'total_pontos')
            OR (table_name = 'subgrupo_avaliacao' AND column_name = 'orcamento_pontos')
            OR (table_name IN ('avaliacao', 'nota') AND column_name = 'valor')
            OR (table_name = 'nota_auditoria' AND column_name IN ('valor_anterior', 'valor_novo')))
      `);
      expect(colunas.rows).toHaveLength(6);
      for (const coluna of colunas.rows) {
        expect(coluna.numeric_precision).toBeNull();
        expect(coluna.numeric_scale).toBeNull();
      }
    });
  });

  describe("composição institucional", () => {
    it("mantém uma regra por curso/período e identifica nomes repetidos por UUID", async () => {
      const f = await criarPontuacaoFixture(pg.db, { subgrupos: [
        { nome: "Livre", orcamento_pontos: "60.00", modo_quantidade: "SEM_LIMITE", quantidade_fixa: null },
        { nome: "Livre", orcamento_pontos: "60.00", modo_quantidade: "FIXA", quantidade_fixa: 2 },
      ] });
      expect(new Set(f.subgrupos.map((s) => s.id)).size).toBe(2);
      await rejeitaSql((trx) => trx("piv.regra_pontuacao").insert({
        id: randomUUID(), curso_id: f.cursoId, periodo_letivo_id: f.periodoId, total_pontos: "120.00",
        origem: "CONFIGURADA", versao: 1, criada_por_usuario_id: f.usuarioId, atualizada_por_usuario_id: f.usuarioId,
      }), ["23505"]);
      const outra = await criarRegraPontuacao(pg.db, { ...f, periodoId: f.outroPeriodoId });
      expect(outra.regraId).not.toBe(f.regraId);
    });

    it("permite composição temporariamente divergente e valida a soma final exata", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      await pg.db.transaction(async (trx) => {
        await trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update({ orcamento_pontos: "70.00" });
        const parcial = await trx("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: f.regraId }).sum("orcamento_pontos as soma").first();
        expect(parcial?.soma).toBe("118.00");
        await trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[1].id }).update({ orcamento_pontos: "8.00" });
      });
      const final = await pg.db("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: f.regraId }).sum("orcamento_pontos as soma").first();
      expect(final?.soma).toBe("120.00");
    });

    it.each(["71.99", "72.01"])("rejeita soma divergente no commit com orçamento %s e desfaz toda a composição", async (valor) => {
      const f = await criarPontuacaoFixture(pg.db);
      await expect(pg.db.transaction(async (trx) => {
        await trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update({ orcamento_pontos: valor });
        await trx("piv.regra_pontuacao").where({ id: f.regraId }).update({ versao: 2 });
      })).rejects.toMatchObject({ code: "23514" });
      expect((await pg.db("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).first()).orcamento_pontos).toBe("72.00");
      expect((await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first()).versao).toBe(1);
    });

    it("valida também mudanças apenas do total e regras sem nenhum subgrupo no commit", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      await expect(pg.db.transaction(async (trx) => {
        await trx("piv.regra_pontuacao").where({ id: f.regraId }).update({ total_pontos: "120.01" });
      })).rejects.toMatchObject({ code: "23514" });
      await expect(pg.db.transaction(async (trx) => {
        await trx("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: f.regraId }).delete();
      })).rejects.toMatchObject({ code: "23514" });
      expect(await pg.db("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: f.regraId })).toHaveLength(3);
    });

    it("aceita composição exata em centésimos, sem arredondar a soma", async () => {
      const f = await criarPontuacaoFixture(pg.db, { totalPontos: "100.01", subgrupos: [
        { nome: "Parte A", orcamento_pontos: "60.00", modo_quantidade: "FIXA", quantidade_fixa: 1 },
        { nome: "Parte B", orcamento_pontos: "40.01", modo_quantidade: "SEM_LIMITE", quantidade_fixa: null },
      ] });
      expect((await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first()).total_pontos).toBe("100.01");
    });

    it.each([
      { modo_quantidade: "FIXA", quantidade_fixa: null },
      { modo_quantidade: "FIXA", quantidade_fixa: 0 },
      { modo_quantidade: "FIXA", quantidade_fixa: -1 },
      { modo_quantidade: "SEM_LIMITE", quantidade_fixa: 1 },
      { modo_quantidade: "DESCONHECIDA", quantidade_fixa: null },
    ])("rejeita quantidade incoerente $modo_quantidade/$quantidade_fixa", async (dados) => {
      const f = await criarPontuacaoFixture(pg.db);
      await rejeitaSql((trx) => trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update(dados));
    });

    it("rejeita nome vazio e impede trocar um subgrupo para outra regra", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const outra = await criarRegraPontuacao(pg.db, { ...f, periodoId: f.outroPeriodoId });
      await rejeitaSql((trx) => trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update({ nome: "   " }));
      await rejeitaSql((trx) => trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update({ regra_pontuacao_id: outra.regraId }));
    });
  });

  describe("orçamento, quantidade e regra da oferta", () => {
    it.each(["PROVA", "TPI", "TRABALHO"])("preserva o tipo histórico %s e aceita máximo variável sem normalização", async (tipo_avaliacao) => {
      const f = await criarPontuacaoFixture(pg.db);
      const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f, { tipo_avaliacao, valor: "18.01" });
      const avaliacao = await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first();
      expect(avaliacao.tipo_avaliacao).toBe(tipo_avaliacao);
      expect(avaliacao.valor).toBe("18.01");
    });

    it("exige configuração e subgrupo da regra do curso/período da oferta", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const semRegra = await criarContextoPontuacao(pg.db);
      await rejeitaSql((trx) => criarAvaliacaoPontuacao(trx, f, { turma_disciplina_id: semRegra.ofertaId }));
      const outra = await criarRegraPontuacao(pg.db, { ...f, periodoId: f.outroPeriodoId });
      await rejeitaSql((trx) => criarAvaliacaoPontuacao(trx, f, { subgrupo_id: outra.subgrupos[0].id }));
      await rejeitaSql((trx) => criarAvaliacaoPontuacao(trx, f, { subgrupo_id: null }));
    });

    it("aceita máximos desiguais e conserva saldos independentes por oferta", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      for (const ofertaId of [f.ofertaId, f.outraOfertaId]) {
        for (const valor of ["12.00", "18.00", "18.00", "24.00"]) {
          await criarAvaliacaoPontuacao(pg.db, f, { turma_disciplina_id: ofertaId, valor });
        }
      }
      const somas = await pg.db("piv.avaliacao").whereIn("turma_disciplina_id", [f.ofertaId, f.outraOfertaId])
        .groupBy("turma_disciplina_id").select("turma_disciplina_id").sum("valor as soma").count("id as quantidade");
      expect(somas).toHaveLength(2);
      for (const soma of somas) { expect(soma.soma).toBe("72.00"); expect(soma.quantidade).toBe("4"); }
    });

    it("rejeita uma quinta avaliação mesmo havendo saldo", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      for (let i = 0; i < 4; i++) await criarAvaliacaoPontuacao(pg.db, f, { valor: "1.00" });
      await rejeitaSql((trx) => criarAvaliacaoPontuacao(trx, f, { valor: "1.00" }));
      expect(await pg.db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId })).toHaveLength(4);
    });

    it("rejeita excedente de centésimo de orçamento mesmo abaixo da quantidade fixa", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      await criarAvaliacaoPontuacao(pg.db, f, { valor: "71.99" });
      await rejeitaSql((trx) => criarAvaliacaoPontuacao(trx, f, { valor: "0.02" }));
      await criarAvaliacaoPontuacao(pg.db, f, { valor: "0.01" });
      expect(await pg.db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId })).toHaveLength(2);
    });

    it("SEM_LIMITE admite quantidade livre e continua sujeito ao orçamento", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      for (let i = 0; i < 6; i++) await criarAvaliacaoPontuacao(pg.db, f, { subgrupo_id: f.subgrupos[2].id, valor: "7.00" });
      await rejeitaSql((trx) => criarAvaliacaoPontuacao(trx, f, { subgrupo_id: f.subgrupos[2].id, valor: "0.01" }));
      expect(await pg.db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId, subgrupo_id: f.subgrupos[2].id })).toHaveLength(6);
    });

    it("revalida agregados em edição e movimento, excluindo o próprio máximo anterior", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f, { valor: "18.00" });
      await pg.db("piv.avaliacao").where({ id: avaliacaoId }).update({ valor: "72.00" });
      await criarAvaliacaoPontuacao(pg.db, f, { turma_disciplina_id: f.outraOfertaId, valor: "1.00" });
      await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: avaliacaoId }).update({ turma_disciplina_id: f.outraOfertaId }));
      await pg.db("piv.avaliacao").where({ id: avaliacaoId }).update({ valor: "71.00", turma_disciplina_id: f.outraOfertaId });
      expect((await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first()).turma_disciplina_id).toBe(f.outraOfertaId);
      expect((await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first()).regra_pontuacao_id).toBe(f.regraId);
    });

    it("recuperação fica fora do orçamento, exige máximo igual ao total e é única por oferta", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const recuperacaoId = await criarAvaliacaoPontuacao(pg.db, f, { tipo_avaliacao: "RECUPERACAO", subgrupo_id: null, valor: "120.00" });
      await rejeitaSql((trx) => criarAvaliacaoPontuacao(trx, f, { tipo_avaliacao: "RECUPERACAO", subgrupo_id: null, valor: "120.00" }), ["23505"]);
      await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: recuperacaoId }).update({ valor: "100.00" }));
      await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: recuperacaoId }).update({ subgrupo_id: f.subgrupos[0].id }));
      await criarAvaliacaoPontuacao(pg.db, f, { valor: "72.00" });
      expect(await pg.db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId })).toHaveLength(2);
    });
  });

  describe("primeiros marcadores e preservação", () => {
    it("fixa regra e momento no primeiro uso e não esquece o uso após excluir a avaliação sem nota", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const regra = await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first();
      const oferta = await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first();
      expect(regra.usada_em).toBeTruthy();
      expect(oferta.regra_pontuacao_id).toBe(f.regraId);
      expect(oferta.pontuacao_vinculada_em).toBeTruthy();
      await pg.db("piv.avaliacao").where({ id: avaliacaoId }).delete();
      expect((await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first()).usada_em).toEqual(regra.usada_em);
      expect((await pg.db("piv.turma_disciplina").where({ id: f.ofertaId }).first()).pontuacao_vinculada_em).toEqual(oferta.pontuacao_vinculada_em);
      await rejeitaSql((trx) => trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update({ nome: "Nome alterado" }));
    });

    it.each([null, "2000-01-01T00:00:00Z"])("impede limpar ou trocar usada_em para %s", async (usada_em) => {
      const f = await criarPontuacaoFixture(pg.db); await criarAvaliacaoPontuacao(pg.db, f);
      await rejeitaSql((trx) => trx("piv.regra_pontuacao").where({ id: f.regraId }).update({ usada_em }));
    });

    it.each([null, "2000-01-01T00:00:00Z"])("impede limpar ou trocar pontuacao_vinculada_em para %s", async (pontuacao_vinculada_em) => {
      const f = await criarPontuacaoFixture(pg.db); await criarAvaliacaoPontuacao(pg.db, f);
      await rejeitaSql((trx) => trx("piv.turma_disciplina").where({ id: f.ofertaId }).update({ pontuacao_vinculada_em }));
    });

    it("rejeita troca/limpeza da regra vinculada e referências parcialmente preenchidas", async () => {
      const f = await criarPontuacaoFixture(pg.db); await criarAvaliacaoPontuacao(pg.db, f);
      const outra = await criarRegraPontuacao(pg.db, { ...f, periodoId: f.outroPeriodoId });
      for (const regra_pontuacao_id of [null, outra.regraId]) {
        await rejeitaSql((trx) => trx("piv.turma_disciplina").where({ id: f.ofertaId }).update({ regra_pontuacao_id }));
      }
      await rejeitaSql((trx) => trx("piv.turma_disciplina").where({ id: f.outraOfertaId }).update({ regra_pontuacao_id: f.regraId }));
      await rejeitaSql((trx) => trx("piv.turma_disciplina").where({ id: f.outraOfertaId }).update({ pontuacao_vinculada_em: "2026-09-28T12:00:00Z" }));
    });

    it("bloqueia total e todas as operações da composição após uso", async () => {
      const f = await criarPontuacaoFixture(pg.db); await criarAvaliacaoPontuacao(pg.db, f);
      await rejeitaSql(async (trx) => {
        await trx("piv.regra_pontuacao").where({ id: f.regraId }).update({ total_pontos: "121.00" });
        await trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update({ orcamento_pontos: "73.00" });
      });
      await rejeitaSql((trx) => trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).delete());
      await rejeitaSql((trx) => trx("piv.subgrupo_avaliacao").insert({
        id: randomUUID(), regra_pontuacao_id: f.regraId, nome: "Novo", orcamento_pontos: "1.00",
        modo_quantidade: "SEM_LIMITE", quantidade_fixa: null, ordem: 3,
      }));
    });

    it("preserva quantidade, modo, ordem e distribuição mesmo se a composição nova também seria válida", async () => {
      const f = await criarPontuacaoFixture(pg.db); await criarAvaliacaoPontuacao(pg.db, f);
      for (const dados of [
        { quantidade_fixa: 5 }, { modo_quantidade: "SEM_LIMITE", quantidade_fixa: null }, { ordem: 4 },
      ]) await rejeitaSql((trx) => trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update(dados));
      await rejeitaSql(async (trx) => {
        await trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).update({ orcamento_pontos: "73.00" });
        await trx("piv.subgrupo_avaliacao").where({ id: f.subgrupos[1].id }).update({ orcamento_pontos: "5.00" });
      });
      expect((await pg.db("piv.subgrupo_avaliacao").where({ id: f.subgrupos[0].id }).first()).quantidade_fixa).toBe(4);
    });

    it("fixa primeira_nota_em com zero e preserva o marcador na retificação", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId);
      const antes = await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first();
      expect(antes.primeira_nota_em).toBeTruthy();
      await pg.db("piv.nota").where({ id: notaId }).update({ valor: "18.00" });
      expect((await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first()).primeira_nota_em).toEqual(antes.primeira_nota_em);
      await pg.db("piv.avaliacao").where({ id: avaliacaoId }).update({ descricao_avaliacao: "Descrição corrigida", data_devolucao: "2026-10-02" });
      expect((await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first()).descricao_avaliacao).toBe("Descrição corrigida");
    });

    it.each([null, "2000-01-01T00:00:00Z"])("impede limpar ou trocar primeira_nota_em para %s", async (primeira_nota_em) => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      await criarNotaPontuacao(pg.db, f, avaliacaoId);
      await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: avaliacaoId }).update({ primeira_nota_em }));
    });

    it("bloqueia máximo, subgrupo, oferta, finalidade e exclusão desde a primeira nota zero", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId);
      for (const dados of [
        { valor: "19.00" }, { subgrupo_id: f.subgrupos[2].id },
        { turma_disciplina_id: f.outraOfertaId }, { tipo_avaliacao: "PROVA" },
      ]) await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: avaliacaoId }).update(dados));
      await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: avaliacaoId }).delete());
      expect((await pg.db("piv.nota").where({ id: notaId }).first()).valor).toBe("0.00");
    });

    it("não libera estrutura se uma tentativa alternativa de excluir a nota ocorrer", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId);
      const marcador = (await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first()).primeira_nota_em;
      // O banco pode proibir a exclusão ou permiti-la sem esquecer o primeiro uso.
      try { await pg.db.transaction((trx) => trx("piv.nota").where({ id: notaId }).delete()); }
      catch (erro) { expect(["23503", "23514"]).toContain((erro as { code?: string }).code); }
      expect(marcador).toBeTruthy();
      expect((await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first()).primeira_nota_em).toEqual(marcador);
      await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: avaliacaoId }).update({ valor: "19.00" }));
    });
  });

  describe("faixa, vínculos e recuperação da nota", () => {
    it("rejeita nota acima do máximo sem gravar nota ou primeiro marcador", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      await rejeitaSql((trx) => criarNotaPontuacao(trx, f, avaliacaoId, { valor: "18.01" }));
      expect(await pg.db("piv.nota").where({ avaliacao_id: avaliacaoId })).toEqual([]);
      expect((await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first()).primeira_nota_em).toBeNull();
    });

    it("exige matrícula da mesma oferta e mantém UNIQUE avaliação/matrícula", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      await rejeitaSql((trx) => criarNotaPontuacao(trx, f, avaliacaoId, { matricula_turma_disciplina_id: f.outraMatriculaDisciplinaId }));
      await criarNotaPontuacao(pg.db, f, avaliacaoId);
      await rejeitaSql((trx) => criarNotaPontuacao(trx, f, avaliacaoId), ["23505"]);
    });

    it.each(["vinculo", "matricula"] as const)("rejeita lançamento quando %s está inativo", async (alvo) => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const tabela = alvo === "vinculo" ? "piv.matricula_turma_disciplina" : "piv.matricula";
      const id = alvo === "vinculo" ? f.matriculaDisciplinaId : f.matriculaId;
      await pg.db(tabela).where({ id }).update({ status: "cancelada" });
      await rejeitaSql((trx) => criarNotaPontuacao(trx, f, avaliacaoId));
    });

    it("impede transferir uma nota já lançada para outra avaliação", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const primeira = await criarAvaliacaoPontuacao(pg.db, f); const segunda = await criarAvaliacaoPontuacao(pg.db, f);
      const notaId = await criarNotaPontuacao(pg.db, f, primeira);
      await rejeitaSql((trx) => trx("piv.nota").where({ id: notaId }).update({ avaliacao_id: segunda }));
      await rejeitaSql((trx) => trx("piv.nota").where({ id: notaId }).update({ matricula_turma_disciplina_id: f.outraMatriculaDisciplinaId }));
    });

    it("aplica o máximo real da recuperação a aluno com etapa regular completa e nota abaixo do corte", async () => {
      const f = await criarPontuacaoFixture(pg.db); await prepararRegularCompleto(f);
      const recuperacaoId = await criarAvaliacaoPontuacao(pg.db, f, { tipo_avaliacao: "RECUPERACAO", subgrupo_id: null, valor: "120.00" });
      await rejeitaSql((trx) => criarNotaPontuacao(trx, f, recuperacaoId, { valor: "120.01" }));
      const notaId = await criarNotaPontuacao(pg.db, f, recuperacaoId, { valor: "120.00" });
      expect((await pg.db("piv.nota").where({ id: notaId }).first()).valor).toBe("120.00");
    });

    it("recusa recuperação se o plano ou o lançamento regular ainda estiver incompleto", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const regular = await criarAvaliacaoPontuacao(pg.db, f);
      await criarNotaPontuacao(pg.db, f, regular);
      const rec = await criarAvaliacaoPontuacao(pg.db, f, { tipo_avaliacao: "RECUPERACAO", subgrupo_id: null, valor: "120.00" });
      await rejeitaSql((trx) => criarNotaPontuacao(trx, f, rec));
      for (const [subgrupo, valor] of [[0, "12.00"], [0, "18.00"], [0, "24.00"], [1, "6.00"], [2, "42.00"]] as const) {
        await criarAvaliacaoPontuacao(pg.db, f, { subgrupo_id: f.subgrupos[subgrupo].id, valor });
      }
      await rejeitaSql((trx) => criarNotaPontuacao(trx, f, rec));
      expect((await pg.db("piv.avaliacao").where({ id: rec }).first()).primeira_nota_em).toBeNull();
    });

    it("recusa recuperação no corte exato de 60%", async () => {
      const f = await criarPontuacaoFixture(pg.db); await prepararRegularCompleto(f);
      const regulares = await pg.db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId, subgrupo_id: f.subgrupos[0].id });
      for (const avaliacao of regulares) {
        await pg.db("piv.nota").where({ avaliacao_id: avaliacao.id, matricula_turma_disciplina_id: f.matriculaDisciplinaId }).update({ valor: avaliacao.valor });
      }
      const rec = await criarAvaliacaoPontuacao(pg.db, f, { tipo_avaliacao: "RECUPERACAO", subgrupo_id: null, valor: "120.00" });
      await rejeitaSql((trx) => criarNotaPontuacao(trx, f, rec));
    });

    it("período encerrado bloqueia avaliação, lançamento e retificação", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId);
      await pg.db("piv.periodo_letivo").where({ id: f.periodoId }).update({ status: "encerrado" });
      await rejeitaSql((trx) => criarAvaliacaoPontuacao(trx, f));
      await rejeitaSql((trx) => trx("piv.nota").where({ id: notaId }).update({ valor: "1.00" }));
      await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: avaliacaoId }).update({ descricao_avaliacao: "Novo texto" }));
    });

    it("preserva publicação e registro da nota contra exclusão direta", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId);
      await rejeitaSql((trx) => trx("piv.nota").where({ id: notaId }).update({ publicada_em: "2000-01-01T00:00:00Z" }));
      await rejeitaSql((trx) => trx("piv.nota").where({ id: notaId }).delete());
      expect(await pg.db("piv.nota").where({ id: notaId })).toHaveLength(1);
    });

    it("recusa escrita em snapshot antigo sem relaxar os agregados", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      await expect(pg.db.transaction((trx) => criarAvaliacaoPontuacao(trx, f), {
        isolationLevel: "repeatable read",
      })).rejects.toMatchObject({ code: "23514" });
      expect(await pg.db("piv.avaliacao").where({ turma_disciplina_id: f.ofertaId })).toEqual([]);
    });

    it("bloqueia retorno após escritas incompatíveis mantendo dados e guards", async () => {
      const f = await criarPontuacaoFixture(pg.db);
      const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      for (const retornar of [retornarGuards, retornarExpansao]) {
        await expect(pg.db.transaction((trx) => retornar(trx))).rejects.toThrow("RETORNO_INCOMPATIVEL");
      }
      expect((await pg.db("piv.avaliacao").where({ id: avaliacaoId }).first()).valor).toBe("18.00");
      await rejeitaSql((trx) => trx("piv.regra_pontuacao").where({ id: f.regraId }).update({ usada_em: null }));
    });
  });

  describe("pais e histórico", () => {
    it("impede reinterpretar uma oferta usada por mudanças indiretas em turma ou matriz", async () => {
      const f = await criarPontuacaoFixture(pg.db); await criarAvaliacaoPontuacao(pg.db, f);
      for (const dados of [{ curso_id: f.outroCursoId }, { periodo_letivo_id: f.outroPeriodoId }]) {
        await rejeitaSql((trx) => trx("piv.turma").where({ id: f.turmaId }).update(dados));
      }
      for (const dados of [{ curso_id: f.outroCursoId }, { disciplina_id: f.outraDisciplinaId }]) {
        await rejeitaSql((trx) => trx("piv.curso_disciplina").where({ id: f.cursoDisciplinaId }).update(dados));
      }
      await rejeitaSql((trx) => trx("piv.turma_disciplina").where({ id: f.ofertaId }).update({ curso_disciplina_id: f.outroCursoDisciplinaId }));
    });

    it("impede trocar vínculos decisivos de matrícula com nota existente", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      await criarNotaPontuacao(pg.db, f, avaliacaoId);
      for (const dados of [{ turma_disciplina_id: f.outraOfertaId }, { matricula_id: f.outraMatriculaId }]) {
        await rejeitaSql((trx) => trx("piv.matricula_turma_disciplina").where({ id: f.matriculaDisciplinaId }).update(dados));
      }
      await rejeitaSql((trx) => trx("piv.matricula").where({ id: f.matriculaId }).update({ curso_id: f.outroCursoId }));
    });

    it("instala RESTRICT nos caminhos que antes apagavam notas/auditorias por cascata", async () => {
      const caminhos = [
        ["turma_disciplina", "turma_id"], ["avaliacao", "turma_disciplina_id"],
        ["matricula_turma_disciplina", "turma_disciplina_id"], ["matricula_turma_disciplina", "matricula_id"],
        ["nota", "avaliacao_id"], ["nota", "matricula_turma_disciplina_id"], ["nota_auditoria", "nota_id"],
        ["nota_autorizacao_excepcional", "avaliacao_id"], ["nota_autorizacao_excepcional", "matricula_turma_disciplina_id"],
      ];
      for (const [tabela, coluna] of caminhos) {
        const resultado = await pg.db.raw(`
          SELECT c.confdeltype FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
          WHERE c.contype = 'f' AND n.nspname = 'piv' AND t.relname = ? AND a.attname = ?
        `, [tabela, coluna]);
        expect(resultado.rows, `${tabela}.${coluna}`).toEqual([{ confdeltype: "r" }]);
      }
    });

    it("rejeita exclusões de toda a cadeia com nota auditada e conserva os registros", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId); const auditoriaId = await auditarNota(pg.db, f, notaId);
      for (const [tabela, id] of [
        ["nota", notaId], ["avaliacao", avaliacaoId], ["matricula_turma_disciplina", f.matriculaDisciplinaId],
        ["matricula", f.matriculaId], ["turma_disciplina", f.ofertaId], ["turma", f.turmaId],
        ["curso_disciplina", f.cursoDisciplinaId], ["curso", f.cursoId], ["periodo_letivo", f.periodoId], ["aluno", f.alunoId],
      ]) await rejeitaSql((trx) => trx(`piv.${tabela}`).where({ id }).delete(), ["23503", "23514"]);
      expect(await pg.db("piv.nota").where({ id: notaId })).toHaveLength(1);
      expect(await pg.db("piv.nota_auditoria").where({ id: auditoriaId })).toHaveLength(1);
    });

    it("não permite excluir oferta vinculada mesmo após remover a última avaliação sem nota", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      await pg.db("piv.avaliacao").where({ id: avaliacaoId }).delete();
      await rejeitaSql((trx) => trx("piv.turma_disciplina").where({ id: f.ofertaId }).delete(), ["23503", "23514"]);
      expect((await pg.db("piv.regra_pontuacao").where({ id: f.regraId }).first()).usada_em).toBeTruthy();
    });

    it("preserva a autorização excepcional ao tentar excluir sua avaliação", async () => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const autorizacaoId = randomUUID();
      await pg.db("piv.nota_autorizacao_excepcional").insert({
        id: autorizacaoId, avaliacao_id: avaliacaoId, matricula_turma_disciplina_id: f.matriculaDisciplinaId,
        motivo: "Fixture de preservação", autorizada_por_usuario_id: f.usuarioId, expira_em: "2027-01-01T00:00:00Z",
      });
      await rejeitaSql((trx) => trx("piv.avaliacao").where({ id: avaliacaoId }).delete(), ["23503", "23514"]);
      expect(await pg.db("piv.nota_autorizacao_excepcional").where({ id: autorizacaoId })).toHaveLength(1);
    });

    it.each(["UPDATE", "DELETE", "TRUNCATE"] as const)("nota_auditoria é append-only contra %s", async (acao) => {
      const f = await criarPontuacaoFixture(pg.db); const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, f);
      const notaId = await criarNotaPontuacao(pg.db, f, avaliacaoId); const auditoriaId = await auditarNota(pg.db, f, notaId);
      await rejeitaSql((trx) => acao === "TRUNCATE" ? trx.raw("TRUNCATE piv.nota_auditoria")
        : acao === "DELETE" ? trx("piv.nota_auditoria").where({ id: auditoriaId }).delete()
        : trx("piv.nota_auditoria").where({ id: auditoriaId }).update({ motivo: "Histórico alterado" }));
      expect((await pg.db("piv.nota_auditoria").where({ id: auditoriaId }).first()).motivo).toBe("Fixture de integridade");
    });

    it.each(["UPDATE", "DELETE", "TRUNCATE"] as const)("regra_pontuacao_auditoria é append-only contra %s", async (acao) => {
      const f = await criarPontuacaoFixture(pg.db); const auditoriaId = await auditarRegra(f);
      await rejeitaSql((trx) => acao === "TRUNCATE" ? trx.raw("TRUNCATE piv.regra_pontuacao_auditoria")
        : acao === "DELETE" ? trx("piv.regra_pontuacao_auditoria").where({ id: auditoriaId }).delete()
        : trx("piv.regra_pontuacao_auditoria").where({ id: auditoriaId }).update({ novo: { totalPontos: "300.00" } }));
      expect((await pg.db("piv.regra_pontuacao_auditoria").where({ id: auditoriaId }).first()).novo).toEqual({ totalPontos: "120.00" });
    });
  });
});
