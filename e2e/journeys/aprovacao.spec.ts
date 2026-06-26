import { test, expect } from "../fixtures/test.js";
import { criarPlano100, lancarNotaLote, registrarChamada, datasRecentes } from "../helpers/dominio.js";

/**
 * E2E-J01 — Aprovação direta (spec §10). A jornada autoritativa (notas +
 * frequência, que implementam a regra §9) deve passar de ponta a ponta. A
 * coerência em ficha é verificada à parte e está sujeita ao defeito §17.1.
 */
test.describe("E2E-J01 Aprovação direta @journey", () => {
  test("aluno com 100 pontos e 100% de presença é APROVADO em todas as leituras autoritativas", async ({
    novoCenario,
  }) => {
    const cenario = await novoCenario();
    const { aluno, apiAluno } = await cenario.matricularAluno();

    // 7. Professor cria avaliações totalizando 100 pontos.
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);

    // 8. Professor lança notas cheias (100% dos pontos).
    for (const provaId of plano.provas) {
      const r = await lancarNotaLote(cenario.apiProfessor, provaId, [{ alunoId: aluno.id, valor: 20 }]);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
    }
    expect((await lancarNotaLote(cenario.apiProfessor, plano.tpi, [{ alunoId: aluno.id, valor: 5 }])).status).toBe(200);
    expect((await lancarNotaLote(cenario.apiProfessor, plano.trabalho, [{ alunoId: aluno.id, valor: 35 }])).status).toBe(200);

    // 9. Professor registra frequência de 100% (5 aulas, todas presentes).
    for (const data of datasRecentes(5)) {
      const chamada = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
        { alunoId: aluno.id, status: "PRESENTE" },
      ]);
      expect([200, 201], JSON.stringify(chamada.body)).toContain(chamada.status);
    }

    // 10. Aluno acessa o próprio boletim — APROVADO com média final 100.
    const boletim = await apiAluno.get("/notas/me");
    expect(boletim.status).toBe(200);
    const disciplina = boletim.body.disciplinas[0];
    expect(disciplina.situacao).toBe("APROVADO");
    expect(disciplina.etapaRegularCompleta).toBe(true);
    expect(disciplina.mediaFinal).toBe(100);

    // 10b. Aluno acessa a própria frequência — REGULAR, 100%.
    const minhaFreq = await apiAluno.get("/frequencias/minha");
    expect(minhaFreq.status).toBe(200);
    const consolidado = minhaFreq.body.consolidado[0];
    expect(consolidado.percentual).toBe(100);
    expect(consolidado.situacao).toBe("REGULAR");

    // 11. Secretaria consulta o rendimento da turma — aluno APROVADO.
    const rendimento = await cenario.apiSecretaria.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`,
    );
    expect(rendimento.status).toBe(200);
    const linhaAluno = rendimento.body.alunos.find((a: any) => a.alunoId === aluno.id);
    expect(linhaAluno.situacao).toBe("APROVADO");
    expect(linhaAluno.mediaFinal).toBe(100);

    // 11b. Ficha consolidada deve existir e trazer a matrícula do aluno.
    const ficha = await cenario.apiSecretaria.get(`/alunos/${aluno.id}/ficha`);
    expect(ficha.status).toBe(200);
    expect(ficha.body.aluno).toBeTruthy();
    expect(Array.isArray(ficha.body.matriculas)).toBe(true);
  });
});
