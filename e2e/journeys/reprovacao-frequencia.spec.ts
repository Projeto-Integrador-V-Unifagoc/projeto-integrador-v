import { test, expect, consultarResultadoJornada } from "../fixtures/test.js";
import { fecharDb } from "../helpers/db.js";
import { criarPlanoRegular, lancarPontosRegulares, registrarFrequenciaCompleta } from "../helpers/dominio.js";

test.afterAll(fecharDb);

test.describe("E2E-J04 Impedimento e pendência de frequência @journey", () => {
  test("nota120/120 com frequência50% não aprova; justificativa não altera o requisito", async ({ novoCenario }) => {
    const c = await novoCenario({ regraPontuacao: "120" }); const aluno = await c.matricularAluno();
    const plano = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
    await lancarPontosRegulares(c.apiProfessor, plano, aluno.aluno.id, "120.00");
    const registros = await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [aluno.aluno.id], 2, 2);
    const antes = await consultarResultadoJornada(c, aluno);
    expect(antes).toMatchObject({ pontosEfetivos: "120.00", resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "NAO_APROVADA",
      frequencia: { presencas: 2, faltas: 2, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" },
    });
    expect(antes.motivos).toContain("FREQUENCIA_INSUFICIENTE");
    const turma = await c.apiProfessor.get("/frequencias/turma/" + c.turmaDisciplinaId);
    expect(turma.status).toBe(200); expect(turma.body.alunosEmRisco.some((a: any) => a.alunoId === aluno.aluno.id)).toBe(true);
    const ausente = registros.find((r) => r.status === "AUSENTE");
    expect(ausente?.id).toEqual(expect.any(String));
    const justificativa = await aluno.apiAluno.post("/frequencias/" + ausente!.id + "/justificativa", {
      body: { motivo: "Atestado médico", observacao: "Consulta sintética de rotina" },
    });
    expect(justificativa.status).toBe(200);
    const frequencia = await aluno.apiAluno.get("/frequencias/minha");
    expect(frequencia.status).toBe(200);
    expect(frequencia.body.consolidado.find((f: any) => f.turmaDisciplinaId === c.turmaDisciplinaId)).toMatchObject({ percentual: 50, situacao: "RISCO_REPROVACAO" });
    expect(await consultarResultadoJornada(c, aluno)).toEqual(antes);
  });

  test("nota120/120 sem frequência permanece pendente e não presume presença100%", async ({ novoCenario }) => {
    const c = await novoCenario({ regraPontuacao: "120" }); const aluno = await c.matricularAluno();
    const plano = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
    await lancarPontosRegulares(c.apiProfessor, plano, aluno.aluno.id, "120.00");
    const resultado = await consultarResultadoJornada(c, aluno);
    expect(resultado).toMatchObject({ etapaRegularCompleta: true, resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "PENDENTE",
      frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
    });
    expect(resultado.motivos).toContain("FREQUENCIA_PENDENTE");
  });
});
