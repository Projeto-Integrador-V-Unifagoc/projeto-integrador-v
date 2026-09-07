import { Request, Response } from "express";
import { NotasMockService } from "../service/NotasMockService.js";

const obterParametro = (valor: string | string[]) => (Array.isArray(valor) ? valor[0] : valor);

export class NotasMockController {
  private readonly notasMockService = new NotasMockService();

  listarTodos(_req: Request, res: Response) {
    res.status(200).json(this.notasMockService.listarTodos());
  }

  buscarPorAluno(req: Request, res: Response) {
    res.status(200).json(this.notasMockService.buscarPorAluno(obterParametro(req.params.alunoId)));
  }

  buscarPorTurma(req: Request, res: Response) {
    res.status(200).json(this.notasMockService.buscarPorTurma(obterParametro(req.params.turmaId)));
  }

  buscarPorDisciplina(req: Request, res: Response) {
    res
      .status(200)
      .json(this.notasMockService.buscarPorDisciplina(obterParametro(req.params.disciplinaId)));
  }
}
