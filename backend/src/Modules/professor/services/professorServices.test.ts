import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { professorRepository } from "../repository/professorRepository.js";
import { professorService } from "./professorServices.js";
import type { CriarProfessorDTO } from "../models/professorModels.js";

const repositoryOriginal = { ...professorRepository };

const professorCompleto = {
  id: "professor-1",
  nome: "Maria Silva",
  email: "maria@unieduca.local",
  cpf: "12345678901",
  curso_id: "curso-1",
  faculdade_id: "faculdade-1",
};

const dadosCadastroProfessor: CriarProfessorDTO = {
  nome: "Maria Silva",
  email: "maria@unieduca.local",
  senha: "123456",
  cpf: "12345678901",
  data_nascimento: "1990-01-01",
  logradouro: "Rua A",
  numero: "10",
  bairro: "Centro",
  cidade_id: "3652500",
  estado: "MG",
  cep: "36500000",
  curso_id: "curso-1",
  faculdade_id: "faculdade-1",
};

function criarPayloadProfessor(overrides: Partial<CriarProfessorDTO> = {}): CriarProfessorDTO {
  return { ...dadosCadastroProfessor, ...overrides };
}

describe("professorService", () => {
  beforeEach(() => {
    Object.assign(professorRepository, repositoryOriginal);
  });

  afterEach(() => {
    Object.assign(professorRepository, repositoryOriginal);
  });

  it("bloqueia criacao com e-mail ja cadastrado", async () => {
    const dados = criarPayloadProfessor();
    let cpfConsultado = false;
    let criarChamado = false;

    professorRepository.buscarPorEmail = async (email) => {
      assert.equal(email, dados.email);
      return { id: "professor-existente" };
    };
    professorRepository.buscarPorCpf = async () => {
      cpfConsultado = true;
      return undefined;
    };
    professorRepository.criar = async () => {
      criarChamado = true;
      return professorCompleto as any;
    };

    await assert.rejects(
      () => professorService.criar(dados),
      /e-mail/,
    );

    assert.equal(cpfConsultado, false);
    assert.equal(criarChamado, false);
  });

  it("bloqueia criacao com CPF ja cadastrado", async () => {
    const dados = criarPayloadProfessor();
    let criarChamado = false;

    professorRepository.buscarPorEmail = async (email) => {
      assert.equal(email, dados.email);
      return undefined;
    };
    professorRepository.buscarPorCpf = async (cpf) => {
      assert.equal(cpf, dados.cpf);
      return { id: "professor-existente" };
    };
    professorRepository.criar = async () => {
      criarChamado = true;
      return professorCompleto as any;
    };

    await assert.rejects(
      () => professorService.criar(dados),
      /CPF/,
    );

    assert.equal(criarChamado, false);
  });

  it("retorna erro ao atualizar professor inexistente", async () => {
    professorRepository.buscarPorId = async () => undefined;

    await assert.rejects(
      () => professorService.atualizar("professor-inexistente", { nome: "Novo nome" }),
      /Professor n.o encontrado/,
    );
  });

  it("encaminha dados validos para o repository ao criar", async () => {
    const dados = criarPayloadProfessor();
    let payloadRecebido: any;

    professorRepository.buscarPorEmail = async (email) => {
      assert.equal(email, dados.email);
      return undefined;
    };
    professorRepository.buscarPorCpf = async (cpf) => {
      assert.equal(cpf, dados.cpf);
      return undefined;
    };
    professorRepository.criar = async (payload: any) => {
      payloadRecebido = payload;
      return professorCompleto as any;
    };

    const result = await professorService.criar(dados);

    assert.deepEqual(payloadRecebido, dados);
    assert.equal(result.id, "professor-1");
  });
});
