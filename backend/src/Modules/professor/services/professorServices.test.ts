import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { professorRepository } from "../repository/professorRepository.js";
import { professorService } from "./professorServices.js";

const repositoryOriginal = { ...professorRepository };

const professorCompleto = {
  id: "professor-1",
  nome: "Maria Silva",
  email: "maria@unieduca.local",
  cpf: "12345678901",
  curso_id: "curso-1",
  faculdade_id: "faculdade-1",
};

describe("professorService", () => {
  beforeEach(() => {
    Object.assign(professorRepository, repositoryOriginal);
  });

  afterEach(() => {
    Object.assign(professorRepository, repositoryOriginal);
  });

  it("bloqueia criacao com e-mail ja cadastrado", async () => {
    professorRepository.buscarPorEmail = async () => ({ id: "professor-existente" });
    professorRepository.buscarPorCpf = async () => undefined;

    await assert.rejects(
      () =>
        professorService.criar({
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
        }),
      /e-mail/,
    );
  });

  it("bloqueia criacao com CPF ja cadastrado", async () => {
    professorRepository.buscarPorEmail = async () => undefined;
    professorRepository.buscarPorCpf = async () => ({ id: "professor-existente" });

    await assert.rejects(
      () =>
        professorService.criar({
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
        }),
      /CPF/,
    );
  });

  it("retorna erro ao atualizar professor inexistente", async () => {
    professorRepository.buscarPorId = async () => undefined;

    await assert.rejects(
      () => professorService.atualizar("professor-inexistente", { nome: "Novo nome" }),
      /Professor n.o encontrado/,
    );
  });

  it("encaminha dados validos para o repository ao criar", async () => {
    let payloadRecebido: any;

    professorRepository.buscarPorEmail = async () => undefined;
    professorRepository.buscarPorCpf = async () => undefined;
    professorRepository.criar = async (payload: any) => {
      payloadRecebido = payload;
      return professorCompleto as any;
    };

    const result = await professorService.criar({
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
    });

    assert.equal(payloadRecebido.email, "maria@unieduca.local");
    assert.equal(result.id, "professor-1");
  });
});
