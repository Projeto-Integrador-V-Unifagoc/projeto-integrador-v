import { test, expect } from "../fixtures/test.js";
import { pegarCidade, db, contar } from "../helpers/db.js";
import * as ids from "../helpers/ids.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";
import { criarPlano100, lancarNotaLote } from "../helpers/dominio.js";

/**
 * Integridade referencial (spec §7.2, §12). FKs inexistentes, unicidade,
 * RESTRICT × CASCADE e ausência de registros órfãos.
 */
test.describe("Constraints e integridade @integrity", () => {
  test("FK inexistente é rejeitada (curso-disciplina, turma, avaliação)", async ({ apiSecretaria, runId }) => {
    const fake = ids.uuid();
    const cd = await apiSecretaria.post("/curso-disciplina", {
      body: { cursoId: fake, disciplinaId: fake, periodoIdeal: 1 },
    });
    expect(cd.status).toBe(400);

    const cidade = await pegarCidade();
    const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
    const dep = await estrutura.criarDepartamento(apiSecretaria, runId, fac.id);
    const curso = await estrutura.criarCurso(apiSecretaria, runId, dep.id);
    const turma = await apiSecretaria.post("/turmas", {
      body: { periodoLetivoId: fake, cursoId: curso.id, periodoCurricular: 1, descricao: "x", sigla: ids.sigla(runId), capacidadeAlunos: 10, turno: "NOITE" },
    });
    expect(turma.status).toBe(400);

    const avaliacao = await apiSecretaria.post("/avaliacoes", {
      body: { tipo_avaliacao: "PROVA", data_lancamento: "2026-05-01", valor: 20, turma_disciplina_id: fake },
    });
    expect(avaliacao.status).toBe(400);
  });

  test("código de departamento duplicado é rejeitado", async ({ apiSecretaria, runId }) => {
    const cidade = await pegarCidade();
    const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
    const cod = ids.codigo("DEP", runId);
    const primeira = await apiSecretaria.post("/departamentos", { body: { codigo: cod, nome: "A", faculdadeId: fac.id } });
    expect(primeira.status).toBe(201);
    const dup = await apiSecretaria.post("/departamentos", { body: { codigo: cod, nome: "B", faculdadeId: fac.id } });
    expect(dup.status).not.toBe(201);
  });

  test("RESTRICT: remover curso com turma é bloqueado (400)", async ({ apiSecretaria, runId }) => {
    const cidade = await pegarCidade();
    const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
    const dep = await estrutura.criarDepartamento(apiSecretaria, runId, fac.id);
    const curso = await estrutura.criarCurso(apiSecretaria, runId, dep.id);
    const periodo = await estrutura.criarPeriodoLetivo(apiSecretaria, runId);
    await estrutura.criarTurma(apiSecretaria, runId, { periodoLetivoId: periodo.id, cursoId: curso.id });

    const remover = await apiSecretaria.del(`/cursos/${curso.id}`);
    expect(remover.status).toBe(400);
  });

  test("CASCADE: remover turma apaga turma-disciplina e avaliações", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const criada = await cenario.apiProfessor.post("/avaliacoes", {
      body: { tipo_avaliacao: "PROVA", data_lancamento: "2026-05-01", valor: 20, turma_disciplina_id: cenario.turmaDisciplinaId },
    });
    expect(criada.status).toBe(201);

    const remover = await cenario.apiSecretaria.del(`/turmas/${cenario.turmaId}`);
    expect(remover.status).toBe(204);
    expect(await contar("turma_disciplina", { id: cenario.turmaDisciplinaId })).toBe(0);
    expect(await contar("avaliacao", { id: criada.body.id })).toBe(0);
  });

  test("nota é única por aluno e avaliação (relançar não duplica)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [{ alunoId: aluno.id, valor: 10 }]);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [{ alunoId: aluno.id, valor: 18 }]);
    expect(await contar("nota", { avaliacao_id: plano.provas[0] })).toBe(1);
  });

  test("não há registros órfãos após um fluxo completo", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const plano = await criarPlano100(cenario.apiProfessor, cenario.turmaDisciplinaId);
    await lancarNotaLote(cenario.apiProfessor, plano.provas[0], [{ alunoId: aluno.id, valor: 12 }]);

    const orfaosMtd = await db()("piv.matricula_turma_disciplina as mtd")
      .leftJoin("piv.matricula as m", "mtd.matricula_id", "m.id")
      .whereNull("m.id")
      .count<{ c: string }>("* as c")
      .first();
    const orfaosNota = await db()("piv.nota as n")
      .leftJoin("piv.matricula_turma_disciplina as mtd", "n.matricula_turma_disciplina_id", "mtd.id")
      .whereNull("mtd.id")
      .count<{ c: string }>("* as c")
      .first();
    expect(Number(orfaosMtd?.c ?? 0)).toBe(0);
    expect(Number(orfaosNota?.c ?? 0)).toBe(0);
  });
});
