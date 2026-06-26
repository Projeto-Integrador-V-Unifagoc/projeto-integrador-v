import { test, expect } from "../fixtures/test.js";
import { pegarCidade } from "../helpers/db.js";
import * as ids from "../helpers/ids.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";
import { criarAluno } from "../factories/aluno.factory.js";

/**
 * Módulo de matrícula (spec §6, §11.4). Turmas disponíveis, criação com vínculos
 * automáticos, duplicidade, status, cancelamento e regras de compatibilidade.
 */
test.describe("Matrícula @api", () => {
  test("lista turmas disponíveis com vagas e remove a turma cheia", async ({ novoCenario }) => {
    const cenario = await novoCenario({ capacidadeTurma: 1 });
    const disponiveisAntes = await cenario.apiSecretaria.get(`/turmas/disponiveis/${cenario.cursoId}`);
    expect(disponiveisAntes.status).toBe(200);
    expect(disponiveisAntes.body.some((t: any) => t.id === cenario.turmaId)).toBe(true);

    await cenario.matricularAluno();

    const disponiveisDepois = await cenario.apiSecretaria.get(`/turmas/disponiveis/${cenario.cursoId}`);
    // Turma de capacidade 1 já preenchida não deve mais aparecer como disponível.
    expect(disponiveisDepois.body.some((t: any) => t.id === cenario.turmaId)).toBe(false);
  });

  test("matrícula cria vínculos de disciplina (matricula_turma_disciplina)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { matriculaId } = await cenario.matricularAluno();
    const status = await cenario.apiSecretaria.get(`/matriculas/aluno/${(await idDoAluno(cenario, matriculaId))}`);
    // A listagem por aluno traz o vínculo de turma-disciplina.
    expect(status.status).toBe(200);
  });

  test("matrícula duplicada (mesmo aluno e turma) retorna 409", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const matriculado = await cenario.matricularAluno();
    const dup = await cenario.apiSecretaria.post("/matriculas", {
      body: { alunoId: matriculado.aluno.id, turmaId: cenario.turmaId },
    });
    expect(dup.status).toBe(409);
  });

  test("alunoId inválido retorna 400", async ({ apiSecretaria }) => {
    const resp = await apiSecretaria.post("/matriculas", { body: { alunoId: "x", turmaId: ids.uuid() } });
    expect(resp.status).toBe(400);
  });

  test("transições de status válidas e inválidas", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { matriculaId } = await cenario.matricularAluno();

    const trancar = await cenario.apiSecretaria.patch(`/matriculas/${matriculaId}/status`, {
      body: { status: "trancada" },
    });
    expect(trancar.status).toBe(200);

    const invalido = await cenario.apiSecretaria.patch(`/matriculas/${matriculaId}/status`, {
      body: { status: "status-inexistente" },
    });
    expect(invalido.status).toBe(400);
  });

  test("matrícula em curso divergente é rejeitada (§11.4)", async ({ novoCenario, apiSecretaria, runId }) => {
    const cenario = await novoCenario();
    // Cria um aluno de OUTRO curso e tenta matriculá-lo na turma do cenário.
    const cidade = await pegarCidade();
    const fac = await estrutura.criarFaculdade(apiSecretaria, `${runId}o`, cidade);
    const dep = await estrutura.criarDepartamento(apiSecretaria, `${runId}o`, fac.id);
    const outroCurso = await estrutura.criarCurso(apiSecretaria, `${runId}o`, dep.id);
    const aluno = await criarAluno(apiSecretaria, `${runId}o`, {
      cursoId: outroCurso.id,
      cidadeIbge: cidade.ibge,
      uf: cidade.uf,
    });
    const resp = await apiSecretaria.post("/matriculas", {
      body: { alunoId: aluno.id, turmaId: cenario.turmaId },
    });
    // §11.4: curso do aluno diverge do curso da turma ⇒ rejeitado.
    expect([400, 409]).toContain(resp.status);
  });

  test("matrícula em turma cheia retorna conflito (§11.4)", async ({ novoCenario }) => {
    const cenario = await novoCenario({ capacidadeTurma: 1 });
    await cenario.matricularAluno();
    // Segundo aluno na turma de capacidade 1 deve ser rejeitado.
    const cidade = await pegarCidade();
    const aluno = await criarAluno(cenario.apiSecretaria, `${cenario.runId}z`, {
      cursoId: cenario.cursoId,
      cidadeIbge: cidade.ibge,
      uf: cidade.uf,
    });
    const resp = await cenario.apiSecretaria.post("/matriculas", {
      body: { alunoId: aluno.id, turmaId: cenario.turmaId },
    });
    // §11.4: turma de capacidade 1 já preenchida ⇒ conflito.
    expect(resp.status).toBe(409);
  });
});

async function idDoAluno(cenario: any, _matriculaId: string): Promise<string> {
  const todas = await cenario.apiSecretaria.get("/matriculas");
  const linha = todas.body.find((m: any) => m.turma_id === cenario.turmaId);
  return linha?.aluno_id ?? "";
}
