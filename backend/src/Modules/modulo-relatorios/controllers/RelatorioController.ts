import type { Request, Response } from "express";
import { RelatorioService } from "../services/RelatorioService";
import { NotaError } from "../../notas/errors/NotaError";
import type { FiltrosRelatorioAcademico } from "../models/RelatorioAcademico";

export class RelatorioController {
  private service = new RelatorioService();
  private autenticar(req: Request) {
    const user = (req as any).user;
    if (!user?.id) throw new NotaError("Autenticação necessária.", 401, "AUTENTICACAO_NECESSARIA");
    if (!["aluno", "professor", "secretaria", "administrador"].includes(user.tipo_usuario)) {
      throw new NotaError("Você não possui permissão para esta operação.", 403, "PERFIL_PROIBIDO");
    }
  }
  private responderErro(res: Response, error: unknown) {
    if (error instanceof NotaError) return res.status(error.status).json({ codigo: error.codigo, mensagem: error.message, campos: error.campos });
    return res.status(500).json({ codigo: "ERRO_INTERNO", mensagem: "Não foi possível carregar os relatórios acadêmicos." });
  }
  async listarRelatoriosAcademicos(req: Request, res: Response) {
    try {
      this.autenticar(req);
      return res.status(200).json(await this.service.listarRelatorios(req.query as FiltrosRelatorioAcademico, req));
    } catch (error) { return this.responderErro(res, error); }
  }
  async statusFonteDados(req: Request, res: Response) {
    try {
      this.autenticar(req);
      return res.status(200).json(await this.service.obterStatusFonteDados(req));
    } catch (error) { return this.responderErro(res, error); }
  }
}
