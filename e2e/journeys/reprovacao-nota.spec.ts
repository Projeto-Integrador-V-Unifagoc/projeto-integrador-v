import { test, expect } from "../fixtures/test.js";
import { criarPlano100, lancarNotaLote, obterLancamento } from "../helpers/dominio.js";

/**
 * E2E-J03 — Reprovação por nota (spec §10, §9.2). Plano completo, média parcial
 * < 60 e recuperação também < 60 ⇒ REPROVADO. Inclui o teste de coerência da
 * ficha (defeito §17.1): a regra legada diverge da regra §9.
 */
test.describe("E2E-J03 Reprovação por nota @journey", () => {
  test("média parcial e recuperação abaixo de 60 resultam em REPROVADO nas leituras autoritativas", async ({
    novoCenario,
  }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);

    // Plano completo com média parcial ~42 (< 60).
    const lotes: Array<[string, number]> = [
      [plano.provas[0], 10],
      [plano.provas[1], 10],
      [plano.provas[2], 10],
      [plano.tpi, 2],
      [plano.trabalho, 10],
    ];
    for (const [avaliacaoId, valor] of lotes) {
      const r = await lancarNotaLote(cenario.apiProfessor, avaliacaoId, [{ alunoId: aluno.id, valor }]);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
    }

    const recuperacao = await cenario.apiProfessor.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/recuperacao`,
    );
    const recuperacaoId = recuperacao.body.recuperacaoAvaliacaoId;
    expect(recuperacaoId).toBeTruthy();
    await obterLancamento(cenario.apiProfessor, recuperacaoId);

    // Recuperação também abaixo de 60.
    const loteRec = await lancarNotaLote(cenario.apiProfessor, recuperacaoId, [
      { alunoId: aluno.id, valor: 40 },
    ]);
    expect(loteRec.status, JSON.stringify(loteRec.body)).toBe(200);

    const rendimento = await cenario.apiProfessor.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`,
    );
    const linha = rendimento.body.alunos.find((a: any) => a.alunoId === aluno.id);
    expect(linha.situacao).toBe("REPROVADO");
    expect(linha.mediaFinal).toBeLessThan(60);

    // Boletim do aluno coerente com o rendimento.
    const boletim = await cenario.apiSecretaria.get(`/notas/alunos/${aluno.id}`);
    expect(boletim.body.disciplinas[0].situacao).toBe("REPROVADO");
  });

  test("ficha reflete a reprovação por nota coerente com a regra §9 (§17.1 corrigido)", async ({
    novoCenario,
  }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    const lotes: Array<[string, number]> = [
      [plano.provas[0], 10],
      [plano.provas[1], 10],
      [plano.provas[2], 10],
      [plano.tpi, 2],
      [plano.trabalho, 10],
    ];
    for (const [avaliacaoId, valor] of lotes) {
      await lancarNotaLote(cenario.apiProfessor, avaliacaoId, [{ alunoId: aluno.id, valor }]);
    }
    // Recuperação também abaixo de 60 ⇒ REPROVADO (§9).
    const recuperacao = await cenario.apiProfessor.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/recuperacao`,
    );
    const recuperacaoId = recuperacao.body.recuperacaoAvaliacaoId;
    await obterLancamento(cenario.apiProfessor, recuperacaoId);
    await lancarNotaLote(cenario.apiProfessor, recuperacaoId, [{ alunoId: aluno.id, valor: 40 }]);

    const ficha = await cenario.apiSecretaria.get(`/alunos/${aluno.id}/ficha`);
    expect(ficha.status).toBe(200);
    const disc = (ficha.body.notas ?? []).find((n: any) => n.disciplinaId === cenario.disciplinaId);
    expect(disc, "ficha não trouxe a disciplina avaliada").toBeTruthy();
    // Regra §9 (escala 0–100, aprovação >= 60): média 42 e recuperação 40 ⇒ reprovado.
    expect(disc.situacao).toBe("reprovado");
    expect(Number(disc.media)).toBeLessThan(60);
  });
});
