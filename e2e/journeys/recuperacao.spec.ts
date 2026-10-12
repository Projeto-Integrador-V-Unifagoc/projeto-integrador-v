import { test, expect, consultarResultadoJornada } from "../fixtures/test.js";
import { fecharDb } from "../helpers/db.js";
import { criarPlanoRegular, lancarNotaLote, lancarPontosRegulares, obterLancamento, registrarFrequenciaCompleta } from "../helpers/dominio.js";

test.afterAll(fecharDb);

test.describe("E2E-J02 Recuperação no total configurado @journey", () => {
  for (const caso of [{ recuperacao: "72.00", percentual: 60 }, { recuperacao: "90.00", percentual: 75 }]) {
    test("regular60/120 e REC" + caso.recuperacao + " aprovam sem soma; suficiente regular fica fora", async ({ novoCenario }) => {
      const c = await novoCenario({ regraPontuacao: "120" });
      const rec = await c.matricularAluno(), suficiente = await c.matricularAluno();
      const plano = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
      await lancarPontosRegulares(c.apiProfessor, plano, rec.aluno.id, "60.00");
      await lancarPontosRegulares(c.apiProfessor, plano, suficiente.aluno.id, "120.00");
      await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [rec.aluno.id, suficiente.aluno.id], 3, 1);
      expect(await consultarResultadoJornada(c, rec)).toMatchObject({ resultadoPorNota: "EM_RECUPERACAO",
        pontosEfetivos: "60.00", aprovacaoDisciplina: "PENDENTE", elegivelRecuperacaoPorNota: true,
      });
      expect(await consultarResultadoJornada(c, suficiente)).toMatchObject({ resultadoPorNota: "SUFICIENTE",
        aprovacaoDisciplina: "APROVADA", elegivelRecuperacaoPorNota: false,
      });
      const recuperacao = await c.apiProfessor.get("/notas/turmas/" + c.turmaDisciplinaId + "/recuperacao");
      expect(recuperacao.status).toBe(200); expect(recuperacao.body.valorMaximoRecuperacao).toBe("120.00");
      expect(recuperacao.body.alunos.map((a: any) => a.alunoId)).toEqual([rec.aluno.id]);
      const id = recuperacao.body.recuperacaoAvaliacaoId;
      expect(id).toEqual(expect.any(String));
      const grade = await obterLancamento(c.apiProfessor, id);
      expect(grade.status).toBe(200); expect(grade.body.avaliacao.valorMaximo).toBe("120.00");
      expect(grade.body.alunos.map((a: any) => a.alunoId)).toEqual([rec.aluno.id]);

      const misto = await lancarNotaLote(c.apiProfessor, id, [
        { alunoId: rec.aluno.id, valor: caso.recuperacao }, { alunoId: suficiente.aluno.id, valor: caso.recuperacao },
      ]);
      expect(misto.status).toBe(409); expect(misto.body.codigo).toBe("RECUPERACAO_NAO_ELEGIVEL");
      expect((await obterLancamento(c.apiProfessor, id)).body.alunos[0].valor).toBeNull();

      const salva = await lancarNotaLote(c.apiProfessor, id, [{ alunoId: rec.aluno.id, valor: caso.recuperacao }]);
      expect(salva.status).toBe(200);
      const final = await consultarResultadoJornada(c, rec);
      expect(final).toMatchObject({ pontosRegularesObtidos: "60.00", pontosRecuperacao: caso.recuperacao,
        pontosEfetivos: caso.recuperacao, percentualResultado: caso.percentual, resultadoPorNota: "SUFICIENTE",
        aprovacaoDisciplina: "APROVADA", elegivelRecuperacaoPorNota: true,
        frequencia: { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" },
      });
      expect(salva.body.alunos[0].resultadoAcademico).toEqual(final);
      const indevido = await lancarNotaLote(c.apiProfessor, id, [{ alunoId: suficiente.aluno.id, valor: caso.recuperacao }]);
      expect(indevido.status).toBe(409);
      expect(await consultarResultadoJornada(c, rec)).toEqual(final);
    });
  }
});
