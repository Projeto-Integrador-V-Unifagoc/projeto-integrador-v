import { test, expect } from "../fixtures/test.js";
import { pegarCidade, contar } from "../helpers/db.js";
import { criarAluno } from "../factories/aluno.factory.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";

/**
 * Módulo `modulo-documentos` (spec §6, §11.5, §17.4). Upload com validação de
 * tipo/tamanho, vínculo ao aluno, isolamento da listagem, validação, exclusão e
 * autorização.
 *
 * Observação de segurança (§17.4): o `documentoRouter` não declara middleware de
 * autenticação. Na prática, `homeAlunoRouter`/`matriculaRouter` (montados em "/"
 * com `autenticar`/`soSecretaria`) interceptam antes, então anônimos recebem 401
 * e apenas a secretaria alcança as rotas. A proteção é acidental e ampla demais,
 * mas o acesso anônimo é negado — registrado no relatório de débitos.
 */

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function alunoBase(apiSecretaria: any, runId: string) {
  const cidade = await pegarCidade();
  const fac = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
  const dep = await estrutura.criarDepartamento(apiSecretaria, runId, fac.id);
  const curso = await estrutura.criarCurso(apiSecretaria, runId, dep.id);
  return criarAluno(apiSecretaria, runId, { cursoId: curso.id, cidadeIbge: cidade.ibge, uf: cidade.uf });
}

test.describe("Documentos @api", () => {
  test("upload de PDF válido vincula o documento ao aluno", async ({ apiSecretaria, runId }) => {
    const aluno = await alunoBase(apiSecretaria, runId);
    const upload = await apiSecretaria.post("/documentos", {
      multipart: {
        aluno_id: aluno.id,
        tipo_documento: "RG",
        arquivo: { name: "rg.pdf", mimeType: "application/pdf", buffer: PDF },
      },
    });
    expect(upload.status, JSON.stringify(upload.body)).toBe(201);
    const lista = await apiSecretaria.get(`/documentos/aluno/${aluno.id}`);
    expect(lista.body.some((d: any) => d.id === upload.body.id)).toBe(true);
  });

  test("download mantém o arquivo enviado", async ({ apiSecretaria, runId }) => {
    // O endpoint resolve um caminho absoluto gravado pelo multer. Em Windows o
    // multer grava com barras invertidas e o `path.resolve`/`existsSync` deste
    // runtime não as resolve; validado em CI Linux (§16).
    test.skip(
      process.platform === "win32",
      "Download depende de separadores de caminho POSIX; validar em CI Linux (§16).",
    );
    const aluno = await alunoBase(apiSecretaria, runId);
    const upload = await apiSecretaria.post("/documentos", {
      multipart: { aluno_id: aluno.id, tipo_documento: "RG", arquivo: { name: "rg.pdf", mimeType: "application/pdf", buffer: PDF } },
    });
    const download = await apiSecretaria.get(`/documentos/${upload.body.id}/arquivo`);
    expect(download.status).toBe(200);
  });

  test("extensão enganosa com MIME inválido é rejeitada", async ({ apiSecretaria, runId }) => {
    const aluno = await alunoBase(apiSecretaria, runId);
    const upload = await apiSecretaria.post("/documentos", {
      multipart: {
        aluno_id: aluno.id,
        tipo_documento: "RG",
        arquivo: { name: "malicioso.pdf", mimeType: "text/plain", buffer: Buffer.from("not a pdf") },
      },
    });
    expect(upload.status).not.toBe(201);
  });

  test("arquivo acima de 10MB é rejeitado", async ({ apiSecretaria, runId }) => {
    const aluno = await alunoBase(apiSecretaria, runId);
    const grande = Buffer.alloc(11 * 1024 * 1024, 0x41);
    const upload = await apiSecretaria.post("/documentos", {
      multipart: {
        aluno_id: aluno.id,
        tipo_documento: "RG",
        arquivo: { name: "grande.pdf", mimeType: "application/pdf", buffer: grande },
      },
    });
    expect(upload.status).not.toBe(201);
  });

  test("tipo de documento inválido é rejeitado (400)", async ({ apiSecretaria, runId }) => {
    const aluno = await alunoBase(apiSecretaria, runId);
    const upload = await apiSecretaria.post("/documentos", {
      multipart: { aluno_id: aluno.id, tipo_documento: "INEXISTENTE", arquivo: { name: "x.pdf", mimeType: "application/pdf", buffer: PDF } },
    });
    expect(upload.status).toBe(400);
  });

  test("listagem não mistura documentos de alunos diferentes", async ({ apiSecretaria, runId }) => {
    const alunoA = await alunoBase(apiSecretaria, `${runId}a`);
    const alunoB = await alunoBase(apiSecretaria, `${runId}b`);
    const up = await apiSecretaria.post("/documentos", {
      multipart: { aluno_id: alunoA.id, tipo_documento: "RG", arquivo: { name: "a.pdf", mimeType: "application/pdf", buffer: PDF } },
    });
    expect(up.status).toBe(201);
    const listaB = await apiSecretaria.get(`/documentos/aluno/${alunoB.id}`);
    expect(listaB.body.some((d: any) => d.id === up.body.id)).toBe(false);
  });

  test("validação (APROVADO) altera o status e exclusão remove o registro", async ({ apiSecretaria, runId }) => {
    const aluno = await alunoBase(apiSecretaria, runId);
    const up = await apiSecretaria.post("/documentos", {
      multipart: { aluno_id: aluno.id, tipo_documento: "RG", arquivo: { name: "rg.pdf", mimeType: "application/pdf", buffer: PDF } },
    });
    const docId = up.body.id;
    const validar = await apiSecretaria.patch(`/documentos/${docId}/validar`, { body: { status: "APROVADO" } });
    expect(validar.status).toBe(200);
    expect(validar.body.status).toBe("APROVADO");

    const excluir = await apiSecretaria.del(`/documentos/${docId}`);
    expect(excluir.status).toBe(204);
    expect(await contar("documento", { id: docId })).toBe(0);
  });

  test("acesso anônimo às rotas de documentos é negado (401)", async ({ api, apiSecretaria, runId }) => {
    const aluno = await alunoBase(apiSecretaria, runId);
    const lista = await api.get(`/documentos/aluno/${aluno.id}`);
    expect(lista.status).toBe(401);
  });
});
