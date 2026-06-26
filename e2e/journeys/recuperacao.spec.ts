import { test, expect } from "../fixtures/test.js";
import { criarPlano100, lancarNotaLote, obterLancamento } from "../helpers/dominio.js";

/**
 * E2E-J02 — Recuperação com aprovação (spec §10, §9.2). Reaproveita estrutura
 * isolada; valida EM_RECUPERACAO, criação da recuperação, aprovação por nota de
 * recuperação e bloqueio de recuperação indevida para aluno já aprovado.
 */
test.describe("E2E-J02 Recuperação com aprovação @journey", () => {
  test("aluno em recuperação aprova pela nota de recuperação; aluno já aprovado não a recebe", async ({
    novoCenario,
  }) => {
    const cenario = await novoCenario();
    const rec = await cenario.matricularAluno();
    const aprov = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);

    // Lança todas as regulares: `rec` com média < 60, `aprov` com 100.
    const lotes: Array<[string, number, number]> = [
      [plano.provas[0], 10, 20],
      [plano.provas[1], 10, 20],
      [plano.provas[2], 10, 20],
      [plano.tpi, 2, 5],
      [plano.trabalho, 10, 35],
    ];
    for (const [avaliacaoId, vRec, vAprov] of lotes) {
      const r = await lancarNotaLote(cenario.apiProfessor, avaliacaoId, [
        { alunoId: rec.aluno.id, valor: vRec },
        { alunoId: aprov.aluno.id, valor: vAprov },
      ]);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
    }

    // 3. Etapa completa: `rec` em recuperação, `aprov` aprovado.
    const rendimento1 = await cenario.apiProfessor.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`,
    );
    const linhaRec = rendimento1.body.alunos.find((a: any) => a.alunoId === rec.aluno.id);
    const linhaAprov = rendimento1.body.alunos.find((a: any) => a.alunoId === aprov.aluno.id);
    expect(linhaRec.situacao).toBe("EM_RECUPERACAO");
    expect(linhaRec.elegivelRecuperacao).toBe(true);
    expect(linhaAprov.situacao).toBe("APROVADO");

    // 4. Obter/Criar a avaliação de recuperação.
    const recuperacao = await cenario.apiProfessor.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/recuperacao`,
    );
    expect(recuperacao.status).toBe(200);
    const recuperacaoId = recuperacao.body.recuperacaoAvaliacaoId;
    expect(recuperacaoId).toBeTruthy();
    expect(recuperacao.body.alunos.some((a: any) => a.alunoId === rec.aluno.id)).toBe(true);

    const grade = await obterLancamento(cenario.apiProfessor, recuperacaoId);
    expect(grade.body.avaliacao.valorMaximo).toBeGreaterThanOrEqual(60);

    // 5. Lança recuperação >= 60 para `rec`.
    const loteRec = await lancarNotaLote(cenario.apiProfessor, recuperacaoId, [
      { alunoId: rec.aluno.id, valor: 70 },
    ]);
    expect(loteRec.status, JSON.stringify(loteRec.body)).toBe(200);

    // 6. Média final e aprovação.
    const rendimento2 = await cenario.apiProfessor.get(
      `/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`,
    );
    const recFinal = rendimento2.body.alunos.find((a: any) => a.alunoId === rec.aluno.id);
    expect(recFinal.situacao).toBe("APROVADO");
    expect(recFinal.mediaFinal).toBe(70);

    // 7. Aluno já aprovado não aceita nota de recuperação indevida.
    const loteIndevido = await lancarNotaLote(cenario.apiProfessor, recuperacaoId, [
      { alunoId: aprov.aluno.id, valor: 70 },
    ]);
    expect(loteIndevido.status).toBe(400);
    expect(JSON.stringify(loteIndevido.body)).toMatch(/elegível|elegivel|recupera/i);
  });
});
