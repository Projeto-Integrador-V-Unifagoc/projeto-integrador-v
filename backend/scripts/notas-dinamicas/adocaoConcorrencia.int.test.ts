import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { startPgIntegration, type PgIntegration } from "../../src/test-helpers/pgIntegration";
import { criarHistoricoPontuacao } from "../../src/test-helpers/historicoPontuacao";
import { disputarComBloqueioAcademico } from "../../src/test-helpers/disputaAcademica";
import { fonteMigrationsPontuacao } from "./retorno";

let pg: PgIntegration | undefined;
afterEach(async () => { try { await pg?.stop(); } finally { pg = undefined; } });

describe("adoção - controle real de escritores antes da descoberta/replay", () => {
  it("espera o escritor em andamento e bloqueia adoção após regular50→70 com REC80", async () => {
    pg = await startPgIntegration({ fronteiraExpandida: true });
    const db = pg.db; const fixture = await criarHistoricoPontuacao(db, "recuperacao");
    const { fonte } = await fonteMigrationsPontuacao();
    const disputa = await disputarComBloqueioAcademico(db, async (trx) => {
      await trx("piv.nota").where({ id: fixture.notaIds[0] }).update({ valor: "20.00" });
      await trx("piv.nota_auditoria").insert({ nota_id: fixture.notaIds[0], usuario_id: fixture.usuarioId,
        perfil: "secretaria", acao: "RETIFICACAO", valor_anterior: "0.00", valor_novo: "20.00",
        motivo: "Retificação sintética durante a transição", criado_em: trx.raw("clock_timestamp()") });
    }, [() => db.migrate.latest({ migrationSource: fonte, tableName: "knex_migrations", schemaName: "public" })]);
    expect(disputa.bloqueios).toHaveLength(1);
    expect(disputa.bloqueios[0].tiposLock).toContain("relation");
    expect(disputa.resultados[0].status).toBe("rejected");
    if (disputa.resultados[0].status === "rejected") expect(disputa.resultados[0].reason.message).toMatch(/HISTORICO_INCOMPATIVEL/);
    expect((await db("piv.nota").where({ id: fixture.notaIds[0] }).first()).valor).toBe("20.00");
    expect(await db("piv.regra_pontuacao")).toEqual([]);
    expect(await db("public.knex_migrations")).toHaveLength(14);
  });

  it("INSERT de nova oferta aguarda o controle de tabelas e nasce após adoção sem regra default", async () => {
    pg = await startPgIntegration({ fronteiraExpandida: true });
    const db = pg.db; const fixture = await criarHistoricoPontuacao(db, "completo");
    const { fonte } = await fonteMigrationsPontuacao();
    const turma = await db("piv.turma").where({ id: fixture.turmaId }).first();
    const professorId = (await db("piv.turma_disciplina").where({ id: fixture.ofertaId }).first()).professor_id;
    const turmaId = randomUUID(); const ofertaId = randomUUID();
    const disputa = await disputarComBloqueioAcademico(db, async (trx) => {
      await trx.migrate.latest({ migrationSource: fonte, tableName: "knex_migrations", schemaName: "public", disableTransactions: true });
    }, [() => db.transaction(async (trx) => {
      await trx("piv.turma").insert({ ...turma, id: turmaId, sigla: turmaId });
      await trx("piv.turma_disciplina").insert({ id: ofertaId, turma_id: turmaId,
        curso_disciplina_id: fixture.cursoDisciplinaId, professor_id: professorId, status: "ativa" });
    })], { aposComprovarBloqueio: async (bloqueios) => {
      const { rows } = await db.raw(`SELECT mode FROM pg_locks l JOIN pg_class c ON c.oid=l.relation
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='piv' AND c.relname='turma'
          AND l.granted AND l.pid=ANY(?)`, [bloqueios[0].bloqueadores]);
      expect(rows.map((r: any) => r.mode)).toContain("ShareRowExclusiveLock");
    } });
    expect(disputa.bloqueios[0].tiposLock).toContain("relation");
    expect(disputa.resultados[0].status).toBe("fulfilled");
    expect((await db("piv.turma_disciplina").where({ id: ofertaId }).first()).regra_pontuacao_id).toBeNull();
    expect((await db("piv.turma_disciplina").where({ id: fixture.ofertaId }).first()).regra_pontuacao_id).not.toBeNull();
    expect(await db("public.knex_migrations")).toHaveLength(16);
  });
});
