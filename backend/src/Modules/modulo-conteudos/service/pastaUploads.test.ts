import path from "path";
import { describe, expect, it } from "vitest";
import { caminhoCompleto, nomeEmDisco, UPLOAD_CONTEUDO_DIR } from "./pastaUploads";

describe("pastaUploads", () => {
  it("guarda só o nome do arquivo, venha o caminho do Windows ou do Linux", () => {
    expect(nomeEmDisco("C:\\Estudo\\backend\\uploads-conteudo\\abc.png")).toBe("abc.png");
    expect(nomeEmDisco("/app/uploads-conteudo/abc.pdf")).toBe("abc.pdf");
    expect(nomeEmDisco("abc.docx")).toBe("abc.docx");
  });

  it("resolve sempre dentro da pasta de uploads, inclusive registros antigos com caminho absoluto", () => {
    expect(caminhoCompleto("abc.png")).toBe(path.join(UPLOAD_CONTEUDO_DIR, "abc.png"));
    expect(caminhoCompleto("C:\\outra\\pasta\\abc.png")).toBe(path.join(UPLOAD_CONTEUDO_DIR, "abc.png"));
    expect(caminhoCompleto("../../etc/passwd")).toBe(path.join(UPLOAD_CONTEUDO_DIR, "passwd"));
  });
});
