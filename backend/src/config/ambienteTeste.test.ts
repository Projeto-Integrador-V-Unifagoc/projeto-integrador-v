import { spawnSync } from "node:child_process";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BANCO_TESTE = "postgresql://fixture:senha-sintetica@localhost:5433/academico_test";
const backendDir = path.resolve(__dirname, "../..");
const configE2ePath = path.resolve(backendDir, "../e2e/helpers/config.ts");
const dotenvConfig = vi.fn();
const knexMock = vi.fn((config: unknown) => ({ config }));

vi.mock("dotenv", () => ({ default: { config: dotenvConfig } }));
vi.mock("knex", () => ({ default: knexMock }));

let ambienteAnterior: NodeJS.ProcessEnv;

beforeEach(() => {
  ambienteAnterior = { ...process.env };
  process.env.ACADEMICO_MODO_TESTE = "true";
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = BANCO_TESTE;
  delete process.env.EMAIL_MODO_TESTE;
  dotenvConfig.mockClear();
  knexMock.mockClear();
  vi.resetModules();
});

afterEach(() => {
  process.env = ambienteAnterior;
  vi.resetModules();
});

/** Subprocesso com fixtures e loaders interceptados: jamais lê dotenv ou abre rede. */
function executarIsolado(codigo: string, env: Record<string, string> = {}, cwd = backendDir) {
  return spawnSync(process.execPath, ["-r", path.join(backendDir, "node_modules/ts-node/register"), "-e", codigo], {
    cwd,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      ACADEMICO_MODO_TESTE: "true",
      NODE_ENV: "test",
      DATABASE_URL: BANCO_TESTE,
      ...env,
    },
    encoding: "utf8",
    timeout: 30_000,
  });
}

describe("modo de teste explícito", () => {
  it("não carrega dotenv e força e-mail local antes de criar a conexão", async () => {
    await import("../database/connection");
    expect(dotenvConfig).not.toHaveBeenCalled();
    expect(process.env.EMAIL_MODO_TESTE).toBe("true");
    expect(knexMock).toHaveBeenCalledWith(expect.objectContaining({ connection: BANCO_TESTE }));
  });

  it.each([
    ["produção", { NODE_ENV: "production" }],
    ["sem destino explícito", { DATABASE_URL: "", DATABASE: BANCO_TESTE }],
    ["host externo", { DATABASE_URL: "postgresql://fixture:senha-sintetica@externo.invalid/academico_test" }],
    ["banco compartilhado", { DATABASE_URL: "postgresql://fixture:senha-sintetica@localhost/academico" }],
    ["modo ambíguo", { ACADEMICO_MODO_TESTE: "1" }],
  ])("recusa %s antes de dotenv/Knex", async (_nome, overrides) => {
    Object.assign(process.env, overrides);
    await expect(import("../database/connection")).rejects.toThrow();
    expect(dotenvConfig).not.toHaveBeenCalled();
    expect(knexMock).not.toHaveBeenCalled();
  });

  it("mantém os loaders de desenvolvimento quando o modo está desativado", async () => {
    delete process.env.ACADEMICO_MODO_TESTE;
    await import("../database/connection");
    expect(dotenvConfig).toHaveBeenCalledWith({ path: ".env.development" });
    expect(dotenvConfig).toHaveBeenCalledWith();
  });

  it("permite unidade mockada com URL explícita sem abrir conexão de banco", async () => {
    const { configurarAmbienteTeste } = await import("./ambienteTeste");
    expect(configurarAmbienteTeste()).toBe(BANCO_TESTE);
    expect(knexMock).not.toHaveBeenCalled();
    expect(dotenvConfig).not.toHaveBeenCalled();
  });
});

describe("destino de banco isolado", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("aceita loopback %s com porta efêmera", async (host) => {
    const { validarBancoTeste } = await import("./ambienteTeste");
    const url = `postgresql://fixture:senha-sintetica@${host}:49152/academico_e2e`;
    expect(validarBancoTeste(url)).toBe(url);
  });

  it.each([
    "postgresql://fixture:senha-sintetica@externo.invalid/academico_test",
    "postgresql://fixture:senha-sintetica@localhost/academico",
    "postgresql://fixture:senha-sintetica@localhost/academico_TEST",
    "https://fixture:senha-sintetica@localhost/academico_test",
    "postgresql://fixture:senha-sintetica@localhost/academico_test?host=externo.invalid",
    "postgresql://fixture:senha-sintetica@localhost/academico_test?options=-csearch_path%3Dpublic",
    "postgresql://fixture:senha-sintetica@localhost/outro%2Facademico_test",
    "postgresql://fixture:senha-sintetica@localhost:70000/academico_test",
    "postgresql://fixture:senha-sintetica@localhost/academico_test#fragmento",
    "URL-invalida-senha-sintetica",
    "",
  ])("recusa destino inseguro sem expor credenciais (%#)", async (url) => {
    const { validarBancoTeste } = await import("./ambienteTeste");
    let erro: Error | undefined;
    try { validarBancoTeste(url); } catch (capturado) { erro = capturado as Error; }
    expect(erro).toBeInstanceOf(Error);
    expect(erro?.message).not.toContain("senha-sintetica");
    if (url) expect(erro?.message).not.toContain(url);
  });
});

describe("CLI Knex e scripts E2E", () => {
  const interceptarLoaders = `
    const Module = require('node:module');
    const original = Module._load;
    let dotenvChamadas = 0;
    Module._load = function(id, ...args) {
      if (id === 'dotenv') return { config() { dotenvChamadas++; } };
      return original.call(this, id, ...args);
    };
  `;

  it("Knex evita dotenv e expõe development sem depender de NODE_ENV=test", () => {
    const resultado = executarIsolado(`${interceptarLoaders}
      const config = require('./knexfile.ts');
      console.log(JSON.stringify({dotenvChamadas, ambientes: Object.keys(config),
        connection: config.development.connection, email: process.env.EMAIL_MODO_TESTE}));
    `);
    expect(resultado.status, resultado.stderr).toBe(0);
    expect(JSON.parse(resultado.stdout)).toEqual({
      dotenvChamadas: 0, ambientes: ["development", "staging", "production"],
      connection: BANCO_TESTE, email: "true",
    });
  });

  it.each(["setup-db.mjs", "start-backend.mjs"])("%s preserva modo explícito e seleciona development", (script) => {
    const resultado = executarIsolado(`${interceptarLoaders}
      const cp = require('node:child_process');
      const chamadas = [];
      cp.spawnSync = cp.spawn = (cmd, args, options) => {
        chamadas.push({cmd, args, env: { modo: options.env.ACADEMICO_MODO_TESTE,
          nodeEnv: options.env.NODE_ENV, email: options.env.EMAIL_MODO_TESTE,
          database: options.env.DATABASE_URL }});
        return {status: 0, on() {}, kill() {}};
      };
      require('node:module').syncBuiltinESMExports();
      import('../e2e/scripts/${script}').then(() =>
        console.log('CONTRATO=' + JSON.stringify(chamadas)));
    `, { ACADEMICO_MODO_TESTE: "true", E2E_DATABASE_URL: BANCO_TESTE }, path.resolve(backendDir, "../e2e"));
    expect(resultado.status, resultado.stderr).toBe(0);
    const linha = resultado.stdout.split("\n").find((item) => item.startsWith("CONTRATO="));
    const chamadas = JSON.parse(linha!.slice("CONTRATO=".length));
    expect(chamadas.length).toBe(script === "setup-db.mjs" ? 3 : 1);
    for (const chamada of chamadas) {
      expect(chamada.env).toEqual({ modo: "true", nodeEnv: "development", email: "true", database: BANCO_TESTE });
      if (script === "setup-db.mjs") expect(chamada.args).toEqual(expect.arrayContaining(["--env", "development"]));
    }
  });

  for (const script of ["setup-db.mjs", "start-backend.mjs"]) {
    it.each([
      ["flag ausente", { RETIRAR_FLAG: "true" }],
      ["flag false", { ACADEMICO_MODO_TESTE: "false" }],
      ["flag ambígua", { ACADEMICO_MODO_TESTE: "1" }],
      ["destino ausente", { RETIRAR_DESTINO: "true" }],
    ] as const)(`${script} recusa %s antes de qualquer filho`, (_rotulo, overrides) => {
      const resultado = executarIsolado(`${interceptarLoaders}
        const cp = require('node:child_process');
        cp.spawnSync = cp.spawn = () => { console.log('FILHO_EXECUTADO'); return {status:0,on(){},kill(){}}; };
        require('node:module').syncBuiltinESMExports();
        if (process.env.RETIRAR_FLAG === 'true') delete process.env.ACADEMICO_MODO_TESTE;
        if (process.env.RETIRAR_DESTINO === 'true') { delete process.env.E2E_DATABASE_URL; delete process.env.DATABASE_URL; }
        import('../e2e/scripts/${script}');
      `, overrides, path.resolve(backendDir, "../e2e"));
      expect(resultado.status).not.toBe(0);
      expect(resultado.stdout).not.toContain("FILHO_EXECUTADO");
      expect(resultado.stderr).not.toContain("senha-sintetica");
    });
  }

  it.each(["setup-db.mjs", "start-backend.mjs"])("%s bloqueia remoto antes de executar filho", (script) => {
    const resultado = executarIsolado(`${interceptarLoaders}
      const cp = require('node:child_process');
      cp.spawnSync = cp.spawn = () => { console.log('FILHO_EXECUTADO'); return {status: 0, on(){}, kill(){}}; };
      require('node:module').syncBuiltinESMExports();
      import('../e2e/scripts/${script}');
    `, { E2E_DATABASE_URL: "postgresql://fixture:senha-sintetica@externo.invalid/academico_e2e" });
    expect(resultado.status).not.toBe(0);
    expect(resultado.stdout).not.toContain("FILHO_EXECUTADO");
    expect(resultado.stderr).not.toContain("senha-sintetica");
  });

  it.each(["setup-db.mjs", "start-backend.mjs"])("%s recusa produção antes de selecionar development", (script) => {
    const resultado = executarIsolado(`${interceptarLoaders}
      const cp = require('node:child_process');
      cp.spawnSync = cp.spawn = () => { console.log('FILHO_EXECUTADO'); return {status: 0, on(){}, kill(){}}; };
      require('node:module').syncBuiltinESMExports();
      import('../e2e/scripts/${script}');
    `, { NODE_ENV: "production", E2E_DATABASE_URL: BANCO_TESTE });
    expect(resultado.status).not.toBe(0);
    expect(resultado.stdout).not.toContain("FILHO_EXECUTADO");
    expect(resultado.stderr).toContain("produção");
    expect(resultado.stderr).not.toContain("senha-sintetica");
  });
});

describe("configuração E2E", () => {
  it("valida seu banco explícito sem carregar dotenv", async () => {
    process.env.E2E_DATABASE_URL = BANCO_TESTE;
    const { config } = await import(configE2ePath);
    expect(config.databaseUrl).toBe(BANCO_TESTE);
    expect(dotenvConfig).not.toHaveBeenCalled();
  });

  it.each([
    { NODE_ENV: "production", E2E_DATABASE_URL: BANCO_TESTE },
    { E2E_DATABASE_URL: "postgresql://fixture:senha-sintetica@externo.invalid/academico_e2e" },
  ])("recusa ambiente inseguro antes de expor configuração (%#)", async (env) => {
    Object.assign(process.env, env);
    await expect(import(configE2ePath)).rejects.toThrow();
    expect(dotenvConfig).not.toHaveBeenCalled();
  });
});

describe("helper de integração PostgreSQL", () => {
  const interceptarIntegracao = `
    const Module = require('node:module');
    const original = Module._load;
    const chamadas = [];
    let iniciado = 0, parado = 0, nomeBanco;
    Module._load = function(id, ...args) {
      if (id === '@testcontainers/postgresql') return { PostgreSqlContainer: class {
        withDatabase(nome) { nomeBanco = nome; return this; }
        async start() { iniciado++; return { getConnectionUri() {
          return 'postgresql://fixture:senha-sintetica@' + (process.env.HOST_FIXTURE || 'localhost') + ':49152/' + nomeBanco;
        }, async stop(){ parado++; } }; }
      }};
      if (id === 'knex') return () => ({ async destroy(){} });
      if (id === 'node:child_process') return { spawnSync(cmd, args, options) {
        chamadas.push({cmd, args, modo:options.env.ACADEMICO_MODO_TESTE,
          nodeEnv:options.env.NODE_ENV, email:options.env.EMAIL_MODO_TESTE}); return {status:0};
      }};
      return original.call(this, id, ...args);
    };
  `;

  it("usa banco _test em porta efêmera e CLI development com e-mail isolado", () => {
    const resultado = executarIsolado(`${interceptarIntegracao}
      require('./src/test-helpers/pgIntegration.ts').startPgIntegration().then(async pg => {
        await pg.stop(); console.log(JSON.stringify({iniciado,parado,nomeBanco,chamadas,
          modo:process.env.ACADEMICO_MODO_TESTE,email:process.env.EMAIL_MODO_TESTE}));
      });
    `, { ACADEMICO_MODO_TESTE: "" });
    expect(resultado.status, resultado.stderr).toBe(0);
    const estado = JSON.parse(resultado.stdout);
    expect(estado).toMatchObject({ iniciado: 1, parado: 1, nomeBanco: "projeto_integrador_test", modo: "true", email: "true" });
    expect(estado.chamadas).toHaveLength(3);
    for (const chamada of estado.chamadas) {
      expect(chamada).toMatchObject({ cmd: process.execPath, modo: "true", nodeEnv: "development", email: "true" });
      expect(chamada.args).toEqual(expect.arrayContaining(["--env", "development"]));
    }
  });

  it("recusa produção antes de criar container", () => {
    const resultado = executarIsolado(`${interceptarIntegracao}
      require('./src/test-helpers/pgIntegration.ts').startPgIntegration().catch(erro =>
        console.log(JSON.stringify({iniciado,chamadas:chamadas.length,erro:erro.message})));
    `, { NODE_ENV: "production" });
    expect(resultado.status, resultado.stderr).toBe(0);
    expect(JSON.parse(resultado.stdout)).toMatchObject({ iniciado: 0, chamadas: 0, erro: expect.stringContaining("produção") });
  });

  it("recusa URI de container remoto e o encerra antes de executar migrations", () => {
    const resultado = executarIsolado(`${interceptarIntegracao}
      require('./src/test-helpers/pgIntegration.ts').startPgIntegration().catch(erro =>
        console.log(JSON.stringify({iniciado,parado,chamadas:chamadas.length,erro:erro.message})));
    `, { HOST_FIXTURE: "externo.invalid" });
    expect(resultado.status, resultado.stderr).toBe(0);
    expect(JSON.parse(resultado.stdout)).toMatchObject({ iniciado: 1, parado: 1, chamadas: 0 });
    expect(resultado.stdout).not.toContain("senha-sintetica");
  });
});

describe("proteção de e-mail", () => {
  it("mantém transporte local mesmo após alteração das flags e configuração SMTP salva", () => {
    const resultado = executarIsolado(`
      const Module = require('node:module');
      const original = Module._load;
      const transportes = [];
      let envios = 0;
      Module._load = function(id, ...args) {
        if (id === 'nodemailer') return { createTransport(options) {
          transportes.push(options); return {verify: async () => true, close(){},
            async sendMail(){envios++;}};
        }};
        return original.call(this, id, ...args);
      };
      const { configurarAmbienteTeste } = require('./src/config/ambienteTeste.ts');
      configurarAmbienteTeste();
      const service = require('./src/Modules/usuario-perfil-autenticacao/services/email-service.ts').default;
      delete process.env.ACADEMICO_MODO_TESTE;
      delete process.env.EMAIL_MODO_TESTE;
      process.env.FRONTEND_URL = 'http://localhost:5173';
      (async () => {
        await service.verificarConexao({host:'externo.invalid', porta:587, seguro:false,
          usuario:'fixture', senha:'senha-sintetica'});
        await service.enviarRecuperacaoSenha({nome:'Fixture',email:'fixture@example.invalid',token:'fixture'});
        console.log(JSON.stringify({transportes,envios}));
      })();
    `);
    expect(resultado.status, resultado.stderr).toBe(0);
    expect(JSON.parse(resultado.stdout)).toEqual({ transportes: [{ jsonTransport: true }, { jsonTransport: true }], envios: 1 });
  });
});
