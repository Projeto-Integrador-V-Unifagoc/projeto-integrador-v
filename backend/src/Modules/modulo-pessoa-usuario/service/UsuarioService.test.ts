import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { UsuarioService } from "./UsuarioService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    criarUsuario: async (data: any) => data,
    listarUsuarios: async () => [{ id: "u1" }],
    buscarUsuarioPorId: async (id: string) => ({ id }),
    ...overrides,
  };
  const service = new UsuarioService();
  service.usuarioRepository = repository as any;
  return { service, repository };
}

describe("UsuarioService.criarUsuario", () => {
  it("mapeia tipoUsuario e preenche timestamps", async () => {
    let salvo: any;
    const { service } = criar({ criarUsuario: async (d: any) => ((salvo = d), d) });
    await service.criarUsuario({ id: "u1", email: "a@b.com", senha: "hash", tipoUsuario: "secretaria" });
    assert.equal(salvo.tipo_usuario, "secretaria");
    assert.ok(salvo.created_at instanceof Date);
    assert.ok(salvo.updated_at instanceof Date);
  });
});

describe("UsuarioService leitura", () => {
  it("lista usuarios", async () => {
    const { service } = criar();
    assert.deepEqual(await service.listarUsuarios(), [{ id: "u1" }]);
  });

  it("busca usuario por id", async () => {
    const { service } = criar();
    assert.deepEqual(await service.buscarUsuarioPorId("u9"), { id: "u9" });
  });
});
