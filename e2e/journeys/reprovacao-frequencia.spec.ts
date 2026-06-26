import { test, expect } from "../fixtures/test.js";
import { criarPlano100, lancarNotaLote, registrarChamada, datasRecentes } from "../helpers/dominio.js";

/**
 * E2E-J04 — Reprovação por frequência (spec §10, §9.3). Nota suficiente não pode
 * mascarar frequência < 75%. A justificativa não altera o percentual.
 */
test.describe("E2E-J04 Reprovação por frequência @journey", () => {
  test("nota alta com frequência < 75% mantém risco; justificativa não muda o percentual", async ({
    novoCenario,
  }) => {
    const cenario = await novoCenario();
    const { aluno, apiAluno } = await cenario.matricularAluno();

    // Nota final >= 60 (plano cheio).
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [{ alunoId: aluno.id, valor: 20 }]);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[1], [{ alunoId: aluno.id, valor: 20 }]);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[2], [{ alunoId: aluno.id, valor: 20 }]);
    await lancarNotaLote(cenario.apiProfessor, plano.tpi, [{ alunoId: aluno.id, valor: 5 }]);
    await lancarNotaLote(cenario.apiProfessor, plano.trabalho, [{ alunoId: aluno.id, valor: 35 }]);

    // Frequência 50% (2 presenças, 2 ausências).
    const datas = datasRecentes(4);
    const statuses: Array<"PRESENTE" | "AUSENTE"> = ["PRESENTE", "PRESENTE", "AUSENTE", "AUSENTE"];
    let registroAusenteId = "";
    for (let i = 0; i < datas.length; i++) {
      const chamada = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, datas[i], [
        { alunoId: aluno.id, status: statuses[i] },
      ]);
      expect([200, 201]).toContain(chamada.status);
      if (statuses[i] === "AUSENTE") registroAusenteId = chamada.body.registros[0].id;
    }

    // Nota aprova, mas frequência reprova: as duas leituras autoritativas divergem
    // em situação, e nenhuma "mascara" a outra (§9.4 ainda não materializada — §17.2).
    const rendimento = await cenario.apiProfessor.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`,
    );
    expect(rendimento.body.alunos.find((a: any) => a.alunoId === aluno.id).situacao).toBe("APROVADO");

    const freq = await apiAluno.get("/frequencias/minha");
    const consolidado = freq.body.consolidado[0];
    expect(consolidado.percentual).toBe(50);
    expect(consolidado.situacao).toBe("RISCO_REPROVACAO");

    // Relatório de frequência da turma lista o aluno em risco.
    const turma = await cenario.apiProfessor.get(`/frequencias/turma/${cenario.turmaDisciplinaId}`);
    expect(turma.status).toBe(200);
    expect(turma.body.alunosEmRisco.some((a: any) => a.alunoId === aluno.id)).toBe(true);

    // 4. Justificativa da ausência (pelo próprio aluno) não altera o percentual.
    expect(registroAusenteId).toBeTruthy();
    const justificativa = await apiAluno.post(`/frequencias/${registroAusenteId}/justificativa`, {
      body: { motivo: "Atestado médico", observacao: "Consulta de rotina" },
    });
    expect(justificativa.status, JSON.stringify(justificativa.body)).toBe(200);

    const freqDepois = await apiAluno.get("/frequencias/minha");
    expect(freqDepois.body.consolidado[0].percentual).toBe(50);
    expect(freqDepois.body.consolidado[0].situacao).toBe("RISCO_REPROVACAO");
  });
});
