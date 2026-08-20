import { test, expect } from "../fixtures/test.js";
import { criarProfessorComLogin } from "../factories/professor.factory.js";
import { criarPlano100, lancarNotaLote } from "../helpers/dominio.js";
import { contar } from "../helpers/db.js";

/**
 * Módulos `avaliacao` e `notas` (spec §6, §9.1, §9.2, §11). Regras de pontos,
 * escopo do professor, lote atômico, limites e autorização excepcional.
 */
test.describe("Avaliações @api", () => {
  const hoje = new Date().toISOString().slice(0, 10);

  test("PROVA é normalizada para 20 pontos", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const resp = await cenario.apiProfessor.post("/avaliacoes", {
      body: { tipo_avaliacao: "PROVA", data_lancamento: hoje, valor: 999, turma_disciplina_id: cenario.turmaDisciplinaId },
    });
    expect(resp.status).toBe(201);
    expect(Number(resp.body.valor)).toBe(20);
  });

  test("quarta PROVA é rejeitada (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    for (let i = 0; i < 3; i++) {
      const r = await cenario.apiProfessor.post("/avaliacoes", {
        body: { tipo_avaliacao: "PROVA", data_lancamento: hoje, valor: 20, turma_disciplina_id: cenario.turmaDisciplinaId },
      });
      expect(r.status).toBe(201);
    }
    const quarta = await cenario.apiProfessor.post("/avaliacoes", {
      body: { tipo_avaliacao: "PROVA", data_lancamento: hoje, valor: 20, turma_disciplina_id: cenario.turmaDisciplinaId },
    });
    expect(quarta.status).toBe(400);
  });

  test("trabalhos acima de 35 pontos são rejeitados (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const resp = await cenario.apiProfessor.post("/avaliacoes", {
      body: { tipo_avaliacao: "TRABALHO", data_lancamento: hoje, valor: 36, turma_disciplina_id: cenario.turmaDisciplinaId },
    });
    expect(resp.status).toBe(400);
  });

  test("data de devolução anterior ao lançamento é rejeitada (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const resp = await cenario.apiProfessor.post("/avaliacoes", {
      body: {
        tipo_avaliacao: "PROVA",
        data_lancamento: "2026-05-10",
        data_devolucao: "2026-05-01",
        valor: 20,
        turma_disciplina_id: cenario.turmaDisciplinaId,
      },
    });
    expect(resp.status).toBe(400);
  });

  test("professor não cria avaliação em turma-disciplina de outro professor (403)", async ({ novoCenario, runId }) => {
    const cenario = await novoCenario();
    const outro = await criarProfessorComLogin(cenario.apiSecretaria, `${runId}x`, {
      cursoId: cenario.cursoId,
      cidadeIbge: cenario.cidade.ibge,
      uf: cenario.cidade.uf,
    });
    const apiOutro = cenario.apiSecretaria.comToken(outro.token);
    const resp = await apiOutro.post("/avaliacoes", {
      body: { tipo_avaliacao: "PROVA", data_lancamento: hoje, valor: 20, turma_disciplina_id: cenario.turmaDisciplinaId },
    });
    expect(resp.status).toBe(403);
  });

  test("CRUD: busca, atualiza e remove avaliação", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const criada = await cenario.apiProfessor.post("/avaliacoes", {
      body: { tipo_avaliacao: "TRABALHO", data_lancamento: hoje, valor: 10, turma_disciplina_id: cenario.turmaDisciplinaId },
    });
    const id = criada.body.id;
    expect((await cenario.apiProfessor.get(`/avaliacoes/${id}`)).status).toBe(200);
    expect((await cenario.apiProfessor.put(`/avaliacoes/${id}`, { body: { valor: 15 } })).status).toBe(200);
    expect((await cenario.apiProfessor.del(`/avaliacoes/${id}`)).status).toBe(204);
  });
});

test.describe("Notas em lote @api", () => {
  test("nota acima do máximo invalida o lote inteiro (400) sem persistir", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const a2 = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);

    const resp = await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [
      { alunoId: a1.aluno.id, valor: 15 },
      { alunoId: a2.aluno.id, valor: 999 }, // acima do máximo (20)
    ]);
    expect(resp.status).toBe(400);
    // Atomicidade (§12.1): nenhuma nota persistida para a avaliação.
    expect(await contar("nota", { avaliacao_id: plano.provas[0] })).toBe(0);
  });

  test("aluno duplicado no lote é rejeitado (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    const resp = await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [
      { alunoId: a1.aluno.id, valor: 10 },
      { alunoId: a1.aluno.id, valor: 12 },
    ]);
    expect(resp.status).toBe(400);
  });

  test("aluno sem matrícula ativa no lote é rejeitado (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    const resp = await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [
      { alunoId: "00000000-0000-4000-8000-000000000000", valor: 10 },
    ]);
    expect(resp.status).toBe(400);
  });
});

test.describe("Autorização excepcional de nota @api", () => {
  test("somente a secretaria registra autorização (professor 403)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    const resp = await cenario.apiProfessor.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: plano.provas[0], motivo: "Retificação fora do prazo solicitada." },
    });
    expect(resp.status).toBe(403);
  });

  test("secretaria registra autorização com motivo válido (201)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    const resp = await cenario.apiSecretaria.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: plano.provas[0], motivo: "Retificação autorizada pela coordenação." },
    });
    expect(resp.status).toBe(201);
  });

  test("motivo curto é rejeitado (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    const resp = await cenario.apiSecretaria.post("/notas/autorizacoes-excepcionais", {
      body: { avaliacaoId: plano.provas[0], motivo: "x" },
    });
    expect(resp.status).toBe(400);
  });
});
