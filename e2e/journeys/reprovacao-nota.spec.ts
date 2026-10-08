import { test, expect, consultarResultadoJornada } from "../fixtures/test.js";
import { fecharDb } from "../helpers/db.js";
import { criarPlanoRegular, lancarNotaLote, lancarPontosRegulares, registrarFrequenciaCompleta } from "../helpers/dominio.js";

test.afterAll(fecharDb);

test.describe("E2E-J03 Insuficiência por nota e corte exato @journey", () => {
  test("regular60/120 e REC48 conservam60 e não aprovam, inclusive na ficha", async ({ novoCenario }) => {
    const c = await novoCenario({ regraPontuacao: "120" }); const aluno = await c.matricularAluno();
    const plano = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
    await lancarPontosRegulares(c.apiProfessor, plano, aluno.aluno.id, "60.00");
    await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [aluno.aluno.id], 3, 1);
    const recuperacao = await c.apiProfessor.get("/notas/turmas/" + c.turmaDisciplinaId + "/recuperacao");
    expect(recuperacao.status).toBe(200); expect(recuperacao.body.valorMaximoRecuperacao).toBe("120.00");
    expect((await lancarNotaLote(c.apiProfessor, recuperacao.body.recuperacaoAvaliacaoId,
      [{ alunoId: aluno.aluno.id, valor: "48.00" }])).status).toBe(200);
    const resultado = await consultarResultadoJornada(c, aluno);
    expect(resultado).toMatchObject({ pontosRegularesObtidos: "60.00", pontosRecuperacao: "48.00",
      pontosEfetivos: "60.00", percentualResultado: 50, resultadoPorNota: "INSUFICIENTE", aprovacaoDisciplina: "NAO_APROVADA",
      frequencia: { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" },
    });
    const ficha = await c.apiSecretaria.get("/alunos/" + aluno.aluno.id + "/ficha");
    expect(ficha.status).toBe(200);
    expect(ficha.body.notas.find((n: any) => n.resultadoAcademico?.turmaDisciplinaId === c.turmaDisciplinaId)?.resultadoAcademico).toEqual(resultado);
  });

  for (const caso of [
    { modelo: "300", total: "300.00", abaixo: "179.99", corte: "180.00", percentualAbaixo: 60, indice: 2, corrigir: "60.00", suficiente: "180.00" },
    { modelo: "100.01", total: "100.01", abaixo: "60.00", corte: "60.006", percentualAbaixo: 59.99, indice: 3, corrigir: "0.01", suficiente: "60.01" },
  ] as const) {
    test(caso.abaixo + "/" + caso.total + " fica abaixo do corte" + caso.corte + "; retificação exata o atinge", async ({ novoCenario }) => {
      const c = await novoCenario({ regraPontuacao: caso.modelo }); const aluno = await c.matricularAluno();
      const plano = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
      await lancarPontosRegulares(c.apiProfessor, plano, aluno.aluno.id, caso.abaixo);
      await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [aluno.aluno.id], 9, 1);
      const antes = await consultarResultadoJornada(c, aluno);
      expect(antes).toMatchObject({ totalPontos: caso.total, cortePontos: caso.corte, pontosEfetivos: caso.abaixo,
        percentualResultado: caso.percentualAbaixo, resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true,
        aprovacaoDisciplina: "PENDENTE", etapaRegularCompleta: true,
      });
      expect((await lancarNotaLote(c.apiProfessor, plano.avaliacoes[caso.indice].id,
        [{ alunoId: aluno.aluno.id, valor: caso.corrigir }])).status).toBe(200);
      const depois = await consultarResultadoJornada(c, aluno);
      expect(depois).toMatchObject({ cortePontos: caso.corte, pontosEfetivos: caso.suficiente,
        resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "APROVADA", elegivelRecuperacaoPorNota: false,
      });
      if (caso.modelo === "300") expect(depois.percentualResultado).toBe(antes.percentualResultado);
    });
  }
});
