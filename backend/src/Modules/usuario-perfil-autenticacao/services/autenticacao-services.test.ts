import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { afterEach, beforeEach, describe, it } from "vitest";
import autenticacaoService from "./autenticacao-services";

function mockRepo(overrides: Record<string, any> = {}) {
  const repo = {
    findByEmail: async (_email: string) => null,
    buscarAlunoSimples: async (_id: string) => ({ id: "a1", usuario_id: null }),
    buscarProfessorSimples: async (_id: string) => ({ id: "p1", ativo: true, usuario_id: null }),
    buscarProfessorPorUsuario: async (_id: string) => ({ id: "p1", ativo: true }),
    create: async (dados: any) => ({ id: "u1", ...dados }),
    vincularUsuarioAoAluno: async () => undefined,
    vincularUsuarioAoProfessor: async () => undefined,
    buscarPorId: async (id: string) => ({ id, nome: "Fulano", email: "f@x.com", senha: "hash", tipo_usuario: "secretaria" }),
    buscarAlunoPorUsuario: async () => null,
    listarAlunosSemUsuario: async () => [],
    listarProfessoresSemUsuario: async () => [],
    findAll: async () => [],
    update: async (_id: string, _dados: any) => undefined,
    delete: async (_id: string) => undefined,
    desvincularAlunosDoUsuario: async () => undefined,
    desvincularProfessoresDoUsuario: async () => undefined,
    ...overrides,
  };
  (autenticacaoService as any).usuarioRepository = repo;
  return repo;
}

describe("AutenticacaoService.cadastrarUsuario", () => {
  it("exige nome, email, senha e tipo_usuario", async () => {
    mockRepo();
    await assert.rejects(() => autenticacaoService.cadastrarUsuario({ nome: "x" }), /campos obrigatórios/);
  });

  it("rejeita e-mail ja cadastrado", async () => {
    mockRepo({ findByEmail: async () => ({ id: "u9" }) });
    await assert.rejects(
      () => autenticacaoService.cadastrarUsuario({ nome: "x", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "secretaria" }),
      /já está cadastrado/,
    );
  });

  it("rejeita vinculo com aluno inexistente ou ja vinculado", async () => {
    mockRepo({ buscarAlunoSimples: async () => null });
    await assert.rejects(
      () => autenticacaoService.cadastrarUsuario({ nome: "x", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "aluno", aluno_id: "a1" }),
      /Aluno selecionado não encontrado/,
    );

    mockRepo({ buscarAlunoSimples: async () => ({ id: "a1", usuario_id: "u2" }) });
    await assert.rejects(
      () => autenticacaoService.cadastrarUsuario({ nome: "x", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "aluno", aluno_id: "a1" }),
      /já possui um login vinculado/,
    );
  });

  it("rejeita professor inativo", async () => {
    mockRepo({ buscarProfessorSimples: async () => ({ id: "p1", ativo: false, usuario_id: null }) });
    await assert.rejects(
      () => autenticacaoService.cadastrarUsuario({ nome: "x", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "professor", professor_id: "p1" }),
      /Professor inativo/,
    );
  });

  it("cria o usuario com senha criptografada, tipo em minusculo e vincula o aluno", async () => {
    let criado: any;
    let vinculo: any;
    mockRepo({
      create: async (d: any) => ((criado = d), { id: "u1", ...d }),
      vincularUsuarioAoAluno: async (alunoId: string, usuarioId: string) => {
        vinculo = { alunoId, usuarioId };
      },
    });
    await autenticacaoService.cadastrarUsuario({
      nome: "Fulano", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "ALUNO", aluno_id: "a1",
    });
    assert.equal(criado.tipo_usuario, "aluno");
    assert.notEqual(criado.senha, "Segredo@123");
    assert.equal(await bcrypt.compare("Segredo@123", criado.senha), true);
    assert.deepEqual(vinculo, { alunoId: "a1", usuarioId: "u1" });
  });

  it("rejeita vinculo com professor inexistente ou ja vinculado", async () => {
    mockRepo({ buscarProfessorSimples: async () => null });
    await assert.rejects(
      () => autenticacaoService.cadastrarUsuario({ nome: "x", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "professor", professor_id: "p1" }),
      /Professor selecionado não encontrado/,
    );

    mockRepo({ buscarProfessorSimples: async () => ({ id: "p1", ativo: true, usuario_id: "u2" }) });
    await assert.rejects(
      () => autenticacaoService.cadastrarUsuario({ nome: "x", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "professor", professor_id: "p1" }),
      /já possui um login vinculado/,
    );
  });

  it("cria o usuario e vincula o professor", async () => {
    let vinculo: any;
    mockRepo({
      create: async (d: any) => ({ id: "u1", ...d }),
      vincularUsuarioAoProfessor: async (professorId: string, usuarioId: string) => {
        vinculo = { professorId, usuarioId };
      },
    });
    await autenticacaoService.cadastrarUsuario({
      nome: "Fulano", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "PROFESSOR", professor_id: "p1",
    });
    assert.deepEqual(vinculo, { professorId: "p1", usuarioId: "u1" });
  });

  it("nao exige vinculo quando aluno_id/professor_id nao sao informados", async () => {
    const repo = mockRepo({ create: async (d: any) => ({ id: "u1", ...d }) });
    const usuario = await autenticacaoService.cadastrarUsuario({
      nome: "Fulano", email: "a@b.com", senha: "Segredo@123", tipo_usuario: "secretaria",
    });
    assert.equal(usuario.id, "u1");
  });
});

describe("AutenticacaoService listagens e leitura", () => {
  it("listarAlunosSemUsuario delega ao repositorio", async () => {
    const alunos = [{ id: "a1" }];
    mockRepo({ listarAlunosSemUsuario: async () => alunos });
    assert.deepEqual(await autenticacaoService.listarAlunosSemUsuario(), alunos);
  });

  it("listarProfessoresSemUsuario delega ao repositorio", async () => {
    const professores = [{ id: "p1" }];
    mockRepo({ listarProfessoresSemUsuario: async () => professores });
    assert.deepEqual(await autenticacaoService.listarProfessoresSemUsuario(), professores);
  });

  it("listarTodos delega ao repositorio", async () => {
    const usuarios = [{ id: "u1" }];
    mockRepo({ findAll: async () => usuarios });
    assert.deepEqual(await autenticacaoService.listarTodos(), usuarios);
  });
});

describe("AutenticacaoService.login", () => {
  let jwtSecret: string | undefined;

  beforeEach(() => {
    jwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "segredo-de-teste-com-tamanho-suficiente-1";
  });

  afterEach(() => {
    if (jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwtSecret;
  });

  it("rejeita usuario inexistente", async () => {
    mockRepo({ findByEmail: async () => null });
    await assert.rejects(() => autenticacaoService.login("x@x.com", "123"), /Usuário não encontrado/);
  });

  it("rejeita professor inativo", async () => {
    const senha = await bcrypt.hash("123", 10);
    mockRepo({
      findByEmail: async () => ({ id: "u1", tipo_usuario: "professor", senha, nome: "P", email: "p@x.com" }),
      buscarProfessorPorUsuario: async () => ({ id: "p1", ativo: false }),
    });
    await assert.rejects(() => autenticacaoService.login("p@x.com", "123"), /Professor inativo/);
  });

  it("rejeita senha invalida", async () => {
    const senha = await bcrypt.hash("correta", 10);
    mockRepo({ findByEmail: async () => ({ id: "u1", tipo_usuario: "secretaria", senha, nome: "S", email: "s@x.com" }) });
    await assert.rejects(() => autenticacaoService.login("s@x.com", "errada"), /Senha inválida/);
  });

  it("retorna token e dados publicos do usuario no login valido", async () => {
    const senha = await bcrypt.hash("correta", 10);
    mockRepo({ findByEmail: async () => ({ id: "u1", tipo_usuario: "secretaria", senha, nome: "S", email: "s@x.com" }) });
    const r = await autenticacaoService.login("s@x.com", "correta");
    assert.ok(r.token);
    assert.deepEqual(r.usuario, { id: "u1", nome: "S", email: "s@x.com", tipo_usuario: "secretaria" });
  });

  it("permite login de professor ativo", async () => {
    const senha = await bcrypt.hash("correta", 10);
    mockRepo({
      findByEmail: async () => ({ id: "u1", tipo_usuario: "professor", senha, nome: "P", email: "p@x.com" }),
      buscarProfessorPorUsuario: async () => ({ id: "p1", ativo: true }),
    });
    const r = await autenticacaoService.login("p@x.com", "correta");
    assert.ok(r.token);
    assert.equal(r.usuario.tipo_usuario, "professor");
  });

  it("rejeita login de professor sem vinculo encontrado", async () => {
    const senha = await bcrypt.hash("correta", 10);
    mockRepo({
      findByEmail: async () => ({ id: "u1", tipo_usuario: "professor", senha, nome: "P", email: "p@x.com" }),
      buscarProfessorPorUsuario: async () => null,
    });
    await assert.rejects(() => autenticacaoService.login("p@x.com", "correta"), /Professor inativo/);
  });
});

describe("AutenticacaoService.getMe", () => {
  it("lanca erro quando o usuario nao existe", async () => {
    mockRepo({ buscarPorId: async () => null });
    await assert.rejects(() => autenticacaoService.getMe("u1"), /Usuário não encontrado/);
  });

  it("nao expoe a senha", async () => {
    mockRepo({ buscarPorId: async () => ({ id: "u1", nome: "S", email: "s@x.com", senha: "hash", tipo_usuario: "secretaria" }) });
    const me = await autenticacaoService.getMe("u1");
    assert.equal((me as any).senha, undefined);
    assert.equal(me.pessoa, null);
  });

  it("monta pessoa e academico para aluno vinculado", async () => {
    mockRepo({
      buscarPorId: async () => ({ id: "u1", nome: "S", email: "s@x.com", senha: "hash", tipo_usuario: "aluno" }),
      buscarAlunoPorUsuario: async () => ({
        pessoa_nome: "Aluno Um", cpf: "111", matricula: "2024001", curso_nome: "ADS", curso_codigo: "ADS01", periodo: 3,
      }),
    });
    const me = await autenticacaoService.getMe("u1");
    assert.deepEqual(me.pessoa, {
      nome: "Aluno Um", cpf: "111", data_nascimento: null, logradouro: null, numero: null, bairro: null, estado: null, cep: null,
    });
    assert.deepEqual(me.academico, { matricula: "2024001", curso: "ADS", curso_codigo: "ADS01", periodo: 3 });
  });

  it("mantem pessoa/academico nulos quando aluno vinculado nao e encontrado", async () => {
    mockRepo({
      buscarPorId: async () => ({ id: "u1", nome: "S", email: "s@x.com", senha: "hash", tipo_usuario: "aluno" }),
      buscarAlunoPorUsuario: async () => null,
    });
    const me = await autenticacaoService.getMe("u1");
    assert.equal(me.pessoa, null);
    assert.equal(me.academico, null);
  });

  it("monta pessoa e academico para professor vinculado", async () => {
    mockRepo({
      buscarPorId: async () => ({ id: "u1", nome: "S", email: "s@x.com", senha: "hash", tipo_usuario: "professor" }),
      buscarProfessorPorUsuario: async () => ({
        pessoa_nome: "Prof Um", cpf: "222", curso_nome: "ADS", curso_codigo: "ADS01", faculdade_nome: "Unieduca",
      }),
    });
    const me = await autenticacaoService.getMe("u1");
    assert.deepEqual(me.pessoa, {
      nome: "Prof Um", cpf: "222", data_nascimento: null, logradouro: null, numero: null, bairro: null, estado: null, cep: null,
    });
    assert.deepEqual(me.academico, { curso: "ADS", curso_codigo: "ADS01", faculdade: "Unieduca" });
  });

  it("preenche academico com nulos quando os dados do aluno/professor vinculado estao incompletos", async () => {
    mockRepo({
      buscarPorId: async () => ({ id: "u1", nome: "S", email: "s@x.com", senha: "hash", tipo_usuario: "aluno" }),
      buscarAlunoPorUsuario: async () => ({}),
    });
    const me = await autenticacaoService.getMe("u1");
    assert.deepEqual(me.academico, { matricula: null, curso: null, curso_codigo: null, periodo: null });
    assert.deepEqual(me.pessoa, {
      nome: null, cpf: null, data_nascimento: null, logradouro: null, numero: null, bairro: null, estado: null, cep: null,
    });

    mockRepo({
      buscarPorId: async () => ({ id: "u1", nome: "S", email: "s@x.com", senha: "hash", tipo_usuario: "professor" }),
      buscarProfessorPorUsuario: async () => ({}),
    });
    const me2 = await autenticacaoService.getMe("u1");
    assert.deepEqual(me2.academico, { curso: null, curso_codigo: null, faculdade: null });
  });

  it("mantem pessoa/academico nulos quando professor vinculado nao e encontrado", async () => {
    mockRepo({
      buscarPorId: async () => ({ id: "u1", nome: "S", email: "s@x.com", senha: "hash", tipo_usuario: "professor" }),
      buscarProfessorPorUsuario: async () => null,
    });
    const me = await autenticacaoService.getMe("u1");
    assert.equal(me.pessoa, null);
    assert.equal(me.academico, null);
  });
});

describe("AutenticacaoService.atualizarUsuario", () => {
  it("lanca erro quando o usuario nao existe", async () => {
    mockRepo({ buscarPorId: async () => null });
    await assert.rejects(() => autenticacaoService.atualizarUsuario("u1", { nome: "x" }), /Usuário não encontrado/);
  });

  it("nao chama update quando nenhum campo e informado", async () => {
    let chamado = false;
    mockRepo({ update: async () => { chamado = true; } });
    await autenticacaoService.atualizarUsuario("u1", {});
    assert.equal(chamado, false);
  });

  it("atualiza apenas os campos informados, ignorando senha em branco", async () => {
    let dadosAtualizados: any;
    mockRepo({ update: async (_id: string, dados: any) => { dadosAtualizados = dados; } });
    await autenticacaoService.atualizarUsuario("u1", { nome: "Novo Nome", senha: "" });
    assert.deepEqual(dadosAtualizados, { nome: "Novo Nome" });
  });

  it("criptografa a senha quando informada", async () => {
    let dadosAtualizados: any;
    mockRepo({ update: async (_id: string, dados: any) => { dadosAtualizados = dados; } });
    await autenticacaoService.atualizarUsuario("u1", { email: "novo@x.com", tipo_usuario: "SECRETARIA", senha: "NovaSenha@123" });
    assert.equal(dadosAtualizados.email, "novo@x.com");
    assert.equal(dadosAtualizados.tipo_usuario, "secretaria");
    assert.equal(await bcrypt.compare("NovaSenha@123", dadosAtualizados.senha), true);
  });

  it("nao mexe no vinculo quando aluno_id e professor_id nao sao informados", async () => {
    let desvinculouAluno = false;
    mockRepo({ desvincularAlunosDoUsuario: async () => { desvinculouAluno = true; } });
    await autenticacaoService.atualizarUsuario("u1", { nome: "Novo" });
    assert.equal(desvinculouAluno, false);
  });

  it("rejeita vincular aluno inexistente", async () => {
    mockRepo({ buscarAlunoSimples: async () => null });
    await assert.rejects(
      () => autenticacaoService.atualizarUsuario("u1", { tipo_usuario: "aluno", aluno_id: "a1" }),
      /Aluno selecionado não encontrado/,
    );
  });

  it("rejeita vincular aluno ja vinculado a outro usuario", async () => {
    mockRepo({ buscarAlunoSimples: async () => ({ id: "a1", usuario_id: "outro" }) });
    await assert.rejects(
      () => autenticacaoService.atualizarUsuario("u1", { tipo_usuario: "aluno", aluno_id: "a1" }),
      /já possui um login vinculado/,
    );
  });

  it("permite manter o vinculo de aluno ja pertencente ao proprio usuario", async () => {
    let vinculado: any;
    mockRepo({
      buscarAlunoSimples: async () => ({ id: "a1", usuario_id: "u1" }),
      vincularUsuarioAoAluno: async (alunoId: string, usuarioId: string) => { vinculado = { alunoId, usuarioId }; },
    });
    await autenticacaoService.atualizarUsuario("u1", { tipo_usuario: "aluno", aluno_id: "a1" });
    assert.deepEqual(vinculado, { alunoId: "a1", usuarioId: "u1" });
  });

  it("rejeita vincular professor inexistente", async () => {
    mockRepo({ buscarProfessorSimples: async () => null });
    await assert.rejects(
      () => autenticacaoService.atualizarUsuario("u1", { tipo_usuario: "professor", professor_id: "p1" }),
      /Professor selecionado não encontrado/,
    );
  });

  it("rejeita vincular professor inativo", async () => {
    mockRepo({ buscarProfessorSimples: async () => ({ id: "p1", ativo: false, usuario_id: null }) });
    await assert.rejects(
      () => autenticacaoService.atualizarUsuario("u1", { tipo_usuario: "professor", professor_id: "p1" }),
      /Professor inativo/,
    );
  });

  it("rejeita vincular professor ja vinculado a outro usuario", async () => {
    mockRepo({ buscarProfessorSimples: async () => ({ id: "p1", ativo: true, usuario_id: "outro" }) });
    await assert.rejects(
      () => autenticacaoService.atualizarUsuario("u1", { tipo_usuario: "professor", professor_id: "p1" }),
      /já possui um login vinculado/,
    );
  });

  it("nao vincula ninguem quando o tipo efetivo e aluno mas nenhum aluno_id e informado", async () => {
    let vinculouAluno = false;
    let vinculouProfessor = false;
    mockRepo({
      buscarPorId: async (id: string) => ({ id, nome: "F", email: "f@x.com", senha: "hash", tipo_usuario: "aluno" }),
      vincularUsuarioAoAluno: async () => { vinculouAluno = true; },
      vincularUsuarioAoProfessor: async () => { vinculouProfessor = true; },
    });
    await autenticacaoService.atualizarUsuario("u1", { professor_id: "p1" });
    assert.equal(vinculouAluno, false);
    assert.equal(vinculouProfessor, false);
  });

  it("vincula o professor, desvinculando o anterior, usando o tipo efetivo do usuario existente", async () => {
    let desvinculouAluno = false;
    let desvinculouProfessor = false;
    let vinculado: any;
    mockRepo({
      buscarPorId: async (id: string) => ({ id, nome: "F", email: "f@x.com", senha: "hash", tipo_usuario: "professor" }),
      desvincularAlunosDoUsuario: async () => { desvinculouAluno = true; },
      desvincularProfessoresDoUsuario: async () => { desvinculouProfessor = true; },
      vincularUsuarioAoProfessor: async (professorId: string, usuarioId: string) => { vinculado = { professorId, usuarioId }; },
    });
    const r = await autenticacaoService.atualizarUsuario("u1", { professor_id: "p1" });
    assert.equal(desvinculouAluno, true);
    assert.equal(desvinculouProfessor, true);
    assert.deepEqual(vinculado, { professorId: "p1", usuarioId: "u1" });
    assert.deepEqual(r, { id: "u1" });
  });
});

describe("AutenticacaoService.excluirUsuario", () => {
  it("lanca erro quando o usuario nao existe", async () => {
    mockRepo({ buscarPorId: async () => null });
    await assert.rejects(() => autenticacaoService.excluirUsuario("u1"), /Usuário não encontrado/);
  });

  it("exclui o usuario existente", async () => {
    let idExcluido: string | undefined;
    mockRepo({ delete: async (id: string) => { idExcluido = id; return true; } });
    const r = await autenticacaoService.excluirUsuario("u1");
    assert.equal(idExcluido, "u1");
    assert.equal(r, true);
  });
});
