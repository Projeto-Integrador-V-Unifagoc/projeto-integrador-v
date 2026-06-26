import { test, expect } from "../fixtures/test.js";
import * as ids from "../helpers/ids.js";

/**
 * Módulos `cidades`, `modulo-status-matricula-disciplina`, `routes` e o diretório
 * legado `modulo-professores` (spec §6, §11.2). Inclui smoke de rotas e 404.
 */
test.describe("Cidades @api", () => {
  test("lista cidades e consulta por IBGE", async ({ apiSecretaria }) => {
    const lista = await apiSecretaria.get("/cidades");
    expect(lista.status).toBe(200);
    expect(Array.isArray(lista.body)).toBe(true);
    expect(lista.body.length).toBeGreaterThan(0);

    const ibge = lista.body[0].ibge;
    const detalhe = await apiSecretaria.get(`/cidades/${ibge}`);
    expect(detalhe.status).toBe(200);
    expect(String(detalhe.body.ibge)).toBe(String(ibge));
  });

  test("IBGE inexistente: contrato atual do CRUD de cidades mantido (200, corpo vazio)", async ({ apiSecretaria }) => {
    // Decisão de produto: o CRUD de cidades é mantido como está. A consulta por
    // IBGE inexistente responde 200 com corpo nulo (não 404). Documentado.
    const resp = await apiSecretaria.get("/cidades/0000000");
    expect(resp.status).toBe(200);
    expect(resp.body == null || resp.body === "" || Object.keys(resp.body ?? {}).length === 0).toBe(true);
  });
});

test.describe("Status de matrícula/disciplina @api", () => {
  test("CRUD de status de disciplina (cria, lista, consulta, atualiza)", async ({ apiSecretaria, runId }) => {
    const criar = await apiSecretaria.post("/statusDisciplina", {
      body: { descricao: `Cursando ${runId}` },
    });
    expect([200, 201]).toContain(criar.status);
    const id = criar.body.id;

    const lista = await apiSecretaria.get("/statusDisciplina");
    expect(lista.status).toBe(200);

    const consulta = await apiSecretaria.get(`/statusDisciplina/${id}`);
    expect(consulta.status).toBe(200);

    const atualizar = await apiSecretaria.put(`/statusDisciplina/${id}`, {
      body: { descricao: `Cursando Atualizado ${runId}` },
    });
    expect([200, 204]).toContain(atualizar.status);
  });

  test("status de curso pode ser criado e listado", async ({ apiSecretaria, runId }) => {
    const criar = await apiSecretaria.post("/statusCurso", { body: { descricao: `Ativo ${runId}` } });
    expect([200, 201]).toContain(criar.status);
    const lista = await apiSecretaria.get("/statusCurso");
    expect(lista.status).toBe(200);
  });
});

test.describe("Smoke de rotas e 404 @api", () => {
  test("rota inexistente retorna 404", async ({ apiSecretaria }) => {
    const resp = await apiSecretaria.get(`/rota-que-nao-existe-${ids.runId()}`);
    expect(resp.status).toBe(404);
  });

  test("endpoints montados respondem (não 404) para a secretaria", async ({ apiSecretaria }) => {
    // Smoke dos principais GETs de listagem montados em app.ts / routers.
    const rotas = [
      "/alunos",
      "/cidades",
      "/faculdades",
      "/departamentos",
      "/cursos",
      "/disciplinas",
      "/periodos-letivos",
      "/curso-disciplina",
      "/turmas",
      "/statusDisciplina",
      "/statusCurso",
      "/professores",
      "/avaliacoes",
      "/matriculas",
      "/relatorios/academicos",
    ];
    for (const rota of rotas) {
      const resp = await apiSecretaria.get(rota);
      expect(resp.status, `rota ${rota} respondeu ${resp.status}`).not.toBe(404);
      expect(resp.status).toBeLessThan(500);
    }
  });

  test("módulo legado `modulo-professores` não expõe rota própria (usar /professores)", async ({ apiSecretaria }) => {
    // O diretório modulo-professores está vazio; o módulo efetivo é /professores.
    const legado = await apiSecretaria.get("/modulo-professores");
    expect(legado.status).toBe(404);
    const efetivo = await apiSecretaria.get("/professores");
    expect(efetivo.status).toBe(200);
  });
});
