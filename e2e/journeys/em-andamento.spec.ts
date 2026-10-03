import { test, expect, consultarResultadoJornada } from "../fixtures/test.js";
import { fecharDb } from "../helpers/db.js";
import { criarPlanoRegular, datasRecentes, lancarNotaLote, obterLancamento, registrarFrequenciaCompleta } from "../helpers/dominio.js";

test.afterAll(fecharDb);

test.describe("E2E-J05 Pendências e indicador parcial @journey", () => {
  test("plano incompleto com100% parcial e frequência suficiente continua pendente", async ({ novoCenario }) => {
    const c = await novoCenario({ regraPontuacao: "120" }); const aluno = await c.matricularAluno();
    const avaliacao = await c.apiProfessor.post("/avaliacoes", { body: {
      turma_disciplina_id: c.turmaDisciplinaId, tipo_avaliacao: "REGULAR", subgrupo_id: c.regraPontuacao!.subgrupos[0].id,
      descricao_avaliacao: "Única atividade do plano incompleto", valor: "18.00", data_lancamento: datasRecentes(1)[0],
    } });
    expect(avaliacao.status).toBe(201);
    expect((await lancarNotaLote(c.apiProfessor, avaliacao.body.id, [{ alunoId: aluno.aluno.id, valor: "18.00" }])).status).toBe(200);
    await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [aluno.aluno.id], 1, 0);
    const resultado = await consultarResultadoJornada(c, aluno);
    expect(resultado).toMatchObject({ planoCompleto: false, etapaRegularCompleta: false, avaliacoesLancadas: 1,
      pontosRegularesObtidos: "18.00", pontosEfetivos: null, resultadoPorNota: "EM_ANDAMENTO",
      indicadorRegular: { percentual: 100, parcial: true, denominadorPontos: "18.00" },
      aprovacaoDisciplina: "PENDENTE", elegivelRecuperacaoPorNota: false,
    });
    expect(resultado.motivos).toContain("PLANO_INCOMPLETO");
    const recuperacao = await c.apiProfessor.get("/notas/turmas/" + c.turmaDisciplinaId + "/recuperacao");
    expect(recuperacao.status).toBe(200); expect(recuperacao.body.recuperacaoAvaliacaoId).toBeNull();
  });

  test("plano completo com notas ausentes não aprova apesar de100% parcial", async ({ novoCenario }) => {
    const c = await novoCenario({ regraPontuacao: "120" }); const aluno = await c.matricularAluno();
    const plano = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
    expect((await lancarNotaLote(c.apiProfessor, plano.avaliacoes[0].id, [{ alunoId: aluno.aluno.id, valor: "18.00" }])).status).toBe(200);
    await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [aluno.aluno.id], 4, 0);
    const resultado = await consultarResultadoJornada(c, aluno);
    expect(resultado).toMatchObject({ planoCompleto: true, etapaRegularCompleta: false, avaliacoesRegulares: 6,
      avaliacoesLancadas: 1, pontosEfetivos: null, resultadoPorNota: "EM_ANDAMENTO", aprovacaoDisciplina: "PENDENTE",
      indicadorRegular: { percentual: 100, parcial: true, denominadorPontos: "18.00" }, elegivelRecuperacaoPorNota: false,
    });
    expect([...resultado.avaliacoesSemNota].sort()).toEqual(plano.avaliacoes.slice(1).map((a) => a.id).sort());
    expect(resultado.motivos).toContain("NOTAS_PENDENTES");
    const recuperacao = await c.apiProfessor.get("/notas/turmas/" + c.turmaDisciplinaId + "/recuperacao");
    expect(recuperacao.status).toBe(200); expect(recuperacao.body.alunos).toEqual([]);
  });

  test("zero lançado remove uma pendência e continua distinto de nota ausente", async ({ novoCenario }) => {
    const c = await novoCenario({ regraPontuacao: "120" }); const aluno = await c.matricularAluno();
    const plano = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
    expect((await lancarNotaLote(c.apiProfessor, plano.avaliacoes[0].id, [{ alunoId: aluno.aluno.id, valor: "0.00" }])).status).toBe(200);
    await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [aluno.aluno.id], 3, 1);
    const parcial = await consultarResultadoJornada(c, aluno);
    expect(parcial).toMatchObject({ avaliacoesLancadas: 1, etapaRegularCompleta: false, pontosRegularesObtidos: "0.00",
      indicadorRegular: { percentual: 0, parcial: true, denominadorPontos: "18.00" }, aprovacaoDisciplina: "PENDENTE",
    });
    expect(parcial.avaliacoesSemNota).not.toContain(plano.avaliacoes[0].id);
    expect(parcial.avaliacoesSemNota).toContain(plano.avaliacoes[1].id);
    const comZero = await obterLancamento(c.apiProfessor, plano.avaliacoes[0].id);
    const semNota = await obterLancamento(c.apiProfessor, plano.avaliacoes[1].id);
    expect(comZero.status).toBe(200); expect(semNota.status).toBe(200);
    expect(comZero.body.alunos[0]).toMatchObject({ valor: "0.00", lancada: true });
    expect(semNota.body.alunos[0]).toMatchObject({ valor: null, lancada: false });
    for (const avaliacao of plano.avaliacoes.slice(1)) {
      expect((await lancarNotaLote(c.apiProfessor, avaliacao.id, [{ alunoId: aluno.aluno.id, valor: "0.00" }])).status).toBe(200);
    }
    const completo = await consultarResultadoJornada(c, aluno);
    expect(completo).toMatchObject({ etapaRegularCompleta: true, avaliacoesLancadas: 6, avaliacoesSemNota: [],
      pontosRegularesObtidos: "0.00", resultadoPorNota: "EM_RECUPERACAO", aprovacaoDisciplina: "PENDENTE",
      indicadorRegular: { percentual: 0, parcial: false, denominadorPontos: "120.00" }, elegivelRecuperacaoPorNota: true,
    });
  });
});
