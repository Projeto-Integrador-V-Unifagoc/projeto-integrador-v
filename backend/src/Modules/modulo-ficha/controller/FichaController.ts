import { Request, Response } from "express";
import { FichaService } from "../service/FichaService.js";
import { mensagemDeErro } from "../../../shared/erro.js";

const service = new FichaService();

export class FichaController {
  async buscarFicha(req: Request, res: Response) {
    try {
      const alunoId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!alunoId)
        return res.status(400).json({ error: "alunoId é obrigatório" });

      const ficha = await service.montarFicha(alunoId);
      return res.status(200).json(ficha);
    } catch (error: unknown) {
      console.error(error);
      return res
        .status(500)
        .json({ error: mensagemDeErro(error, "Erro ao montar ficha do aluno.") });
    }
  }
}
