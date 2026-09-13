import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "vitest";
import { obterJwtSecret } from "./jwt";

const SEGREDO_VALIDO = "x".repeat(40);

describe("obterJwtSecret", () => {
  let jwtSecret: string | undefined;
  let nodeEnv: string | undefined;

  beforeEach(() => {
    jwtSecret = process.env.JWT_SECRET;
    nodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwtSecret;
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
  });

  it("usa o segredo de desenvolvimento quando nao ha JWT_SECRET fora de producao", () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "development";
    assert.equal(obterJwtSecret(), "segredo-desenvolvimento-unieduca-local-32");
  });

  it("retorna o segredo configurado quando tem tamanho suficiente", () => {
    process.env.JWT_SECRET = SEGREDO_VALIDO;
    assert.equal(obterJwtSecret(), SEGREDO_VALIDO);
  });

  it("remove espacos ao redor do segredo", () => {
    process.env.JWT_SECRET = `  ${SEGREDO_VALIDO}  `;
    assert.equal(obterJwtSecret(), SEGREDO_VALIDO);
  });

  it("rejeita segredo curto", () => {
    process.env.JWT_SECRET = "curto";
    assert.throws(() => obterJwtSecret(), /pelo menos 32 caracteres/);
  });

  it("rejeita ausencia de segredo em producao", () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "production";
    assert.throws(() => obterJwtSecret(), /JWT_SECRET deve ser definido/);
  });
});
