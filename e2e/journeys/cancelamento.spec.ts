import { test, expect } from "../fixtures/test.js";
import { criarPlano100, lancarNotaLote, registrarChamada, datasRecentes } from "../helpers/dominio.js";
import { db, fecharDb } from "../helpers/db.js";
test.afterAll(fecharDb);

/**
 * E2E-J06 — Cancelamento/trancamento (spec §10). Cancelar remove o aluno das
 * próximas grades de lançamento sem apagar histórico/auditoria; recancelar
 * conflita.
 */
test.describe("E2E-J06 Cancelamento @journey", () => {
  test("cancelamento retira das grades e preserva histórico; recancelar retorna 409", async ({
    novoCenario,
  }) => {
    const cenario = await novoCenario({ regraPontuacao: "100" });
    const { aluno, matriculaId } = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);

    // Lança ao menos uma nota e uma frequência.
    expect((await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [{ alunoId: aluno.id, valor: "15.00" }])).status).toBe(200);
    const [data] = datasRecentes(1);
    await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: aluno.id, status: "PRESENTE" },
    ]);

    const mtd = await db()("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "mtd.matricula_id", "m.id")
      .where("m.aluno_id", aluno.id)
      .first("mtd.id");
    const mtdId = String(mtd.id);
    const notasAntes = Number(
      (await db()("piv.nota").where({ matricula_turma_disciplina_id: mtdId }).count("* as c").first())?.c ?? 0,
    );
    const freqAntes = Number(
      (await db()("piv.frequencia").where({ matricula_turma_disciplina_id: mtdId }).count("* as c").first())?.c ?? 0,
    );
    expect(notasAntes).toBeGreaterThanOrEqual(1);
    expect(freqAntes).toBeGreaterThanOrEqual(1);

    // 3. Cancela a matrícula.
    const cancel = await cenario.apiSecretaria.patch(`/matriculas/${matriculaId}/cancelar`);
    expect(cancel.status, JSON.stringify(cancel.body)).toBe(200);

    // 4. Aluno sai das próximas grades de lançamento.
    const grade = await cenario.apiProfessor.get(`/notas/avaliacoes/${plano.provas[0]}/lancamento`);
    expect(grade.body.alunos.some((a: any) => a.alunoId === aluno.id)).toBe(false);

    // 5. Histórico e auditoria preservados.
    const notasDepois = Number(
      (await db()("piv.nota").where({ matricula_turma_disciplina_id: mtdId }).count("* as c").first())?.c ?? 0,
    );
    const freqDepois = Number(
      (await db()("piv.frequencia").where({ matricula_turma_disciplina_id: mtdId }).count("* as c").first())?.c ?? 0,
    );
    expect(notasDepois).toBe(notasAntes);
    expect(freqDepois).toBe(freqAntes);

    // 6. Recancelar gera conflito, sem efeitos adicionais.
    const recancel = await cenario.apiSecretaria.patch(`/matriculas/${matriculaId}/cancelar`);
    expect(recancel.status).toBe(409);
  });
});
