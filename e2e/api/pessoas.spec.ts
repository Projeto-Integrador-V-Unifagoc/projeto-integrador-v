import { test, expect } from "../fixtures/test.js";
import { pegarCidade } from "../helpers/db.js";
import * as ids from "../helpers/ids.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";
import * as professorFactory from "../factories/professor.factory.js";
import { criarAluno } from "../factories/aluno.factory.js";
import { cadastrarUsuario, login } from "../factories/usuario.factory.js";

/**
 * Pessoas: gestão de alunos e professores (spec §6, §11.3). CPF único, dados
 * sensíveis, sincronização pessoa↔entidade, inativação/reativação e busca.
 */

async function cursoBase(apiSecretaria: any, runId: string) {
  const cidade = await pegarCidade();
  const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
  const dep = await estrutura.criarDepartamento(apiSecretaria, runId, fac.id);
  const curso = await estrutura.criarCurso(apiSecretaria, runId, dep.id);
  return { cidade, cursoId: curso.id };
}

test.describe("Professores @api", () => {
  test("CRUD lógico: cria, busca, inativa (204) e reativa (200)", async ({ apiSecretaria, runId }) => {
    const { cidade, cursoId } = await cursoBase(apiSecretaria, runId);
    const prof = await professorFactory.criarProfessor(apiSecretaria, runId, {
      cursoId,
      cidadeIbge: cidade.ibge,
      uf: cidade.uf,
    });
    const lido = await apiSecretaria.get(`/professores/${prof.id}`);
    expect(lido.status).toBe(200);

    const inativa = await apiSecretaria.del(`/professores/${prof.id}`);
    expect(inativa.status).toBe(204);

    const reativa = await apiSecretaria.patch(`/professores/${prof.id}/reativar`);
    expect(reativa.status).toBe(200);
  });

  test("CPF duplicado retorna 409", async ({ apiSecretaria, runId }) => {
    const { cidade, cursoId } = await cursoBase(apiSecretaria, runId);
    const cpf = ids.cpf();
    await professorFactory.criarProfessor(apiSecretaria, runId, { cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf, cpf });
    const dup = await apiSecretaria.post("/professores", {
      body: {
        nome: `Professor ${runId}`,
        cpf,
        data_nascimento: "1985-05-10",
        logradouro: "X",
        numero: "1",
        bairro: "Y",
        cidade_id: cidade.ibge,
        estado: cidade.uf,
        cep: "35300000",
        curso_id: cursoId,
      },
    });
    expect(dup.status).toBe(409);
  });

  test("CPF inválido retorna 400", async ({ apiSecretaria, runId }) => {
    const { cidade, cursoId } = await cursoBase(apiSecretaria, runId);
    const resp = await apiSecretaria.post("/professores", {
      body: {
        nome: `Professor ${runId}`,
        cpf: "11111111111",
        data_nascimento: "1985-05-10",
        logradouro: "X",
        numero: "1",
        bairro: "Y",
        cidade_id: cidade.ibge,
        estado: cidade.uf,
        cep: "35300000",
        curso_id: cursoId,
      },
    });
    expect(resp.status).toBe(400);
  });

  test("buscar professor inexistente retorna 404", async ({ apiSecretaria }) => {
    const resp = await apiSecretaria.get(`/professores/${ids.uuid()}`);
    expect(resp.status).toBe(404);
  });

  test("professor inativo não autentica nem recebe novo vínculo", async ({ apiSecretaria, runId }) => {
    const { cidade, cursoId } = await cursoBase(apiSecretaria, runId);
    const { professor, email, senha } = await professorFactory.criarProfessorComLogin(apiSecretaria, runId, {
      cursoId,
      cidadeIbge: cidade.ibge,
      uf: cidade.uf,
    });
    // Login funciona antes de inativar.
    expect(await login(apiSecretaria, email, senha)).toBeTruthy();

    const inativa = await apiSecretaria.del(`/professores/${professor.id}`);
    expect(inativa.status).toBe(204);

    // Após inativar, novo login é negado (§11.1).
    const loginInativo = await apiSecretaria.post("/login", { body: { email, senha } });
    expect(loginInativo.status).toBe(401);

    // Tentar vincular um novo usuário ao professor inativo é rejeitado.
    const vinculo = await apiSecretaria.post("/cadastro", {
      body: {
        nome: "Outro",
        email: ids.email("prof2", runId),
        senha: "Senha@123",
        tipo_usuario: "professor",
        professor_id: professor.id,
      },
    });
    expect(vinculo.status).toBe(400);
  });
});

test.describe("Alunos @api", () => {
  test("cria aluno e busca por id, matrícula e texto", async ({ apiSecretaria, runId }) => {
    const { cidade, cursoId } = await cursoBase(apiSecretaria, runId);
    const aluno = await criarAluno(apiSecretaria, runId, { cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf });

    const porId = await apiSecretaria.get(`/alunos/id/${aluno.id}`);
    expect(porId.status).toBe(200);

    if (aluno.matricula) {
      const porMatricula = await apiSecretaria.get(`/alunos/${aluno.matricula}`);
      expect(porMatricula.status).toBe(200);
    }

    const busca = await apiSecretaria.get("/alunos/buscar", { query: { q: aluno.cpf } });
    expect(busca.status).toBe(200);
    expect(Array.isArray(busca.body)).toBe(true);
  });

  test("CPF duplicado de pessoa é rejeitado (400)", async ({ apiSecretaria, runId }) => {
    const { cidade, cursoId } = await cursoBase(apiSecretaria, runId);
    const cpf = ids.cpf();
    await criarAluno(apiSecretaria, runId, { cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf, cpf });
    const dup = await apiSecretaria.post("/alunos", {
      body: {
        pessoa: {
          cpf,
          nome: "Outro",
          dataNascimento: "2002-01-01",
          logradouro: "X",
          numero: "1",
          bairro: "Y",
          cidadeIbge: cidade.ibge,
          estado: cidade.uf,
          cep: "35300000",
        },
        periodo: "1",
        curso: cursoId,
      },
    });
    expect(dup.status).toBe(400);
  });

  test("busca com menos de 3 caracteres é rejeitada (400)", async ({ apiSecretaria }) => {
    const resp = await apiSecretaria.get("/alunos/buscar", { query: { q: "ab" } });
    expect(resp.status).toBe(400);
  });

  test("/me do aluno não expõe hash e traz dados acadêmicos", async ({ apiSecretaria, runId }) => {
    const { cidade, cursoId } = await cursoBase(apiSecretaria, runId);
    const aluno = await criarAluno(apiSecretaria, runId, { cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf });
    const email = ids.email("aluno", runId);
    const senha = "Aluno@1234";
    await cadastrarUsuario(apiSecretaria, { nome: "Aluno", email, senha, tipo_usuario: "aluno", aluno_id: aluno.id });
    const token = await login(apiSecretaria, email, senha);
    const me = await apiSecretaria.get("/me", { token });
    expect(me.status).toBe(200);
    expect(JSON.stringify(me.body)).not.toMatch(/\$2[aby]\$/);
    expect(me.body.data.pessoa).toBeTruthy();
  });
});
