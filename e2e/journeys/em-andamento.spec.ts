import { test, expect } from "../fixtures/test.js";
import { criarPlano100, lancarNotaLote, registrarChamada, datasRecentes } from "../helpers/dominio.js";

/**
 * E2E-J05 — Aluno ainda em andamento (spec §10, §9.4). Plano incompleto e
 * frequência parcial não podem classificar o aluno como aprovado nem reprovado.
 */
test.describe("E2E-J05 Em andamento @journey", () => {
  test("plano e frequência parciais não geram classificação prematura", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno, apiAluno } = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);

    // Apenas 2 das 5 avaliações são lançadas — etapa regular incompleta.
    await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [{ alunoId: aluno.id, valor: 18 }]);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[1], [{ alunoId: aluno.id, valor: 16 }]);

    // Frequência parcial (uma aula).
    const [data] = datasRecentes(1);
    await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: aluno.id, status: "PRESENTE" },
    ]);

    const boletim = await apiAluno.get("/notas/me");
    const disciplina = boletim.body.disciplinas[0];
    expect(disciplina.etapaRegularCompleta).toBe(false);
    expect(disciplina.situacao).toBe("EM_ANDAMENTO");
    expect(["APROVADO", "REPROVADO", "EM_RECUPERACAO"]).not.toContain(disciplina.situacao);

    const rendimento = await cenario.apiProfessor.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`,
    );
    const linha = rendimento.body.alunos.find((a: any) => a.alunoId === aluno.id);
    expect(linha.situacao).toBe("EM_ANDAMENTO");
    expect(linha.elegivelRecuperacao).toBe(false);
  });
});
