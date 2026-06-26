import { test, expect } from "../fixtures/test.js";

/**
 * Matriz de autorização (spec §8, §17.4). Sem autenticação ⇒ 401; perfil sem
 * permissão ⇒ 403. Os cruzamentos `@defeito` capturam rotas administrativas e de
 * ficha registradas direto em `app.ts` sem `autenticar` (vulnerabilidade real).
 */
test.describe("Autorização — rotas protegidas (router) @integrity", () => {
  test("escrita de professor/avaliação/matrícula exige autenticação (anônimo 401)", async ({ api }) => {
    const id = "00000000-0000-4000-8000-000000000000";
    expect((await api.put(`/professores/${id}`, { body: {} })).status).toBe(401);
    expect((await api.post("/avaliacoes", { body: {} })).status).toBe(401);
    expect((await api.post("/matriculas", { body: {} })).status).toBe(401);
    expect((await api.put(`/notas/avaliacoes/${id}/lote`, { body: { itens: [] } })).status).toBe(401);
    expect((await api.post("/frequencias", { body: {} })).status).toBe(401);
  });

  test("perfil sem permissão recebe 403 (aluno/professor em rotas de secretaria)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { apiAluno } = await cenario.matricularAluno();

    // Aluno não cria professor (soSecretaria).
    expect((await apiAluno.post("/professores", { body: {} })).status).toBe(403);
    // Aluno não cria matrícula (soSecretaria).
    expect((await apiAluno.post("/matriculas", { body: {} })).status).toBe(403);
    // Professor não cria matrícula (soSecretaria).
    expect((await cenario.apiProfessor.post("/matriculas", { body: {} })).status).toBe(403);
  });

  test("aluno não acessa boletim de terceiros (403)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const a2 = await cenario.matricularAluno();
    const resp = await a1.apiAluno.get(`/notas/alunos/${a2.aluno.id}`);
    expect(resp.status).toBe(403);
  });

  test("aluno não acessa o rendimento da turma (403)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { apiAluno } = await cenario.matricularAluno();
    const resp = await apiAluno.get(`/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`);
    expect(resp.status).toBe(403);
  });
});

test.describe("Autorização — rotas administrativas (§17.4 corrigido) @integrity", () => {
  test("leitura administrativa de dados pessoais exige autenticação (401)", async ({ api }) => {
    expect((await api.get("/alunos")).status).toBe(401);
    expect((await api.get("/alunos/00000000-0000-4000-8000-000000000000/ficha")).status).toBe(401);
  });

  test("escrita administrativa exige autenticação (anônimo 401)", async ({ api, runId }) => {
    const resp = await api.post("/cursos", {
      body: { codigo: `X${runId}`, nome: "x", departamentoId: "00000000-0000-4000-8000-000000000000" },
    });
    expect(resp.status).toBe(401);
  });

  test("escrita exige secretaria (perfil aluno 403)", async ({ novoCenario, runId }) => {
    const cenario = await novoCenario();
    const { apiAluno } = await cenario.matricularAluno();
    const resp = await apiAluno.post("/cursos", {
      body: { codigo: `Y${runId}`, nome: "x", departamentoId: "00000000-0000-4000-8000-000000000000" },
    });
    expect(resp.status).toBe(403);
  });

  test("escrita de faculdade/departamento exige autenticação; leitura permanece pública", async ({ api }) => {
    // Decisão de produto: escritas protegidas, leituras de referência públicas.
    expect((await api.post("/faculdades", { body: {} })).status).toBe(401);
    expect((await api.post("/departamentos", { body: {} })).status).toBe(401);
    expect((await api.get("/faculdades")).status).toBe(200);
    expect((await api.get("/departamentos")).status).toBe(200);
    expect((await api.get("/cidades")).status).toBe(200);
  });
});
