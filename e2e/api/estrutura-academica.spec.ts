import { test, expect } from "../fixtures/test.js";
import { pegarCidade } from "../helpers/db.js";
import * as ids from "../helpers/ids.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";

/**
 * Módulos de estrutura acadêmica (spec §6, §7, §11.2): disciplina, período,
 * curso-disciplina, turma e turma-disciplina. CRUD, unicidades, datas,
 * capacidade, matriz curricular e relacionamentos.
 */
test.describe("Estrutura acadêmica @api", () => {
  test.describe("Disciplinas — CRUD e código único", () => {
    test("cria, lê, atualiza e remove disciplina", async ({ apiSecretaria, runId }) => {
      const criada = await estrutura.criarDisciplina(apiSecretaria, runId, { cargaHoraria: 80 });
      const lida = await apiSecretaria.get(`/disciplinas/${criada.id}`);
      expect(lida.status).toBe(200);
      expect(lida.body.id).toBe(criada.id);

      const atualizada = await apiSecretaria.put(`/disciplinas/${criada.id}`, {
        body: { nome: `Disciplina Atualizada ${runId}` },
      });
      expect(atualizada.status).toBe(200);

      const removida = await apiSecretaria.del(`/disciplinas/${criada.id}`);
      expect(removida.status).toBe(204);
      const depois = await apiSecretaria.get(`/disciplinas/${criada.id}`);
      expect(depois.status).toBe(404);
    });

    test("código duplicado é rejeitado (400)", async ({ apiSecretaria, runId }) => {
      const cod = ids.codigo("DIS", runId);
      await estrutura.criarDisciplina(apiSecretaria, runId, { codigo: cod });
      const dup = await apiSecretaria.post("/disciplinas", {
        body: { codigo: cod, nome: "Outra", cargaHoraria: 60 },
      });
      expect(dup.status).toBe(400);
    });

    test("payload sem campos obrigatórios é rejeitado (400)", async ({ apiSecretaria }) => {
      const resp = await apiSecretaria.post("/disciplinas", { body: {} });
      expect(resp.status).toBe(400);
    });

    test("identificador inexistente retorna 404", async ({ apiSecretaria }) => {
      const resp = await apiSecretaria.get(`/disciplinas/${ids.uuid()}`);
      expect(resp.status).toBe(404);
    });
  });

  test.describe("Período letivo — unicidade e datas", () => {
    test("data fim anterior à inicial é rejeitada", async ({ apiSecretaria, runId }) => {
      const resp = await apiSecretaria.post("/periodos-letivos", {
        body: {
          codigo: ids.codigo("PL", runId),
          ano: ids.numeroUnico(),
          semestre: 1,
          dataInicio: "2026-08-01",
          dataFim: "2026-07-01",
          status: "ativo",
        },
      });
      expect(resp.status).toBe(400);
    });

    test("semestre inválido é rejeitado", async ({ apiSecretaria, runId }) => {
      const resp = await apiSecretaria.post("/periodos-letivos", {
        body: {
          codigo: ids.codigo("PL", runId),
          ano: ids.numeroUnico(),
          semestre: 3,
          dataInicio: "2026-02-01",
          dataFim: "2026-06-01",
        },
      });
      expect(resp.status).toBe(400);
    });

    test("ano+semestre duplicado é rejeitado", async ({ apiSecretaria, runId }) => {
      const ano = ids.numeroUnico();
      const base = {
        ano,
        semestre: 1,
        dataInicio: "2026-02-01",
        dataFim: "2026-06-01",
        status: "ativo",
      };
      const primeira = await apiSecretaria.post("/periodos-letivos", {
        body: { ...base, codigo: ids.codigo("PLA", runId) },
      });
      expect(primeira.status).toBe(201);
      const segunda = await apiSecretaria.post("/periodos-letivos", {
        body: { ...base, codigo: ids.codigo("PLB", runId) },
      });
      expect(segunda.status).toBe(400);
    });
  });

  test.describe("Matriz curricular e turma-disciplina", () => {
    test("disciplina não pode ser associada duas vezes ao mesmo curso", async ({ apiSecretaria, runId }) => {
      const cidade = await pegarCidade();
      const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
      const dep = await estrutura.criarDepartamento(apiSecretaria, runId, fac.id);
      const curso = await estrutura.criarCurso(apiSecretaria, runId, dep.id);
      const disc = await estrutura.criarDisciplina(apiSecretaria, runId);
      const primeira = await estrutura.associarDisciplinaAoCurso(apiSecretaria, curso.id, disc.id);
      expect(primeira.id).toBeTruthy();
      const dup = await apiSecretaria.post("/curso-disciplina", {
        body: { cursoId: curso.id, disciplinaId: disc.id, periodoIdeal: 1 },
      });
      expect(dup.status).not.toBe(201);
      expect(JSON.stringify(dup.body)).toMatch(/associada|já|ja/i);

      const matriz = await apiSecretaria.get(`/cursos/${curso.id}/matriz-curricular`);
      expect(matriz.status).toBe(200);
      expect(matriz.body.filter((d: any) => d.disciplina_id === disc.id || d.id === disc.id).length).toBeLessThanOrEqual(1);
    });

    test("capacidade de turma zero é rejeitada", async ({ apiSecretaria, runId }) => {
      const cidade = await pegarCidade();
      const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
      const dep = await estrutura.criarDepartamento(apiSecretaria, runId, fac.id);
      const curso = await estrutura.criarCurso(apiSecretaria, runId, dep.id);
      const periodo = await estrutura.criarPeriodoLetivo(apiSecretaria, runId);
      const resp = await apiSecretaria.post("/turmas", {
        body: {
          periodoLetivoId: periodo.id,
          cursoId: curso.id,
          periodoCurricular: 1,
          descricao: "Turma",
          sigla: ids.sigla(runId),
          capacidadeAlunos: 0,
          turno: "NOITE",
        },
      });
      expect(resp.status).toBe(400);
    });

    test("turma-disciplina exige disciplina pertencente à matriz do curso", async ({ apiSecretaria, runId }) => {
      const cidade = await pegarCidade();
      const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
      const dep = await estrutura.criarDepartamento(apiSecretaria, runId, fac.id);
      const cursoA = await estrutura.criarCurso(apiSecretaria, runId, dep.id);
      const cursoB = await estrutura.criarCurso(apiSecretaria, `${runId}B`, dep.id);
      const disc = await estrutura.criarDisciplina(apiSecretaria, runId);
      // associa a B, mas cria turma em A
      const cdB = await estrutura.associarDisciplinaAoCurso(apiSecretaria, cursoB.id, disc.id);
      const periodo = await estrutura.criarPeriodoLetivo(apiSecretaria, runId);
      const turmaA = await estrutura.criarTurma(apiSecretaria, runId, {
        periodoLetivoId: periodo.id,
        cursoId: cursoA.id,
      });
      const profCurso = await import("../factories/professor.factory.js");
      const prof = await profCurso.criarProfessor(apiSecretaria, runId, {
        cursoId: cursoB.id,
        cidadeIbge: cidade.ibge,
        uf: cidade.uf,
      });
      const resp = await apiSecretaria.post(`/turmas/${turmaA.id}/disciplinas`, {
        body: { cursoDisciplinaId: cdB.id, professorId: prof.id },
      });
      expect(resp.status).not.toBe(201);
      expect(JSON.stringify(resp.body)).toMatch(/matriz|curso/i);
    });
  });
});
