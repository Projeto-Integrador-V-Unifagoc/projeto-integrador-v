import type { Request, Response } from "express";
import { NotasService } from "../service/NotasService.js";

export class NotasController {
  constructor(private service = new NotasService()) {}

  async listar(_req: Request, res: Response) {
    try {
      res.status(200).json(await this.service.listar());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async buscarPorId(req: Request, res: Response) {
    try {
      res.status(200).json(await this.service.buscarPorId(String(req.params.id)));
    } catch (error: any) {
      res.status(this.statusErro(error)).json({ error: error.message });
    }
  }

  async listarPorAluno(req: Request, res: Response) {
    try {
      res.status(200).json(await this.service.listarPorAluno(String(req.params.alunoId)));
    } catch (error: any) {
      res.status(this.statusErro(error)).json({ error: error.message });
    }
  }

  async listarPorTurma(req: Request, res: Response) {
    try {
      res.status(200).json(await this.service.listarPorTurma(String(req.params.turmaId)));
    } catch (error: any) {
      res.status(this.statusErro(error)).json({ error: error.message });
    }
  }

  async listarPorTurmaDisciplina(req: Request, res: Response) {
    try {
      res.status(200).json(await this.service.listarPorTurmaDisciplina(String(req.params.turmaDisciplinaId)));
    } catch (error: any) {
      res.status(this.statusErro(error)).json({ error: error.message });
    }
  }

  async lancar(req: Request, res: Response) {
    try {
      res.status(201).json(await this.service.lancar(req.body));
    } catch (error: any) {
      res.status(this.statusErro(error)).json({ error: error.message });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      res.status(200).json(await this.service.atualizar(String(req.params.id), req.body));
    } catch (error: any) {
      res.status(this.statusErro(error)).json({ error: error.message });
    }
  }

  async remover(req: Request, res: Response) {
    try {
      res.status(200).json(await this.service.remover(String(req.params.id)));
    } catch (error: any) {
      res.status(this.statusErro(error)).json({ error: error.message });
    }
  }

  private statusErro(error: Error): number {
    if (error.message.includes("nao encontrada") || error.message.includes("nao encontrado")) return 404;
    if (
      error.message.includes("inval") ||
      error.message.includes("obrigatorio") ||
      error.message.includes("Informe") ||
      error.message.includes("nao pode") ||
      error.message.includes("nao pertence") ||
      error.message.includes("nao possui")
    ) {
      return 400;
    }
    return 500;
  }
}
