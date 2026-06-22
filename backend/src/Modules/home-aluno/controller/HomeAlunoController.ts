import type { Request, Response } from "express";
import { HomeAlunoError } from "../errors/HomeAlunoError.js";
import { HomeAlunoService } from "../service/HomeAlunoService.js";

export class HomeAlunoController {
  constructor(private service = new HomeAlunoService()) {}

  private erro(res: Response, error: unknown) {
    if (error instanceof HomeAlunoError) return res.status(error.status).json({ codigo: error.codigo, mensagem: error.message });
    console.error("Erro no módulo home do aluno", error);
    return res.status(500).json({ codigo: "ERRO_INTERNO", mensagem: "Erro interno do servidor." });
  }

  minhasDisciplinas = async (req: Request, res: Response) => {
    try { return res.json(await this.service.minhasDisciplinas(req)); } catch (e) { return this.erro(res, e); }
  };

  minhasTarefas = async (req: Request, res: Response) => {
    try { return res.json(await this.service.minhasTarefas(req)); } catch (e) { return this.erro(res, e); }
  };
}
