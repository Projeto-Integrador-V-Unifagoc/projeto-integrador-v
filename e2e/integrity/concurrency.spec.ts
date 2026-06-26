import { test, expect } from "../fixtures/test.js";
import { pegarCidade, db, garantirLocal } from "../helpers/db.js";
import { criarAluno } from "../factories/aluno.factory.js";
import { criarPlano100, datasRecentes } from "../helpers/dominio.js";

/**
 * Concorrência mínima (spec §12.2). Duas requisições simultâneas e validação do
 * estado final consistente.
 */
test.describe("Concorrência @integrity", () => {
  test("mesma matrícula simultânea: apenas uma é criada", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const cidade = await pegarCidade();
    const aluno = await criarAluno(cenario.apiSecretaria, `${cenario.runId}c`, {
      cursoId: cenario.cursoId,
      cidadeIbge: cidade.ibge,
      uf: cidade.uf,
    });
    const corpo = { body: { alunoId: aluno.id, turmaId: cenario.turmaId } };
    const [r1, r2] = await Promise.all([
      cenario.apiSecretaria.post("/matriculas", corpo),
      cenario.apiSecretaria.post("/matriculas", corpo),
    ]);
    const criados = [r1, r2].filter((r) => r.status === 201).length;
    expect(criados).toBe(1);
  });

  test("criação simultânea de avaliações respeita o limite de provas", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const corpo = {
      body: { tipo_avaliacao: "PROVA", data_lancamento: "2026-05-01", valor: 20, turma_disciplina_id: cenario.turmaDisciplinaId },
    };
    // Já existem 2 provas; duas criações simultâneas não podem gerar a 4ª.
    await cenario.apiProfessor.post("/avaliacoes", corpo);
    await cenario.apiProfessor.post("/avaliacoes", corpo);
    const [r1, r2] = await Promise.all([
      cenario.apiProfessor.post("/avaliacoes", corpo),
      cenario.apiProfessor.post("/avaliacoes", corpo),
    ]);
    const criadas = [r1, r2].filter((r) => r.status === 201).length;
    expect(criadas).toBe(1);
    const total = await db()("piv.avaliacao")
      .where({ turma_disciplina_id: cenario.turmaDisciplinaId, tipo_avaliacao: "PROVA" })
      .count<{ c: string }>("* as c")
      .first();
    expect(Number(total?.c ?? 0)).toBe(3);
  });

  test("dois lotes simultâneos da mesma avaliação convergem para uma nota por aluno", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    const itens = (valor: number) => ({ body: { itens: [{ alunoId: aluno.id, valor }] } });
    await Promise.all([
      cenario.apiProfessor.put(`/notas/avaliacoes/${plano.provas[0]}/lote`, itens(10)),
      cenario.apiProfessor.put(`/notas/avaliacoes/${plano.provas[0]}/lote`, itens(15)),
    ]);
    const total = await db()("piv.nota").where({ avaliacao_id: plano.provas[0] }).count<{ c: string }>("* as c").first();
    expect(Number(total?.c ?? 0)).toBe(1);
  });

  test("última vaga: apenas uma matrícula vence (§12.2)", async ({ novoCenario }) => {
    const cenario = await novoCenario({ capacidadeTurma: 1 });
    const cidade = await pegarCidade();
    const [alA, alB] = await Promise.all([
      criarAluno(cenario.apiSecretaria, `${cenario.runId}a`, { cursoId: cenario.cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf }),
      criarAluno(cenario.apiSecretaria, `${cenario.runId}b`, { cursoId: cenario.cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf }),
    ]);
    const [r1, r2] = await Promise.all([
      cenario.apiSecretaria.post("/matriculas", { body: { alunoId: alA.id, turmaId: cenario.turmaId } }),
      cenario.apiSecretaria.post("/matriculas", { body: { alunoId: alB.id, turmaId: cenario.turmaId } }),
    ]);
    // §12.2: turma de capacidade 1 ⇒ apenas uma matrícula vence (lock em turma
    // serializa a verificação de capacidade no `criar`).
    expect([r1, r2].filter((r) => r.status === 201).length).toBe(1);
  });

  test("duas chamadas na mesma data não duplicam a aula (§12.2)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const localId = await garantirLocal("E2E-LOCAL");
    const [data] = datasRecentes(1);
    const corpo = {
      body: { turmaDisciplinaId: cenario.turmaDisciplinaId, data, localId, registros: [{ alunoId: aluno.id, status: "PRESENTE" }] },
    };
    await Promise.all([
      cenario.apiProfessor.post("/frequencias", corpo),
      cenario.apiProfessor.post("/frequencias", corpo),
    ]);
    const aulas = await db()("piv.aula")
      .where({ turma_disciplina_id: cenario.turmaDisciplinaId })
      .count<{ c: string }>("* as c")
      .first();
    // §12.2: não pode haver chamada duplicada para a mesma data. O serviço casa a
    // aula existente por data e reaproveita o registro, mantendo uma única aula.
    expect(Number(aulas?.c ?? 0)).toBe(1);
  });
});
