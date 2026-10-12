import { Request, Response } from "express";
import { FichaService } from "../service/FichaService.js";
import { NotaError } from "../../notas/errors/NotaError";
import { registrarFalhaAcademica } from "../../../observabilidade/falhaAcademica";

const service = new FichaService();

export class FichaController {
  async buscarFicha(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.id) return res.status(401).json({ codigo: "AUTENTICACAO_INVALIDA", mensagem: "Autenticação necessária." });
      const perfil = typeof user.tipo_usuario === "string" ? user.tipo_usuario.trim().toLowerCase() : "";
      if (!["secretaria", "administrador"].includes(perfil)) {
        return res.status(403).json({ codigo: "PERFIL_PROIBIDO", mensagem: "Você não possui permissão para consultar a ficha." });
      }
      const alunoId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!alunoId)
        return res.status(400).json({ error: "alunoId é obrigatório" });

      const ficha = await service.montarFicha(alunoId, req);
      return res.status(200).json(ficha);
    } catch (error: unknown) {
      if (error instanceof NotaError) return res.status(error.status).json({ codigo: error.codigo, mensagem: error.message, campos: error.campos });
      registrarFalhaAcademica(res, "ficha.buscar", error);
      return res.status(500).json({ codigo: "ERRO_INTERNO", mensagem: "Não foi possível carregar a ficha do aluno." });
    }
  }
}
