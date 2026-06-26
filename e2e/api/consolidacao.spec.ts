import { test, expect } from "../fixtures/test.js";

/**
 * Consolidação (spec §6, §11.6): home do aluno, ficha e relatórios. Foco em
 * isolamento por aluno/perfil e coerência com a matrícula.
 */
test.describe("Home do aluno @api", () => {
  test("disciplinas e tarefas exigem perfil aluno e refletem a matrícula", async ({ novoCenario, api }) => {
    const cenario = await novoCenario();
    const { aluno, apiAluno } = await cenario.matricularAluno();

    const disciplinas = await apiAluno.get("/me/disciplinas");
    expect(disciplinas.status).toBe(200);
    expect(disciplinas.body.some((d: any) => d.disciplinaId === cenario.disciplinaId)).toBe(true);

    const tarefas = await apiAluno.get("/me/tarefas");
    expect(tarefas.status).toBe(200);
    expect(Array.isArray(tarefas.body)).toBe(true);

    // Secretaria não acessa a home do aluno (§8).
    const secretaria = await cenario.apiSecretaria.get("/me/disciplinas");
    expect(secretaria.status).toBe(403);

    // Anônimo é barrado (autenticar).
    const anon = await api.get("/me/disciplinas");
    expect(anon.status).toBe(401);

    // Garante que o objeto `aluno` foi usado (evita lint de variável não usada).
    expect(aluno.id).toBeTruthy();
  });
});

test.describe("Ficha do aluno @api", () => {
  test("consolida aluno e matrículas", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const ficha = await cenario.apiSecretaria.get(`/alunos/${aluno.id}/ficha`);
    expect(ficha.status).toBe(200);
    expect(ficha.body.aluno).toBeTruthy();
    expect(Array.isArray(ficha.body.matriculas)).toBe(true);
    expect(ficha.body.matriculas.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Relatórios acadêmicos @api", () => {
  test("status da fonte de dados aponta para o banco piv", async ({ apiSecretaria }) => {
    const status = await apiSecretaria.get("/relatorios/academicos/status");
    expect(status.status).toBe(200);
    expect(status.body.source).toBe("database");
    expect(status.body.schema).toBe("piv");
  });

  test("secretaria lista relatórios; anônimo é barrado (401)", async ({ apiSecretaria, api }) => {
    const lista = await apiSecretaria.get("/relatorios/academicos");
    expect(lista.status).toBe(200);
    expect(Array.isArray(lista.body)).toBe(true);

    const anon = await api.get("/relatorios/academicos");
    expect(anon.status).toBe(401);
  });

  test("relatórios do aluno são restritos ao perfil Aluno", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { apiAluno } = await cenario.matricularAluno();
    const relatorios = await apiAluno.get("/relatorios/academicos");
    expect(relatorios.status).toBe(200);
    // Quando há itens, todos devem ser do perfil Aluno (não expõe terceiros).
    for (const item of relatorios.body) {
      expect(item.perfis).toContain("Aluno");
    }
  });
});
