import { test, expect, consultarResultadoJornada } from "../fixtures/test.js";
import type { Api } from "../helpers/api.js";
import { fecharDb } from "../helpers/db.js";
import { criarPlano100, criarPlanoRegular, lancarNotaLote, lancarPontosRegulares, registrarFrequenciaCompleta } from "../helpers/dominio.js";

test.afterAll(fecharDb);

test.describe("E2E-J01 Aprovação conjunta @journey", () => {
  for (const caso of [
    { nome: "total120", total: "120.00", provas: "72.00", quantidade: 4, institucional: "6.00", trabalhos: "42.00" },
    { nome: "composição100 diferente", total: "100.00", provas: "60.00", quantidade: 2, institucional: "5.00", trabalhos: "35.00" },
  ]) {
    test("fixture100 rejeita " + caso.nome + " antes de qualquer escrita", async () => {
      const escritas: unknown[] = [];
      const api = {
        get: async () => ({ status: 200, body: { regraPontuacaoId: "regra-sintética", totalPontos: caso.total, subgrupos: [
          { id: "g1", nome: "Provas", orcamentoPontos: caso.provas, modoQuantidade: "FIXA", quantidadeFixa: caso.quantidade },
          { id: "g2", nome: "Institucional", orcamentoPontos: caso.institucional, modoQuantidade: "FIXA", quantidadeFixa: 1 },
          { id: "g3", nome: "Trabalhos", orcamentoPontos: caso.trabalhos, modoQuantidade: "SEM_LIMITE", quantidadeFixa: null },
        ] } }),
        post: async (_url: string, dados: unknown) => { escritas.push(dados); return { status: 201, body: { id: "av-" + escritas.length } }; },
      } as unknown as Api;
      await expect(criarPlano100(api, "oferta-sintética")).rejects.toThrow(/criarPlano100 exige/);
      expect(escritas).toEqual([]);
    });
  }

  test("100 pontos e100% de presença aprovam com resultado comum na ficha", async ({ novoCenario }) => {
    const c = await novoCenario({ regraPontuacao: "100" });
    const aluno = await c.matricularAluno();
    const plano = await criarPlano100(c.apiProfessor, c.turmaDisciplinaId);
    const notas = ["20.00", "20.00", "20.00", "5.00", "35.00"];
    for (const [indice, id] of plano.todas.entries()) {
      expect((await lancarNotaLote(c.apiProfessor, id, [{ alunoId: aluno.aluno.id, valor: notas[indice] }])).status).toBe(200);
    }
    await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [aluno.aluno.id], 5, 0);
    const resultado = await consultarResultadoJornada(c, aluno);
    expect(resultado).toMatchObject({ totalPontos: "100.00", cortePontos: "60.00", planoCompleto: true,
      etapaRegularCompleta: true, pontosRegularesObtidos: "100.00", pontosEfetivos: "100.00",
      resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "APROVADA", elegivelRecuperacaoPorNota: false,
      frequencia: { presencas: 5, faltas: 0, percentual: 100, situacao: "REGULAR", requisito: "SUFICIENTE" },
    });
    const ficha = await c.apiSecretaria.get("/alunos/" + aluno.aluno.id + "/ficha");
    expect(ficha.status).toBe(200);
    const disciplina = ficha.body.notas.find((n: any) => n.resultadoAcademico?.turmaDisciplinaId === c.turmaDisciplinaId);
    expect(disciplina?.resultadoAcademico).toEqual(resultado);
    const frequencia = await aluno.apiAluno.get("/frequencias/minha");
    expect(frequencia.status).toBe(200);
    expect(frequencia.body.consolidado.find((f: any) => f.turmaDisciplinaId === c.turmaDisciplinaId)).toMatchObject({ percentual: 100, situacao: "REGULAR" });
  });

  for (const caso of [{ presencas: 3, faltas: 1, percentual: 75 }, { presencas: 4, faltas: 1, percentual: 80 }]) {
    test("72/120 com frequência" + caso.percentual + "% aprova e conserva ALERTA", async ({ novoCenario }) => {
      const c = await novoCenario({ regraPontuacao: "120" }); const aluno = await c.matricularAluno();
      const plano = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
      await lancarPontosRegulares(c.apiProfessor, plano, aluno.aluno.id, "72.00");
      await registrarFrequenciaCompleta(c.apiProfessor, c.turmaDisciplinaId, [aluno.aluno.id], caso.presencas, caso.faltas);
      const resultado = await consultarResultadoJornada(c, aluno);
      expect(resultado).toMatchObject({ totalPontos: "120.00", cortePontos: "72.00", etapaRegularCompleta: true,
        pontosEfetivos: "72.00", resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "APROVADA",
        frequencia: { ...caso, situacao: "ALERTA", requisito: "SUFICIENTE" },
      });
      const recuperacao = await c.apiProfessor.get("/notas/turmas/" + c.turmaDisciplinaId + "/recuperacao");
      expect(recuperacao.status).toBe(200); expect(recuperacao.body.alunos).toEqual([]);
      expect(recuperacao.body.recuperacaoAvaliacaoId).toBeNull();
    });
  }
});
