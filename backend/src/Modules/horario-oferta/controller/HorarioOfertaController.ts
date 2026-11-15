import type { Request, Response } from "express";
import { HorarioOfertaService } from "../service/HorarioOfertaService";

export class HorarioOfertaController {
  service = new HorarioOfertaService();
  listarTurma = async (req: Request, res: Response) => this.executar(res, () => this.service.listarPorTurma(String(req.params.turmaId)));
  listarOferta = async (req: Request, res: Response) => this.executar(res, () => this.service.listarPorOferta(String(req.params.ofertaId)));
  criar = async (req: Request, res: Response) => this.executar(res, () => this.service.criar(String(req.params.ofertaId), req.body), 201);
  atualizar = async (req: Request, res: Response) => this.executar(res, () => this.service.atualizar(String(req.params.id), req.body));
  remover = async (req: Request, res: Response) => this.executar(res, async () => { await this.service.remover(String(req.params.id)); return null; }, 204);
  private async executar(res: Response, operacao: () => Promise<any>, status = 200) {
    try { const resultado = await operacao(); if (status === 204) res.status(204).send(); else res.status(status).json(resultado); }
    catch (error: any) { res.status(Number(error?.status) || 400).json({ error: error?.message ?? "Erro ao processar horario", conflito: error?.conflito }); }
  }
}
