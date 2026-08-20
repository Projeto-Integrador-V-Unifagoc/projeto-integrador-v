import { test, expect } from "../fixtures/test.js";
import { db } from "../helpers/db.js";
import { criarPlano100, lancarNotaLote, registrarChamada, datasRecentes } from "../helpers/dominio.js";

/**
 * Auditoria (spec §12.3). Lançamentos e alterações de nota e frequência geram
 * registros de auditoria com usuário, perfil, ação e dados.
 */
test.describe("Auditoria @integrity", () => {
  test("lançamento e correção de nota geram nota_auditoria", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [{ alunoId: aluno.id, valor: 10 }]);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [{ alunoId: aluno.id, valor: 18 }]);

    const nota = await db()("piv.nota").where({ avaliacao_id: plano.provas[0] }).first();
    expect(nota).toBeTruthy();
    const auditorias = await db()("piv.nota_auditoria").where({ nota_id: nota.id }).orderBy("criado_em");
    expect(auditorias.length).toBeGreaterThanOrEqual(2);
    for (const a of auditorias) {
      expect(a.usuario_id).toBeTruthy();
      expect(a.perfil).toBeTruthy();
      expect(a.acao).toBeTruthy();
    }
    // O valor novo da última auditoria reflete a correção (18).
    expect(Number(auditorias[auditorias.length - 1].valor_novo)).toBe(18);
  });

  test("lançamento de frequência gera frequencia_auditoria", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const [data] = datasRecentes(1);
    const chamada = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: aluno.id, status: "PRESENTE" },
    ]);
    const frequenciaId = chamada.body.registros[0].id;
    const auditorias = await db()("piv.frequencia_auditoria").where({ frequencia_id: frequenciaId });
    expect(auditorias.length).toBeGreaterThanOrEqual(1);
    const a = auditorias[0];
    expect(a.usuario_id).toBeTruthy();
    expect(a.perfil).toBe("professor");
    expect(a.acao).toBeTruthy();
    expect(a.dados_novos).toBeTruthy();
  });

  test("autorização excepcional é registrada com motivo e validade", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    const resp = await cenario.apiSecretaria.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: plano.provas[0], motivo: "Retificação autorizada pela coordenação." },
    });
    expect(resp.status).toBe(201);
    const registro = await db()("piv.nota_autorizacao_excepcional").where({ avaliacao_id: plano.provas[0] }).first();
    expect(registro).toBeTruthy();
    expect(registro.motivo).toContain("Retificação");
    expect(registro.expira_em).toBeTruthy();
    expect(registro.autorizada_por_usuario_id).toBeTruthy();
  });
});
